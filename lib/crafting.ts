// lib/crafting.ts
// Reads and writes for crafting and bond hearts (lib/craftingConfig.ts). Everything goes through
// the RPCs in supabase/migrations/20261029090000_crafting_step1.sql, which answer with the bag
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
  // 'crafted', 'wrong', 'no_station', 'items', 'gold', or 'failed' (no answer).
  status: string;
  correct: boolean | null;
  correctAnswer: string | null;
  // The first time this kid made it: it goes in their recipe book.
  first: boolean;
  outputQty: number;
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
    return { status: 'failed', correct: null, correctAnswer: null, first: false, outputQty: 0, bag: null, trash: null, progress: null };
  }
  return {
    status: data.status ?? 'failed',
    correct: data.correct ?? null,
    correctAnswer: data.correct_answer ?? null,
    first: !!data.first,
    outputQty: data.output_qty ?? 0,
    bag: data.bag ? cleanCounts(data.bag) : null,
    trash: data.trash ? cleanCounts(data.trash) as Partial<Record<TrashType, number>> : null,
    progress: data.progress ?? null,
  };
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
