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
  REGROW_MS, REST_MS, WOOD_PER_TREE, woodKey, WRONG_LIMIT, saplingKey, veggieKey,
  type GardenBag, type TreeId, type VeggieId,
} from '@/lib/gardenConfig';
import { alwaysSaplingFor, chopSwingsFor, dailyTreeLimitFor } from '@/lib/gearConfig';

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

// Trees come with the day's map (lib/mapNature.ts), so their ids start with the day:
// "2026-10-23:12_7". A chopped tree stays a stump until that day is over.
const TREE_ID = /^(\d{4}-\d{2}-\d{2}):\d+_\d+$/;
export const treeDayOf = (nodeId: string) => TREE_ID.exec(nodeId)?.[1] ?? null;
// Midnight in the Philippines at the end of that day, in epoch ms.
export const endOfTreeDay = (day: string) => Date.parse(`${day}T00:00:00+08:00`) + 24 * 3600_000;

/** Trees this kid has chopped down on `day` (from the device copy). */
export function treesFelledOn(state: GardenState, day: string): number {
  let n = 0;
  for (const [key, t] of Object.entries(state.plants)) {
    const nodeId = key.slice(key.indexOf(':') + 1);
    if (treeDayOf(nodeId) === day && t.readyAt !== null) n++;
  }
  return n;
}

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
  if (bagRes.error || plantsRes.error) return null;
  const bag = cleanBag(Object.fromEntries((bagRes.data ?? []).map(r => [r.item_key, r.quantity])));
  const plants: Record<string, PlantTimer> = {};
  for (const r of plantsRes.data ?? []) {
    const picked = toMs(r.last_picked_at);
    const key = plantKey(r.region, r.node_id);
    const day = treeDayOf(r.node_id);
    const tree = day !== null;
    // Trees from days gone by are long gone from the map.
    if (tree && endOfTreeDay(day) < Date.now() - 24 * 3600_000) continue;
    plants[key] = {
      readyAt: picked === null ? null : tree ? endOfTreeDay(day) : picked + REGROW_MS,
      restUntil: toMs(r.rest_until),
      wrong: r.wrong_streak ?? 0,
      ...(tree ? { hits: r.hits ?? 0, misses: r.chop_misses ?? 0 } : {}),
    };
  }
  return { bag, plants };
}

// 'no_tool': a find whose tool (pickaxe, shovel) the kid doesn't own; nothing was graded.
export type GatherStatus = 'picked' | 'wrong' | 'growing' | 'resting' | 'no_tool';

export interface GatherResult {
  status: GatherStatus;
  correct: boolean | null;
  correctAnswer: string | null;
  veggie: VeggieId;
  // How many went into the bag (a Bronze tool and up sometimes finds 2).
  count: number;
  seeds: number;
  // A rare find's bag key (find_gem, find_coin), when one turned up.
  rare: string | null;
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
      count: data.count ?? (data.status === 'picked' ? 1 : 0),
      seeds: data.seeds ?? 0,
      rare: data.rare ?? null,
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
// rolls (an offline pick's seed packet, second find or rare find shows up once it syncs).
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

// 'stump': already chopped today. 'tired': the day's trees (dailyTreeLimitFor) are chopped.
// 'no_tool': no axe; nothing was graded.
export type ChopStatus = 'hit' | 'felled' | 'wrong' | 'stump' | 'resting' | 'tired' | 'no_tool';

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
  userId: string; region: string; nodeId: string; tree: TreeId; questionId: string; selected: string;
  entryId: string; playedAt?: string | null;
}): Promise<ChopCall> {
  const { data, error } = await supabase.rpc('chop_wild_tree', {
    p_user_id: args.userId,
    p_region: args.region,
    p_node_id: args.nodeId,
    p_tree: args.tree,
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
      // A chopped tree stays a stump until its day is over.
      readyAt: data.status === 'felled' || data.status === 'stump' ? endOfTreeDay(treeDayOf(args.nodeId) ?? '') : null,
      restUntil: toMs(data.rest_until),
      bag: data.bag ? cleanBag(data.bag) : null,
      replayed: !!data.replayed,
    },
  };
}

// What a swing does to the device copy: the same rules chop_wild_tree applies for the kid's axe.
// A sapling that's certain (a clean chop, or a Silver Axe) shows straight away; the 50% roll for
// the others and a Gold Axe's double wood wait for sync.
export function applyLocalChop(state: GardenState, region: string, nodeId: string, tree: TreeId, correct: boolean, now: number, axeTier: number): { state: GardenState; result: Pick<ChopResult, 'status' | 'hits' | 'clean' | 'wood' | 'saplings' | 'restUntil'> } {
  const swings = chopSwingsFor(axeTier);
  const key = plantKey(region, nodeId);
  const prev = state.plants[key] ?? { readyAt: null, restUntil: null, wrong: 0, hits: 0, misses: 0 };
  const hits = prev.hits ?? 0;
  const misses = prev.misses ?? 0;
  const day = treeDayOf(nodeId);
  if (axeTier <= 0) {
    return { state, result: { status: 'no_tool', hits, clean: false, wood: 0, saplings: 0, restUntil: null } };
  }
  if (day && treesFelledOn(state, day) >= dailyTreeLimitFor(axeTier)) {
    return { state, result: { status: 'tired', hits, clean: false, wood: 0, saplings: 0, restUntil: null } };
  }
  if (correct && hits + 1 >= swings) {
    const clean = misses === 0;
    const sapling = clean || alwaysSaplingFor(axeTier);
    const bag: GardenBag = { ...state.bag, [woodKey(tree)]: (state.bag[woodKey(tree)] ?? 0) + WOOD_PER_TREE };
    if (sapling) bag[saplingKey(tree)] = (bag[saplingKey(tree)] ?? 0) + 1;
    return {
      state: { bag, plants: { ...state.plants, [key]: { readyAt: day ? endOfTreeDay(day) : now, restUntil: null, wrong: 0, hits: 0, misses: 0 } } },
      result: { status: 'felled', hits: swings, clean, wood: WOOD_PER_TREE, saplings: sapling ? 1 : 0, restUntil: null },
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
