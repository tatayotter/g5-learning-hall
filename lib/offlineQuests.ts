// lib/offlineQuests.ts
//
// Main quests with no connection (docs/offline-mode-plan.md, first slice).
// On the installed app, for players with the 'offline_play' flag:
// - the week's answer key is downloaded while online (get_answer_key RPC,
//   login-required, never through the public /api/content cache), so an
//   offline quiz is graded the moment it's submitted, same as online;
// - the answers go into a per-player outbox on the device;
// - on reconnect each entry goes to sync_offline_main_quest, which re-grades
//   it on the server (the phone's score is never trusted) and applies the
//   reward once per entry id, so retries can't double-pay.
// Plain browser tabs stay online-only, per the plan: no key download and no
// outbox kept between visits.
import { supabase } from '@/lib/supabase';
import { hasFeatureFlag } from '@/lib/featureFlags';
import { isRunningInstalled } from '@/lib/installPrompt';
import { isNativeApp } from '@/lib/platform';
import { isOffline } from '@/lib/offlineSnapshot';
import { md5 } from '@/lib/md5';

const KEY_STORE = (userId: string) => `lh_answer_key_${userId}`;
const OUTBOX = (userId: string) => `lh_quest_outbox_${userId}`;

export function offlinePlayEnabled(userId: string): boolean {
  return (isNativeApp() || isRunningInstalled()) && hasFeatureFlag(userId, 'offline_play');
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: offline quests just won't be available.
  }
}

// ── Answer key ──────────────────────────────────────────────────────────────

interface StoredAnswerKey {
  weekIds: string[];
  answers: Record<string, string>;
}

export async function refreshAnswerKey(userId: string, weekIds: string[]): Promise<void> {
  if (!offlinePlayEnabled(userId) || weekIds.length === 0) return;
  const { data, error } = await supabase.rpc('get_answer_key', {
    p_user_id: userId,
    p_content_week_ids: weekIds,
  });
  if (error || !data || typeof data !== 'object') return;
  write(KEY_STORE(userId), { weekIds, answers: data as Record<string, string> } satisfies StoredAnswerKey);
}

// ── The rest of the term ────────────────────────────────────────────────────
//
// Offline trainer battles (lib/offlineTrainers.ts) ask questions from every week that has
// content, from this week on: this week through the end of the term (and into the next term
// once its weeks are authored, since the list is whatever content_weeks has). The questions
// come through the same answer-stripped /api/content route the weekly screen uses, and the
// answer key covers the same weeks. Under 1 MB for a whole term. Re-downloaded at most every
// few hours, or straight away when this week isn't in the stored copy yet.

const POOL_STORE = (userId: string) => `lh_term_questions_${userId}`;
const POOL_REFRESH_MS = 6 * 60 * 60 * 1000;
// get_answer_key takes at most 20 weeks.
const POOL_MAX_WEEKS = 20;

export interface PoolQuestion {
  id: string;
  question: string;
  options: string[];
  subject: string;
}

interface StoredPool {
  weekIds: string[];
  fetchedAt: number;
  questions: PoolQuestion[];
}

function storedPool(userId: string): StoredPool | null {
  return read<StoredPool | null>(POOL_STORE(userId), null);
}

// Keeps the answer key, and where offline play is on the rest of the term's questions, current
// for the next time the device has no connection. `weekId` is this week's content week.
export async function refreshOfflineContent(userId: string, grade: number, weekStartingDate: string, weekId: string) {
  if (!offlinePlayEnabled(userId)) return;
  const stored = storedPool(userId);
  if (stored && stored.weekIds.includes(weekId) && Date.now() - stored.fetchedAt < POOL_REFRESH_MS) return;

  const { data: weeks, error } = await supabase
    .from('content_weeks')
    .select('id, week_starting_date')
    .eq('grade', grade)
    .gte('week_starting_date', weekStartingDate)
    .order('week_starting_date')
    .limit(POOL_MAX_WEEKS);
  if (error || !weeks?.length) {
    // Without the list, this week's key is still worth having.
    await refreshAnswerKey(userId, [weekId]);
    return;
  }

  const questions: PoolQuestion[] = [];
  const weekIds: string[] = [];
  for (const week of weeks) {
    try {
      const res = await fetch(`/api/content?grade=${grade}&week=${week.week_starting_date}`);
      if (!res.ok) continue;
      const { content } = await res.json();
      for (const day of Object.values(content ?? {}) as Record<string, { quiz?: { id: string; question: string; options: string[] }[] }>[]) {
        for (const [subject, entry] of Object.entries(day ?? {})) {
          for (const q of entry?.quiz ?? []) questions.push({ id: q.id, question: q.question, options: q.options, subject });
        }
      }
      weekIds.push(week.id);
    } catch {
      // A week that didn't download is left out; the next refresh tries again.
    }
  }
  if (!weekIds.includes(weekId)) weekIds.unshift(weekId);
  await refreshAnswerKey(userId, weekIds);
  write(POOL_STORE(userId), { weekIds, fetchedAt: Date.now(), questions } satisfies StoredPool);
}

// The downloaded questions the answer key covers, for battles with no connection.
export function offlineTermQuestions(userId: string): PoolQuestion[] {
  if (!offlinePlayEnabled(userId)) return [];
  const key = answerKey(userId);
  return (storedPool(userId)?.questions ?? []).filter(q => q.id in key);
}

function answerKey(userId: string): Record<string, string> {
  return read<StoredAnswerKey | null>(KEY_STORE(userId), null)?.answers ?? {};
}

