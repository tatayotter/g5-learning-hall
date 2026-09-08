// lib/secEngine.ts
// Data layer for Student Enrichment Content (SEC) entitlements — the real
// gate BonusQuestsTab.tsx checks before showing an owned pack. See
// docs/sec-shop-design.md and supabase/migrations/20260905170000_add_sec_shop_schema.sql.
import { supabase } from '@/lib/supabase';

// Keyed by sec_packs.id so a future second SKU (Grade 3+ math, or a
// different category) just needs a new entry here, not new gating logic.
export const SEC_PACK_ID_BY_GRADE: Record<number, string> = {
  2: 'g2-math-enrichment',
  3: 'g3-math-enrichment',
  4: 'g4-math-enrichment',
  5: 'g5-math-enrichment',
  6: 'g6-math-enrichment',
};

// RLS's own sec_entitlements_select_own_as_child policy already scopes this
// to the caller's own child_id (via current_app_user_id()) — the .eq() calls
// here are belt-and-suspenders, not the actual security boundary.
export async function fetchOwnedSecPackIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('sec_entitlements')
    .select('pack_id')
    .eq('child_id', userId)
    .eq('status', 'active');
  if (error) {
    console.error('Failed to fetch SEC entitlements:', error);
    return new Set();
  }
  return new Set((data || []).map((row) => row.pack_id as string));
}
