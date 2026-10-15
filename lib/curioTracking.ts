// lib/curioTracking.ts
// Tracking Scrolls: one shop item per first-form curio (starters and
// non-legendary wild curios; no legendaries, guild or event curios). The
// player puts one in a map item slot and taps it to start tracking; every
// right map-scroll answer fills its catch meter, and at TRACKING_GOAL the
// player summons the curio beside them and battles it like a wild curio. A
// summoned curio never runs away (it cost a lot of gold).
// Server side (migration 20261015070000_curio_tracking_scrolls): costs in
// shop_items, meters in curio_tracking, and set_active_tracking /
// advance_tracking / summon_tracked_curio do every write.
import { supabase } from '@/lib/supabase';
import { MONSTERS, WILD_MONSTERS, type MonsterDef } from '@/lib/monsterConfig';
import type { PendingWildCurio } from '@/components/monster/types';

export const TRACKING_GOAL = 30;
// Display only; the real price is shop_items.cost.
export const TRACKING_SCROLL_COST = 5000;

const PREFIX = 'tracking_scroll_';

export const TRACKABLE_CURIOS: MonsterDef[] = [
  ...Object.values(MONSTERS),
  ...Object.values(WILD_MONSTERS).filter(m => !m.isLegendary),
];
const TRACKABLE_IDS = new Set(TRACKABLE_CURIOS.map(m => m.id));

export const isTrackable = (monsterId: string) => TRACKABLE_IDS.has(monsterId);
export const trackingScrollKey = (monsterId: string) => `${PREFIX}${monsterId}`;
export function trackedMonsterId(itemKey: string): string | null {
  if (!itemKey.startsWith(PREFIX)) return null;
  const id = itemKey.slice(PREFIX.length);
  return TRACKABLE_IDS.has(id) ? id : null;
}
export const trackingScrollName = (def: MonsterDef) => `Tracking Scroll: ${def.name}`;

// species id -> meter progress, for every scroll the player has started.
export async function fetchTrackingProgress(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('curio_tracking').select('monster_id, progress').eq('user_id', userId);
  if (error) { console.warn('tracking progress load failed:', error.message); return {}; }
  return Object.fromEntries((data ?? []).map(r => [r.monster_id as string, r.progress as number]));
}

export async function setActiveTracking(userId: string, monsterId: string | null): Promise<{ monsterId: string | null; progress: number } | null> {
  const { data, error } = await supabase.rpc('set_active_tracking', { p_user_id: userId, p_monster_id: monsterId });
  if (error) { console.warn('set_active_tracking failed:', error.message); return null; }
  return { monsterId: data?.monster_id ?? null, progress: data?.progress ?? 0 };
}

export async function advanceTracking(userId: string, questionId: string): Promise<{ monsterId: string | null; progress: number } | null> {
  const { data, error } = await supabase.rpc('advance_tracking', { p_user_id: userId, p_question_id: questionId });
  if (error) { console.warn('advance_tracking failed:', error.message); return null; }
  return { monsterId: data?.monster_id ?? null, progress: data?.progress ?? 0 };
}

export async function summonTrackedCurio(userId: string, region: string | null): Promise<{ curio: PendingWildCurio } | { error: string }> {
  const { data, error } = await supabase.rpc('summon_tracked_curio', { p_user_id: userId, p_region: region });
  if (error || !data) return { error: error?.message ?? 'summon failed' };
  return { curio: data as PendingWildCurio };
}

// Species the player already has (team, bench or Catch Inbox).
export async function fetchOwnedSpecies(userId: string): Promise<Set<string>> {
  const [{ data: mons }, { data: caught }] = await Promise.all([
    supabase.from('user_monsters').select('monster_id').eq('user_id', userId),
    supabase.from('user_caught_monsters').select('monster_id').eq('user_id', userId),
  ]);
  return new Set([...(mons ?? []), ...(caught ?? [])].map(r => r.monster_id as string));
}
