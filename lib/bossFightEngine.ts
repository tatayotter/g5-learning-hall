// lib/bossFightEngine.ts
// Pure functions + a small hook for the Term Exam Boss Fight's locked battle
// mechanics (see project_term_boss_fight.md memory for the full design):
// flat queue (no waves), wrong answers requeue to the true end and cost a
// heart, no take-backs, corruption tracked against the ORIGINAL pool size so
// requeue loops don't stall the visual.
import { useState, useCallback, useMemo } from 'react';
import { supabase } from './supabase';

export const POOL_READY_THRESHOLD = 20;
export const POOL_MIN = 12;
export const POOL_MAX = 20;

export interface BossQuestion {
  id: string;
  week_starting_date: string;
  grade: number;
  subject: string;
  tier: number;
  topic: string | null;
  question: string;
  options: string[];
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Groups by topic and samples proportionally so no single topic dominates the
// fight, then clamps to [POOL_MIN, POOL_MAX]. Pools below POOL_READY_THRESHOLD
// shouldn't reach this function at all (gated earlier), but it degrades
// gracefully (just returns everything shuffled) if one slips through.
export function buildBossQuestionPool(all: BossQuestion[]): BossQuestion[] {
  if (all.length <= POOL_MIN) return shuffle(all);

  const byTopic = new Map<string, BossQuestion[]>();
  for (const q of all) {
    const key = q.topic || '__untopic';
    if (!byTopic.has(key)) byTopic.set(key, []);
    byTopic.get(key)!.push(q);
  }

  const target = Math.min(POOL_MAX, Math.max(POOL_MIN, Math.round(all.length * 0.3)));
  const topics = [...byTopic.keys()];
  const perTopic = Math.max(1, Math.floor(target / topics.length));

  const picked: BossQuestion[] = [];
  for (const topic of topics) {
    picked.push(...shuffle(byTopic.get(topic)!).slice(0, perTopic));
  }
  // Top up to target from leftovers if proportional sampling undershot.
  if (picked.length < target) {
    const pickedIds = new Set(picked.map(q => q.id));
    const leftovers = shuffle(all.filter(q => !pickedIds.has(q.id)));
    picked.push(...leftovers.slice(0, target - picked.length));
  }
  return shuffle(picked).slice(0, POOL_MAX);
}

export function getMistakeBudget(poolSize: number): number {
  return Math.max(1, Math.ceil(poolSize * 0.25));
}

// One grouped query for the board's persona-list readiness check, rather than
// a separate query per persona card. Term-scoped so Term 2 fights don't
// include Term 1 questions in their pool counts.
export async function fetchBossPoolCounts(grade: number, term: number): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('draft_questions_public')
    .select('subject')
    .eq('grade', grade)
    .eq('term', term);
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.subject] = (counts[row.subject] || 0) + 1;
  }
  return counts;
}

export async function fetchBossQuestionPool(grade: number, subject: string, term: number): Promise<BossQuestion[]> {
  const { data, error } = await supabase
    .from('draft_questions_public')
    .select('*')
    .eq('grade', grade)
    .eq('subject', subject)
    .eq('term', term);
  if (error || !data) return [];
  return data as BossQuestion[];
}

// Server-side grading, per question — correct_answer never reaches the
// client. Same trust model as the rest of the battle system: the client
// tallies verified-correct results, it doesn't re-derive correctness itself.
export async function gradeBossQuestion(questionId: string, selected: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('grade_boss_question', {
    p_question_id: questionId,
    p_selected: selected,
  });
  if (error) return false;
  return !!data;
}

export type BossFightStatus = 'active' | 'won' | 'lost';

export interface BossFightState {
  status: BossFightStatus;
  current: BossQuestion | null;
  hearts: number;
  maxHearts: number;
  correctCount: number;
  originalPoolSize: number;
  corruptionPct: number; // 0-100, correctCount / originalPoolSize
}

// Flat-queue battle mechanics: wrong answer requeues the question to the true
// end of the remaining queue and costs a heart; no take-backs on a
// requeue-correct (hearts lost stay lost). Corruption is tracked against the
// original pool size, not queue position, so requeue loops don't stall the
// visual decay.
export function useBossFightQueue(initialPool: BossQuestion[]) {
  const maxHearts = useMemo(() => getMistakeBudget(initialPool.length), [initialPool.length]);
  const [queue, setQueue] = useState<BossQuestion[]>(initialPool);
  const [hearts, setHearts] = useState(maxHearts);
  const [correctCount, setCorrectCount] = useState(0);
  const [status, setStatus] = useState<BossFightStatus>('active');

  const current = queue[0] ?? null;
  const originalPoolSize = initialPool.length;
  const corruptionPct = originalPoolSize > 0 ? Math.round((correctCount / originalPoolSize) * 100) : 0;

  const submitAnswer = useCallback((isCorrect: boolean) => {
    if (status !== 'active' || !current) return;

    if (isCorrect) {
      const rest = queue.slice(1);
      const nextCorrect = correctCount + 1;
      setCorrectCount(nextCorrect);
      if (rest.length === 0) {
        setStatus('won');
      } else {
        setQueue(rest);
      }
    } else {
      const rest = queue.slice(1);
      const nextHearts = hearts - 1;
      setHearts(nextHearts);
      if (nextHearts <= 0) {
        setStatus('lost');
      } else {
        setQueue([...rest, current]); // requeue to the true end, no take-backs
      }
    }
  }, [status, current, queue, hearts, correctCount]);

  const state: BossFightState = {
    status, current, hearts, maxHearts, correctCount, originalPoolSize, corruptionPct,
  };

  return { ...state, submitAnswer };
}
