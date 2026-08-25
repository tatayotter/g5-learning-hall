// lib/referral.ts
// Client-side helpers for the referral system.

import { supabase } from './supabase';

export interface ReferralValidation {
  referrerId: string;
  referrerUsername: string;
}

export interface PlayerNotification {
  id: string;
  title: string;
  body: string;
  icon: string;
  read: boolean;
  created_at: string;
}

/** Check whether a code is valid without committing anything. */
export async function validateReferralCode(
  code: string,
): Promise<ReferralValidation | null> {
  if (!code || code.trim().length === 0) return null;

  const { data, error } = await supabase.rpc('validate_referral_code', {
    p_code: code.trim(),
  });
  if (error || !data || data.length === 0) return null;

  const row = Array.isArray(data) ? data[0] : data;
  return { referrerId: row.referrer_id, referrerUsername: row.referrer_username };
}

/**
 * Apply a referral code to a newly created child account.
 * Called from /api/child-signup after the account is created.
 * Returns true if the code was accepted, false if invalid/no-op.
 */
export async function applyReferralCode(
  registrantId: string,
  code: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('apply_referral_code', {
    p_registrant_id: registrantId,
    p_code: code.trim(),
  });
  if (error) {
    console.error('apply_referral_code error:', error);
    return false;
  }
  return !!data;
}

/**
 * Claim the first-login referral reward for the registrant.
 * Idempotent — safe to call on every login; no-ops if already claimed.
 * Returns the reward granted or null if nothing to claim.
 */
export async function claimRegistrantReward(
  userId: string,
): Promise<{ gold: number; growth_pills: number } | null> {
  const { data, error } = await supabase.rpc('claim_registrant_referral_reward', {
    p_user_id: userId,
  });
  // Silently return null if RPC doesn't exist yet (migration pending)
  if (error) return null;
  return data ?? null;
}

/** Fetch all notifications for a player (newest first, max 50). */
export async function fetchNotifications(
  userId: string,
): Promise<PlayerNotification[]> {
  const { data, error } = await supabase.rpc('fetch_player_notifications', {
    p_user_id: userId,
  });
  // Silently return empty if RPC doesn't exist yet (migration pending)
  if (error) return [];
  return (data as PlayerNotification[]) ?? [];
}

/** Mark all of a player's notifications as read. */
export async function markNotificationsRead(userId: string): Promise<void> {
  // Fire-and-forget; non-fatal if migration not applied yet
  supabase.rpc('mark_notifications_read', { p_user_id: userId }).then(() => {});
}

/**
 * Fetch the current player's own referral key.
 * Uses a SECURITY DEFINER RPC because RLS on `children` blocks direct selects.
 */
export async function getMyReferralKey(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_my_referral_key');
  // Silently return null if RPC doesn't exist yet (migration pending)
  if (error) return null;
  return (data as string) ?? null;
}

export interface ReferralStats {
  total_referrals: number;
  rewarded_referrals: number;
  pending_referrals: number;
}

/** Fetch aggregate referral stats for the current player. */
export async function getMyReferralStats(): Promise<ReferralStats | null> {
  const { data, error } = await supabase.rpc('get_my_referral_stats');
  if (error) return null;
  return (data as ReferralStats) ?? null;
}
