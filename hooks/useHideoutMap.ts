// hooks/useHideoutMap.ts
// The Hideout on the map (lib/hideoutConfig.ts, lib/hideout.ts): the signpost in Inkwell Town
// and, on the Hideout's own island, its plots. Says what to draw for each (a prop, a crop, a
// grown tree), which tiles they take, and what a kid standing next to one can do with it. The
// panels and the travel are TrainingMap.tsx's.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { GARDEN_STACK, TREES, VEGGIES, gardenItemIcon, seedsKey, saplingKey, veggieKey, woodKey, WOOD_ICON, type GardenBag, type TreeId, type VeggieId } from '@/lib/gardenConfig';
import {
  HIDEOUT_REGION, HARVEST_VEGGIES, PLOT_ART, PLOTS, SIGNPOST, SIGNPOST_ART, TREE_WOOD_PER_DAY, bedTileId, cropStage, groveStage, plotTiles,
  type PlotDef, type PlotLook,
} from '@/lib/hideoutConfig';
import { useHideout } from '@/lib/hideout';
import { manilaToday } from '@/lib/appDay';
import type { PropSprite } from '@/lib/phaserMap/hideoutProps';
import type { PlantSprite } from '@/lib/phaserMap/gardenPlants';
import type { TreeSprite } from '@/lib/phaserMap/wildTrees';
import type { GrowBar } from '@/lib/phaserMap/growBars';

// What a plot is up to now.
export type PlotPhase =
  | 'unbuilt' | 'soon'                 // not built (soon: not buildable yet)
  | 'empty'                            // built, nothing growing
  | 'growing' | 'ripe'                 // a crop or a tree growing / ready
  | 'collected'                        // a grown tree whose wood was collected today
  | 'camp'
  | 'station';                         // a built Workbench, Compost Bin or Kitchen

export interface HideoutSpot {
  id: string;                          // 'signpost', a plot id, or a garden bed's tile (bed_1_0)
  kind: 'signpost' | 'plot';
  x: number;
  y: number;
  // The tiles it takes (a garden bed not built yet: its crop rows).
  tiles: { x: number; y: number }[];
  plot?: PlotDef;
  // A garden bed's tile: the bed it's in.
  bed?: string;
  phase?: PlotPhase;
  item?: string | null;
  readyAt?: number | null;
  watered?: boolean;
  // The button's words and icon.
  label: string;
  icon: string;
}

interface Args {
  userId: string;
  regionId: string;
  enabled: boolean;
  online: boolean;
  // Where the Hideout map puts each plot (its "Places" layer).
  places: Record<string, { x: number; y: number }>;
  bag: GardenBag;
  onBag: (bag: GardenBag) => void;
}

