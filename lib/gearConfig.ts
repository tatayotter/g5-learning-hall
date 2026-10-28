// lib/gearConfig.ts
// Tools and bag upgrades sold by the Shopkeeper (economy plan, 2026-10-28). Each tool unlocks a
// map skill and has four tiers; a kid buys them one at a time with gold. A tool takes one bag
// square and has to sit in one of the 4 item slots to be used (like holding it). Tools never
// break, and every chop, dig or catch still takes a right answer.
//
// The rules live in supabase/migrations/20261028090000_gear_tools_and_earning_trims.sql
// (gear_tiers, buy_gear, chop_wild_tree, gather_wild_plant); the numbers here mirror them for
// the screen.
import type { VeggieId } from '@/lib/gardenConfig';

export type ToolId = 'axe' | 'pickaxe' | 'shovel' | 'rod' | 'can';
export type GearId = ToolId | 'bag';

export interface GearTierDef {
  tier: number;
  name: string;
  cost: number;
  // What this tier adds, in a kid's words.
  perk: string;
}

export interface GearDef {
  id: GearId;
  // What it's for, shown in the Shop.
  use: string;
  // Not sold yet: the skill it unlocks isn't in the game yet.
  soon?: string;
  tiers: GearTierDef[];
}

export const GEAR: Record<GearId, GearDef> = {
  axe: {
    id: 'axe',
    use: 'Chop trees on the map for wood.',
    tiers: [
      { tier: 1, name: 'Stone Axe', cost: 150, perk: 'Chop a tree in 3 swings.' },
      { tier: 2, name: 'Bronze Axe', cost: 1000, perk: 'Chop a tree in just 2 swings.' },
      { tier: 3, name: 'Silver Axe', cost: 3000, perk: 'A sapling from every tree, and 12 trees a day.' },
      { tier: 4, name: 'Gold Axe', cost: 8000, perk: 'Sometimes double wood!' },
    ],
  },
  pickaxe: {
    id: 'pickaxe',
    use: 'Dig Storm Crystals out of the rocks.',
    tiers: [
      { tier: 1, name: 'Stone Pickaxe', cost: 150, perk: 'Mine Storm Crystals.' },
      { tier: 2, name: 'Bronze Pickaxe', cost: 1000, perk: 'Sometimes find 2 crystals.' },
      { tier: 3, name: 'Silver Pickaxe', cost: 3000, perk: 'Sometimes find a rare Storm Gem!' },
      { tier: 4, name: 'Gold Pickaxe', cost: 8000, perk: '2 crystals more often, and more Storm Gems.' },
    ],
  },
  shovel: {
    id: 'shovel',
    use: 'Dig up Seashells, Ink Pearls and Golden Petals.',
    tiers: [
      { tier: 1, name: 'Stone Shovel', cost: 150, perk: 'Dig up shells, pearls and petals.' },
      { tier: 2, name: 'Bronze Shovel', cost: 1000, perk: 'Sometimes dig up 2.' },
      { tier: 3, name: 'Silver Shovel', cost: 3000, perk: 'Sometimes dig up a rare Old Coin!' },
      { tier: 4, name: 'Gold Shovel', cost: 8000, perk: '2 at a time more often, and more Old Coins.' },
    ],
  },
  rod: {
    id: 'rod',
    use: 'Catch fish by the water.',
    soon: 'Fishing spots are coming soon!',
    tiers: [
      { tier: 1, name: 'Bamboo Rod', cost: 200, perk: 'Catch fish.' },
      { tier: 2, name: 'Bronze Rod', cost: 1200, perk: 'Fish bite faster.' },
      { tier: 3, name: 'Silver Rod', cost: 3500, perk: 'Sometimes catch a rare fish!' },
      { tier: 4, name: 'Gold Rod', cost: 9000, perk: 'Sometimes catch 2 fish.' },
    ],
  },
  can: {
    id: 'can',
    use: 'Water the plants in your own garden.',
    soon: 'Comes with your Hideout garden!',
    tiers: [
      { tier: 1, name: 'Tin Watering Can', cost: 100, perk: 'Water your garden.' },
      { tier: 2, name: 'Bronze Watering Can', cost: 800, perk: 'Plants grow faster.' },
      { tier: 3, name: 'Silver Watering Can', cost: 2500, perk: 'Water 3 plants at once.' },
      { tier: 4, name: 'Gold Watering Can', cost: 6000, perk: 'Sometimes a double harvest!' },
    ],
  },
  bag: {
    id: 'bag',
    use: 'More room in your bag.',
    tiers: [
      { tier: 1, name: 'Bigger Bag', cost: 500, perk: '+6 bag squares (36).' },
      { tier: 2, name: 'Big Bag', cost: 1500, perk: '+6 more squares (42).' },
      { tier: 3, name: 'Huge Bag', cost: 3000, perk: '+6 more squares (48).' },
    ],
  },
};

export const TOOL_ORDER: ToolId[] = ['axe', 'pickaxe', 'shovel', 'rod', 'can'];
export const GEAR_ORDER: GearId[] = [...TOOL_ORDER, 'bag'];

// The tier a kid owns of each piece of gear (missing = none).
export type GearTiers = Partial<Record<GearId, number>>;

export const gearTierDef = (gear: GearId, tier: number) => GEAR[gear].tiers[tier - 1] ?? null;
export const nextGearTier = (gear: GearId, owned: GearTiers) => gearTierDef(gear, (owned[gear] ?? 0) + 1);

// A tool in the bag and the item slots ({item: 'gear_axe'}).
export const toolKey = (tool: ToolId) => `gear_${tool}`;
export const toolOfKey = (key: string): ToolId | null => {
  const m = /^gear_(\w+)$/.exec(key);
  return m && (TOOL_ORDER as string[]).includes(m[1]) ? (m[1] as ToolId) : null;
};

// Art: public/gear/<tool>_<tier>.png (32x32 like the other bag icons). Placeholders until
// Rowil's art lands (/mnt/project-files/economy-art/ART-LIST.md).
export const gearIcon = (gear: GearId, tier: number) => `/gear/${gear}_${Math.min(Math.max(tier, 1), GEAR[gear].tiers.length)}.png`;
export const toolIcon = (tool: ToolId, tier: number) => gearIcon(tool, tier);
export const toolName = (tool: ToolId, tier: number) => gearTierDef(tool, Math.max(tier, 1))?.name ?? tool;

// ── What the tools do (chop_wild_tree, gather_wild_plant) ───────────────────
export const BASE_BAG_SIZE = 30;
export const BAG_SQUARES_PER_TIER = 6;
export const bagSizeFor = (bagTier: number) => BASE_BAG_SIZE + BAG_SQUARES_PER_TIER * Math.max(0, bagTier);

export const chopSwingsFor = (axeTier: number) => (axeTier >= 2 ? 2 : 3);
export const dailyTreeLimitFor = (axeTier: number) => (axeTier >= 3 ? 12 : 8);
// Silver and up: a sapling from every tree, not only a clean chop.
export const alwaysSaplingFor = (axeTier: number) => axeTier >= 3;

// The tool a find needs (veggies need none).
export function toolForVeggie(veggie: VeggieId): ToolId | null {
  if (veggie === 'crystal') return 'pickaxe';
  if (veggie === 'seashell' || veggie === 'inkpearl' || veggie === 'petal') return 'shovel';
  return null;
}

// The verbs on the map: "Mine Storm Crystal", "Dig up Seashell".
export const toolVerb = (tool: ToolId | null) => (tool === 'pickaxe' ? 'Mine' : tool === 'shovel' ? 'Dig up' : null);
