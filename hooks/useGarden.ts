// hooks/useGarden.ts
// The wild veggies and trees on the Training Map (lib/gardenConfig.ts, lib/garden.ts): the
// bag's garden items, each plant's and tree's regrow timer, picking (one question), chopping
// (one question per swing) and selling. Off unless the 'garden' switch is on for the player
// and the map has plants.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BattleQuestion } from '@/components/battle/shared';
import {
  WILD_PLANTS, VEGGIES, GARDEN_STACK, WOOD_KEY, WOOD_PER_TREE, gardenSquares, plantStage, saplingKey, veggieKey,
  type GardenBag, type WildPlantNode, type WildTreeNode,
} from '@/lib/gardenConfig';
import {
  applyLocalChop, applyLocalPick, treesFelledOn, chopWildTree, emptyGarden, fetchGarden, gatherWildPlant, loadLocalGarden, plantKey, saveLocalGarden,
  sellGardenItems, type ChopResult, type GardenState, type GatherResult, type SoldVeggies,
} from '@/lib/garden';
import { flushMapOutbox, gradeScrollOffline, pendingMapEntries, queueChop, queueGather } from '@/lib/offlineMap';
import type { PlantSprite } from '@/lib/phaserMap/gardenPlants';
import type { TreeSprite } from '@/lib/phaserMap/wildTrees';
import { natureDay } from '@/lib/mapNature';

export interface UseGardenArgs {
  userId: string;
  regionId: string;
  enabled: boolean;
  // Playing from the device (lib/offlineMap.ts playingMapOffline).
  offlineMap: boolean;
  // The trees on today's map (lib/mapNature.ts); every one can be chopped.
  mapTrees: WildTreeNode[];
}

export type PlantView = WildPlantNode & { readyAt: number | null; restUntil: number | null; ripe: boolean };
export type TreeView = WildTreeNode & { readyAt: number | null; restUntil: number | null; ready: boolean; hits: number };