export function useHideoutMap({ userId, regionId, enabled, online, places, bag, onBag }: Args) {
  const onIsland = enabled && regionId === HIDEOUT_REGION;
  const inTown = enabled && regionId === SIGNPOST.region;
  const api = useHideout(userId, { enabled: onIsland || inTown, online, onBag });
  const { state } = api;

  // Crops and trees change look as they grow.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!onIsland) return;
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, [onIsland]);
  const today = manilaToday();

  const spots: HideoutSpot[] = useMemo(() => {
    if (inTown) {
      return [{
        id: 'signpost', kind: 'signpost', x: SIGNPOST.x, y: SIGNPOST.y, tiles: [{ x: SIGNPOST.x, y: SIGNPOST.y }],
        label: state.owned ? 'Go to My Hideout' : 'My Hideout', icon: SIGNPOST_ART.src,
      }];
    }
    if (!onIsland || !state.owned) return [];
    const out: HideoutSpot[] = [];
    for (const def of Object.values(PLOTS)) {
      const at = places[def.id];
      if (!at) continue;
      const p = state.plots[def.id];
      const base = { id: def.id, kind: 'plot' as const, x: at.x, y: at.y, tiles: plotTiles(def.kind, at.x, at.y), plot: def };
      if (!p) {
        out.push({ ...base, phase: def.soon ? 'soon' : 'unbuilt', label: def.soon ? def.name : `Build ${def.name}`, icon: def.soon ? PLOT_ART.kitchen_soon.src : WOOD_ICON });
        continue;
      }
      if (def.kind === 'camp') { out.push({ ...base, phase: 'camp', label: 'Curio Camp', icon: PLOT_ART.camp.src }); continue; }
      if (def.kind === 'kitchen' || def.kind === 'workbench' || def.kind === 'compost') {
        out.push({ ...base, phase: 'station', label: def.kind === 'kitchen' ? 'Cook' : `Use ${def.name}`, icon: PLOT_ART[def.kind].src });
        continue;
      }
      // A built garden bed: each of its soil tiles is a spot of its own, one seed packet each.
      if (def.kind === 'bed') {
        base.tiles.forEach((t, i) => {
          const id = bedTileId(def.id, i);
          const tile = state.plots[id];
          const spot = { id, kind: 'plot' as const, x: t.x, y: t.y, tiles: [t], plot: { ...def, id }, bed: def.id };
          if (!tile?.item) { out.push({ ...spot, phase: 'empty', label: 'Plant Seeds', icon: '/garden/icon_seeds_tomato.png' }); return; }
          const name = VEGGIES[tile.item as VeggieId]?.label ?? tile.item;
          const icon = gardenItemIcon(veggieKey(tile.item as VeggieId));
          const watered = tile.wateredAt !== null;
          const ripe = tile.readyAt !== null && now >= tile.readyAt;
          const grown = { ...spot, item: tile.item, readyAt: tile.readyAt, watered };
          if (ripe) out.push({ ...grown, phase: 'ripe', label: `Harvest ${name}`, icon });
          else out.push({ ...grown, phase: 'growing', label: watered ? `${name} is growing` : `Water ${name}`, icon });
        });
        continue;
      }
      // A tree spot.
      if (!p.item) {
        out.push({ ...base, phase: 'empty', label: 'Plant a Sapling', icon: '/garden/icon_sapling_oak.png' });
        continue;
      }
      const ripe = p.readyAt !== null && now >= p.readyAt;
      const watered = p.wateredAt !== null;
      const name = `${TREES[p.item as TreeId]?.label ?? p.item} Tree`;
      const spot = { ...base, item: p.item, readyAt: p.readyAt, watered };
      if (!ripe) out.push({ ...spot, phase: 'growing', label: watered ? `${name} is growing` : `Water ${name}`, icon: gardenItemIcon(saplingKey(p.item as TreeId)) });
      else if (p.collectedOn === today) out.push({ ...spot, phase: 'collected', label: name, icon: gardenItemIcon(woodKey(p.item as TreeId)) });
      else out.push({ ...spot, phase: 'ripe', label: 'Collect Wood', icon: gardenItemIcon(woodKey(p.item as TreeId)) });
    }
    return out;
  }, [inTown, onIsland, state, places, now, today]);

  // What each spot looks like on the map.
  const look = useMemo(() => {
    const props: PropSprite[] = [];
    const crops: PlantSprite[] = [];
    const trees: TreeSprite[] = [];
    // A bar over everything growing, at the top of its art.
    const bars: GrowBar[] = [];
    const bar = (s: HideoutSpot, top: number) => {
      const p = state.plots[s.id];
      if (p?.plantedAt != null && p.readyAt != null && now < p.readyAt) bars.push({ id: s.id, x: s.x, y: s.y, plantedAt: p.plantedAt, readyAt: p.readyAt, top, watered: p.wateredAt !== null });
    };
    for (const s of spots) {
      if (s.kind === 'signpost') { props.push({ id: s.id, src: SIGNPOST_ART.src, x: s.x, y: s.y }); continue; }
      const def = s.plot!;
      const art = (l: PlotLook) => ({ id: s.id, src: PLOT_ART[l].src, x: s.x, y: s.y });
      if (s.phase === 'unbuilt') { props.push(art('site')); continue; }
      if (s.phase === 'soon') { props.push(art('kitchen_soon')); continue; }
      if (def.kind === 'camp') { props.push(art('camp')); continue; }
      if (def.kind === 'kitchen' || def.kind === 'workbench' || def.kind === 'compost') { props.push(art(def.kind)); continue; }
      if (def.kind === 'bed') {
        // A garden bed's tile: the pen's own dirt, and the crop once one is planted.
        const p = state.plots[s.id];
        if (p?.item && p.plantedAt !== null && p.readyAt !== null) {
          const stage = cropStage(p.plantedAt, p.readyAt, now);
          const tall = VEGGIES[p.item as VeggieId]?.tall ?? false;
          crops.push({ id: s.id, veggie: p.item, x: s.x, y: s.y, tall, stage });
          bar(s, stage === 'picked' ? 14 : tall ? 50 : 26);
        }
        continue;
      }
      // A grove spot: the ring of soil, then a sapling, a young tree and a grown one.
      const p = state.plots[s.id];
      if (!p?.item || p.plantedAt === null || p.readyAt === null) { props.push(art('grove')); continue; }
      const stage = groveStage(p.plantedAt, p.readyAt, now);
      if (stage === 'grown') {
        trees.push({ id: s.id, tree: p.item as TreeId, x: s.x, y: s.y, stage: 'ready', hits: 0 });
      } else if (stage === 'young') {
        bar(s, 76);
        props.push({ id: s.id, src: `/garden/tree_${p.item}.png`, x: s.x, y: s.y, frame: { x: 0, y: 0, w: 128, h: 160 }, anchor: { x: 64, y: 134 }, scale: 0.55 });
      } else {
        bar(s, 34);
        props.push({ id: s.id, src: gardenItemIcon(saplingKey(p.item as TreeId)), x: s.x, y: s.y, anchor: { x: 50, y: 96 }, scale: 0.36 });
      }
    }
    return { props, crops, trees, bars };
  }, [spots, state.plots, now]);

  // The plots and the signpost are solid: a kid uses one from a tile beside it. A built pen's soil
  // tiles are not: a kid walks onto a tile to plant it.
  const blocked = useMemo(() => spots.flatMap(s => (s.bed ? [] : s.tiles)), [spots]);

  // A garden bed's ripe tiles: harvesting one picks them all.
  const ripeInBed = (s: HideoutSpot) => (s.bed ? spots.filter(o => o.bed === s.bed && o.phase === 'ripe') : [s]);

  // Bag squares a harvest might need (the most it can give).
  const squaresForHarvest = (s: HideoutSpot) => {
    const adds: GardenBag = {};
    if (s.plot?.kind === 'bed') {
      for (const t of ripeInBed(s)) {
        if (!t.item) continue;
        const v = veggieKey(t.item as VeggieId), sd = seedsKey(t.item as VeggieId);
        adds[v] = (adds[v] ?? 0) + HARVEST_VEGGIES * 2;
        adds[sd] = (adds[sd] ?? 0) + 2;
      }
    } else if (s.item) adds[woodKey(s.item as TreeId)] = TREE_WOOD_PER_DAY;
    return Object.entries(adds).reduce((sum, [k, n]) => {
      const have = bag[k] ?? 0;
      return sum + Math.ceil((have + (n ?? 0)) / GARDEN_STACK) - Math.ceil(have / GARDEN_STACK);
    }, 0);
  };

  return { api, onIsland, inTown, spots, ...look, blocked, squaresForHarvest, ripeInBed };
}

export type HideoutMap = ReturnType<typeof useHideoutMap>;
