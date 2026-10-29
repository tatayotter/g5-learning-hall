// lib/hideoutConfig.ts
// The Hideout (economy plan part 2, 2026-10-28): a kid's own island, bought for 2,000 gold at the
// signpost in Inkwell Town. Its plots stand at fixed spots on the Hideout map (the "Places" layer
// of public/maps-tiled-art/hideout/hideout_<shape>.tmx) and each is built with wood from chopping:
// garden beds grow veggies from seed packets (one per soil tile), grove spots grow saplings into trees that drop
// wood every day, and the Curio Camp is where curios go on missions. The kitchen comes with
// cooking, later.
//
// The rules live in supabase/migrations/20261028160000_hideout.sql (buy_hideout,
// build_hideout_plot, plant_hideout_plot, water_hideout_plot, harvest_hideout_plot) and
// 20261029000000_hideout_tiles_and_trees.sql (a bed's six tiles, six tree spots); the numbers
// here mirror them for the screen.
import { TREES, VEGGIES, gardenItemLabel, saplingKey, seedsKey, type TreeId, type VeggieId } from '@/lib/gardenConfig';

export const HIDEOUT_REGION = 'hideout';
export const HIDEOUT_COST = 2000;

// Five island shapes (Rowil, 2026-10-28: so each kid's island feels their own). The plots, road and
// bridge are on the same tiles on all five, so none is better than another; only the coast
// differs. Built by /mnt/project-files/hideout-map/build_hideout.py <repo> <shape>. A kid's shape
// comes from their id, so it never changes.
export const HIDEOUT_SHAPES = 5;
export function hideoutShape(userId: string): number {
  let h = 2166136261;
  for (let i = 0; i < userId.length; i++) h = Math.imul(h ^ userId.charCodeAt(i), 16777619);
  return ((h >>> 0) % HIDEOUT_SHAPES) + 1;
}
export const hideoutMapPath = (userId: string) => `/maps-tiled-art/hideout/hideout_${hideoutShape(userId)}.tmx`;

// The signpost in Inkwell Town: walk up to it to buy the Hideout or go there. Coming back over
// the Hideout's bridge puts the kid right beside it.
export const SIGNPOST = { region: 'town', x: 25, y: 36 } as const;
export const SIGNPOST_ARRIVE = { x: 26, y: 36 } as const;

export type PlotKind = 'bed' | 'grove' | 'camp' | 'kitchen';

export interface PlotDef {
  id: string;
  kind: PlotKind;
  name: string;
  // Bag items it takes to build.
  cost: Record<string, number>;
  // Not buildable yet: what to tell the kid.
  soon?: string;
}

export const PLOTS: Record<string, PlotDef> = {
  bed_1: { id: 'bed_1', kind: 'bed', name: 'Garden Bed', cost: { wood: 6 } },
  bed_2: { id: 'bed_2', kind: 'bed', name: 'Garden Bed', cost: { wood: 6 } },
  bed_3: { id: 'bed_3', kind: 'bed', name: 'Garden Bed', cost: { wood: 6 } },
  bed_4: { id: 'bed_4', kind: 'bed', name: 'Garden Bed', cost: { wood: 6 } },
  grove_1: { id: 'grove_1', kind: 'grove', name: 'Tree Spot', cost: { wood: 12 } },
  grove_2: { id: 'grove_2', kind: 'grove', name: 'Tree Spot', cost: { wood: 12 } },
  grove_3: { id: 'grove_3', kind: 'grove', name: 'Tree Spot', cost: { wood: 12 } },
  grove_4: { id: 'grove_4', kind: 'grove', name: 'Tree Spot', cost: { wood: 12 } },
  grove_5: { id: 'grove_5', kind: 'grove', name: 'Tree Spot', cost: { wood: 12 } },
  grove_6: { id: 'grove_6', kind: 'grove', name: 'Tree Spot', cost: { wood: 12 } },
  camp: { id: 'camp', kind: 'camp', name: 'Curio Camp', cost: { wood: 15 } },
  kitchen: { id: 'kitchen', kind: 'kitchen', name: 'Kitchen', cost: { wood: 20 }, soon: 'Cooking is coming soon!' },
};
export const PLOT_ORDER = Object.keys(PLOTS);

// What each plot is for, in a kid's words.
export const PLOT_USE: Record<PlotKind, string> = {
  bed: 'Plant seeds here and grow your own veggies.',
  grove: 'Plant a sapling here. It grows into a tree that drops wood every day.',
  camp: 'Send your curios on missions to train while you play.',
  kitchen: 'Cook your veggies into yummy food.',
};

