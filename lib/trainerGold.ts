// lib/trainerGold.ts
// The gold written on each NPC trainer (lib/monsterConfig.ts NPC_TRAINERS reward.gold), paid
// the first time a kid beats that trainer, once per trainer ever. The server decides
// (claim_trainer_first_win in 20261028090000_gear_tools_and_earning_trims.sql): it only pays when
// the win is on record in monster_battle_log, so this is called right after that row is written
// (online) or the offline battle has synced.
import { supabase } from '@/lib/supabase';

export interface TrainerGold {
  gold: number;
  // The account's totals after paying (null when nothing was paid).
  progress: { gold: number; xp: number; level: number } | null;
}

export async function claimTrainerFirstWin(userId: string, trainerId: string): Promise<TrainerGold> {
  const { data, error } = await supabase.rpc('claim_trainer_first_win', { p_user_id: userId, p_trainer_id: trainerId });
  if (error || !data) {
    if (error) console.error('claim_trainer_first_win error:', error);
    return { gold: 0, progress: null };
  }
  return { gold: data.gold ?? 0, progress: data.progress ?? null };
}
