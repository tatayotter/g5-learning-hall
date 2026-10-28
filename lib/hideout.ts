// lib/hideout.ts
// Reads and writes for the Hideout (lib/hideoutConfig.ts). The account's copy lives in
// player_hideouts and player_hideout_plots and only changes through the hideout RPCs; a copy is
// kept on the device so the island shows straight away (and offline, read-only). Every RPC
// answers with the whole Hideout and the bag, so the screen just takes those.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { GardenBag } from '@/lib/gardenConfig';

export interface PlotState {
  item: string | null;
  plantedAt: number | null;
  readyAt: number | null;
  wateredAt: number | null;
  // A grown tree's wood: the last day (YYYY-MM-DD, Manila) it was collected.
  collectedOn: string | null;
}

export interface HideoutState {
  owned: boolean;
  treesPlanted: number;
  cropsHarvested: number;
  // Built plots only.
  plots: Record<string, PlotState>;
}

export const emptyHideout = (): HideoutState => ({ owned: false, treesPlanted: 0, cropsHarvested: 0, plots: {} });

const toMs = (v: string | null | undefined) => (v ? new Date(v).getTime() : null);

interface RawPlot { plot_id: string; item: string | null; planted_at: string | null; ready_at: string | null; watered_at: string | null; collected_on: string | null }

function fromRaw(raw: { owned?: boolean; trees_planted?: number; crops_harvested?: number; plots?: RawPlot[] } | null | undefined): HideoutState {
  if (!raw) return emptyHideout();
  const plots: Record<string, PlotState> = {};
  for (const p of raw.plots ?? []) {
    plots[p.plot_id] = { item: p.item, plantedAt: toMs(p.planted_at), readyAt: toMs(p.ready_at), wateredAt: toMs(p.watered_at), collectedOn: p.collected_on };
  }
  return { owned: !!raw.owned, treesPlanted: raw.trees_planted ?? 0, cropsHarvested: raw.crops_harvested ?? 0, plots };
}

function cleanBag(raw: unknown): GardenBag {
  const bag: GardenBag = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) bag[k] = Math.floor(n);
    }
  }
  return bag;
}

const LOCAL = (userId: string) => `lh_hideout_${userId}`;
const CHANGED_EVENT = 'lh-hideout-changed';

export function loadLocalHideout(userId: string): HideoutState {
  try {
    const raw = localStorage.getItem(LOCAL(userId));
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v === 'object' && v.plots) return v as HideoutState;
  } catch { /* storage blocked */ }
  return emptyHideout();
}

function saveLocal(userId: string, state: HideoutState) {
  try { localStorage.setItem(LOCAL(userId), JSON.stringify(state)); } catch { /* best-effort */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED_EVENT));
}

// The account's copy. Null when it couldn't be read (offline, or before the migration).
export async function fetchHideout(userId: string): Promise<HideoutState | null> {
  const [own, plots] = await Promise.all([
    supabase.from('player_hideouts').select('trees_planted, crops_harvested').eq('user_id', userId).maybeSingle(),
    supabase.from('player_hideout_plots').select('plot_id, item, planted_at, ready_at, watered_at, collected_on').eq('user_id', userId),
  ]);
  if (own.error || plots.error) return null;
  return fromRaw({
    owned: !!own.data,
    trees_planted: own.data?.trees_planted ?? 0,
    crops_harvested: own.data?.crops_harvested ?? 0,
    plots: (plots.data ?? []) as RawPlot[],
  });
}

export interface HideoutCall {
  // 'failed': no answer (no internet, or the server said no).
  status: string;
  hideout: HideoutState | null;
  bag: GardenBag | null;
  correct: boolean | null;
  correctAnswer: string | null;
  // Harvest results.
  veggies: number;
  seeds: number;
  wood: number;
  double: boolean;
  // Watering: every plot that got water.
  watered: string[];
  progress: { gold: number; xp: number; level: number } | null;
  // Building: what it takes, when the bag is short.
  need: Record<string, number> | null;
  replayed: boolean;
}

async function call(fn: string, args: Record<string, unknown>): Promise<HideoutCall> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error || !data) {
    if (error) console.error(`${fn} error:`, error);
    return { status: 'failed', hideout: null, bag: null, correct: null, correctAnswer: null, veggies: 0, seeds: 0, wood: 0, double: false, watered: [], progress: null, need: null, replayed: false };
  }
  return {
    status: data.status ?? (data.ok ? 'ok' : data.reason ?? 'failed'),
    hideout: data.hideout ? fromRaw(data.hideout) : null,
    bag: data.bag ? cleanBag(data.bag) : null,
    correct: data.correct ?? null,
    correctAnswer: data.correct_answer ?? null,
    veggies: data.veggies ?? 0,
    seeds: data.seeds ?? 0,
    wood: data.wood ?? 0,
    double: !!data.double,
    watered: Array.isArray(data.plots) ? data.plots : [],
    progress: data.progress ?? null,
    need: data.need ?? null,
    replayed: !!data.replayed,
  };
}

/** The Hideout: the device copy straight away, the account's once it loads, and the actions.
 *  onBag hears the bag after each action (the map's garden bag). */
export function useHideout(userId: string, { enabled, online, onBag }: { enabled: boolean; online: boolean; onBag: (bag: GardenBag) => void }) {
  const [state, setState] = useState<HideoutState>(() => (enabled && typeof window !== 'undefined' ? loadLocalHideout(userId) : emptyHideout()));
  const [loaded, setLoaded] = useState(false);
  const onBagRef = useRef(onBag);
  useEffect(() => { onBagRef.current = onBag; });
  const take = useCallback((res: HideoutCall) => {
    if (res.hideout) { setState(res.hideout); saveLocal(userId, res.hideout); }
    if (res.bag) onBagRef.current(res.bag);
    return res;
  }, [userId]);

  useEffect(() => {
    if (!enabled) return;
    const read = () => setState(loadLocalHideout(userId));
    window.addEventListener(CHANGED_EVENT, read);
    if (online) {
      void fetchHideout(userId).then(fresh => {
        if (fresh) { setState(fresh); saveLocal(userId, fresh); }
        setLoaded(true);
      });
    }
    return () => window.removeEventListener(CHANGED_EVENT, read);
  }, [enabled, online, userId]);

  const buy = useCallback(async () => take(await call('buy_hideout', { p_user_id: userId })), [userId, take]);
  const build = useCallback(async (plot: string) => take(await call('build_hideout_plot', { p_user_id: userId, p_plot: plot })), [userId, take]);
  const plant = useCallback(async (plot: string, item: string, questionId: string, selected: string) => take(await call('plant_hideout_plot', {
    p_user_id: userId, p_plot: plot, p_item: item, p_question_id: questionId, p_selected: selected, p_entry_id: crypto.randomUUID(),
  })), [userId, take]);
  const water = useCallback(async (plot: string, questionId: string, selected: string) => take(await call('water_hideout_plot', {
    p_user_id: userId, p_plot: plot, p_question_id: questionId, p_selected: selected, p_entry_id: crypto.randomUUID(),
  })), [userId, take]);
  const harvest = useCallback(async (plot: string) => take(await call('harvest_hideout_plot', { p_user_id: userId, p_plot: plot })), [userId, take]);

  return { state, loaded, buy, build, plant, water, harvest };
}

export type HideoutApi = ReturnType<typeof useHideout>;
