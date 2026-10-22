// hooks/useItemBar.ts
// State and actions for the Training Map's 4 item slots (lib/itemBar.ts) and
// the Tracking Scroll in them (lib/curioTracking.ts). TrainingMap remounts per
// region, so everything that must outlive a map change is pushed up to
// MonsterGuild's battleState (onBattleStatePatch) and saved to
// user_battle_state.item_bar.
//
// Offline (offline_play players), slot changes are kept on the device and
// written to the account the next time the map opens with internet.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { updateOfflineCopy } from '@/lib/offlineReads';
import type { CurioCollection } from '@/lib/curioCollection';
import type { InventoryMap } from '@/lib/inventory';
import type { BattleState, PendingWildCurio } from '@/components/monster/types';
import type { TrashType } from '@/lib/trashConfig';
import {
  ItemBar, ItemSlot, TrashCounts, normalizeItemBar, isItemSlot, addTrash, tradeTrash, equip as equipInBar, clearSlot,
  placeAt as placeInBar, swapSlots, dropMissing, bagSquaresUsed, BAG_SIZE,
} from '@/lib/itemBar';
import {
  TRACKING_GOAL, fetchTrackingProgress, setActiveTracking, advanceTracking, summonTrackedCurio, trackedMonsterId,
} from '@/lib/curioTracking';
import { logWildEncounterEvent } from '@/lib/wildEncounterLog';

const pendingKey = (userId: string) => `lh_item_bar_unsaved_${userId}`;

type Saved = { bar: ItemBar; trash: TrashCounts };

function loadUnsaved(userId: string): Saved | null {
  try {
    const raw = localStorage.getItem(pendingKey(userId));
    if (!raw) return null;
    const v = JSON.parse(raw);
    return normalizeItemBar(v?.bar ?? v, v?.trash);
  } catch { return null; }
}
function setUnsaved(userId: string, saved: Saved | null) {
  try {
    if (saved) localStorage.setItem(pendingKey(userId), JSON.stringify(saved));
    else localStorage.removeItem(pendingKey(userId));
  } catch { /* storage blocked */ }
}

// Bag items: every Tracking Scroll the player holds (one square each).
export const bagItemKeys = (inventory: InventoryMap) =>
  Object.entries(inventory).filter(([k, q]) => (q ?? 0) > 0 && trackedMonsterId(k)).map(([k]) => k).sort();

export interface UseItemBarArgs {
  userId: string;
  battleState: BattleState;
  inventory: InventoryMap;
  offline: boolean;
  regionId: string | null;
  onBattleStatePatch: (patch: Partial<BattleState>) => void;
  onTrackedCurioSummoned: (curio: PendingWildCurio) => void;
  // Bag squares the garden's veggies and seed packets take (hooks/useGarden.ts).
  gardenSquares?: number;
}

