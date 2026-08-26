// lib/marketingBonus.ts
// Claims the 250-gold "parent opted into email updates" welcome bonus.
// Idempotent — safe to call on every login, mirrors
// lib/referral.ts's claimRegistrantReward() exactly (same shape, same
// call site in components/Dashboard.tsx).
import { supabase } from './supabase';

export async function claimMarketingGoldBonus(
  userId: string,
): Promise<{ gold: number } | null> {
  const { data, error } = await supabase.rpc('claim_marketing_gold_bonus', {
    p_user_id: userId,
  });
  if (error) return null;
  return data ?? null;
}
