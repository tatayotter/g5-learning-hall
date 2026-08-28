// lib/masteryGauntletEngine.ts
// Topic Mastery Gauntlet — a term-break event quest. Unlike admin-authored
// event_quests, the question pool is assembled dynamically from
// draft_questions_public for the grade + term that just ended, reusing the
// Term Exam Boss Fight's topic-balancing helper. See
// supabase/migrations/20260828140000_topic_mastery_gauntlet.sql and
// project_term_break_special_content_plan memory for the full design.
//
// Practice mode, not exam mode: no hearts, no lose condition. A wrong answer
// just requeues the question to the end so the student sees it again before
// finishing — the point is repetition, not risk.
import { useState, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { BossQuestion, buildBossQuestionPool, POOL_MIN, POOL_MAX } from './bossFightEngine';

export async function fetchGauntletQuestionPool(grade: number, term: number): Promise<BossQuestion[]> {
  const { data, error } = await supabase
    .from('draft_questions_public')
    .select('*')
    .eq('grade', grade)
    .eq('term', term);
  if (error || !data) return [];
  return data as BossQuestion[];
}

// question_id -> most recent correctness, scoped to this student's own attempts
// for this grade + term (RLS-enforced read-own on mastery_gauntlet_attempts).
export async function fetchGauntletMistakes(userId: string, grade: number, term: number): Promise<Map<string, boolean>> {
  const { data, error } = await supabase
    .from('mastery_gauntlet_attempts')
    .select('question_id, is_correct')
    .eq('user_id', userId)
    .eq('grade', grade)
    .eq('term', term);
  if (error || !data) return new Map();
  return new Map(data.map((row: any) => [row.question_id as string, row.is_correct as boolean]));
}

// First run per student: no attempts yet, every question falls into the
// "unseen" bucket, so this degrades to buildBossQuestionPool's plain
// topic-balanced random sample. Once mastery_gauntlet_attempts has rows
// (i.e. the student has done a gauntlet for this grade/term before, or
// answered these questions elsewhere), previously-wrong questions are
// prioritized first, then unseen, then already-correct — so a repeat trip
// through the same break's gauntlet (or next year's, if a term ever
// repeats) actually targets real mistakes instead of re-randomizing.
export function buildMasteryGauntletPool(all: BossQuestion[], mistakes: Map<string, boolean>): BossQuestion[] {
  const wrong: BossQuestion[] = [];
  const unseen: BossQuestion[] = [];
  const correct: BossQuestion[] = [];
  for (const q of all) {
    if (!mistakes.has(q.id)) unseen.push(q);
    else if (mistakes.get(q.id) === false) wrong.push(q);
    else correct.push(q);
  }

  // Topic-balance within each priority bucket independently so a student
  // with many wrong answers in one subject doesn't get a pool that's all
  // that one subject — then concatenate in priority order and cap at
  // POOL_MAX. buildBossQuestionPool already no-ops (just shuffles) when a
  // bucket is small.
  const prioritized = [
    ...buildBossQuestionPool(wrong),
    ...buildBossQuestionPool(unseen),
    ...buildBossQuestionPool(correct),
  ];
  if (prioritized.length <= POOL_MAX) return prioritized;
  return prioritized.slice(0, Math.max(POOL_MIN, POOL_MAX));
}

// SECURITY DEFINER RPC — reads draft_questions.correct_answer server-side
// (locked down from direct client SELECT) and upserts the correctness log
// in the same call.
export async function gradeGauntletQuestion(
  userId: string, questionId: string, selected: string, grade: number, subject: string, term: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc('grade_mastery_gauntlet_question', {
    p_question_id: questionId,
    p_selected: selected,
    p_user_id: userId,
    p_grade: grade,
    p_subject: subject,
    p_term: term,
  });
  if (error) return false;
  return !!data;
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
