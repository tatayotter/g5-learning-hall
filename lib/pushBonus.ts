// lib/pushBonus.ts
// Claims the 300-gold "turned on push notifications" welcome bonuses.
// Two independent, stackable triggers — a child gets 300 for enabling push
// themselves, and another 300 if their parent enables it on their own
// device. Idempotent — safe to call on every login, mirrors
// lib/marketingBonus.ts's claimMarketingGoldBonus() exactly (same shape,
// same call site in components/Dashboard.tsx).
import { supabase } from './supabase';

export async function claimPushGoldBonusChild(
  userId: string,
): Promise<{ gold: number } | null> {
  const { data, error } = await supabase.rpc('claim_push_gold_bonus_child', {
    p_user_id: userId,
  });
  if (error) return null;
  return data ?? null;
}

export async function claimPushGoldBonusParent(
  userId: string,
): Promise<{ gold: number } | null> {
  const { data, error } = await supabase.rpc('claim_push_gold_bonus_parent', {
    p_user_id: userId,
  });
  if (error) return null;
  return data ?? null;
}
