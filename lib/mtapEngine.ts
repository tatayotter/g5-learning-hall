// lib/mtapEngine.ts
// Data/engine layer for the MTAP Expansion Pack (Student Enrichment Content).
// Mirrors lib/guildEngine.ts's shape (fetch pool, grade an answer, track
// attempts) but reads mtap_expansion_content / mtap_question_attempts instead
// of the sq_* guild tables — see supabase/migrations/20260828130000_add_mtap_expansion_content_schema.sql
// and 20260905160000_add_mtap_expansion_attempts_and_grading.sql for the schema.
import { supabase } from '@/lib/supabase';
import { MIXED_TRAINER_TIER_MIX, TIERS } from '@/lib/mtapContent';
import type { MtapTier, MtapStrandDef } from '@/lib/mtapContent';

export interface MtapQuestion {
  id: string;
  question_code: string;
  grade: number;
  strand: number;
  archetype: string;
  tier: MtapTier;
  question: string;
  options: string[];
  time_budget_seconds: number;
  visual: { type: string; markdown_table?: string; image_url?: string } | null;
}

export interface MtapAttempt {
  archetype: string;
  tier: MtapTier;
  correct: boolean;
  created_at: string;
}

export interface MtapGradeResult {
  correct: boolean;
  correct_answer: string;
  solution_steps: string;
  technique: string | null;
  reward_eligible: boolean;
}

export interface MixedTrainerRewardResult {
  granted: boolean;
  growth_pills?: number;
  reason?: 'set_too_small' | 'unverified' | 'already_claimed_today';
}

// Fetches every reviewed question for one archetype+tier — the whole bank (up to
// 8), not a single quiz-sized sample, so the player component can shuffle/track
// which ones haven't been seen this session itself. mtap_expansion_content_public
// never includes correct_answer/solution_steps (same answer-stripping guarantee
// content_questions_public gives QuestModule) — those only come back through
// gradeMtapAnswer below, after a real attempt.
export async function fetchMtapQuestions(grade: number, archetype: string, tier: MtapTier): Promise<MtapQuestion[]> {
  const { data, error } = await supabase
    .from('mtap_expansion_content_public')
    .select('*')
    .eq('grade', grade)
    .eq('archetype', archetype)
    .eq('tier', tier);
  if (error) {
    console.error('Failed to fetch mtap questions:', error);
    return [];
  }
  return (data || []) as MtapQuestion[];
}

// One example question per tier for a whole strand's worth of archetypes — the
// Reviewer's data source. Deliberately pulls from the SAME table the quiz reads,
// so every worked example the reviewer shows is guaranteed to match a real,
// verified row rather than drifting from what the app actually serves (the
// "reviewer generated FROM the question bank" rule in
// content/mtap-expansion-overview.md). Answer-bearing fields aren't in the
// public view, so this fetches through gradeMtapAnswer's own path isn't
// possible here — the Reviewer instead reads the full row via a dedicated RPC
// (see grade_mtap_expansion_answer's sibling below) is NOT used for this;
// instead the base table's answer fields are exposed read-only for `reviewed`
// rows via a second, explicitly answer-INCLUDING view — see
// mtap_expansion_content_reviewer below.
export async function fetchMtapReviewerExamples(grade: number, strand: number): Promise<Record<string, Record<MtapTier, MtapReviewerRow | null>>> {
  const { data, error } = await supabase
    .from('mtap_expansion_content_reviewer')
    .select('*')
    .eq('grade', grade)
    .eq('strand', strand);
  if (error) {
    console.error('Failed to fetch mtap reviewer examples:', error);
    return {};
  }
  const byArchetype: Record<string, Record<MtapTier, MtapReviewerRow | null>> = {};
  for (const row of (data || []) as MtapReviewerRow[]) {
    if (!byArchetype[row.archetype]) {
      byArchetype[row.archetype] = { easy: null, average: null, difficult: null };
    }
    // One example per tier — keep the first one seen (question_code order is
    // stable/ascending from generation, so this is deterministic, not random).
    if (!byArchetype[row.archetype][row.tier]) {
      byArchetype[row.archetype][row.tier] = row;
    }
  }
  return byArchetype;
}

