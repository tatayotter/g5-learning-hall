// lib/gardenConfig.ts
// Wild veggies on the Training Map (garden step 1, behind the 'garden' switch). Plants grow
// at fixed spots; walking onto a ripe one and answering one question right picks it. The
// veggie goes into the bag, sometimes with a seed packet, and the plant regrows for
// REGROW_MS. The rules live in supabase/migrations/20261022120000_garden_wild_plants.sql
// (gather_wild_plant, sell_garden_items); the numbers here mirror them for the screen.

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

// Bag item keys (player_bag_items.item_key).
export const veggieKey = (v: VeggieId) => `veggie_${v}`;
export const seedsKey = (v: VeggieId) => `seeds_${v}`;
export type GardenItemKey = `veggie_${VeggieId}` | `seeds_${VeggieId}`;
export type GardenBag = Partial<Record<string, number>>;

export function parseGardenKey(key: string): { kind: 'veggie' | 'seeds'; veggie: VeggieDef } | null {
  const m = /^(veggie|seeds)_(\w+)$/.exec(key);
  const def = m ? VEGGIES[m[2] as VeggieId] : undefined;
  return m && def ? { kind: m[1] as 'veggie' | 'seeds', veggie: def } : null;
}

export const gardenItemLabel = (key: string) => {
  const p = parseGardenKey(key);
  if (!p) return key;
  return p.kind === 'veggie' ? p.veggie.label : `${p.veggie.label} Seeds`;
};
export const gardenItemIcon = (key: string) => {
  const p = parseGardenKey(key);
  return p ? `/garden/icon_${p.kind === 'seeds' ? 'seeds_' : ''}${p.veggie.id}.png` : '';
};

// Bag keys in display order: veggies, then seed packets.
export const GARDEN_KEYS: string[] = [...VEGGIE_ORDER.map(veggieKey), ...VEGGIE_ORDER.map(seedsKey)];

export const gardenSquares = (bag: GardenBag) =>
  GARDEN_KEYS.reduce((sum, k) => sum + Math.ceil((bag[k] ?? 0) / GARDEN_STACK), 0);

// How a plant looks: ripe (pick it), just picked, or growing back (second half of the regrow).
export type PlantStage = 'ripe' | 'picked' | 'growing';
export function plantStage(readyAt: number | null, now: number): PlantStage {
  if (readyAt === null || now >= readyAt) return 'ripe';
  return readyAt - now > REGROW_MS / 2 ? 'picked' : 'growing';
}
