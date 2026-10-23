// lib/gardenConfig.ts
// Wild veggies and trees on the Training Map (behind the 'garden' switch). Plants grow at
// fixed spots; walking onto a ripe one and answering one question right picks it. The
// veggie goes into the bag, sometimes with a seed packet, and the plant regrows for
// REGROW_MS. Ribboned trees take CHOP_SWINGS right answers, one per swing, and give wood and
// sometimes a sapling, then grow back for TREE_REGROW_MS. The rules live in
// supabase/migrations/20261022120000_garden_wild_plants.sql (gather_wild_plant,
// sell_garden_items) and 20261023120000_garden_wild_trees.sql (chop_wild_tree); the numbers
// here mirror them for the screen.

export type VeggieId = 'tomato' | 'eggplant' | 'pumpkin' | 'carrot' | 'cabbage' | 'corn' | 'beans';

export interface VeggieDef {
  id: VeggieId;
  label: string;
  // Two tiles tall (a 32x64 art frame) instead of one.
  tall: boolean;
}

export const VEGGIES: Record<VeggieId, VeggieDef> = {
  tomato:   { id: 'tomato',   label: 'Tomato',   tall: false },
  eggplant: { id: 'eggplant', label: 'Eggplant', tall: false },
  pumpkin:  { id: 'pumpkin',  label: 'Pumpkin',  tall: false },
  carrot:   { id: 'carrot',   label: 'Carrot',   tall: false },
  cabbage:  { id: 'cabbage',  label: 'Cabbage',  tall: false },
  corn:     { id: 'corn',     label: 'Corn',     tall: true },
  beans:    { id: 'beans',    label: 'Beans',    tall: true },
};
export const VEGGIE_ORDER: VeggieId[] = ['tomato', 'eggplant', 'pumpkin', 'carrot', 'cabbage', 'corn', 'beans'];

// Same list as wild_plant_nodes in the migration.
export interface WildPlantNode { id: string; veggie: VeggieId; x: number; y: number }
export const WILD_PLANTS: Record<string, WildPlantNode[]> = {
  ledgers_heart: [
    { id: 'tomato_1',   veggie: 'tomato',   x: 12, y: 10 },
    { id: 'corn_1',     veggie: 'corn',     x: 15, y: 12 },
    { id: 'eggplant_1', veggie: 'eggplant', x: 13, y: 14 },
    { id: 'pumpkin_1',  veggie: 'pumpkin',  x: 12, y: 28 },
    { id: 'carrot_1',   veggie: 'carrot',   x: 14, y: 29 },
    { id: 'tomato_2',   veggie: 'tomato',   x: 40, y: 6 },
    { id: 'cabbage_1',  veggie: 'cabbage',  x: 50, y: 13 },
    { id: 'beans_1',    veggie: 'beans',    x: 48, y: 15 },
  ],
};

export const REGROW_MS = 20 * 60 * 1000;
// Wrong answers in a row before a plant rests for REST_MS.
export const WRONG_LIMIT = 3;
export const REST_MS = 60 * 1000;
export const VEGGIE_SELL_PRICE = 2;
// Veggies or seed packets of one kind per bag square (same as trash).
export const GARDEN_STACK = 20;

// ── Trees ──────────────────────────────────────────────────────────────────
// Art: public/garden/tree_<id>.png, four 96x144 frames (ready, stump, sprout, young crown)
// with the trunk base at (48, 134), cut from the map's own tileset (Props.png). Each kind
// has its own stump, and every growth stage grows on that stump.
export type TreeId = 'maple' | 'oak' | 'birch' | 'pine';
export const TREES: Record<TreeId, { id: TreeId; label: string }> = {
  maple: { id: 'maple', label: 'Maple' },
  oak:   { id: 'oak',   label: 'Oak' },
  birch: { id: 'birch', label: 'Birch' },
  pine:  { id: 'pine',  label: 'Pine' },
};
export const TREE_ORDER: TreeId[] = ['maple', 'oak', 'birch', 'pine'];