export interface MtapReviewerRow extends MtapQuestion {
  correct_answer: string;
  solution_steps: string;
}

// Full attempt history for a user, scoped to one grade — used entirely
// client-side to compute tier-unlock/mastery status (see computeTierUnlocks
// below). This is a pacing/UX read, not a security-sensitive one: RLS already
// restricts it to the caller's own rows (mtap_question_attempts_select_own).
export async function fetchMtapAttempts(userId: string, grade: number): Promise<MtapAttempt[]> {
  const { data, error } = await supabase
    .from('mtap_question_attempts')
    .select('archetype, tier, correct, created_at')
    .eq('user_id', userId)
    .eq('grade', grade)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch mtap attempts:', error);
    return [];
  }
  return (data || []) as MtapAttempt[];
}

// Mastery rule from content/mtap-expansion-overview.md: "8 of last 10 attempts
// correct, across >=2 sessions" unlocks the next tier. Computed client-side
// (not a DB function) because this is pure pacing/UX, not an economic security
// boundary — see the migration's own comment for why that's a safe call here.
// Easy is always unlocked. A tier with fewer than 10 attempts on its
// PRECEDING tier is simply not unlocked yet (not an error case).
export function computeTierUnlocked(attempts: MtapAttempt[], archetype: string, tier: MtapTier): boolean {
  if (tier === 'easy') return true;
  const precedingTier: MtapTier = tier === 'average' ? 'easy' : 'average';
  const relevant = attempts
    .filter(a => a.archetype === archetype && a.tier === precedingTier)
    .slice(0, 10); // already ordered newest-first by fetchMtapAttempts
  if (relevant.length < 10) return false;
  const correctCount = relevant.filter(a => a.correct).length;
  const distinctDays = new Set(relevant.map(a => a.created_at.slice(0, 10))).size;
  return correctCount >= 8 && distinctDays >= 2;
}

// Whether a specific archetype+tier is itself "mastered" (used for progress
// bars / checkmarks, not gating) — same threshold, applied to the tier's own
// attempts rather than the preceding tier's.
export function computeTierMastered(attempts: MtapAttempt[], archetype: string, tier: MtapTier): boolean {
  const relevant = attempts.filter(a => a.archetype === archetype && a.tier === tier).slice(0, 10);
  if (relevant.length < 10) return false;
  const correctCount = relevant.filter(a => a.correct).length;
  const distinctDays = new Set(relevant.map(a => a.created_at.slice(0, 10))).size;
  return correctCount >= 8 && distinctDays >= 2;
}

// Mixed Trainer Track's own unlock rule (content/mtap-expansion-overview.md's
// mastery-threshold table): stays locked until EVERY strand in the grade has
// at least one archetype with Difficult unlocked — "capstone stays locked
// until there's a real base to draw a shuffled set from." An empty strand
// list (grade not populated) never unlocks, rather than vacuously passing.
export function computeMixedTrainerUnlocked(attempts: MtapAttempt[], strands: MtapStrandDef[]): boolean {
  if (strands.length === 0) return false;
  return strands.every(strand => strand.archetypes.some(arch => computeTierUnlocked(attempts, arch.key, 'difficult')));
}

