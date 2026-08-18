// lib/guildEngine.ts
import { supabase } from '@/lib/supabase';
import { CURRENT_TERM, PREFETCH_BATCH_SIZE, MIN_SESSION_POOL_SIZE } from '@/lib/guildConfig';
import type { GuildKey } from '@/lib/dailyChecklist';
import { GUILD_MONSTERS, MonsterDef } from '@/lib/monsterConfig';
import type { QualityTier } from '@/lib/curioQuality';
import {
  isOfflineStorageAvailable, cacheGuildPool, getCachedGuildPoolAnyTier,
  getLocallyCompletedQuestionIds, markQuestionsCompletedLocal,
  getCachedSubclassProfile, updateSubclassProfileLocal, cacheSubclassProfile,
} from '@/lib/localDataSource';
import { isAppOffline } from '@/lib/offlineState';

// Best-effort mirror of a freshly fetched guild pool into the on-device
// SQLite cache, so the Android offline shell has something to serve next
// time there's no connection. Never allowed to affect the online path —
// swallow any failure (missing native plugin, disk error, etc).
async function cacheGuildPoolSafe(tableName: string, questType: string, gradeLevel: number | undefined, tier: number | null, questions: any[]) {
  if (!isOfflineStorageAvailable()) return;
  try {
    await cacheGuildPool(tableName, questType, gradeLevel, tier, questions);
  } catch (e) {
    console.error('Offline cache write failed (non-fatal):', e);
  }
}

// Guild level at which a player is rewarded their guild's companion monster.
export const GUILD_MONSTER_GRANT_LEVEL = 5;

export interface SubclassProfile {
  lorekeeper_lvl: number;
  lorekeeper_xp: number;
  lorekeeper_tier: number;
  spellcaster_lvl: number;
  spellcaster_xp: number;
  spellcaster_tier: number;
  number_realm_lvl: number;
  number_realm_xp: number;
  number_realm_tier: number;
  logic_labyrinth_lvl: number;
  logic_labyrinth_xp: number;
  logic_labyrinth_tier: number;
  lexicon_arena_lvl: number;
  lexicon_arena_xp: number;
  lexicon_arena_tier: number;
}

export const MAX_DIFFICULTY_TIER = 3;

// Only the 5 sq_* guild quizzes track a difficulty tier — Monster Arena
// (questType 'monster_arena') pulls from embedded weekly_packages JSON and
// isn't in this map, so it falls back to the untiered fetch path below.
const GUILD_TIER_FIELD: Partial<Record<string, keyof SubclassProfile>> = {
  lorekeeper: 'lorekeeper_tier',
  spellcaster: 'spellcaster_tier',
  number_realm: 'number_realm_tier',
  logic_labyrinth: 'logic_labyrinth_tier',
  lexicon_arena: 'lexicon_arena_tier',
};

export async function fetchSubclassProfile(userId: string): Promise<SubclassProfile | null> {
  if (isOfflineStorageAvailable() && isAppOffline()) {
    return getCachedSubclassProfile(userId);
  }

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
  if (data && isOfflineStorageAvailable()) {
    void cacheSubclassProfileSafe(userId, data as SubclassProfile);
  }
  return data as SubclassProfile | null;
}

async function cacheSubclassProfileSafe(userId: string, profile: SubclassProfile) {
  try {
    await cacheSubclassProfile(userId, profile);
  } catch (e) {
    console.error('Offline cache write failed (non-fatal):', e);
  }
}