// The key holds md5('lh-key:' || question id || ':' || answer) per question (get_answer_key), so
// a whole term of answers on the device can't simply be read off it. A plain answer (a key
// downloaded before the key was hashed) still works.
const HASHED = /^[0-9a-f]{32}$/;
function matchesKey(entry: string | undefined, questionId: string, answer: string | undefined | null): boolean {
  if (entry === undefined || answer === undefined || answer === null) return false;
  return HASHED.test(entry) ? md5(`lh-key:${questionId}:${answer}`) === entry : entry === answer;
}

export interface KeyedQuestion {
  id: string;
  options?: unknown;
}

// The right option for a question, found by checking each option against the key; undefined
// when the key doesn't cover it.
function correctOption(key: Record<string, string>, question: KeyedQuestion): string | undefined {
  const entry = key[question.id];
  if (entry === undefined) return undefined;
  if (!HASHED.test(entry)) return entry;
  const options = Array.isArray(question.options) ? (question.options as unknown[]).map(String) : [];
  return options.find(o => matchesKey(entry, question.id, o));
}

// Whether the downloaded key covers a question, for questions graded one at a time (the
// Training Map's scrolls, lib/offlineMap.ts, and offline trainer battles).
export function hasOfflineAnswer(userId: string, questionId: string): boolean {
  return offlinePlayEnabled(userId) && questionId in answerKey(userId);
}

// One question graded from the downloaded key, with the right option to show.
export function gradeQuestionOffline(userId: string, question: KeyedQuestion, selected: string) {
  const key = offlinePlayEnabled(userId) ? answerKey(userId) : {};
  return {
    correct: matchesKey(key[question.id], question.id, selected),
    correctAnswer: correctOption(key, question) ?? null,
  };
}

export function canAnswerOffline(userId: string, questionIds: string[]): boolean {
  if (!offlinePlayEnabled(userId) || questionIds.length === 0) return false;
  const key = answerKey(userId);
  return questionIds.every(id => id in key);
}

export function gradeOffline(userId: string, questions: KeyedQuestion[], selected: Record<number, string>) {
  const key = answerKey(userId);
  const questionIds = questions.map(q => q.id);
  const correctAnswers = questions.map(q => correctOption(key, q) ?? '');
  const correctCount = questions.filter((q, i) => matchesKey(key[q.id], q.id, selected[i])).length;
  return {
    correct_count: correctCount,
    total: questionIds.length,
    is_perfect: questionIds.length > 0 && correctCount === questionIds.length,
    correct_answers: correctAnswers,
  };
}

// ── Outbox ──────────────────────────────────────────────────────────────────

export interface QuestOutboxEntry {
  id: string;
  contentWeekId: string;
  weekday: string;
  subject: string;
  answers: { question_id: string; selected: string | undefined }[];
  playedAt: string;
  // Server rejections (not network failures) so far; kept for a look, never dropped.
  failures: number;
}

export function pendingQuestEntries(userId: string): QuestOutboxEntry[] {
  return read<QuestOutboxEntry[]>(OUTBOX(userId), []);
}

export function queueQuestAnswers(userId: string, entry: Omit<QuestOutboxEntry, 'id' | 'failures' | 'playedAt'>) {
  const full: QuestOutboxEntry = { ...entry, id: crypto.randomUUID(), playedAt: new Date().toISOString(), failures: 0 };
  write(OUTBOX(userId), [...pendingQuestEntries(userId), full]);
  // Ask the browser not to clear this site's storage under pressure.
  void navigator.storage?.persist?.().catch(() => {});
}

export interface SyncedQuest {
  quest: string;
  is_perfect: boolean;
  xp: number;
  gold: number;
  // Already mastered by the time this synced (most often on another device), so it paid nothing.
  alreadyDone: boolean;
}

const flushing = new Map<string, Promise<SyncedQuest[]>>();

// Sends queued answers oldest first, one at a time. Stops at the first
// network failure (the rest wait for the next attempt). Safe to call often:
// overlapping calls share one run, and a re-sent entry is a no-op server-side.
export function flushQuestOutbox(userId: string): Promise<SyncedQuest[]> {
  const running = flushing.get(userId);
  if (running) return running;
  const run = (async () => {
    const synced: SyncedQuest[] = [];
    for (const entry of pendingQuestEntries(userId)) {
      if (isOffline()) break;
      const { data, error } = await supabase.rpc('sync_offline_main_quest', {
        p_user_id: userId,
        p_entry_id: entry.id,
        p_content_week_id: entry.contentWeekId,
        p_weekday: entry.weekday,
        p_subject: entry.subject,
        p_answers: entry.answers,
        p_played_at: entry.playedAt,
      });
      const remaining = pendingQuestEntries(userId);
      if (error || !data) {
        // No status means the request never got an answer: try again later.
        if (!error?.code) break;
        console.error('Offline quest sync rejected:', error);
        write(OUTBOX(userId), remaining.map(e => e.id === entry.id ? { ...e, failures: e.failures + 1 } : e));
        continue;
      }
      write(OUTBOX(userId), remaining.filter(e => e.id !== entry.id));
      if (!data.replayed) {
        synced.push({ quest: data.quest, is_perfect: !!data.is_perfect, xp: data.xp ?? 0, gold: data.gold ?? 0, alreadyDone: !!data.already_mastered });
      }
    }
    return synced;
  })().finally(() => flushing.delete(userId));
  flushing.set(userId, run);
  return run;
}
