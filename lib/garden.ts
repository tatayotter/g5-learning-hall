// lib/garden.ts
// Reads and writes for the wild veggies and trees (lib/gardenConfig.ts). The bag counts and
// plant/tree timers live on the account (player_bag_items, player_gather_nodes) and only
// change through gather_wild_plant / chop_wild_tree / sell_garden_items. A copy is kept on the
// device so the map can show them, and offline_play kids can keep picking and chopping with
// no connection: offline answers are graded from the downloaded answer key, shown straight
// away and queued in the map outbox (lib/offlineMap.ts), and the server grades them again
// when they sync.
import { supabase } from '@/lib/supabase';
import {
  CHOP_SWINGS, REGROW_MS, REST_MS, TREE_REGROW_MS, WILD_TREES, WOOD_KEY, WOOD_PER_TREE, WRONG_LIMIT, saplingKey, veggieKey,
  type GardenBag, type TreeId, type VeggieId,
} from '@/lib/gardenConfig';

export interface PlantTimer {
  // Epoch ms; null = ripe.
  readyAt: number | null;
  restUntil: number | null;
  wrong: number;
  // Trees only: swings landed so far, and misses in this chop (a clean chop has none).
  hits?: number;
  misses?: number;
}

export interface GardenState {
  bag: GardenBag;
  // Keyed `${region}:${nodeId}`.
  plants: Record<string, PlantTimer>;
}

export const plantKey = (region: string, nodeId: string) => `${region}:${nodeId}`;
// Every tree's plant key, by region.
const WILD_TREE_IDS = Object.fromEntries(Object.entries(WILD_TREES).map(([r, ts]) => [r, ts.map(t => `${r}:${t.id}`)]));

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
    // Every column, so the veggies still load on a database without the tree columns yet.
    supabase.from('player_gather_nodes').select('*').eq('user_id', userId),
  ]);
  const trees = new Set(Object.values(WILD_TREE_IDS).flat());
  if (bagRes.error || plantsRes.error) return null;
  const bag = cleanBag(Object.fromEntries((bagRes.data ?? []).map(r => [r.item_key, r.quantity])));
  const plants: Record<string, PlantTimer> = {};
  for (const r of plantsRes.data ?? []) {
    const picked = toMs(r.last_picked_at);
    const key = plantKey(r.region, r.node_id);
    const tree = trees.has(key);
    plants[key] = {
      readyAt: picked === null ? null : picked + (tree ? TREE_REGROW_MS : REGROW_MS),
      restUntil: toMs(r.rest_until),
      wrong: r.wrong_streak ?? 0,
      ...(tree ? { hits: r.hits ?? 0, misses: r.chop_misses ?? 0 } : {}),
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

export type ChopStatus = 'hit' | 'felled' | 'wrong' | 'growing' | 'resting';

export interface ChopResult {
  status: ChopStatus;
  correct: boolean | null;
  correctAnswer: string | null;
  tree: TreeId;
  hits: number;
  clean: boolean;
  wood: number;
  saplings: number;
  readyAt: number | null;
  restUntil: number | null;
  bag: GardenBag | null;
  replayed: boolean;
}

export type ChopCall = { ok: true; result: ChopResult } | { ok: false; network: boolean };

export async function chopWildTree(args: {
  userId: string; region: string; nodeId: string; questionId: string; selected: string;
  entryId: string; playedAt?: string | null;
}): Promise<ChopCall> {
  const { data, error } = await supabase.rpc('chop_wild_tree', {
    p_user_id: args.userId,
    p_region: args.region,
    p_node_id: args.nodeId,
    p_question_id: args.questionId,
    p_selected: args.selected,
    p_entry_id: args.entryId,
    p_played_at: args.playedAt ?? null,
  });
  if (error || !data) {
    if (error) console.error('chop_wild_tree error:', error);
    return { ok: false, network: !error?.code };
  }
  return {
    ok: true,
    result: {
      status: data.status,
      correct: data.correct ?? null,
      correctAnswer: data.correct_answer ?? null,
      tree: data.tree,
      hits: data.hits ?? 0,
      clean: !!data.clean,
      wood: data.wood ?? 0,
      saplings: data.saplings ?? 0,
      readyAt: toMs(data.ready_at),
      restUntil: toMs(data.rest_until),
      bag: data.bag ? cleanBag(data.bag) : null,
      replayed: !!data.replayed,
    },
  };
}

// What a swing does to the device copy: the same rules chop_wild_tree applies. A clean chop's
// sapling is certain, so it shows straight away; the 50% roll for the others waits for sync.
export function applyLocalChop(state: GardenState, region: string, nodeId: string, tree: TreeId, correct: boolean, now: number): { state: GardenState; result: Pick<ChopResult, 'status' | 'hits' | 'clean' | 'wood' | 'saplings' | 'restUntil'> } {
  const key = plantKey(region, nodeId);
  const prev = state.plants[key] ?? { readyAt: null, restUntil: null, wrong: 0, hits: 0, misses: 0 };
  const hits = prev.hits ?? 0;
  const misses = prev.misses ?? 0;
  if (correct && hits + 1 >= CHOP_SWINGS) {
    const clean = misses === 0;
    const bag: GardenBag = { ...state.bag, [WOOD_KEY]: (state.bag[WOOD_KEY] ?? 0) + WOOD_PER_TREE };
    if (clean) bag[saplingKey(tree)] = (bag[saplingKey(tree)] ?? 0) + 1;
    return {
      state: { bag, plants: { ...state.plants, [key]: { readyAt: now + TREE_REGROW_MS, restUntil: null, wrong: 0, hits: 0, misses: 0 } } },
      result: { status: 'felled', hits: CHOP_SWINGS, clean, wood: WOOD_PER_TREE, saplings: clean ? 1 : 0, restUntil: null },
    };
  }
  if (correct) {
    return {
      state: { ...state, plants: { ...state.plants, [key]: { ...prev, wrong: 0, hits: hits + 1, misses } } },
      result: { status: 'hit', hits: hits + 1, clean: false, wood: 0, saplings: 0, restUntil: null },
    };
  }
  const wrong = prev.wrong + 1;
  const restUntil = wrong >= WRONG_LIMIT ? now + REST_MS : null;
  const next: PlantTimer = { ...prev, hits, misses: misses + 1, wrong: restUntil ? 0 : wrong, restUntil: restUntil ?? prev.restUntil };
  return {
    state: { ...state, plants: { ...state.plants, [key]: next } },
    result: { status: 'wrong', hits, clean: false, wood: 0, saplings: 0, restUntil },
  };
}
