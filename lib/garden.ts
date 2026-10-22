// lib/garden.ts
// Reads and writes for the wild veggies (lib/gardenConfig.ts). The bag counts and plant timers
// live on the account (player_bag_items, player_gather_nodes) and only change through
// gather_wild_plant / sell_garden_items. A copy is kept on the device so the map can show
// them, and offline_play kids can keep picking, with no connection: offline picks are graded
// from the downloaded answer key, shown straight away and queued in the map outbox
// (lib/offlineMap.ts), and the server grades them again when they sync.
import { supabase } from '@/lib/supabase';
import { REGROW_MS, REST_MS, WRONG_LIMIT, veggieKey, type GardenBag, type VeggieId } from '@/lib/gardenConfig';

export interface PlantTimer {
  // Epoch ms; null = ripe.
  readyAt: number | null;
  restUntil: number | null;
  wrong: number;
}

export interface GardenState {
  bag: GardenBag;
  // Keyed `${region}:${nodeId}`.
  plants: Record<string, PlantTimer>;
}

export const plantKey = (region: string, nodeId: string) => `${region}:${nodeId}`;
export const emptyGarden = (): GardenState => ({ bag: {}, plants: {} });

const LOCAL = (userId: string) => `lh_garden_${userId}`;

export function loadLocalGarden(userId: string): GardenState {
  try {
    const raw = localStorage.getItem(LOCAL(userId));
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v === 'object' && v.bag && v.plants) return v as GardenState;
  } catch { /* storage blocked */ }
  return emptyGarden();
}

export function saveLocalGarden(userId: string, state: GardenState) {
  try { localStorage.setItem(LOCAL(userId), JSON.stringify(state)); } catch { /* best-effort */ }
}

const toMs = (v: string | null | undefined) => (v ? new Date(v).getTime() : null);

function cleanBag(raw: unknown): GardenBag {
  const bag: GardenBag = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n) && n > 0) bag[k] = Math.floor(n);
    }
  }
  return bag;
}

// The account's copy. Null when it couldn't be read (offline, or before the migration).
export async function fetchGarden(userId: string): Promise<GardenState | null> {
  const [bagRes, plantsRes] = await Promise.all([
    supabase.from('player_bag_items').select('item_key, quantity').eq('user_id', userId),
    supabase.from('player_gather_nodes').select('region, node_id, last_picked_at, wrong_streak, rest_until').eq('user_id', userId),
  ]);
  if (bagRes.error || plantsRes.error) return null;
  const bag = cleanBag(Object.fromEntries((bagRes.data ?? []).map(r => [r.item_key, r.quantity])));
  const plants: Record<string, PlantTimer> = {};
  for (const r of plantsRes.data ?? []) {
    const picked = toMs(r.last_picked_at);
    plants[plantKey(r.region, r.node_id)] = {
      readyAt: picked === null ? null : picked + REGROW_MS,
      restUntil: toMs(r.rest_until),
      wrong: r.wrong_streak ?? 0,
    };
  }
  return { bag, plants };
}

export type GatherStatus = 'picked' | 'wrong' | 'growing' | 'resting';

export interface GatherResult {
  status: GatherStatus;
  correct: boolean | null;
  correctAnswer: string | null;
  veggie: VeggieId;
  seeds: number;
  readyAt: number | null;
  restUntil: number | null;
  bag: GardenBag | null;
  replayed: boolean;
}

export type GatherCall = { ok: true; result: GatherResult } | { ok: false; network: boolean };

export async function gatherWildPlant(args: {
  userId: string; region: string; nodeId: string; questionId: string; selected: string;
  entryId: string; playedAt?: string | null;
}): Promise<GatherCall> {
  const { data, error } = await supabase.rpc('gather_wild_plant', {
    p_user_id: args.userId,
    p_region: args.region,
    p_node_id: args.nodeId,
    p_question_id: args.questionId,
    p_selected: args.selected,
    p_entry_id: args.entryId,
    p_played_at: args.playedAt ?? null,
  });
  if (error || !data) {
    if (error) console.error('gather_wild_plant error:', error);
    // No error code = the request never reached the database.
    return { ok: false, network: !error?.code };
  }
  return {
    ok: true,
    result: {
      status: data.status,
      correct: data.correct ?? null,
      correctAnswer: data.correct_answer ?? null,
      veggie: data.veggie,
      seeds: data.seeds ?? 0,
      readyAt: toMs(data.ready_at),
      restUntil: toMs(data.rest_until),
      bag: data.bag ? cleanBag(data.bag) : null,
      replayed: !!data.replayed,
    },
  };
}

export interface SoldVeggies {
  gold: number;
  bag: GardenBag;
  // The account's totals after the sale (already paid there).
  progress: { gold: number; xp: number; level: number } | null;
}

export async function sellGardenItems(userId: string, items: GardenBag | null): Promise<SoldVeggies | null> {
  const { data, error } = await supabase.rpc('sell_garden_items', { p_user_id: userId, p_items: items });
  if (error || !data) {
    console.error('sell_garden_items error:', error);
    return null;
  }
  return { gold: data.gold ?? 0, bag: cleanBag(data.bag), progress: data.progress ?? null };
}

// What a pick does to the device copy: the same rules gather_wild_plant applies, minus the
// seed roll (an offline pick's seed packet shows up once it syncs).
export function applyLocalPick(state: GardenState, region: string, nodeId: string, veggie: VeggieId, correct: boolean, now: number): GardenState {
  const key = plantKey(region, nodeId);
  const prev = state.plants[key] ?? { readyAt: null, restUntil: null, wrong: 0 };
  if (correct) {
    const vk = veggieKey(veggie);
    return {
      bag: { ...state.bag, [vk]: (state.bag[vk] ?? 0) + 1 },
      plants: { ...state.plants, [key]: { readyAt: now + REGROW_MS, restUntil: null, wrong: 0 } },
    };
  }
  const wrong = prev.wrong + 1;
  const next: PlantTimer = wrong >= WRONG_LIMIT
    ? { ...prev, wrong: 0, restUntil: now + REST_MS }
    : { ...prev, wrong };
  return { ...state, plants: { ...state.plants, [key]: next } };
}
