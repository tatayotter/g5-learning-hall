// lib/featureFlags.ts
//
// Hidden rollout switches (feature_flags table, my_feature_flags RPC — see
// supabase/migrations/20261006070000_offline_play.sql). Fetched on
// every online load and remembered per player, so a flag that's on keeps
// working offline. Unknown or never-fetched flags read as off.
import { supabase } from '@/lib/supabase';

export type FeatureFlag = 'offline_play';

const KEY = (userId: string) => `lh_flags_${userId}`;

export async function refreshFeatureFlags(userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('my_feature_flags', { p_user_id: userId });
  // Before the migration lands the RPC doesn't exist; keep whatever was remembered.
  if (error || !Array.isArray(data)) return getFeatureFlags(userId);
  try { localStorage.setItem(KEY(userId), JSON.stringify(data)); } catch { /* best-effort */ }
  return data as string[];
}

export function getFeatureFlags(userId: string): string[] {
  try {
    const raw = localStorage.getItem(KEY(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hasFeatureFlag(userId: string, flag: FeatureFlag): boolean {
  return getFeatureFlags(userId).includes(flag);
}
