// lib/bossQuestionBank.ts
// Keeps the term's boss questions on the device so the board and the fight
// never wait on them. The whole term (every subject, ~2k questions, ~0.75 MB)
// downloads once in the background as soon as the dashboard loads, whether or
// not the boss event is on yet, and each subject's next fight is picked ahead
// of time. Only questions are stored: draft_questions_public has no answers,
// and grading stays server-side (grade_boss_question).
//
// Freshness: one head-only count per load. A changed count, a cache older than
// BANK_MAX_AGE_MS, or no cache at all re-downloads the bank.
import { supabase } from './supabase';
import { buildBossQuestionPool, type BossQuestion } from './bossFightEngine';

const BANK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000; // PostgREST's default max rows per request

interface StoredBank {
  fetchedAt: number;
  questions: BossQuestion[];
}

const bankKey = (grade: number, term: number) => `lh_boss_bank_g${grade}_t${term}`;
const poolsKey = (grade: number, term: number) => `lh_boss_pools_g${grade}_t${term}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // quota or storage blocked: callers fall back to the network
  }
}

export function readBossBank(grade: number, term: number): BossQuestion[] | null {
  return read<StoredBank>(bankKey(grade, term))?.questions ?? null;
}

async function downloadBank(grade: number, term: number): Promise<BossQuestion[] | null> {
  const questions: BossQuestion[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('draft_questions_public')
      .select('id, week_starting_date, grade, subject, tier, topic, question, options')
      .eq('grade', grade)
      .eq('term', term)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) return null;
    questions.push(...(data as BossQuestion[]));
    if (data.length < PAGE_SIZE) return questions;
  }
}

const inFlight = new Map<string, Promise<BossQuestion[] | null>>();

// Returns the device's bank, refreshing it first when it's missing, stale or
// the server's count changed. Resolves to the cached copy if the check fails
// (e.g. offline), or null when there is nothing cached and no connection.
export function syncBossBank(grade: number, term: number): Promise<BossQuestion[] | null> {
  const key = bankKey(grade, term);
  const running = inFlight.get(key);
  if (running) return running;
  const sync = (async () => {
    const stored = read<StoredBank>(bankKey(grade, term));
    const { count, error } = await supabase
      .from('draft_questions_public')
      .select('id', { count: 'exact', head: true })
      .eq('grade', grade)
      .eq('term', term);
    if (error || count === null) return stored?.questions ?? null;
    const fresh = stored
      && stored.questions.length === count
      && Date.now() - stored.fetchedAt < BANK_MAX_AGE_MS;
    if (fresh) {
      fillMissingPools(grade, term, stored.questions);
      return stored.questions;
    }
    const questions = await downloadBank(grade, term);
    if (!questions) return stored?.questions ?? null;
    write(bankKey(grade, term), { fetchedAt: Date.now(), questions } satisfies StoredBank);
    // New bank: every subject's pre-picked fight may hold retired questions.
    write(poolsKey(grade, term), {});
    fillMissingPools(grade, term, questions);
    return questions;
  })().finally(() => { inFlight.delete(key); });
  inFlight.set(key, sync);
  return sync;
}

export function bankSubjectQuestions(bank: BossQuestion[], subject: string): BossQuestion[] {
  return bank.filter(q => q.subject === subject);
}

export function bankPoolCounts(bank: BossQuestion[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const q of bank) counts[q.subject] = (counts[q.subject] ?? 0) + 1;
  return counts;
}

export function bankLatestWeek(bank: BossQuestion[]): string | null {
  let latest: string | null = null;
  for (const q of bank) if (!latest || q.week_starting_date > latest) latest = q.week_starting_date;
  return latest;
}

// Pre-picks the next fight's questions for every subject that has none yet.
function fillMissingPools(grade: number, term: number, bank: BossQuestion[]) {
  const pools = read<Record<string, BossQuestion[]>>(poolsKey(grade, term)) ?? {};
  let changed = false;
  for (const subject of Object.keys(bankPoolCounts(bank))) {
    if (pools[subject]?.length) continue;
    pools[subject] = buildBossQuestionPool(bankSubjectQuestions(bank, subject));
    changed = true;
  }
  if (changed) write(poolsKey(grade, term), pools);
}

// Hands out the subject's pre-picked fight and picks the next one right away,
// so a retry or the next visit is just as instant. Null when nothing is stored.
export function takeBossPool(grade: number, term: number, subject: string): BossQuestion[] | null {
  const bank = readBossBank(grade, term);
  if (!bank) return null;
  const all = bankSubjectQuestions(bank, subject);
  if (all.length === 0) return null;
  const pools = read<Record<string, BossQuestion[]>>(poolsKey(grade, term)) ?? {};
  const ids = new Set(all.map(q => q.id));
  const picked = pools[subject]?.length && pools[subject].every(q => ids.has(q.id))
    ? pools[subject]
    : buildBossQuestionPool(all);
  pools[subject] = buildBossQuestionPool(all);
  write(poolsKey(grade, term), pools);
  return picked;
}