// Same list as wild_tree_nodes in the migration. x, y is the trunk's tile.
export interface WildTreeNode { id: string; tree: TreeId; x: number; y: number }
export const WILD_TREES: Record<string, WildTreeNode[]> = {
  ledgers_heart: [
    { id: 'maple_1', tree: 'maple', x: 20, y: 7 },
    { id: 'oak_1',   tree: 'oak',   x: 42, y: 13 },
    { id: 'birch_1', tree: 'birch', x: 9,  y: 35 },
    { id: 'pine_1',  tree: 'pine',  x: 42, y: 30 },
  ],
};
// The tiles a tree's canopy covers above its trunk (3 wide, 3 up): nothing spawns there.
export const treeTiles = (t: { x: number; y: number }) =>
  [-3, -2, -1, 0].flatMap(dy => [-1, 0, 1].map(dx => ({ x: t.x + dx, y: t.y + dy })));

export const TREE_REGROW_MS = 4 * 60 * 60 * 1000;
export const CHOP_SWINGS = 3;
export const WOOD_PER_TREE = 3;

// How a tree looks: ready (ribboned), a stump, a sprout on it, a young crown (thirds of the regrow).
export type TreeStage = 'ready' | 'stump' | 'small' | 'young';
export function treeStage(readyAt: number | null, now: number): TreeStage {
  if (readyAt === null || now >= readyAt) return 'ready';
  const left = (readyAt - now) / TREE_REGROW_MS;
  return left > 2 / 3 ? 'stump' : left > 1 / 3 ? 'small' : 'young';
}

// ── Bag items ──────────────────────────────────────────────────────────────
// Keys in player_bag_items.item_key.
export const veggieKey = (v: VeggieId) => `veggie_${v}`;
export const seedsKey = (v: VeggieId) => `seeds_${v}`;
export const WOOD_KEY = 'wood';
export const saplingKey = (t: TreeId) => `sapling_${t}`;
export type GardenBag = Partial<Record<string, number>>;
// Wood sells at the Recycler for the same price as a veggie.
export const WOOD_SELL_PRICE = VEGGIE_SELL_PRICE;

export type ParsedGardenKey =
  | { kind: 'veggie' | 'seeds'; veggie: VeggieDef }
  | { kind: 'wood' }
  | { kind: 'sapling'; tree: TreeId };

export function parseGardenKey(key: string): ParsedGardenKey | null {
  if (key === WOOD_KEY) return { kind: 'wood' };
  const s = /^sapling_(\w+)$/.exec(key);
  if (s) return s[1] in TREES ? { kind: 'sapling', tree: s[1] as TreeId } : null;
  const m = /^(veggie|seeds)_(\w+)$/.exec(key);
  const def = m ? VEGGIES[m[2] as VeggieId] : undefined;
  return m && def ? { kind: m[1] as 'veggie' | 'seeds', veggie: def } : null;
}

// Whether the Recycler buys it (veggies and wood; seeds and saplings are for planting).
export const gardenSellable = (key: string) => {
  const p = parseGardenKey(key);
  return p?.kind === 'veggie' || p?.kind === 'wood';
};

export const gardenItemLabel = (key: string) => {
  const p = parseGardenKey(key);
  if (!p) return key;
  if (p.kind === 'wood') return 'Wood';
  if (p.kind === 'sapling') return `${TREES[p.tree].label} Sapling`;
  return p.kind === 'veggie' ? p.veggie.label : `${p.veggie.label} Seeds`;
};
export const gardenItemIcon = (key: string) => {
  const p = parseGardenKey(key);
  if (!p) return '';
  if (p.kind === 'wood') return '/garden/icon_wood.png';
  if (p.kind === 'sapling') return `/garden/icon_sapling_${p.tree}.png`;
  return `/garden/icon_${p.kind === 'seeds' ? 'seeds_' : ''}${p.veggie.id}.png`;
};

// Bag keys in display order: veggies, wood, then seed packets and saplings.
export const GARDEN_KEYS: string[] = [
  ...VEGGIE_ORDER.map(veggieKey), WOOD_KEY, ...VEGGIE_ORDER.map(seedsKey), ...TREE_ORDER.map(saplingKey),
];

export const gardenSquares = (bag: GardenBag) =>
  GARDEN_KEYS.reduce((sum, k) => sum + Math.ceil((bag[k] ?? 0) / GARDEN_STACK), 0);

// How a plant looks: ripe (pick it), just picked, or growing back (second half of the regrow).
export type PlantStage = 'ripe' | 'picked' | 'growing';
export function plantStage(readyAt: number | null, now: number): PlantStage {
  if (readyAt === null || now >= readyAt) return 'ripe';
  return readyAt - now > REGROW_MS / 2 ? 'picked' : 'growing';
}
