// lib/growthPill.ts
// Consumes a Growth Pill (see lib/inventory.ts's ItemKey union — granted by
// Term Boss Fight victories, lib/bossFightEngine.ts) to instantly grant one
// owned curio +5 levels. Mirrors lib/monsterGraduation.ts's shape exactly —
// same "call an RPC, return a boolean" contract — since the underlying
// use_growth_pill RPC was itself modeled directly on graduate_monster.
import { supabase } from './supabase';

export async function useGrowthPill(userId: string, monsterRowId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('use_growth_pill', {
    p_user_id: userId,
    p_monster_row_id: monsterRowId,
  });
  if (error) {
    console.error('use_growth_pill error:', error);
    return false;
  }
  return !!data;
}