export function useGarden({ userId, regionId, enabled, offlineMap, mapTrees }: UseGardenArgs) {
  const nodes = useMemo(() => (enabled ? WILD_PLANTS[regionId] ?? [] : []), [enabled, regionId]);
  const treeNodes = useMemo(() => (enabled ? mapTrees : []), [enabled, mapTrees]);
  const on = nodes.length > 0 || treeNodes.length > 0;
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
      if (pendingMapEntries(userId).some(e => e.kind === 'gather' || e.kind === 'chop')) await flushMapOutbox(userId);
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

  const trees: TreeView[] = useMemo(() => treeNodes.map(n => {
    const timer = state.plants[plantKey(regionId, n.id)];
    const readyAt = timer?.readyAt ?? null;
    return { ...n, readyAt, restUntil: timer?.restUntil ?? null, ready: readyAt === null || now >= readyAt, hits: timer?.hits ?? 0 };
  }), [treeNodes, state.plants, regionId, now]);

  // Every tree on the map is drawn; with the garden switch on, the ones this kid chopped are stumps.
  const treeSprites: TreeSprite[] = useMemo(() => {
    const byId = new Map(trees.map(t => [t.id, t]));
    return mapTrees.map(n => {
      const t = byId.get(n.id);
      return { id: n.id, tree: n.tree, x: n.x, y: n.y, stage: t && !t.ready ? 'stump' as const : 'ready' as const, hits: t?.hits ?? 0 };
    });
  }, [mapTrees, trees]);

  // Trees chopped today, against DAILY_TREE_LIMIT.
  const felledToday = useMemo(() => treesFelledOn(state, natureDay(now)), [state, now]);

  // The tree whose trunk stands on (x, y).
  const treeAt = useCallback((x: number, y: number) => trees.find(t => t.x === x && t.y === y) ?? null, [trees]);

  // Squares a felled tree's wood and sapling might need.
  const squaresForChop = useCallback((tree: TreeView['tree']) => {
    const bag = stateRef.current.bag;
    const wood = bag[WOOD_KEY] ?? 0;
    const woodSquares = Math.ceil((wood + WOOD_PER_TREE) / GARDEN_STACK) - Math.ceil(wood / GARDEN_STACK);
    return woodSquares + ((bag[saplingKey(tree)] ?? 0) % GARDEN_STACK === 0 ? 1 : 0);
  }, []);

  // Squares one more of this veggie needs (0 when its stack has room).
  const squaresForPick = useCallback((veggie: PlantView['veggie']) => ((stateRef.current.bag[veggieKey(veggie)] ?? 0) % GARDEN_STACK === 0 ? 1 : 0), []);

  // The last pick's full result, for the panel's onComplete (the modal only knows right/wrong).
  const lastResult = useRef<GatherResult | null>(null);
  // The server answered but turned the last pick or swing down (not a connection problem), so
  // asking again won't help: the map closes the panel and says so instead of "the internet
  // hiccuped".
  const refused = useRef(false);

  // BattleQuestionModal's grader for one pick attempt at a plant.
  const grade = useCallback(async (plant: PlantView, question: BattleQuestion, selected: string) => {
    lastResult.current = null;
    refused.current = false;
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
    if (!call.ok) { refused.current = !call.network; return { correct: false, correctAnswer: null, failed: true }; }
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

  // The last swing's full result, like lastResult for picks.
  const lastChop = useRef<ChopResult | null>(null);

  // BattleQuestionModal's grader for one swing at a tree.
  const chop = useCallback(async (tree: TreeView, question: BattleQuestion, selected: string) => {
    lastChop.current = null;
    refused.current = false;
    if (offlineMap) {
      const res = gradeScrollOffline(userId, question, selected);
      queueChop(userId, regionId, tree.id, tree.tree, question.id, selected);
      const local = applyLocalChop(stateRef.current, regionId, tree.id, tree.tree, res.correct, Date.now());
      update(local.state);
      lastChop.current = {
        ...local.result, correct: res.correct, correctAnswer: res.correctAnswer, tree: tree.tree,
        readyAt: null, bag: null, replayed: false,
      };
      return res;
    }
    const call = await chopWildTree({
      userId, region: regionId, nodeId: tree.id, tree: tree.tree, questionId: question.id, selected, entryId: crypto.randomUUID(),
    });
    if (!call.ok) { refused.current = !call.network; return { correct: false, correctAnswer: null, failed: true }; }
    const r = call.result;
    lastChop.current = r;
    const key = plantKey(regionId, tree.id);
    const prev = stateRef.current.plants[key] ?? { readyAt: null, restUntil: null, wrong: 0, hits: 0, misses: 0 };
    update({
      bag: r.bag ?? stateRef.current.bag,
      plants: {
        ...stateRef.current.plants,
        [key]: r.status === 'felled' ? { readyAt: r.readyAt, restUntil: null, wrong: 0, hits: 0, misses: 0 }
          : r.status === 'hit' ? { ...prev, wrong: 0, hits: r.hits }
          : r.status === 'wrong' ? { ...prev, misses: (prev.misses ?? 0) + 1, ...(r.restUntil ? { wrong: 0, restUntil: r.restUntil } : { wrong: prev.wrong + 1 }) }
          : r.status === 'stump' ? { ...prev, readyAt: r.readyAt }
          : r.status === 'tired' ? prev
          : { ...prev, restUntil: r.restUntil },
      },
    });
    return { correct: !!r.correct, correctAnswer: r.correctAnswer };
  }, [offlineMap, userId, regionId, update]);

  /** Sells veggies and wood (null = all of them). Null when it didn't work. */
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
    trees,
    treeSprites,
    treeAt,
    felledToday,
    squaresForChop,
    chop,
    lastChop,
    refused,
    sell,
  };
}

export type GardenApi = ReturnType<typeof useGarden>;
