// lib/gear.ts
// The tools and bag upgrades a kid owns (lib/gearConfig.ts). The account's copy is
// player_gear, written only by buy_gear(); it's remembered on the device (like feature flags)
// so the map knows the kid's axe offline too, and every screen showing gear hears about a
// purchase straight away.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GEAR_ORDER, type GearId, type GearTiers } from '@/lib/gearConfig';

const CHANGED_EVENT = 'lh-gear-changed';
const KEY = (userId: string) => `lh_gear_${userId}`;

function clean(raw: unknown): GearTiers {
  const out: GearTiers = {};
  if (raw && typeof raw === 'object') {
    for (const g of GEAR_ORDER) {
      const n = Number((raw as Record<string, unknown>)[g]);
      if (Number.isFinite(n) && n > 0) out[g] = Math.floor(n);
    }
  }
  return out;
}

export function getGear(userId: string): GearTiers {
  try {
    const raw = localStorage.getItem(KEY(userId));
    return raw ? clean(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function remember(userId: string, gear: GearTiers) {
  try { localStorage.setItem(KEY(userId), JSON.stringify(gear)); } catch { /* best-effort */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED_EVENT));
}

// The account's copy; keeps the remembered one when it can't be read (offline, or before the
// migration).
export async function refreshGear(userId: string): Promise<GearTiers> {
  const { data, error } = await supabase.from('player_gear').select('gear, tier').eq('user_id', userId);
  if (error || !data) return getGear(userId);
  const gear = clean(Object.fromEntries(data.map(r => [r.gear, r.tier])));
  remember(userId, gear);
  return gear;
}

export type BuyGearResult =
  | { ok: true; gear: GearId; tier: number; cost: number; gold: number | null }
  | { ok: false; reason: 'max' | 'not_for_sale' | 'gold' | 'failed' };

export async function buyGear(userId: string, gear: GearId): Promise<BuyGearResult> {
  const { data, error } = await supabase.rpc('buy_gear', { p_user_id: userId, p_gear: gear });
  if (error || !data) {
    if (error) console.error('buy_gear error:', error);
    return { ok: false, reason: 'failed' };
  }
  if (!data.ok) return { ok: false, reason: data.reason ?? 'failed' };
  remember(userId, { ...getGear(userId), [gear]: data.tier });
  return { ok: true, gear, tier: data.tier, cost: data.cost, gold: data.progress?.gold ?? null };
}

// The remembered gear straight away, then the account's copy once it loads (online).
export function useGear(userId: string | null | undefined, { fetch = true }: { fetch?: boolean } = {}) {
  const [gear, setGear] = useState<GearTiers>(() => (userId && typeof window !== 'undefined' ? getGear(userId) : {}));
  useEffect(() => {
    if (!userId) return;
    const read = () => setGear(getGear(userId));
    read();
    window.addEventListener(CHANGED_EVENT, read);
    if (fetch) void refreshGear(userId);
    return () => window.removeEventListener(CHANGED_EVENT, read);
  }, [userId, fetch]);
  const buy = useCallback((g: GearId) => (userId ? buyGear(userId, g) : Promise.resolve({ ok: false, reason: 'failed' } as BuyGearResult)), [userId]);
  return { gear, buy };
}
