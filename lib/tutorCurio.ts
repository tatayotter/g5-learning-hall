// lib/tutorCurio.ts
// Spends gold (and optionally a Tome of Knowledge, see lib/tomeShop.ts) to
// roll for a curio quality upgrade via the tutor_curio RPC. Mirrors the
// graduateMonster wrapper in lib/monsterGraduation.ts.
import { supabase } from './supabase';
import { QualityTier } from './curioQuality';

export interface TutorOutcome {
  success: boolean;
  error?: 'not_found' | 'already_perfect' | 'insufficient_gold';
  rolled_tier?: 'fail' | QualityTier;
  previous_quality?: QualityTier;
  new_quality?: QualityTier;
  gold_spent?: number;
  used_tome?: boolean;
  // Present only when gold was actually deducted — the RPC now writes
  // straight to player_progress, so callers should sync (not re-apply) this
  // into local state via useWeeklyData's syncCharacterStats, not
  // updateStatsAndJournal (which would push another delta on top of a
  // change this RPC already made atomically). See MonsterGuild's
  // onProgressSynced.
  character_stats?: { gold: number; xp: number; level: number };
}

export async function tutorCurio(
  userId: string,
  monsterRowId: string,
  useTome: boolean = false,
): Promise<TutorOutcome | null> {
  const { data, error } = await supabase.rpc('tutor_curio', {
    p_user_id: userId,
    p_monster_row_id: monsterRowId,
    p_use_tome: useTome,
  });
  if (error) {
    console.error('tutor_curio error:', error);
    return null;
  }
  return data as TutorOutcome;
}