// Minutes to grow (hideout_grow_minutes).
export const GROW_MINUTES: Partial<Record<VeggieId, number>> = {
  cabbage: 60, carrot: 120, beans: 180, tomato: 240, eggplant: 360, corn: 480, pumpkin: 720,
};
export const TREE_GROW_MINUTES = 24 * 60;
export const growMinutes = (kind: PlotKind, item: string) =>
  kind === 'bed' ? GROW_MINUTES[item as VeggieId] ?? null : kind === 'grove' && item in TREES ? TREE_GROW_MINUTES : null;

// What one harvest gives (harvest_hideout_plot): a garden bed's tile, a grown tree's day.
export const HARVEST_VEGGIES = 2;
export const TREE_WOOD_PER_DAY = 2;

// Watering (water_hideout_plot): the share of the time left that stays. A Tin can takes 40% off,
// Bronze and up 60%; Silver and up waters everything growing at once; Gold sometimes doubles a
// harvest.
export const waterFactorFor = (canTier: number) => (canTier >= 2 ? 0.4 : 0.6);
export const waterAllFor = (canTier: number) => canTier >= 3;

// The bag item a plot takes to plant: seed packets in a bed, saplings in a grove spot.
export const plantKeyFor = (kind: PlotKind, item: string) => (kind === 'bed' ? seedsKey(item as VeggieId) : saplingKey(item as TreeId));
export const plantLabel = (kind: PlotKind, item: string) => (kind === 'bed' ? VEGGIES[item as VeggieId]?.label ?? item : `${TREES[item as TreeId]?.label ?? item} Tree`);
export const costWords = (cost: Record<string, number>) => Object.entries(cost).map(([k, n]) => `${n} ${gardenItemLabel(k)}`).join(' and ');

// "3 Tomatoes", "3 Carrots", "3 Corn", "3 Beans".
export const pluralVeggie = (label: string) => (/s$|^Corn$/.test(label) ? label : /o$/.test(label) ? `${label}es` : `${label}s`);

// "about 2 hours", "about 25 minutes".
export function timeWords(ms: number) {
  const mins = Math.max(1, Math.ceil(ms / 60000));
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.round(mins / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

// ── How a plot looks ─────────────────────────────────────────────────────────
// Art (placeholders until Rowil's art lands, /mnt/project-files/economy-art/ART-LIST.md Part 2):
// public/hideout/<name>.png, standing on the plot's tile (bottom centre).
export type PlotLook =
  | 'site'          // not built: a sign with stakes
  | 'grove'         // an empty tree spot
  | 'camp'
  | 'kitchen_soon';

export const PLOT_ART: Record<PlotLook, { src: string; w: number; h: number }> = {
  site: { src: '/hideout/build_site.png', w: 56, h: 51 },
  grove: { src: '/hideout/tree_spot.png', w: 32, h: 32 },
  camp: { src: '/hideout/curio_camp.png', w: 64, h: 64 },
  kitchen_soon: { src: '/hideout/kitchen_soon.png', w: 32, h: 48 },
};
export const SIGNPOST_ART = { src: '/hideout/signpost.png', w: 29, h: 64 };

// Each garden bed is a fenced dirt pen on the map (hideout.tmx, like the town's pens). Its Places
// point is the middle of its two crop rows: six soil tiles, three across, and the kid stands on
// the row in front. Each tile takes one seed packet (Rowil, 2026-10-29) and is its own plot on the
// server, bed_N_0..bed_N_5 in this order. The tiles a plot takes (solid), around its Places point:
export const plotTiles = (kind: PlotKind, x: number, y: number) =>
  kind === 'bed'
    ? [-1, 0, 1].flatMap(dx => [-1, 0].map(dy => ({ x: x + dx, y: y + dy })))
    : [{ x, y }];
export const BED_TILES = 6;
export const bedTileId = (bed: string, i: number) => `${bed}_${i}`;

// A crop's look as it grows: planted (soil and a sprout), growing, ripe (the wild veggies' strip).
export type CropStage = 'picked' | 'growing' | 'ripe';
export function cropStage(plantedAt: number, readyAt: number, now: number): CropStage {
  if (now >= readyAt) return 'ripe';
  return (now - plantedAt) / Math.max(1, readyAt - plantedAt) < 0.5 ? 'picked' : 'growing';
}
// A tree in the grove: a sapling, a young tree (half way), then grown.
export type GroveStage = 'sapling' | 'young' | 'grown';
export function groveStage(plantedAt: number, readyAt: number, now: number): GroveStage {
  if (now >= readyAt) return 'grown';
  return (now - plantedAt) / Math.max(1, readyAt - plantedAt) < 0.5 ? 'sapling' : 'young';
}
