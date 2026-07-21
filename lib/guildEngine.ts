// lib/guildEngine.ts
import { supabase } from '@/lib/supabase';
import { CURRENT_TERM, PREFETCH_BATCH_SIZE } from '@/lib/guildConfig';
import type { GuildKey } from '@/lib/dailyChecklist';
import { GUILD_MONSTERS } from '@/lib/monsterConfig';

// Guild level at which a player is rewarded their guild's companion monster.
export const GUILD_MONSTER_GRANT_LEVEL = 5;

export interface SubclassProfile {
  lorekeeper_lvl: number;
  lorekeeper_xp: number;
  spellcaster_lvl: number;
  spellcaster_xp: number;
  number_realm_lvl: number;
  number_realm_xp: number;
  logic_labyrinth_lvl: number;
  logic_labyrinth_xp: number;
  lexicon_arena_lvl: number;
  lexicon_arena_xp: number;
}

export async function fetchSubclassProfile(userId: string): Promise<SubclassProfile | null> {
  const USER_ID = userId;
  const { data, error } = await supabase
    .from('user_subclass_profiles')
    .select('*')
    .eq('user_id', USER_ID)
    .maybeSingle();
  if (error) {
    console.error('Failed to fetch subclass profile:', error);
    return null;
  }
  return data as SubclassProfile | null;
}

export async function updateSubclassProfile(userId: string, fields: Partial<SubclassProfile>) {
  const USER_ID = userId;
  const { error } = await supabase
    .from('user_subclass_profiles')
    .update(fields)
    .eq('user_id', USER_ID);
  if (error) {
    console.error('Failed to update subclass profile:', error);
  }
}

const GUILD_LEVEL_FIELD: Record<GuildKey, keyof SubclassProfile> = {
  lorekeeper: 'lorekeeper_lvl',
  spellcaster: 'spellcaster_lvl',
  number_realm: 'number_realm_lvl',
  logic_labyrinth: 'logic_labyrinth_lvl',
  lexicon_arena: 'lexicon_arena_lvl',
};

const GUILD_MONSTER_ID: Record<GuildKey, string> = {
  lorekeeper: 'lorekeeper_familiar',
  spellcaster: 'spellcaster_familiar',
  number_realm: 'numberrealm_familiar',
  logic_labyrinth: 'logiclabyrinth_familiar',
  lexicon_arena: 'lexiconarena_familiar',
};

// Reads a player's level in a given guild off their SubclassProfile. Returns
// 0 (safely resolves to tier 1 display) if the profile or guildKey is missing.
export function guildLevelForKey(profile: SubclassProfile | null | undefined, guildKey: GuildKey | undefined): number {
  if (!profile || !guildKey) return 0;
  return profile[GUILD_LEVEL_FIELD[guildKey]] as number;
}

// Grants the guild's companion monster (see GUILD_MONSTERS in lib/monsterConfig.ts)
// into the player's caught-monsters bench the first time that guild reaches
// GUILD_MONSTER_GRANT_LEVEL. Call once per level-up, guarded by the caller so
// it only fires on the level-5 crossing turn. Safe to call more than once —
// checks for an existing catch first. Returns the granted monster id (so the
// caller can show a "new curio" reveal), or null if nothing was granted.
export async function ensureGuildMonsterGranted(userId: string, guildKey: GuildKey): Promise<string | null> {
  const monsterId = GUILD_MONSTER_ID[guildKey];
  if (!monsterId || !GUILD_MONSTERS[monsterId]) return null;

  const [{ data: owned }, { data: caught }] = await Promise.all([
    supabase.from('user_monsters').select('id').eq('user_id', userId).eq('monster_id', monsterId).limit(1),
    supabase.from('user_caught_monsters').select('id').eq('user_id', userId).eq('monster_id', monsterId).limit(1),
  ]);
  if ((owned && owned.length > 0) || (caught && caught.length > 0)) return null;

  const { error } = await supabase.from('user_caught_monsters').insert({
    user_id: userId, monster_id: monsterId, monster_level: 1, monster_exp: 0,
  });
  if (error) {
    console.error('Failed to grant guild companion monster:', error);
    return null;
  }
  return monsterId;
}

