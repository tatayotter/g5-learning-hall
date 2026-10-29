// lib/crafting.ts
// Reads and writes for crafting and bond hearts (lib/craftingConfig.ts). Everything goes through
// the RPCs in supabase/migrations/20261029090000_crafting_step1.sql (cooking:
// 20261029130000_kitchen_cooking_time.sql), which answer with the bag
// (and the trash, for crafting) so the screen just takes those.
import { supabase } from '@/lib/supabase';
import type { GardenBag } from '@/lib/gardenConfig';
import type { TrashType } from '@/lib/trashConfig';
import type { BondFields } from '@/lib/craftingConfig';

function cleanCounts(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) out[k] = Math.floor(n);
    }
  }
  return out;
}

export interface CraftResult {
  // 'crafted', 'cooking' (it's in the Kitchen's pot), 'busy' (the pot is full), 'wrong',
  // 'no_station', 'items', 'gold', or 'failed' (no answer).
  status: string;
  recipe: string | null;
  correct: boolean | null;
  correctAnswer: string | null;
  // The first time this kid made it: it goes in their recipe book.
  first: boolean;
  outputQty: number;
  // Cooking: when it's done.
  readyAt: number | null;
  bag: GardenBag | null;
  trash: Partial<Record<TrashType, number>> | null;
  progress: { gold: number; xp: number; level: number } | null;
}

export async function craftItem(userId: string, recipe: string, questionId: string, selected: string, entryId: string): Promise<CraftResult> {
  const { data, error } = await supabase.rpc('craft_item', {
    p_user_id: userId, p_recipe: recipe, p_question_id: questionId, p_selected: selected, p_entry_id: entryId,
  });
  if (error || !data) {
    if (error) console.error('craft_item error:', error);
    return { status: 'failed', recipe: null, correct: null, correctAnswer: null, first: false, outputQty: 0, readyAt: null, bag: null, trash: null, progress: null };
  }
  return {
    status: data.status ?? 'failed',
    recipe: data.recipe ?? null,
    correct: data.correct ?? null,
    correctAnswer: data.correct_answer ?? null,
    first: !!data.first,
    outputQty: data.output_qty ?? 0,
    readyAt: data.ready_at ? Date.parse(data.ready_at) : null,
    bag: data.bag ? cleanCounts(data.bag) : null,
    trash: data.trash ? cleanCounts(data.trash) as Partial<Record<TrashType, number>> : null,
    progress: data.progress ?? null,
  };
}

// Food cooking in a station's pot (the Kitchen), from the right answer until the kid collects it.
export interface CookingPot {
  station: string;
  recipe: string;
  startedAt: number;
  readyAt: number;
}

export async function fetchCooking(userId: string): Promise<CookingPot[] | null> {
  const { data, error } = await supabase.from('player_cooking').select('station, recipe_id, started_at, ready_at').eq('user_id', userId);
  if (error) return null;
  return (data ?? []).map(r => ({
    station: r.station as string, recipe: r.recipe_id as string,
    startedAt: Date.parse(r.started_at as string), readyAt: Date.parse(r.ready_at as string),
  }));
}

export interface CollectResult {
  // 'collected', 'not_ready', 'empty', or 'failed'.
  status: string;
  recipe: string | null;
  outputQty: number;
  bag: GardenBag | null;
}

export async function collectCooking(userId: string, station: string): Promise<CollectResult> {
  const { data, error } = await supabase.rpc('collect_cooking', { p_user_id: userId, p_station: station });
  if (error || !data) {
    if (error) console.error('collect_cooking error:', error);
    return { status: 'failed', recipe: null, outputQty: 0, bag: null };
  }
  return { status: data.status ?? 'failed', recipe: data.recipe ?? null, outputQty: data.output_qty ?? 0, bag: data.bag ? cleanCounts(data.bag) : null };
}

// The recipes this kid has made, and how many times (the recipe book).
export async function fetchMadeRecipes(userId: string): Promise<Record<string, number> | null> {
  const { data, error } = await supabase.from('player_recipes').select('recipe_id, times').eq('user_id', userId);
  if (error) return null;
  return Object.fromEntries((data ?? []).map(r => [r.recipe_id as string, r.times as number]));
}

export interface FeedResult {
  // 'fed', 'no_curio', 'no_camp', 'no_food', 'full', or 'failed'.
  status: string;
  curio: (BondFields & { id: string }) | null;
  bag: GardenBag | null;
}

export async function feedCurio(userId: string, curioId: string, food: string): Promise<FeedResult> {
  const { data, error } = await supabase.rpc('feed_curio', { p_user_id: userId, p_curio_id: curioId, p_food: food });
  if (error || !data) {
    if (error) console.error('feed_curio error:', error);
    return { status: 'failed', curio: null, bag: null };
  }
  return { status: data.status ?? 'failed', curio: data.curio_row ?? null, bag: data.bag ? cleanCounts(data.bag) : null };
}

// A curio setting off on a mission takes its snack (eaten in the last day) along. Null: none.
export async function takeCurioSnack(userId: string, curioId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('take_curio_snack', { p_user_id: userId, p_curio_id: curioId });
  if (error) { console.warn('take_curio_snack error:', error.message); return null; }
  return typeof data === 'string' ? data : null;
}
