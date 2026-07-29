// lib/lifetimeStats.ts
import { supabase } from './supabase';

// guild_sessions_count/monster_battles_won/sibling_battles_won/perfect_quizzes/
// dummy_battles_won all reset to 0 at the start of every week (see
// hooks/useWeeklyData.ts's carriedForward) — each weekly_packages row only
// holds that week's own count, so a lifetime total means summing across
// every week the account has a row for.
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

export async function fetchLifetimeBattleStats(userId: string): Promise<LifetimeBattleStats> {
  const { data, error } = await supabase
    .from('weekly_packages')
    .select('guild_sessions_count, monster_battles_won, sibling_battles_won, perfect_quizzes, dummy_battles_won')
    .eq('user_id', userId);

  if (error || !data) return EMPTY_STATS;

  return data.reduce((acc, row) => ({
    guildSessions: acc.guildSessions + (row.guild_sessions_count || 0),
    trainerWins: acc.trainerWins + (row.monster_battles_won || 0),
    liveBattleWins: acc.liveBattleWins + (row.sibling_battles_won || 0),
    dummyWins: acc.dummyWins + (row.dummy_battles_won || 0),
    perfectQuizzes: acc.perfectQuizzes + (row.perfect_quizzes || 0),
  }), { ...EMPTY_STATS });
}
