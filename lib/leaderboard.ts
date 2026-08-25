// lib/leaderboard.ts
// Aggregates Monster Arena stats across every known player for the
// Leaderboard tab. Reads only tables that already allow broad cross-user
// select under RLS (user_battle_state, user_monsters, player_progress,
// user_completed_questions, monster_battle_log) — no new policies needed.
import { supabase } from '@/lib/supabase';
import { USERS, UserId, loadClassmates } from '@/lib/userSession';
import { MONSTER_ARENA_QUEST_TYPE } from '@/lib/guildEngine';
import { BOT_PROFILES, getBotProgress, botAllMonsterIds, teamSizeForLevel } from '@/lib/botProfiles';

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

// fetchLeaderboard() below used to recompute rankings from scratch — six
// cross-user table scans over the *entire* platform roster — on every single
// mount of LeaderboardPanel. Nothing coalesced repeat opens, so a player
// flipping between tabs re-ran the full O(all-platform-users) query each
// time. A short TTL cache plus in-flight de-dupe (below) means repeat opens
// within the window reuse one computed result instead of re-querying.
// See Phase 0 of buzzing-rolling-engelbart.md: the fuller fix (a
// leaderboard_snapshot table refreshed on a cron) is future work — this is
// the safe, no-schema-change interim step that still stops the same-session
// re-fetch storm.
const CACHE_TTL_MS = 30_000;
let cachedEntries: LeaderboardEntry[] | null = null;
let cachedAt = 0;
let inFlight: Promise<LeaderboardEntry[]> | null = null;

export async function fetchLeaderboard(options?: { force?: boolean }): Promise<LeaderboardEntry[]> {
  if (!options?.force && cachedEntries && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedEntries;
  }
  if (inFlight) return inFlight;

  inFlight = computeLeaderboard()
    .then(entries => {
      cachedEntries = entries;
      cachedAt = Date.now();
      return entries;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

async function computeLeaderboard(): Promise<LeaderboardEntry[]> {
  await loadClassmates();
  const ids = Object.keys(USERS);
  if (ids.length === 0) return [];

  const [battleStateRes, monstersRes, caughtRes, progressRes, questionsRes, battleLogRes] = await Promise.all([
    supabase.from('user_battle_state').select('user_id, defeated_trainers').in('user_id', ids),
    supabase.from('user_monsters').select('user_id, monster_id, monster_level, nickname, slot, acquired_via').in('user_id', ids).order('slot'),
    supabase.from('user_caught_monsters').select('user_id, monster_id, monster_level, nickname').in('user_id', ids),
    // player_progress is one row per user (lifetime, not week-keyed) — see
    // docs/weekly-progress-redesign-plan.md Phase 4 Wave 2. Replaces a multi-row
    // weekly_packages fetch + client-side "latest row wins" dedup, which (like the
    // sync trigger before its 2026-08-11 fix) could be fooled by a pre-staged future week
    // with non-null-but-zeroed character_stats sorting as "latest".
    supabase.from('player_progress').select('user_id, level, gold').in('user_id', ids),
    supabase.from('user_completed_questions').select('user_id').eq('quest_type', MONSTER_ARENA_QUEST_TYPE).in('user_id', ids),
    supabase.from('monster_battle_log').select('user_id, opponent').eq('result', 'win').in('user_id', ids),
  ]);

  const defeatedByUser = new Map<string, number>();
  (battleStateRes.data || []).forEach((row: any) => {
    defeatedByUser.set(row.user_id, (row.defeated_trainers || []).length);
  });

  // Traded-in curios are excluded from every leaderboard signal below — rank
  // (and the team/collection shown for it) should reflect earned progress,
  // not trading/purchasing power. user_caught_monsters (the dex) is never
  // touched by trading, so it's unaffected.
  const earnedMonsters = (monstersRes.data || []).filter((row: any) => row.acquired_via !== 'traded');

  const teamByUser = new Map<string, LeaderboardTeamMonster[]>();
  earnedMonsters.forEach((row: any) => {
    if (row.slot == null) return; // benched, not part of the active team
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
  earnedMonsters.forEach((row: any) => addSpecies(row.user_id, row.monster_id));
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
  earnedMonsters.forEach((row: any) =>
    considerMonster(row.user_id, { monster_id: row.monster_id, monster_level: row.monster_level, nickname: row.nickname }));
  (caughtRes.data || []).forEach((row: any) =>
    considerMonster(row.user_id, { monster_id: row.monster_id, monster_level: row.monster_level, nickname: row.nickname }));

  const statsByUser = new Map<string, { level: number; gold: number }>();
  (progressRes.data || []).forEach((row: any) => {
    statsByUser.set(row.user_id, { level: row.level ?? 1, gold: row.gold ?? 0 });
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
    const stats = statsByUser.get(id) || { level: 1, gold: 0 };
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
      avatar: profile?.avatar ?? '/userpics/userpics_premium/ssb3.png',
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

  // Append simulated classmate bots so the leaderboard is never empty and
  // always shows realistic competing progress. Bots use the same score formula
  // as real players and grow deterministically each day.
  const now = new Date();
  const botEntries: LeaderboardEntry[] = BOT_PROFILES.map(bot => {
    const p = getBotProgress(bot, now);
    const score = p.level * 5 + p.trainerBattlesWon * 10 + p.liveBattleWins * 25 + p.questionsAnswered;
    // Only show the team slots the bot has actually unlocked at their current level.
    const teamSize = teamSizeForLevel(p.level);
    const team: LeaderboardTeamMonster[] = botAllMonsterIds(bot).slice(0, teamSize).map(mId => ({
      monster_id: mId,
      monster_level: p.level,
      nickname: null,
    }));
    return {
      userId: bot.id as UserId,
      name: bot.fullName,
      avatar: bot.userpic,
      grade: bot.grade,
      isFamily: false,
      level: p.level,
      gold: p.gold,
      questionsAnswered: p.questionsAnswered,
      trainerBattlesWon: p.trainerBattlesWon,
      liveBattleWins: p.liveBattleWins,
      team,
      monstersCollected: p.monstersCollected,
      topMonster: team[0] ?? null,
      score,
    };
  });

  return [...entries, ...botEntries].sort((a, b) => b.score - a.score);
}

export interface ReactionCounts {
  [toUserId: string]: number;
}

// Read-only aggregate — RLS on leaderboard_reactions allows select to everyone
// (small trusted family/classmate roster), same pattern as user_completed_questions.
export async function fetchReactionCounts(): Promise<ReactionCounts> {
  const { data } = await supabase.from('leaderboard_reactions').select('to_user_id');
  const counts: ReactionCounts = {};
  (data || []).forEach((row: any) => {
    counts[row.to_user_id] = (counts[row.to_user_id] || 0) + 1;
  });
  return counts;
}

export async function sendReaction(fromUserId: string, toUserId: string, emoji: string = '👏'): Promise<boolean> {
  const { error } = await supabase
    .from('leaderboard_reactions')
    .insert({ from_user_id: fromUserId, to_user_id: toUserId, emoji });
  if (error) {
    console.error('Failed to send reaction:', error);
    return false;
  }
  return true;
}
