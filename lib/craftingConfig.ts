// lib/craftingConfig.ts
// Crafting at the Hideout (step 1, 2026-10-29; design https://claude.ai/artifact/PucK7VBAUSiiS7TndyeKeA).
// A recipe at a built station (the Workbench, the Compost Bin, the Kitchen) takes things from the
// bag, sometimes trash, and gold, and one right answer. Curio food is fed to curios at the Curio
// Camp for bond hearts.
//
// The rules live in supabase/migrations/20261029090000_crafting_step1.sql (craft_recipes,
// craft_item, feed_curio, take_curio_snack); the numbers here mirror them for the screen.
import { VEGGIES, gardenItemIcon, gardenItemLabel, veggieKey, type GardenBag, type VeggieId } from '@/lib/gardenConfig';
import { TRASH_ORDER } from '@/lib/trashConfig';
import type { TrashCounts } from '@/lib/itemBar';

export type StationId = 'workbench' | 'compost' | 'kitchen';

export const STATIONS: Record<StationId, { id: StationId; name: string; verb: string; use: string }> = {
  workbench: { id: 'workbench', name: 'Workbench', verb: 'Make', use: 'Make things for your Hideout.' },
  compost: { id: 'compost', name: 'Compost Bin', verb: 'Make', use: 'Turn trash and old veggies into rich soil.' },
  kitchen: { id: 'kitchen', name: 'Kitchen', verb: 'Cook', use: 'Cook food for you and your curios.' },
};
export const STATION_ORDER: StationId[] = ['kitchen', 'workbench', 'compost'];

// Inputs: bag keys and counts, plus 'any_veggie' (any of the 7 garden veggies, biggest piles
// first) and 'any_trash' (any trash in the bag).
export const ANY_VEGGIE = 'any_veggie';
export const ANY_TRASH = 'any_trash';

export interface RecipeDef {
  id: string;
  station: StationId;
  name: string;
  inputs: Record<string, number>;
  gold: number;
  // What it makes: a bag key (lib/gardenConfig.ts CRAFTED), or a Vault item (battle food).
  output: string;
  outputQty: number;
  outputTo: 'bag' | 'inventory';
  icon: string;
  // What it does, in a kid's words.
  does: string;
  // Kitchen food cooks for a while after the right answer (craft_recipes.cook_seconds).
  cookSeconds?: number;
  // In the recipe book but not makeable yet (later steps).
  soon?: string;
}

const kibbleIcon = '/craft/icon_food_kibble.png';

export const RECIPES: RecipeDef[] = [
  { id: 'curio_kibble', station: 'kitchen', name: 'Curio Kibble', inputs: { veggie_corn: 2, veggie_beans: 1 }, gold: 15,
    output: 'food_kibble', outputQty: 3, outputTo: 'bag', icon: kibbleIcon, cookSeconds: 45,
    does: 'Makes 3. Feed a curio for a bond heart, and its next mission gives 25% more EXP.' },
  { id: 'veggie_mash', station: 'kitchen', name: 'Veggie Mash', inputs: { veggie_pumpkin: 1, veggie_carrot: 1, veggie_cabbage: 1 }, gold: 15,
    output: 'food_mash', outputQty: 2, outputTo: 'bag', icon: '/craft/icon_food_mash.png', cookSeconds: 45,
    does: 'Makes 2. Feed a curio for a bond heart. Its next mission gives 25% more EXP and ends sooner.' },
  { id: 'veggie_stew', station: 'kitchen', name: 'Veggie Stew', inputs: { [ANY_VEGGIE]: 3 }, gold: 40,
    output: 'veggie_stew', outputQty: 1, outputTo: 'inventory', icon: '/craft/icon_veggie_stew.png', cookSeconds: 90,
    does: 'Use it in battle: heals 60 HP and cures your curio, all in one turn.' },
  { id: 'stone_ring', station: 'workbench', name: 'Stone Ring', inputs: { veggie_crystal: 3 }, gold: 20,
    output: 'stone_ring', outputQty: 1, outputTo: 'bag', icon: '/craft/icon_stone_ring.png',
    does: 'Stones around a tree spot. Tree spots need them to be built.' },
  { id: 'garden_soil', station: 'compost', name: 'Garden Soil', inputs: { [ANY_TRASH]: 5, [ANY_VEGGIE]: 1 }, gold: 10,
    output: 'garden_soil', outputQty: 1, outputTo: 'bag', icon: '/craft/icon_garden_soil.png',
    does: 'Rich soil for a tree spot. Tree spots need it to be built.' },
  // Coming in later steps: shown grey in the recipe book.
  { id: 'element_treats', station: 'kitchen', name: 'Element Treats', inputs: {}, gold: 0, output: '', outputQty: 1, outputTo: 'bag',
    icon: kibbleIcon, does: 'A treat for each element, from each region.', soon: "The regions' guild masters will teach these." },
  { id: 'pumpkin_soup', station: 'kitchen', name: 'Pumpkin Soup', inputs: {}, gold: 0, output: '', outputQty: 1, outputTo: 'inventory',
    icon: '/craft/icon_veggie_stew.png', does: 'Heals now and again next turn.', soon: 'The Shopkeeper will sell this recipe.' },
  { id: 'storage_chest', station: 'workbench', name: 'Storage Chest', inputs: {}, gold: 0, output: '', outputQty: 1, outputTo: 'bag',
    icon: '/craft/icon_stone_ring.png', does: 'More room for your things.', soon: 'Coming soon!' },
  { id: 'fertilizer', station: 'compost', name: 'Fertilizer', inputs: {}, gold: 0, output: '', outputQty: 1, outputTo: 'bag',
    icon: '/craft/icon_garden_soil.png', does: 'Makes your garden grow faster.', soon: 'Coming soon!' },
];
export const recipeById = (id: string) => RECIPES.find(r => r.id === id) ?? null;
export const recipesAt = (station: StationId) => RECIPES.filter(r => r.station === station);

