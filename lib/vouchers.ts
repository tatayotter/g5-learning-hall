// lib/vouchers.ts
// Player-facing client for the voucher code redemption system — see
// supabase/migrations/20260909130000_add_voucher_code_system.sql for the
// table/RPC shape. One RPC call does everything: validates the code,
// applies whichever reward it's configured for (curio / item / gold), and
// records the redemption so the same user can't claim it twice.
import { supabase } from './supabase';

export type VoucherRewardType = 'curio' | 'item' | 'gold';

export type VoucherRedeemFailureReason =
  | 'not_found'
  | 'inactive'
  | 'expired'
  | 'already_redeemed'
  | 'exhausted'
  | 'network_error';

export interface VoucherRedeemResult {
  redeemed: boolean;
  reason?: VoucherRedeemFailureReason;
  rewardType?: VoucherRewardType;
  rewardCurioId?: string;
  rewardItemKey?: string;
  rewardItemQty?: number;
  rewardGoldAmount?: number;
  stats?: { level: number; xp: number; gold: number };
}

// Human-readable copy for each failure reason — shared so the panel and any
// future redeem surface (e.g. a promo-code entry on the splash screen)
// don't each invent their own wording.
export const VOUCHER_FAILURE_MESSAGES: Record<VoucherRedeemFailureReason, string> = {
  not_found: "That code doesn't exist — double-check the spelling.",
  inactive: 'That code is no longer active.',
  expired: 'That code has expired.',
  already_redeemed: "You've already claimed this code.",
  exhausted: 'This code has reached its redemption limit.',
  network_error: 'Could not reach the server — try again.',
};

export async function redeemVoucherCode(userId: string, code: string): Promise<VoucherRedeemResult> {
  const { data, error } = await supabase.rpc('redeem_voucher_code', {
    p_user_id: userId,
    p_code: code,
  });
  if (error || !data) {
    console.error('redeem_voucher_code error:', error);
    return { redeemed: false, reason: 'network_error' };
  }
  return {
    redeemed: data.redeemed,
    reason: data.reason,
    rewardType: data.reward_type,
    rewardCurioId: data.reward_curio_id,
    rewardItemKey: data.reward_item_key,
    rewardItemQty: data.reward_item_qty,
    rewardGoldAmount: data.reward_gold_amount,
    stats: data.stats,
  };
}
