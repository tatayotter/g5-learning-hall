// lib/lifetimeStats.ts
import { supabase } from './supabase';
import type { WeeklyData } from '@/hooks/useWeeklyData';

// Phase 4 Wave 2 of the weekly-progress redesign (see docs/weekly-progress-redesign-plan.md):
// player_progress now stores these as true lifetime-cumulative columns, kept in sync by a DB
// trigger on every weekly_packages write (Phase 3) — no more summing across every historical
// weekly_packages row client-side.
export interface PlayerProgress {
  user_id: string;
  level: number;
  xp: number;
  gold: number;
  mastery_count: number;
  purchased_items: number;
  honor_grants: number;
  guild_sessions_count_total: number;
  monster_battles_won_total: number;
  sibling_battles_won_total: number;
  perfect_quizzes_total: number;
  dummy_battles_won_total: number;
  eggs_hatched_total: number;
  curios_graduated_total: number;
  trades_completed_total: number;
  legendaries_caught_total: number;
  tutor_rerolls_total: number;
  tatay_battles_won_total: number;
  tatay_battles_lost_total: number;
  trash_collected_total: number;
  trash_gold_earned_total: number;
  achievements: Record<string, boolean>;
}

export async function fetchPlayerProgress(userId: string): Promise<PlayerProgress | null> {
  const { data, error } = await supabase
    .from('player_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PlayerProgress;
}

// Overlays player_progress's lifetime totals onto a WeeklyData-shaped object, for feeding
// lib/achievements.ts's criteria() functions — those still take a WeeklyData and check its
// weekly-reset-looking counter fields, but per the redesign's decision those now mean "lifetime"
// (thresholds unchanged, only the data source moves). journal_logs/achievements/quiz_attempts/
// mastered_quizzes are left as-is from `data` (still genuinely this-week/carried-forward
// concepts, not part of this remap). Falls back to `data` unchanged if progress hasn't loaded
// yet, so callers don't need a null-guard at every call site.
export function mergeProgressForAchievements(data: WeeklyData, progress: PlayerProgress | null): WeeklyData {
  if (!progress) return data;
  return {
    ...data,
    character_stats: { level: progress.level, xp: progress.xp, gold: progress.gold },
    mastery_count: progress.mastery_count,
    purchased_items: progress.purchased_items,
    honor_grants: progress.honor_grants,
    guild_sessions_count: progress.guild_sessions_count_total,
    monster_battles_won: progress.monster_battles_won_total,
    sibling_battles_won: progress.sibling_battles_won_total,
    perfect_quizzes: progress.perfect_quizzes_total,
    dummy_battles_won: progress.dummy_battles_won_total,
    eggs_hatched: progress.eggs_hatched_total,
    curios_graduated: progress.curios_graduated_total,
    trades_completed: progress.trades_completed_total,
    legendaries_caught: progress.legendaries_caught_total,
    tutor_rerolls: progress.tutor_rerolls_total,
    tatay_battles_won: progress.tatay_battles_won_total,
    tatay_battles_lost: progress.tatay_battles_lost_total,
    trash_collected: progress.trash_collected_total,
    trash_gold_earned: progress.trash_gold_earned_total,
  };
}

export interface LifetimeBattleStats {
  guildSessions: number;
  trainerWins: number;
  liveBattleWins: number;
  dummyWins: number;
  perfectQuizzes: number;
}

const EMPTY_STATS: LifetimeBattleStats = {
  guildSessions: 0,
  trainerWins: 0,
  liveBattleWins: 0,
  dummyWins: 0,
  perfectQuizzes: 0,
};

// Kept as a thin projection of fetchPlayerProgress so components/HeroProfile.tsx's existing
// "Lifetime" toggle needs no changes at all — same function name, same return shape, just a
// single-row read instead of summing every historical weekly_packages row.
export async function fetchLifetimeBattleStats(userId: string): Promise<LifetimeBattleStats> {
  const progress = await fetchPlayerProgress(userId);
  if (!progress) return EMPTY_STATS;
  return {
    guildSessions: progress.guild_sessions_count_total,
    trainerWins: progress.monster_battles_won_total,
    liveBattleWins: progress.sibling_battles_won_total,
    dummyWins: progress.dummy_battles_won_total,
    perfectQuizzes: progress.perfect_quizzes_total,
  };
}