// The 7 garden veggies (not shells, crystals and the other finds).
export const GARDEN_VEGGIES: VeggieId[] = (Object.keys(VEGGIES) as VeggieId[]).filter(v => !VEGGIES[v].found);

// Takes n from the biggest piles first (craft_take_from). Null when there isn't enough.
export function takeFrom(have: Record<string, number>, n: number): Record<string, number> | null {
  const out: Record<string, number> = {};
  let left = n;
  for (const [k, q] of Object.entries(have).filter(([, q]) => q > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    if (left <= 0) break;
    const t = Math.min(q, left);
    out[k] = t;
    left -= t;
  }
  return left > 0 ? null : out;
}

export interface RecipeCheck {
  // Each input: what it takes, what the kid has, its words and icon.
  lines: { key: string; need: number; have: number; label: string; icon: string }[];
  enoughItems: boolean;
  enoughGold: boolean;
}

export function checkRecipe(r: RecipeDef, bag: GardenBag, trash: TrashCounts, gold: number): RecipeCheck {
  const named = (k: string) => r.inputs[k] ?? 0;
  const lines = Object.entries(r.inputs).map(([key, need]) => {
    if (key === ANY_TRASH) {
      const have = TRASH_ORDER.reduce((s, t) => s + (trash[t] ?? 0), 0);
      return { key, need, have, label: 'Trash (any kind)', icon: '/craft/icon_trash.png' };
    }
    if (key === ANY_VEGGIE) {
      // Veggies the recipe names itself are kept for that.
      const have = GARDEN_VEGGIES.reduce((s, v) => s + Math.max(0, (bag[veggieKey(v)] ?? 0) - named(veggieKey(v))), 0);
      return { key, need, have, label: need === 1 ? 'Veggie (any kind)' : 'Veggies (any kind)', icon: gardenItemIcon(veggieKey('tomato')) };
    }
    return { key, need, have: bag[key] ?? 0, label: gardenItemLabel(key), icon: gardenItemIcon(key) };
  });
  return { lines, enoughItems: lines.every(l => l.have >= l.need), enoughGold: gold >= r.gold };
}

// ── Bond hearts (feed_curio) ────────────────────────────────────────────────
export const MAX_BOND_HEARTS = 5;
export const FEEDS_A_DAY = 2;
export const HEART_FADE_MS = 24 * 60 * 60 * 1000;
// Each heart: +2% battle damage and +2% mission EXP. Sibling battles get half.
export const BOND_BONUS_PER_HEART = 0.02;
export const CURIO_FOODS = ['food_kibble', 'food_mash'] as const;
export type CurioFood = typeof CURIO_FOODS[number];
// A snack eaten before a mission: more EXP, and Veggie Mash makes the mission shorter.
export const SNACK_EXP_BONUS = 0.25;
export const MASH_TIME_FACTOR = 0.75;

export interface BondFields {
  bond_hearts?: number | null;
  bond_at?: string | null;
  fed_day?: string | null;
  fed_count?: number | null;
  snack?: string | null;
  snack_at?: string | null;
}

// Hearts now, after fading (bond_hearts_now): one goes for each full day since the last feed.
export function bondHeartsNow(m: BondFields | null | undefined, now = Date.now()): number {
  if (!m?.bond_at || !m.bond_hearts) return 0;
  const days = Math.floor((now - new Date(m.bond_at).getTime()) / HEART_FADE_MS);
  return Math.max(0, Math.min(MAX_BOND_HEARTS, m.bond_hearts - Math.max(0, days)));
}

// When the next heart fades (null: no hearts).
export function nextHeartFadesAt(m: BondFields | null | undefined, now = Date.now()): number | null {
  if (bondHeartsNow(m, now) <= 0 || !m?.bond_at) return null;
  const at = new Date(m.bond_at).getTime();
  const days = Math.max(0, Math.floor((now - at) / HEART_FADE_MS));
  return at + (days + 1) * HEART_FADE_MS;
}

export const feedsLeftToday = (m: BondFields | null | undefined, today: string) =>
  Math.max(0, FEEDS_A_DAY - (m?.fed_day === today ? m.fed_count ?? 0 : 0));

// The battle damage multiplier for a curio's bond. Sibling battles get half, so feeding never
// decides a match between two kids.
export const bondDamageMult = (m: BondFields | null | undefined, versusKid = false) =>
  1 + bondHeartsNow(m) * BOND_BONUS_PER_HEART * (versusKid ? 0.5 : 1);

// The kid-friendly name for each heart count.
export const bondTitle = (hearts: number) =>
  hearts >= 5 ? 'Best Buddy' : hearts >= 3 ? 'Buddy' : hearts >= 1 ? 'Friend' : null;