// Fetch a fresh, non-repeating batch of questions for a given guild's table.
// If the pool is exhausted (everything already completed), it "prestiges":
// wipes the completed-questions history for that quest_type and starts fresh.
export async function fetchQuestionPool(userId: string, tableName: string, questType: string, gradeLevel?: number): Promise<any[]> {
  const USER_ID = userId;

  const { data: completed } = await supabase
    .from('user_completed_questions')
    .select('question_id')
    .eq('user_id', USER_ID)
    .eq('quest_type', questType);

  const completedIds = (completed || []).map((c: any) => c.question_id);

  let query = supabase
    .from(tableName)
    .select('*')
    .eq('term_id', CURRENT_TERM)
    .eq('is_active', true)
    .limit(PREFETCH_BATCH_SIZE);

  if (gradeLevel !== undefined) {
    query = query.eq('grade_level', gradeLevel);
  }

  if (completedIds.length > 0) {
    query = query.not('id', 'in', `(${completedIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) {
    console.error(`Failed to fetch ${tableName} questions:`, error);
    return [];
  }

  // Pool exhausted — prestige: wipe history for this guild and refetch full pool
  if (!data || data.length === 0) {
    await supabase
      .from('user_completed_questions')
      .delete()
      .eq('user_id', USER_ID)
      .eq('quest_type', questType);

    let freshQuery = supabase
      .from(tableName)
      .select('*')
      .eq('term_id', CURRENT_TERM)
      .eq('is_active', true)
      .limit(PREFETCH_BATCH_SIZE);

    if (gradeLevel !== undefined) {
      freshQuery = freshQuery.eq('grade_level', gradeLevel);
    }

    const { data: freshData, error: freshError } = await freshQuery;

    if (freshError) {
      console.error(`Failed to fetch fresh ${tableName} pool after prestige:`, freshError);
      return [];
    }
    return freshData || [];
  }

  return data;
}

export async function markQuestionsCompleted(userId: string, questType: string, questionIds: string[]) {
  if (questionIds.length === 0) return;
  const USER_ID = userId;
  const rows = questionIds.map((id: string) => ({
    user_id: USER_ID,
    quest_type: questType,
    question_id: id
  }));
  const { error } = await supabase.from('user_completed_questions').insert(rows);
  if (error) {
    console.error('Failed to mark questions completed:', error);
  }
}

// ─── Monster Arena question tracking ──────────────────────────────────────────
// Monster Arena questions come from weekly_packages.package_data (embedded JSON,
// no stable id), unlike the sq_* guild tables above. We derive a deterministic
// id from the question text so the same user_completed_questions table can
// track "already asked" per player without a schema change to package_data.

export const MONSTER_ARENA_QUEST_TYPE = 'monster_arena';

export function hashQuestionId(text: string): string {
  const seeds = [0x811c9dc5, 0x1000193, 0x9e3779b9, 0x85ebca6b];
  const hex = seeds.map(seed => {
    let hash = seed >>> 0;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function arenaQuestionText(q: any): string {
  return q.question || q.problem_prompt || '';
}

export async function fetchAnsweredArenaQuestionIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_completed_questions')
    .select('question_id')
    .eq('user_id', userId)
    .eq('quest_type', MONSTER_ARENA_QUEST_TYPE);
  return new Set((data || []).map((row: any) => row.question_id));
}

export async function markArenaQuestionsCompleted(userId: string, questions: any[]) {
  if (questions.length === 0) return;
  const rows = questions.map(q => ({
    user_id: userId,
    quest_type: MONSTER_ARENA_QUEST_TYPE,
    question_id: hashQuestionId(arenaQuestionText(q)),
  }));
  const { error } = await supabase.from('user_completed_questions').insert(rows);
  if (error) {
    console.error('Failed to mark arena questions completed:', error);
  }
}

// Prestige: wipe a player's Monster Arena history so a fresh round starts
// once they've seen every question in the current pool.
export async function resetArenaHistory(userId: string) {
  const { error } = await supabase
    .from('user_completed_questions')
    .delete()
    .eq('user_id', userId)
    .eq('quest_type', MONSTER_ARENA_QUEST_TYPE);
  if (error) {
    console.error('Failed to reset arena question history:', error);
  }
}