// Mixed Trainer Track's question set: pulls the grade's full reviewed pool in
// one query (all archetypes, all tiers — small enough to fetch whole, same
// scale as a single archetype's bank elsewhere in this file), then samples
// MIXED_TRAINER_TIER_MIX's count per tier via sampleDiverse so a 15-question
// Easy draw isn't six GCF/LCM questions and nothing else — "drawn from all
// strands," per every grade's own content doc. Final shuffle keeps tiers from
// arriving in easy/average/difficult blocks; a real elimination round doesn't
// announce which item is which.
export async function fetchMixedTrainerSet(grade: number): Promise<MtapQuestion[]> {
  const { data, error } = await supabase
    .from('mtap_expansion_content_public')
    .select('*')
    .eq('grade', grade);
  if (error) {
    console.error('Failed to fetch mixed trainer pool:', error);
    return [];
  }
  const pool = (data || []) as MtapQuestion[];
  const set: MtapQuestion[] = [];
  for (const tier of TIERS) {
    const tierPool = pool.filter(q => q.tier === tier);
    set.push(...sampleDiverse(tierPool, MIXED_TRAINER_TIER_MIX[tier]));
  }
  return set.sort(() => Math.random() - 0.5);
}

// Round-robins across archetypes (one pick per archetype per round) before
// ever repeating one, so a tier's draw spreads across topics instead of
// clustering on whichever archetype happens to have the biggest bank.
function sampleDiverse(rows: MtapQuestion[], count: number): MtapQuestion[] {
  const shuffled = [...rows].sort(() => Math.random() - 0.5);
  const byArchetype = new Map<string, MtapQuestion[]>();
  for (const q of shuffled) {
    const list = byArchetype.get(q.archetype) || [];
    list.push(q);
    byArchetype.set(q.archetype, list);
  }
  const archetypes = [...byArchetype.keys()];
  const picked: MtapQuestion[] = [];
  let round = 0;
  while (picked.length < count && archetypes.some(a => (byArchetype.get(a) || []).length > round)) {
    for (const a of archetypes) {
      if (picked.length >= count) break;
      const q = (byArchetype.get(a) || [])[round];
      if (q) picked.push(q);
    }
    round += 1;
  }
  return picked;
}

// Grades one question server-side (never trust a client-computed correctness
// check against a public view that never carried the answer in the first
// place). Logs the attempt and reports reward_eligible — true only the FIRST
// time this exact question is answered correctly by this user, so replaying
// the same 8-question bank on a loop doesn't farm gold/XP repeatedly.
export async function gradeMtapAnswer(userId: string, questionCode: string, selected: string): Promise<MtapGradeResult | null> {
  const { data, error } = await supabase.rpc('grade_mtap_expansion_answer', {
    p_user_id: userId,
    p_question_code: questionCode,
    p_selected: selected,
  });
  if (error || !data) {
    console.error('Failed to grade mtap answer:', error);
    return null;
  }
  return data as MtapGradeResult;
}

// Claims the Mixed Trainer Track completion reward (1 Growth Pill), server-
// verified: claim_mixed_trainer_reward checks that every code in
// questionCodes has a real graded attempt (from THIS user, THIS grade)
// within the last 2 hours before granting anything — the client can't just
// assert a run happened. Capped at once per (user, grade) per calendar day
// server-side too, so `granted: false` with reason 'already_claimed_today'
// is an expected, non-error outcome, not a failure to surface as one.
export async function claimMixedTrainerReward(userId: string, grade: number, questionCodes: string[]): Promise<MixedTrainerRewardResult | null> {
  const { data, error } = await supabase.rpc('claim_mixed_trainer_reward', {
    p_user_id: userId,
    p_grade: grade,
    p_question_codes: questionCodes,
  });
  if (error || !data) {
    console.error('Failed to claim mixed trainer reward:', error);
    return null;
  }
  return data as MixedTrainerRewardResult;
}

// Credits XP/gold for a reward-eligible correct answer, via the SAME
// server-authoritative RPC the rest of the app's currency writes already go
// through (apply_progress_deltas) — no new reward-writing code path.
export async function creditMtapReward(userId: string, xp: number, gold: number): Promise<{ level: number; xp: number; gold: number } | null> {
  const { data, error } = await supabase.rpc('apply_progress_deltas', {
    p_user_id: userId,
    p_xp_delta: xp,
    p_gold_delta: gold,
  });
  if (error || !data) {
    console.error('Failed to credit mtap reward:', error);
    return null;
  }
  return data as { level: number; xp: number; gold: number };
}
