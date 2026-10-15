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
  ItemBar, normalizeItemBar, isItemSlot, addTrash, tradeTrash, equipItem, clearSlot, trashCounts,
} from '@/lib/itemBar';
import {
  TRACKING_GOAL, fetchTrackingProgress, setActiveTracking, advanceTracking, summonTrackedCurio, trackedMonsterId,
} from '@/lib/curioTracking';
import { logWildEncounterEvent } from '@/lib/wildEncounterLog';

const pendingKey = (userId: string) => `lh_item_bar_unsaved_${userId}`;

function loadUnsaved(userId: string): ItemBar | null {
  try {
    const raw = localStorage.getItem(pendingKey(userId));
    return raw ? normalizeItemBar(JSON.parse(raw)) : null;
  } catch { return null; }
}
function setUnsaved(userId: string, bar: ItemBar | null) {
  try {
    if (bar) localStorage.setItem(pendingKey(userId), JSON.stringify(bar));
    else localStorage.removeItem(pendingKey(userId));
  } catch { /* storage blocked */ }
}

export interface UseItemBarArgs {
  userId: string;
  battleState: BattleState;
  inventory: InventoryMap;
  offline: boolean;
  regionId: string | null;
  onBattleStatePatch: (patch: Partial<BattleState>) => void;
  onTrackedCurioSummoned: (curio: PendingWildCurio) => void;
}

export function useItemBar({ userId, battleState, inventory, offline, regionId, onBattleStatePatch, onTrackedCurioSummoned }: UseItemBarArgs) {
  const [rawBar, setRawBar] = useState<ItemBar>(() => {
    const unsaved = !offline ? loadUnsaved(userId) : null;
    return unsaved ?? normalizeItemBar(battleState.item_bar);
  });
  // A bag item that ran out (used up somewhere else) leaves its slot.
  const bar = useMemo(
    () => rawBar.map(s => (isItemSlot(s) && !((inventory[s.item] ?? 0) > 0) ? null : s)),
    [rawBar, inventory],
  );
  const barRef = useRef(bar);
  useEffect(() => { barRef.current = bar; }, [bar]);

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
  const persist = useCallback((next: ItemBar) => {
    if (offline) {
      setUnsaved(userId, next);
      updateOfflineCopy<CurioCollection>(userId, 'curioCollection', c => ({
        ...c, battleState: c.battleState && { ...c.battleState, item_bar: next },
      }));
      return;
    }
    writeChain.current = writeChain.current.then(async () => {
      const { error } = await supabase.from('user_battle_state').update({ item_bar: barRef.current }).eq('user_id', userId);
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
      onBattleStatePatch({ item_bar: barRef.current });
      persist(barRef.current);
    }
  }, [offline, userId, persist, onBattleStatePatch]);

  const commit = useCallback((next: ItemBar) => {
    barRef.current = next;
    setRawBar(next);
    onBattleStatePatch({ item_bar: next });
    persist(next);
  }, [onBattleStatePatch, persist]);

  // ── Trash ─────────────────────────────────────────────────────────────────
  /** False when the slots are full (the trash stays on the map). */
  const pickUpTrash = useCallback((type: TrashType): boolean => {
    const next = addTrash(barRef.current, type);
    if (!next) return false;
    commit(next);
    return true;
  }, [commit]);

  const canPickUp = useCallback((type: TrashType) => addTrash(barRef.current, type) !== null, []);

  const tradeAllTrash = useCallback((): number => {
    const { bar: next, gold } = tradeTrash(barRef.current);
    if (gold > 0) commit(next);
    return gold;
  }, [commit]);

  const throwAway = useCallback((slot: number) => commit(clearSlot(barRef.current, slot)), [commit]);

  // ── Bag items ─────────────────────────────────────────────────────────────
  const equip = useCallback((key: string): boolean => {
    const next = equipItem(barRef.current, key);
    if (!next) return false;
    commit(next);
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
    const s = barRef.current[slot];
    if (isItemSlot(s) && trackedMonsterId(s.item) === activeTracking) void stopTracking();
    commit(clearSlot(barRef.current, slot));
  }, [commit, activeTracking, stopTracking]);

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
    trash: trashCounts(bar),
    activeTracking,
    progress,
    busy,
    pickUpTrash,
    canPickUp,
    tradeAllTrash,
    throwAway,
    equip,
    unequip,
    startTracking,
    stopTracking,
    onRightAnswer,
    summon,
  };
}

export type ItemBarApi = ReturnType<typeof useItemBar>;
