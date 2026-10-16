// lib/featureFlags.ts
//
// Hidden rollout switches (feature_flags table, my_feature_flags RPC — see
// supabase/migrations/20261006070000_offline_play.sql). Fetched on
// every online load and remembered per player, so a flag that's on keeps
// working offline. Unknown or never-fetched flags read as off.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// offline_play: quests and battles with no internet (lib/offlineQuests.ts).
// new_nav: the five-tab navigation (components/nav/GameNav.tsx, docs/nav-redesign.md).
export type FeatureFlag = 'offline_play' | 'new_nav';

// Fired after a refresh stores new flags, so screens already drawn can switch.
const CHANGED_EVENT = 'lh-flags-changed';

const KEY = (userId: string) => `lh_flags_${userId}`;

export async function refreshFeatureFlags(userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('my_feature_flags', { p_user_id: userId });
  // Before the migration lands the RPC doesn't exist; keep whatever was remembered.
  if (error || !Array.isArray(data)) return getFeatureFlags(userId);
  try { localStorage.setItem(KEY(userId), JSON.stringify(data)); } catch { /* best-effort */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED_EVENT));
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

// The remembered value straight away (so a flag that's on works offline and
// doesn't flash the old screen), then whatever the next refresh brings.
export function useFeatureFlag(userId: string | null | undefined, flag: FeatureFlag): boolean {
  const [on, setOn] = useState(() => !!userId && typeof window !== 'undefined' && hasFeatureFlag(userId, flag));
  useEffect(() => {
    const read = () => setOn(!!userId && hasFeatureFlag(userId, flag));
    read();
    window.addEventListener(CHANGED_EVENT, read);
    return () => window.removeEventListener(CHANGED_EVENT, read);
  }, [userId, flag]);
  return on;
}
