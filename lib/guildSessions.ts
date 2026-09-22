import { supabase } from './supabase';
import { trackEvent } from './analytics';
import type { GuildKey } from './dailyChecklist';

// Recording a guild session used to be fire-and-forget: not awaited, errors swallowed. A
// failed request (network blip, tab closed mid-call) silently dropped the session — nothing
// in guild_sessions, no lifetime counter movement — with no safe way to retry.
//
// Every session now gets a client-generated id when it ends. mark_guild_session_today (see
// the guild_session_idempotency migration) only records a session the first time it sees that
// id, so retrying the exact same call can never double-count the daily row or the lifetime
// counter. That makes it safe to:
//   * retry a couple of times immediately on transient failure, then
//   * persist to a small local queue and retry later (next app load, or when the browser
//     regains connectivity) instead of dropping the session.
// Errors that will never succeed on retry (bad input, not authorized) are logged and dropped,
// not retried forever.

export interface GuildSessionScore {
  questionsAnswered: number;
  correctCount: number;
}

interface PendingSession {
  userId: string;
  guildKey: GuildKey;
  today: string;
  questionsAnswered: number;
  correctCount: number;
  sessionId: string;
  queuedAt: number;
}

const QUEUE_KEY = 'lh_pending_guild_sessions';
const MAX_QUEUE = 50;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // a week-old queued session isn't worth resurrecting
const RETRY_DELAYS_MS = [400, 1500];

export function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Postgres error codes that mean "this request will never succeed" — a validation failure, a
// RAISE EXCEPTION (P0001, "not authorized" / "unknown guild key"), or a permissions error.
// Retrying these just repeats the same rejection.
function isPermanent(error: { code?: string }): boolean {
  const code = error.code ?? '';
  return code.startsWith('P0') || code.startsWith('22') || code.startsWith('23') || code.startsWith('42') || code === 'PGRST202';
}

async function send(item: PendingSession): Promise<{ ok: boolean; permanent: boolean; message?: string }> {
  const { error } = await supabase.rpc('mark_guild_session_today', {
    p_user_id: item.userId,
    p_guild_key: item.guildKey,
    p_today: item.today,
    p_questions_answered: item.questionsAnswered,
    p_correct_count: item.correctCount,
    p_session_id: item.sessionId,
    p_count_lifetime: true,
  });
  if (!error) return { ok: true, permanent: false };
  return { ok: false, permanent: isPermanent(error), message: error.message };
}

function readQueue(): PendingSession[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingSession[]) : [];
  } catch {
    return []; // private mode / storage disabled — degrade to no queue, not a crash
  }
}

function writeQueue(items: PendingSession[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
  } catch {
    // Storage unavailable or full: the session stays unrecorded past this call. Rare, and
    // there is nothing more useful to do client-side about it.
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Records a finished guild session, retrying transient failures before falling back to a
 * local queue. Never throws — a guild mini-game finishing shouldn't crash on a network blip.
 * Returns true once the server accepted it (or permanently rejected it); false if it was
 * queued for a later retry.
 */
export async function markGuildSessionToday(
  userId: string,
  guildKey: GuildKey,
  today: string,
  score: GuildSessionScore,
): Promise<boolean> {
  const item: PendingSession = {
    userId,
    guildKey,
    today,
    questionsAnswered: score.questionsAnswered,
    correctCount: score.correctCount,
    sessionId: newSessionId(),
    queuedAt: Date.now(),
  };

  let last: Awaited<ReturnType<typeof send>> = { ok: false, permanent: false };
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    last = await send(item);
    if (last.ok || last.permanent) break;
    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }

  if (last.ok) return true;

  trackEvent('guild_session_record_failed', { guild_key: guildKey, permanent: last.permanent, message: last.message ?? '' });
  if (last.permanent) return true; // retrying can't help; don't queue it forever
  writeQueue([...readQueue(), item]);
  return false;
}

/** Retries anything left in the queue for this user. Safe to call repeatedly / concurrently. */
export async function flushPendingGuildSessions(userId: string): Promise<void> {
  const now = Date.now();
  const all = readQueue().filter(item => now - item.queuedAt < MAX_AGE_MS);
  const mine = all.filter(item => item.userId === userId);
  if (mine.length === 0) {
    writeQueue(all); // still prune other users' stale/foreign entries
    return;
  }

  const stillPending: PendingSession[] = all.filter(item => item.userId !== userId);
  for (const item of mine) {
    const result = await send(item);
    if (!result.ok && !result.permanent) stillPending.push(item);
  }
  writeQueue(stillPending);
}
