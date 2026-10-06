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

function answerKey(userId: string): Record<string, string> {
  return read<StoredAnswerKey | null>(KEY_STORE(userId), null)?.answers ?? {};
}

// One question's answer from the downloaded key, for questions graded one at a time (the
// Training Map's scrolls, lib/offlineMap.ts). Undefined when the key doesn't have it.
export function offlineAnswerFor(userId: string, questionId: string): string | undefined {
  if (!offlinePlayEnabled(userId)) return undefined;
  return answerKey(userId)[questionId];
}

export function canAnswerOffline(userId: string, questionIds: string[]): boolean {
  if (!offlinePlayEnabled(userId) || questionIds.length === 0) return false;
  const key = answerKey(userId);
  return questionIds.every(id => id in key);
}

export function gradeOffline(userId: string, questionIds: string[], selected: Record<number, string>) {
  const key = answerKey(userId);
  const correctAnswers = questionIds.map(id => key[id]);
  const correctCount = questionIds.filter((id, i) => selected[i] === key[id]).length;
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
        synced.push({ quest: data.quest, is_perfect: !!data.is_perfect, xp: data.xp ?? 0, gold: data.gold ?? 0 });
      }
    }
    return synced;
  })().finally(() => flushing.delete(userId));
  flushing.set(userId, run);
  return run;
}
