// lib/monsterGraduation.ts
// Consumes a Graduation Scroll (see lib/inventory.ts SHOP_CATALOG) to permanently
// upgrade one team monster's display to its next graduation stage (see
// MonsterDef.graduation in lib/monsterConfig.ts). Mirrors the
// learn_monster_skill/unlearn_monster_skill pattern in lib/skillScrolls.ts.
import { supabase } from './supabase';

export async function graduateMonster(
  userId: string,
  monsterRowId: string,
  requiredLevel: number,
  targetTier: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('graduate_monster', {
    p_user_id: userId,
    p_monster_row_id: monsterRowId,
    p_required_level: requiredLevel,
    p_target_tier: targetTier,
  });
  if (error) {
    console.error('graduate_monster error:', error);
    return false;
  }
  return !!data;
}
