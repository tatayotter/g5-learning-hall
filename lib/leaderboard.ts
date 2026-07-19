// lib/leaderboard.ts
// Aggregates Monster Arena stats across every known player for the
// Leaderboard tab. Reads only tables that already allow broad cross-user
// select under RLS (user_battle_state, user_monsters, weekly_packages,
// user_completed_questions, monster_battle_log) — no new policies needed.
import { supabase } from '@/lib/supabase';
import { USERS, UserId, loadClassmates } from '@/lib/userSession';
import { MONSTER_ARENA_QUEST_TYPE } from '@/lib/guildEngine';

export interface LeaderboardTeamMonster {
  monster_id: string;
  monster_level: number;
  nickname: string | null;
}

export interface LeaderboardEntry {
  userId: UserId;
  name: string;
  avatar: string;
  grade: string;
  isFamily: boolean;
  level: number;
  gold: number;
  questionsAnswered: number;
  trainerBattlesWon: number;
  liveBattleWins: number;
  team: LeaderboardTeamMonster[];
  monstersCollected: number;
  topMonster: LeaderboardTeamMonster | null;
  score: number;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  await loadClassmates();
  const ids = Object.keys(USERS);
  if (ids.length === 0) return [];

  const [battleStateRes, monstersRes, caughtRes, weeklyRes, questionsRes, battleLogRes] = await Promise.all([
    supabase.from('user_battle_state').select('user_id, defeated_trainers').in('user_id', ids),
    supabase.from('user_monsters').select('user_id, monster_id, monster_level, nickname, slot').in('user_id', ids).order('slot'),
    supabase.from('user_caught_monsters').select('user_id, monster_id, monster_level, nickname').in('user_id', ids),
    supabase.from('weekly_packages').select('user_id, character_stats, week_starting_date').in('user_id', ids),
    supabase.from('user_completed_questions').select('user_id').eq('quest_type', MONSTER_ARENA_QUEST_TYPE).in('user_id', ids),
    supabase.from('monster_battle_log').select('user_id, opponent').eq('result', 'win').in('user_id', ids),
  ]);

  const defeatedByUser = new Map<string, number>();
  (battleStateRes.data || []).forEach((row: any) => {
    defeatedByUser.set(row.user_id, (row.defeated_trainers || []).length);
  });

  const teamByUser = new Map<string, LeaderboardTeamMonster[]>();
  (monstersRes.data || []).forEach((row: any) => {
    const list = teamByUser.get(row.user_id) || [];
    list.push({ monster_id: row.monster_id, monster_level: row.monster_level, nickname: row.nickname });
    teamByUser.set(row.user_id, list);
  });

  // Distinct species owned — active team plus bench (user_caught_monsters),
  // same union MonsterGuild.tsx uses for its Compendium "owned" set.
  const speciesByUser = new Map<string, Set<string>>();
  const addSpecies = (userId: string, monsterId: string) => {
    const set = speciesByUser.get(userId) || new Set<string>();
    set.add(monsterId);
    speciesByUser.set(userId, set);
  };
  (monstersRes.data || []).forEach((row: any) => addSpecies(row.user_id, row.monster_id));
  (caughtRes.data || []).forEach((row: any) => addSpecies(row.user_id, row.monster_id));

  // Highest-level monster owned — active team plus bench, mirroring the same
  // union used for monstersCollected above.
  const topMonsterByUser = new Map<string, LeaderboardTeamMonster>();
  const considerMonster = (userId: string, monster: LeaderboardTeamMonster) => {
    const current = topMonsterByUser.get(userId);
    if (!current || monster.monster_level > current.monster_level) {
      topMonsterByUser.set(userId, monster);
    }
  };
  (monstersRes.data || []).forEach((row: any) =>
    considerMonster(row.user_id, { monster_id: row.monster_id, monster_level: row.monster_level, nickname: row.nickname }));
  (caughtRes.data || []).forEach((row: any) =>
    considerMonster(row.user_id, { monster_id: row.monster_id, monster_level: row.monster_level, nickname: row.nickname }));

  const statsByUser = new Map<string, { level: number; gold: number; week: string }>();
  (weeklyRes.data || []).forEach((row: any) => {
    // Admins can pre-stage a future week's row with character_stats left null
    // as a "not started" marker (see hooks/useWeeklyData.ts) — skip those so
    // they don't shadow the last week the player actually played.
    if (!row.character_stats) return;
    const existing = statsByUser.get(row.user_id);
    // Keep only the most recent weekly_packages row per user (there's one per week).
    if (!existing || row.week_starting_date > existing.week) {
      statsByUser.set(row.user_id, {
        level: row.character_stats?.level ?? 1,
        gold: row.character_stats?.gold ?? 0,
        week: row.week_starting_date,
      });
    }
  });

  const questionsByUser = new Map<string, number>();
  (questionsRes.data || []).forEach((row: any) => {
    questionsByUser.set(row.user_id, (questionsByUser.get(row.user_id) || 0) + 1);
  });

  // A monster_battle_log win only counts as a "Live Battle Win" when the
  // opponent was another known player — NPC trainers and wild encounters use
  // their own trainer/wild ids as `opponent`, which never collide with a
  // real user id, so this cleanly separates the two without a schema change.
  const winsByUser = new Map<string, number>();
  (battleLogRes.data || []).forEach((row: any) => {
    if (!ids.includes(row.opponent)) return;
    winsByUser.set(row.user_id, (winsByUser.get(row.user_id) || 0) + 1);
  });

  const entries: LeaderboardEntry[] = ids.map(id => {
    const profile = USERS[id];
    const stats = statsByUser.get(id) || { level: 1, gold: 0, week: '' };
    const questionsAnswered = questionsByUser.get(id) || 0;
    const trainerBattlesWon = defeatedByUser.get(id) || 0;
    const liveBattleWins = winsByUser.get(id) || 0;
    const monstersCollected = speciesByUser.get(id)?.size || 0;
    // Weighted so the two headline achievements (live battle wins, trainer
    // wins) matter most, with level and raw questions answered as a baseline
    // participation credit.
    const score = stats.level * 5 + trainerBattlesWon * 10 + liveBattleWins * 25 + questionsAnswered;
    return {
      userId: id,
      name: profile?.fullName ?? id,
      avatar: profile?.avatar ?? '/userpics/Spr_RS_School_Kid_M.png',
      grade: profile?.grade ?? '',
      isFamily: !!profile?.isFamily,
      level: stats.level,
      gold: stats.gold,
      questionsAnswered,
      trainerBattlesWon,
      liveBattleWins,
      team: teamByUser.get(id) || [],
      monstersCollected,
      topMonster: topMonsterByUser.get(id) || null,
      score,
    };
  });

  return entries.sort((a, b) => b.score - a.score);
}
