// lib/masteryGauntletEngine.ts
// Topic Mastery Gauntlet — a term-break event quest that reviews questions
// from the student's own weekly lessons (content_questions_public), not a
// separately-authored bank. This is what makes it work for every grade:
// content_questions_public is populated every week by ordinary BOW content
// generation for grades 2-6 alike, unlike draft_questions (the Term Exam
// Boss Fight's bank), which was only ever authored for Grade 2 and 5. See
// supabase/migrations/20260902130000_gauntlet_sources_weekly_content.sql
// and project_term_break_special_content_plan memory for the full history.
//
// Grading reuses the Monster Arena's own grade_content_question RPC (via
// lib/guildEngine.ts's gradeMonsterQuestion) and its existing
// player_question_attempts correctness log — no gauntlet-specific grading
// path or attempts table needed.
//
// Practice mode, not exam mode: no hearts, no lose condition. A wrong answer
// just requeues the question to the end so the student sees it again before
// finishing — the point is repetition, not risk.
import { useState, useCallback } from 'react';
import { supabase } from './supabase';
import { BossQuestion, shuffle } from './bossFightEngine';

// 10 questions/day x 5 weekdays. Deliberately not reusing bossFightEngine's
// POOL_MIN/POOL_MAX (12/20) here — those are sized for a single boss fight
// session, not a 5-day weekly pool, and reusing them silently capped every
// bucket at 20 regardless of how many days it needed to cover (see
// balanceBucket below for why that's handled differently here).
export const QUESTIONS_PER_DAY = 10;
const WEEKDAY_COUNT = 5;
const GAUNTLET_POOL_TARGET = QUESTIONS_PER_DAY * WEEKDAY_COUNT;

// Everything published for this grade from before the break started —
// literally "the previous weeks' questions," per the brief. content_questions_public
// has no per-question topic, only subject — `topic` below is set to the
// subject name just to satisfy BossQuestion's shape; balanceBucket (below)
// keys on `.subject` directly for the actual balancing.
export async function fetchGauntletQuestionPool(grade: number, beforeDate: string): Promise<BossQuestion[]> {
  const { data, error } = await supabase
    .from('content_questions_public')
    .select('id, prompt, options, subject, grade, week_starting_date, status')
    .eq('grade', grade)
    .eq('status', 'published')
    .lt('week_starting_date', beforeDate);
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    week_starting_date: row.week_starting_date,
    grade: row.grade,
    subject: row.subject,
    tier: 0,
    topic: row.subject,
    question: row.prompt,
    options: row.options,
  }));
}

// question_id -> most recent correctness, from the Monster Arena's own
// attempt log (already RLS read-own) — no gauntlet-specific tracking table.
// Fetches this student's whole history rather than filtering by the pool's
// ids up front: a single student's lifetime attempt count is small, and it
// avoids an unbounded `.in()` list against a pool that can run into the
// hundreds of rows for grades with several weeks of content.
export async function fetchGauntletMistakes(userId: string): Promise<Map<string, boolean>> {
  const { data, error } = await supabase
    .from('player_question_attempts')
    .select('content_question_id, correct')
    .eq('user_id', userId);
  if (error || !data) return new Map();
  return new Map(data.map((row: any) => [row.content_question_id as string, row.correct as boolean]));
}

// Subject-balanced sample of up to `limit` questions from one bucket — same
// proportional-per-subject idea as bossFightEngine's buildBossQuestionPool,
// but with a caller-supplied limit instead of a fixed cap, since a bucket
// here may need to fill anywhere from a few slots up to the whole weekly
// target depending on how much the other buckets already covered.
function balanceBucket(qs: BossQuestion[], limit: number): BossQuestion[] {
  if (qs.length <= limit) return shuffle(qs);

  const bySubject = new Map<string, BossQuestion[]>();
  for (const q of qs) {
    const key = q.subject || '__unknown';
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key)!.push(q);
  }

  const subjects = [...bySubject.keys()];
  const perSubject = Math.max(1, Math.floor(limit / subjects.length));
  const picked: BossQuestion[] = [];
  for (const subject of subjects) {
    picked.push(...shuffle(bySubject.get(subject)!).slice(0, perSubject));
  }
  if (picked.length < limit) {
    const pickedIds = new Set(picked.map(q => q.id));
    const leftovers = shuffle(qs.filter(q => !pickedIds.has(q.id)));
    picked.push(...leftovers.slice(0, limit - picked.length));
  }
  return shuffle(picked).slice(0, limit);
}