export function useItemBar({ userId, battleState, inventory, offline, regionId, onBattleStatePatch, onTrackedCurioSummoned, gardenSquares = 0 }: UseItemBarArgs) {
  const [saved, setSaved] = useState<Saved>(() => {
    const unsaved = !offline ? loadUnsaved(userId) : null;
    return unsaved ?? normalizeItemBar(battleState.item_bar, battleState.bag_trash);
  });
  const trash = saved.trash;
  // A bag item that ran out (used up somewhere else) leaves its slot.
  const bar = useMemo(() => dropMissing(saved.bar, inventory, saved.trash), [saved, inventory]);
  const itemKeys = useMemo(() => bagItemKeys(inventory), [inventory]);
  const stateRef = useRef<Saved>({ bar, trash });
  useEffect(() => { stateRef.current = { bar, trash }; }, [bar, trash]);
  const itemKeysRef = useRef(itemKeys);
  useEffect(() => { itemKeysRef.current = itemKeys; }, [itemKeys]);
  const gardenRef = useRef(gardenSquares);
  useEffect(() => { gardenRef.current = gardenSquares; }, [gardenSquares]);

  const [activeTracking, setActiveTrackingId] = useState<string | null>(battleState.active_tracking ?? null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (offline) return;
    let cancelled = false;
    fetchTrackingProgress(userId).then(p => { if (!cancelled) setProgress(p); });
    return () => { cancelled = true; };
  }, [userId, offline]);

  // Writes go out one at a time and always carry the newest bar, so a slow
  // earlier write can never land after (and undo) a later one.
  const writeChain = useRef<Promise<unknown>>(Promise.resolve());
  const persist = useCallback((next: Saved) => {
    if (offline) {
      setUnsaved(userId, next);
      updateOfflineCopy<CurioCollection>(userId, 'curioCollection', c => ({
        ...c, battleState: c.battleState && { ...c.battleState, item_bar: next.bar, bag_trash: next.trash },
      }));
      return;
    }
    writeChain.current = writeChain.current.then(async () => {
      const { bar: b, trash: t } = stateRef.current;
      const { error } = await supabase.from('user_battle_state').update({ item_bar: b, bag_trash: t }).eq('user_id', userId);
      if (error) console.warn('item bar save failed:', error.message);
      else setUnsaved(userId, null);
    });
  }, [offline, userId]);

  // Offline changes made earlier: save them now that there's internet.
  const flushedRef = useRef(false);
  useEffect(() => {
    if (offline || flushedRef.current) return;
    flushedRef.current = true;
    if (loadUnsaved(userId)) {
      onBattleStatePatch({ item_bar: stateRef.current.bar, bag_trash: stateRef.current.trash });
      persist(stateRef.current);
    }
  }, [offline, userId, persist, onBattleStatePatch]);

  const commit = useCallback((next: Saved) => {
    // Trash that's all gone leaves its slot.
    const clean = { bar: dropMissing(next.bar, Object.fromEntries(itemKeysRef.current.map(k => [k, 1])), next.trash), trash: next.trash };
    stateRef.current = clean;
    setSaved(clean);
    onBattleStatePatch({ item_bar: clean.bar, bag_trash: clean.trash });
    persist(clean);
  }, [onBattleStatePatch, persist]);

  // ── Trash ─────────────────────────────────────────────────────────────────
  /** False when the bag is full (the trash stays on the map). */
  const pickUpTrash = useCallback((type: TrashType): boolean => {
    const next = addTrash(stateRef.current.trash, type, itemKeysRef.current, gardenRef.current);
    if (!next) return false;
    commit({ bar: stateRef.current.bar, trash: next });
    return true;
  }, [commit]);

  const canPickUp = useCallback((type: TrashType) => addTrash(stateRef.current.trash, type, itemKeysRef.current, gardenRef.current) !== null, []);

  const tradeAllTrash = useCallback((): number => {
    const { trash: next, gold } = tradeTrash(stateRef.current.trash);
    if (gold > 0) commit({ bar: stateRef.current.bar, trash: next });
    return gold;
  }, [commit]);

  /** Throws away every piece of one kind of trash. */
  const throwAway = useCallback((type: TrashType) => {
    commit({ bar: stateRef.current.bar, trash: { ...stateRef.current.trash, [type]: 0 } });
  }, [commit]);

  // ── Slots ─────────────────────────────────────────────────────────────────
  const equip = useCallback((thing: Exclude<ItemSlot, null>): boolean => {
    const next = equipInBar(stateRef.current.bar, thing);
    if (!next) return false;
    commit({ bar: next, trash: stateRef.current.trash });
    return true;
  }, [commit]);

  // ── Tracking ──────────────────────────────────────────────────────────────
  const startTracking = useCallback(async (monsterId: string): Promise<boolean> => {
    if (offline || busy) return false;
    setBusy(true);
    const res = await setActiveTracking(userId, monsterId);
    setBusy(false);
    if (!res) return false;
    setActiveTrackingId(res.monsterId);
    setProgress(p => ({ ...p, [monsterId]: res.progress }));
    onBattleStatePatch({ active_tracking: res.monsterId });
    logWildEncounterEvent(userId, 'tracking_started', { region: regionId, monsterId });
    return true;
  }, [offline, busy, userId, regionId, onBattleStatePatch]);

  const stopTracking = useCallback(async () => {
    if (offline) return;
    setActiveTrackingId(null);
    onBattleStatePatch({ active_tracking: null });
    await setActiveTracking(userId, null);
  }, [offline, userId, onBattleStatePatch]);

  // Putting the active scroll back in the bag stops tracking (its meter keeps its progress).
  const unequip = useCallback((slot: number) => {
    const s = stateRef.current.bar[slot];
    if (isItemSlot(s) && trackedMonsterId(s.item) === activeTracking) void stopTracking();
    commit({ bar: clearSlot(stateRef.current.bar, slot), trash: stateRef.current.trash });
  }, [commit, activeTracking, stopTracking]);

  // Puts a bag thing into a chosen slot (moving it, or pushing out what was there).
  const placeAt = useCallback((thing: Exclude<ItemSlot, null>, slot: number) => {
    const out = stateRef.current.bar[slot];
    if (isItemSlot(out) && trackedMonsterId(out.item) === activeTracking && !(isItemSlot(thing) && thing.item === out.item)) void stopTracking();
    commit({ bar: placeInBar(stateRef.current.bar, thing, slot), trash: stateRef.current.trash });
  }, [commit, activeTracking, stopTracking]);

  const swap = useCallback((a: number, b: number) => {
    if (a === b) return;
    commit({ bar: swapSlots(stateRef.current.bar, a, b), trash: stateRef.current.trash });
  }, [commit]);

  /** A right map-scroll answer. Returns the new progress when it counted. */
  const onRightAnswer = useCallback(async (questionId: string): Promise<{ monsterId: string; progress: number; filled: boolean } | null> => {
    if (offline || !activeTracking) return null;
    const before = progress[activeTracking] ?? 0;
    if (before >= TRACKING_GOAL) return null;
    const res = await advanceTracking(userId, questionId);
    if (!res || !res.monsterId) return null;
    setProgress(p => ({ ...p, [res.monsterId!]: res.progress }));
    if (res.progress === before) return null;
    return { monsterId: res.monsterId, progress: res.progress, filled: res.progress >= TRACKING_GOAL };
  }, [offline, activeTracking, progress, userId]);

  const summon = useCallback(async (): Promise<{ ok: true } | { ok: false; reason: 'curio_waiting' | 'failed' }> => {
    if (offline || !activeTracking || busy) return { ok: false, reason: 'failed' };
    if (battleState.pending_wild_curio) return { ok: false, reason: 'curio_waiting' };
    setBusy(true);
    const res = await summonTrackedCurio(userId, regionId);
    setBusy(false);
    if ('error' in res) {
      return { ok: false, reason: res.error.includes('already waiting') ? 'curio_waiting' : 'failed' };
    }
    const monsterId = activeTracking;
    setActiveTrackingId(null);
    setProgress(p => { const n = { ...p }; delete n[monsterId]; return n; });
    onBattleStatePatch({ active_tracking: null, pending_wild_curio: res.curio });
    logWildEncounterEvent(userId, 'tracking_summoned', { region: regionId, monsterId, quality: res.curio.quality, level: res.curio.level });
    onTrackedCurioSummoned(res.curio);
    return { ok: true };
  }, [offline, activeTracking, busy, battleState.pending_wild_curio, userId, regionId, onBattleStatePatch, onTrackedCurioSummoned]);

  return {
    bar,
    trash,
    itemKeys,
    bagUsed: bagSquaresUsed(itemKeys, trash, gardenSquares),
    bagSize: BAG_SIZE,
    activeTracking,
    progress,
    busy,
    pickUpTrash,
    canPickUp,
    tradeAllTrash,
    throwAway,
    equip,
    unequip,
    placeAt,
    swap,
    startTracking,
    stopTracking,
    onRightAnswer,
    summon,
  };
}

export type ItemBarApi = ReturnType<typeof useItemBar>;
