// hooks/useGarden.ts
// The wild veggies on the Training Map (lib/gardenConfig.ts, lib/garden.ts): the bag's
// veggie and seed counts, each plant's regrow timer, picking (one question) and selling.
// Off unless the 'garden' switch is on for the player and the map has plants.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BattleQuestion } from '@/components/battle/shared';
import {
  WILD_PLANTS, VEGGIES, GARDEN_STACK, gardenSquares, plantStage, veggieKey, type GardenBag, type WildPlantNode,
} from '@/lib/gardenConfig';
import {
  applyLocalPick, emptyGarden, fetchGarden, gatherWildPlant, loadLocalGarden, plantKey, saveLocalGarden, sellGardenItems,
  type GardenState, type GatherResult, type SoldVeggies,
} from '@/lib/garden';
import { flushMapOutbox, gradeScrollOffline, pendingMapEntries, queueGather } from '@/lib/offlineMap';
import type { PlantSprite } from '@/lib/phaserMap/gardenPlants';

export interface UseGardenArgs {
  userId: string;
  regionId: string;
  enabled: boolean;
  // Playing from the device (lib/offlineMap.ts playingMapOffline).
  offlineMap: boolean;
}

export type PlantView = WildPlantNode & { readyAt: number | null; restUntil: number | null; ripe: boolean };

export function useGarden({ userId, regionId, enabled, offlineMap }: UseGardenArgs) {
  const nodes = useMemo(() => (enabled ? WILD_PLANTS[regionId] ?? [] : []), [enabled, regionId]);
  const on = nodes.length > 0;
  const [state, setState] = useState<GardenState>(() => (on && typeof window !== 'undefined' ? loadLocalGarden(userId) : emptyGarden()));
  const stateRef = useRef(state);
  const update = useCallback((next: GardenState) => {
    stateRef.current = next;
    setState(next);
    saveLocalGarden(userId, next);
  }, [userId]);

  // The account's copy, once picks made offline have gone in first.
  useEffect(() => {
    if (!on || offlineMap) return;
    let cancelled = false;
    (async () => {
      if (pendingMapEntries(userId).some(e => e.kind === 'gather')) await flushMapOutbox(userId);
      const fresh = await fetchGarden(userId);
      if (!cancelled && fresh) update(fresh);
    })();
    return () => { cancelled = true; };
  }, [on, offlineMap, userId, update]);

  // Plants change look as they regrow; a slow tick is plenty.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, [on]);

  const plants: PlantView[] = useMemo(() => nodes.map(n => {
    const timer = state.plants[plantKey(regionId, n.id)];
    const readyAt = timer?.readyAt ?? null;
    const restUntil = timer?.restUntil ?? null;
    return { ...n, readyAt, restUntil, ripe: readyAt === null || now >= readyAt };
  }), [nodes, state.plants, regionId, now]);

  const sprites: PlantSprite[] = useMemo(() => plants.map(p => ({
    id: p.id, veggie: p.veggie, x: p.x, y: p.y, tall: VEGGIES[p.veggie].tall, stage: plantStage(p.readyAt, now),
  })), [plants, now]);

  const plantAt = useCallback((x: number, y: number) => plants.find(p => p.x === x && p.y === y) ?? null, [plants]);

  // Squares one more of this veggie needs (0 when its stack has room).
  const squaresForPick = useCallback((veggie: PlantView['veggie']) => ((stateRef.current.bag[veggieKey(veggie)] ?? 0) % GARDEN_STACK === 0 ? 1 : 0), []);

  // The last pick's full result, for the panel's onComplete (the modal only knows right/wrong).
  const lastResult = useRef<GatherResult | null>(null);

  // BattleQuestionModal's grader for one pick attempt at a plant.
  const grade = useCallback(async (plant: PlantView, question: BattleQuestion, selected: string) => {
    lastResult.current = null;
    if (offlineMap) {
      const res = gradeScrollOffline(userId, question, selected);
      queueGather(userId, regionId, plant.id, question.id, selected);
      update(applyLocalPick(stateRef.current, regionId, plant.id, plant.veggie, res.correct, Date.now()));
      lastResult.current = {
        status: res.correct ? 'picked' : 'wrong', correct: res.correct, correctAnswer: res.correctAnswer,
        veggie: plant.veggie, seeds: 0, readyAt: null, restUntil: null, bag: null, replayed: false,
      };
      return res;
    }
    const call = await gatherWildPlant({
      userId, region: regionId, nodeId: plant.id, questionId: question.id, selected, entryId: crypto.randomUUID(),
    });
    if (!call.ok) return { correct: false, correctAnswer: null, failed: true };
    const r = call.result;
    lastResult.current = r;
    const key = plantKey(regionId, plant.id);
    const prev = stateRef.current.plants[key] ?? { readyAt: null, restUntil: null, wrong: 0 };
    update({
      bag: r.bag ?? stateRef.current.bag,
      plants: {
        ...stateRef.current.plants,
        [key]: r.status === 'picked' ? { readyAt: r.readyAt, restUntil: null, wrong: 0 }
          : r.status === 'wrong' ? (r.restUntil ? { ...prev, wrong: 0, restUntil: r.restUntil } : { ...prev, wrong: prev.wrong + 1 })
          : r.status === 'growing' ? { ...prev, readyAt: r.readyAt }
          : { ...prev, restUntil: r.restUntil },
      },
    });
    return { correct: !!r.correct, correctAnswer: r.correctAnswer };
  }, [offlineMap, userId, regionId, update]);

  /** Sells veggies (null = all of them). Null when it didn't work. */
  const sell = useCallback(async (items: GardenBag | null): Promise<SoldVeggies | null> => {
    if (offlineMap) return null;
    const res = await sellGardenItems(userId, items);
    if (!res) return null;
    update({ ...stateRef.current, bag: res.bag });
    return res;
  }, [offlineMap, userId, update]);

  return {
    on,
    bag: state.bag,
    squares: gardenSquares(state.bag),
    plants,
    sprites,
    plantAt,
    squaresForPick,
    grade,
    lastResult,
    sell,
  };
}

export type GardenApi = ReturnType<typeof useGarden>;