export async function updateSubclassProfile(userId: string, fields: Partial<SubclassProfile>) {
  if (isOfflineStorageAvailable() && isAppOffline()) {
    await updateSubclassProfileLocal(userId, fields);
    return;
  }

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

  // Simplified offline: skip the companion-monster grant/reveal entirely —
  // it resolves correctly next time this level-up condition is evaluated
  // online (the caller already treats a null return as "nothing granted").
  if (isOfflineStorageAvailable() && isAppOffline()) return null;

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

// The species def for a guild's own companion monster (see GUILD_MONSTERS) —
// callers that need the actual MonsterDef (rather than just its id) use this
// instead of duplicating the GUILD_MONSTER_ID map's species keys themselves.
export function getCompanionSpeciesDef(guildKey: GuildKey): MonsterDef | undefined {
  return GUILD_MONSTERS[GUILD_MONSTER_ID[guildKey]];
}

// Whether a guild level-up from oldLevel -> newLevel just crossed that
// guild's companion's tier2 or tier3 evolution threshold (see
// MonsterDef.guildEvolution) — i.e. it's a "graduation event" moment, same
// as the level-5 grant check above but for the two automatic evolutions
// that follow it. Checks tier3 first since a big enough XP dump (e.g. a
// perfect Weekly Review) can cross both thresholds in a single session —
// the ceremony should show the highest tier actually reached, not stall on
// tier2. Returns null if neither threshold was crossed, or the species has
// no guildEvolution at all.
export function getCompanionTierCrossed(guildKey: GuildKey, oldLevel: number, newLevel: number): 2 | 3 | null {
  const evo = getCompanionSpeciesDef(guildKey)?.guildEvolution;
  if (!evo) return null;
  if (oldLevel < evo.tier3.level && newLevel >= evo.tier3.level) return 3;
  if (oldLevel < evo.tier2.level && newLevel >= evo.tier2.level) return 2;
  return null;
}

// The owned instance's own level/quality for the guild companion species —
// needed by GraduationCeremonyModal's before/after stat comparison, which
// scales off the *monster's* level (independent of guild level) and its
// Tutor quality roll. Checks user_monsters (promoted to team) first, then
// user_caught_monsters (still benched) — a guild companion lives in exactly
// one of those tables. Falls back to a fresh lv1 normal-quality instance if
// neither row is found, which shouldn't happen once a tier has actually been
// crossed (the tier1 grant guarantees a row exists by then), but keeps the
// ceremony's stat math from throwing on an unexpected gap instead of hard-failing.
export async function fetchCompanionInstanceStats(userId: string, guildKey: GuildKey): Promise<{ level: number; quality: QualityTier }> {
  const monsterId = GUILD_MONSTER_ID[guildKey];
  const fallback = { level: 1, quality: 'normal' as QualityTier };
  if (!monsterId) return fallback;

  const [{ data: owned }, { data: caught }] = await Promise.all([
    supabase.from('user_monsters').select('monster_level, quality').eq('user_id', userId).eq('monster_id', monsterId).limit(1).maybeSingle(),
    supabase.from('user_caught_monsters').select('monster_level, quality').eq('user_id', userId).eq('monster_id', monsterId).limit(1).maybeSingle(),
  ]);
  const row = owned ?? caught;
  if (!row) return fallback;
  return { level: row.monster_level ?? 1, quality: (row.quality as QualityTier) ?? 'normal' };
}

// Fetch a fresh, non-repeating batch of questions for a given guild's table,
// scoped to the player's current difficulty tier for that guild (1-3).
//
// When the tier's pool is exhausted (everything already completed), we
// advance the player's stored tier by 1 and serve that tier's pool instead —
// no history wipe needed, since user_completed_questions only contains this
// tier's question ids, so the next tier's rows are naturally "not completed"
// yet. Only once tier 3 itself is exhausted do we fall back to the old
// "prestige" behavior: wipe history for this guild and recycle its hardest pool.
export async function fetchQuestionPool(userId: string, tableName: string, questType: string, gradeLevel?: number): Promise<any[]> {
  const USER_ID = userId;
  const tierField = GUILD_TIER_FIELD[questType];

  // Offline: serve from whatever's cached, no tier-advance/prestige logic
  // (that requires writing back to the subclass profile's tier field — kept
  // simple here since it resolves correctly once back online anyway).
  if (isOfflineStorageAvailable() && isAppOffline()) {
    const [pool, completedIds] = await Promise.all([
      getCachedGuildPoolAnyTier(tableName, questType, gradeLevel),
      getLocallyCompletedQuestionIds(USER_ID, questType),
    ]);
    const remaining = pool.filter((q: any) => !completedIds.has(q.id));
    const source = remaining.length > 0 ? remaining : pool;
    return source.slice(0, PREFETCH_BATCH_SIZE);
  }

  const [{ data: completed }, profile] = await Promise.all([
    supabase
      .from('user_completed_questions')
      .select('question_id')
      .eq('user_id', USER_ID)
      .eq('quest_type', questType),
    tierField ? fetchSubclassProfile(USER_ID) : Promise.resolve(null),
  ]);

  // Completed IDs are excluded client-side rather than via a `.not(id, in, ...)`
  // filter — with hundreds of completed questions that filter's URL grows past
  // server/proxy length limits and the request fails outright.
  const completedIds = new Set((completed || []).map((c: any) => c.question_id));

  async function fetchPool(tier: number | null): Promise<any[]> {
    let query = supabase
      .from(tableName)
      .select('*')
      .eq('term_id', CURRENT_TERM)
      .eq('is_active', true);
    if (gradeLevel !== undefined) query = query.eq('grade_level', gradeLevel);
    if (tier !== null) query = query.eq('difficulty_tier', tier);
    const { data, error } = await query;
    if (error) {
      console.error(`Failed to fetch ${tableName} questions:`, error);
      return [];
    }
    void cacheGuildPoolSafe(tableName, questType, gradeLevel, tier, data || []);
    return data || [];
  }

  // Top up a too-small "remaining" pool with already-completed questions from
  // the wider pool so a session isn't just 1-2 distinct questions on repeat —
  // still prefers fresh questions first, just pads with seen ones if needed.
  function withTopUp(remaining: any[], widerPool: any[]): any[] {
    if (remaining.length >= MIN_SESSION_POOL_SIZE) return remaining;
    const remainingIds = new Set(remaining.map((q: any) => q.id));
    const topUp = widerPool.filter((q: any) => !remainingIds.has(q.id));
    return [...remaining, ...topUp.slice(0, MIN_SESSION_POOL_SIZE - remaining.length)];
  }

  if (!tierField) {
    const data = await fetchPool(null);
    const remaining = data.filter((q: any) => !completedIds.has(q.id));
    if (remaining.length > 0) return withTopUp(remaining, data).slice(0, PREFETCH_BATCH_SIZE);
    await supabase.from('user_completed_questions').delete().eq('user_id', USER_ID).eq('quest_type', questType);
    return data.slice(0, PREFETCH_BATCH_SIZE);
  }

  const currentTier = (profile?.[tierField] as number | undefined) ?? 1;

  // Fallback guard: this guild may not have any content authored yet at the
  // player's tier (all 4 non-SpellCaster guilds start here) — serve whatever
  // exists across all tiers rather than an empty pool.
  let tierPool = await fetchPool(currentTier);
  if (tierPool.length === 0) tierPool = await fetchPool(null);

  const remaining = tierPool.filter((q: any) => !completedIds.has(q.id));
  if (remaining.length > 0) {
    return withTopUp(remaining, tierPool).slice(0, PREFETCH_BATCH_SIZE);
  }

  if (currentTier < MAX_DIFFICULTY_TIER) {
    const nextTier = currentTier + 1;
    await updateSubclassProfile(USER_ID, { [tierField]: nextTier } as Partial<SubclassProfile>);
    let nextPool = await fetchPool(nextTier);
    if (nextPool.length === 0) nextPool = await fetchPool(null);
    return nextPool.slice(0, PREFETCH_BATCH_SIZE);
  }

  // Already at max tier and its pool is exhausted — prestige: wipe history
  // for this guild and recycle the hardest pool.
  await supabase.from('user_completed_questions').delete().eq('user_id', USER_ID).eq('quest_type', questType);
  return tierPool.slice(0, PREFETCH_BATCH_SIZE);
}

export async function markQuestionsCompleted(userId: string, questType: string, questionIds: string[]) {
  if (questionIds.length === 0) return;

  if (isOfflineStorageAvailable() && isAppOffline()) {
    await markQuestionsCompletedLocal(userId, questType, questionIds);
    return;
  }

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
// Monster Arena questions now carry a real, stable content_questions.id (Phase 4 Wave 3, see
// docs/weekly-progress-redesign-plan.md) instead of a hash derived from question text — the old
// hashQuestionId/arenaQuestionText helpers are gone, `question_id` below is just `q.id` directly.
// Editing a question's wording no longer resets everyone's "already answered" state for it.

export const MONSTER_ARENA_QUEST_TYPE = 'monster_arena';

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
    question_id: q.id,
  }));
  const { error } = await supabase.from('user_completed_questions').insert(rows);
  if (error) {
    console.error('Failed to mark arena questions completed:', error);
  }
}

// Grades a single Monster Guild question (grass encounters, trainer battles, PvP battles)
// server-side, by stable question id — replaces the old text-matching grade_monster_question
// RPC. The `questions` fed into BattleQuestionModal come from content_questions_public, which
// strips correct_answer out of every question, so correctness can't be checked client-side.
export async function gradeMonsterQuestion(
  userId: string,
  questionId: string,
  selected: string
): Promise<{ correct: boolean; correctAnswer: string | null }> {
  const { data, error } = await supabase.rpc('grade_content_question', {
    p_user_id: userId,
    p_question_id: questionId,
    p_selected: selected,
  });
  if (error || !data) {
    console.error('Failed to grade monster question:', error);
    return { correct: false, correctAnswer: null };
  }
  return { correct: !!data.correct, correctAnswer: data.correct_answer ?? null };
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