// First run per student: no attempts yet, every question falls into the
// "unseen" bucket, so this degrades to a plain subject-balanced random
// sample of the full weekly target. Once player_question_attempts has rows
// for these questions (from a prior gauntlet, or just from playing the
// Monster Arena normally that week), previously-wrong questions are
// prioritized first, then unseen, then already-correct — so a repeat trip
// through the gauntlet actually targets real mistakes instead of
// re-randomizing. Each bucket only takes as many slots as are still needed
// to reach the weekly target, so a single well-stocked bucket (e.g. "unseen"
// on a first run) can fill the whole 50 rather than being capped at 20 and
// leaving the other days short.
export function buildMasteryGauntletPool(all: BossQuestion[], mistakes: Map<string, boolean>): BossQuestion[] {
  const wrong: BossQuestion[] = [];
  const unseen: BossQuestion[] = [];
  const correct: BossQuestion[] = [];
  for (const q of all) {
    if (!mistakes.has(q.id)) unseen.push(q);
    else if (mistakes.get(q.id) === false) wrong.push(q);
    else correct.push(q);
  }

  const picked: BossQuestion[] = [];
  for (const bucket of [wrong, unseen, correct]) {
    if (picked.length >= GAUNTLET_POOL_TARGET) break;
    picked.push(...balanceBucket(bucket, GAUNTLET_POOL_TARGET - picked.length));
  }
  return picked;
}

// Splits the full-week pool into one chunk per weekday, round-robin so
// each day gets a mix of priority levels instead of Monday hogging every
// prioritized-wrong question (buildMasteryGauntletPool front-loads wrong
// answers, so a naive contiguous split would starve later days of review
// material). Days with nothing left just get an empty chunk — the board
// already handles an empty day gracefully.
export function splitPoolIntoDays(pool: BossQuestion[], days: string[]): Record<string, BossQuestion[]> {
  const byDay: Record<string, BossQuestion[]> = {};
  for (const day of days) byDay[day] = [];
  pool.forEach((q, i) => { byDay[days[i % days.length]].push(q); });
  return byDay;
}

// Distinct weekdays this student has completed for this event, so the
// board can mark those days' cards done and the reward-claim call knows
// whether all 5 are finished (claim_event_reward's gauntlet branch also
// re-verifies this server-side).
export async function fetchGauntletDaysDone(userId: string, eventId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('mastery_gauntlet_sessions')
    .select('day')
    .eq('user_id', userId)
    .eq('event_id', eventId);
  if (error || !data) return new Set();
  return new Set(data.map((row: any) => row.day as string));
}

// Marks one weekday's chunk complete so claim_event_reward's gauntlet
// branch can see it — plain client insert, RLS-enforced insert-own, same
// pattern as recordEventQuizMastery writing user_event_progress directly.
// `term` is kept only as informational metadata on the row now (no longer
// used to filter the question pool) — pass whatever the event's
// gauntlet_term happens to be, or 1 if unset.
export async function markGauntletDayComplete(userId: string, eventId: string, grade: number, term: number, day: string) {
  await supabase.from('mastery_gauntlet_sessions').upsert(
    { user_id: userId, event_id: eventId, grade, term, day },
    { onConflict: 'user_id,event_id,day' }
  );
}

export type GauntletStatus = 'active' | 'won';

export interface GauntletState {
  status: GauntletStatus;
  current: BossQuestion | null;
  correctCount: number;
  originalPoolSize: number;
  progressPct: number; // 0-100, correctCount / originalPoolSize
}

// Flat-queue practice loop: wrong answer requeues to the true end (seen
// again before the session ends), no hearts, no lose state.
export function useGauntletQueue(initialPool: BossQuestion[]) {
  const [queue, setQueue] = useState<BossQuestion[]>(initialPool);
  const [correctCount, setCorrectCount] = useState(0);
  const [status, setStatus] = useState<GauntletStatus>('active');

  const current = queue[0] ?? null;
  const originalPoolSize = initialPool.length;
  const progressPct = originalPoolSize > 0 ? Math.round((correctCount / originalPoolSize) * 100) : 0;

  const submitAnswer = useCallback((isCorrect: boolean) => {
    if (status !== 'active' || !current) return;
    const rest = queue.slice(1);
    if (isCorrect) {
      const nextCorrect = correctCount + 1;
      setCorrectCount(nextCorrect);
      if (rest.length === 0) {
        setStatus('won');
      } else {
        setQueue(rest);
      }
    } else {
      setQueue([...rest, current]); // requeue to the true end
    }
  }, [status, current, queue, correctCount]);

  const state: GauntletState = { status, current, correctCount, originalPoolSize, progressPct };
  return { ...state, submitAnswer };
}
