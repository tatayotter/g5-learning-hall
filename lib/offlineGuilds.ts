// lib/offlineGuilds.ts
//
// The five side quest guilds with no connection (docs/offline-mode-plan.md). Guild
// questions already carry their answers and the game grades and rewards on the device, so
// offline play only needs:
// - each guild's last-fetched question batch and the subclass profile kept on the device
//   (saved by lib/guildEngine.ts whenever it fetches them on the installed app);
// - a per-player outbox of finished sessions;
// - sync_offline_guild_session on reconnect, which clamps the reward to what the correct
//   answers could have earned and applies the session once per entry id.
import { supabase } from '@/lib/supabase';
import { isOffline } from '@/lib/offlineSnapshot';
import { keepsOfflineCopies } from '@/lib/offlineReads';
import { offlinePlayEnabled } from '@/lib/offlineQuests';
import type { GuildKey } from '@/lib/dailyChecklist';
import type { SubclassProfile } from '@/lib/guildEngine';
import { MIN_SESSION_POOL_SIZE } from '@/lib/guildConfig';

const POOL = (userId: string, questType: string) => `lh_guild_pool_${userId}_${questType}`;
const PROFILE = (userId: string) => `lh_subclass_profile_${userId}`;
const OUTBOX = (userId: string) => `lh_guild_outbox_${userId}`;

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
    // Storage full or blocked: that guild just won't open offline.
  }
}

// True when a guild call should use the device copy instead of the network.
export function playingGuildsOffline(userId: string): boolean {
  return isOffline() && offlinePlayEnabled(userId);
}

// ── Question batches and profile ────────────────────────────────────────────

export function saveGuildPool(userId: string, questType: string, pool: unknown[]) {
  if (keepsOfflineCopies() && pool.length > 0) write(POOL(userId, questType), pool);
}

// The saved batch minus what was answered correctly in sessions still waiting to sync, the
// same "fresh questions first" rule as online. A batch played through starts over.
export function loadGuildPool<T extends { id: string }>(userId: string, questType: string): T[] {
  const pool = read<T[]>(POOL(userId, questType), []);
  const done = new Set(pendingGuildEntries(userId).filter(e => e.guildKey === questType).flatMap(e => e.questionIds));
  const fresh = pool.filter(q => !done.has(q.id));
  return fresh.length >= Math.min(MIN_SESSION_POOL_SIZE, pool.length) ? fresh : pool;
}

export function saveSubclassProfile(userId: string, profile: SubclassProfile | null) {
  if (keepsOfflineCopies() && profile) write(PROFILE(userId), profile);
}

export function loadSubclassProfile(userId: string): SubclassProfile | null {
  return read<SubclassProfile | null>(PROFILE(userId), null);
}

// Offline level-ups show straight away; the server applies the same xp on sync.
export function updateSavedSubclassProfile(userId: string, fields: Partial<SubclassProfile>) {
  const current = loadSubclassProfile(userId);
  if (current) write(PROFILE(userId), { ...current, ...fields });
}

// ── Outbox ──────────────────────────────────────────────────────────────────

export interface GuildOutboxEntry {
  id: string;
  guildKey: GuildKey;
  contentWeekId: string | null;
  questionIds: string[];
  questionsAnswered: number;
  correctCount: number;
  gold: number;
  subclassXp: number;
  playedAt: string;
  // Server rejections (not network failures) so far; kept for a look, never dropped.
  failures: number;
}

export function pendingGuildEntries(userId: string): GuildOutboxEntry[] {
  return read<GuildOutboxEntry[]>(OUTBOX(userId), []);
}

export function queueGuildSession(userId: string, entry: Omit<GuildOutboxEntry, 'id' | 'failures' | 'playedAt'>) {
  const full: GuildOutboxEntry = { ...entry, id: crypto.randomUUID(), playedAt: new Date().toISOString(), failures: 0 };
  write(OUTBOX(userId), [...pendingGuildEntries(userId), full]);
  void navigator.storage?.persist?.().catch(() => {});
}

export interface SyncedGuildSession {
  guildKey: GuildKey;
  gold: number;
  grantedMonster: string | null;
}

const flushing = new Map<string, Promise<SyncedGuildSession[]>>();

// Same shape as flushQuestOutbox: oldest first, stops at the first network failure, a
// re-sent entry is a no-op server-side.
export function flushGuildOutbox(userId: string): Promise<SyncedGuildSession[]> {
  const running = flushing.get(userId);
  if (running) return running;
  const run = (async () => {
    const synced: SyncedGuildSession[] = [];
    for (const entry of pendingGuildEntries(userId)) {
      if (isOffline()) break;
      const { data, error } = await supabase.rpc('sync_offline_guild_session', {
        p_user_id: userId,
        p_entry_id: entry.id,
        p_guild_key: entry.guildKey,
        p_content_week_id: entry.contentWeekId,
        p_question_ids: entry.questionIds,
        p_questions_answered: entry.questionsAnswered,
        p_correct_count: entry.correctCount,
        p_gold: entry.gold,
        p_subclass_xp: entry.subclassXp,
        p_played_at: entry.playedAt,
      });
      const remaining = pendingGuildEntries(userId);
      if (error || !data) {
        if (!error?.code) break;
        console.error('Offline guild sync rejected:', error);
        write(OUTBOX(userId), remaining.map(e => e.id === entry.id ? { ...e, failures: e.failures + 1 } : e));
        continue;
      }
      write(OUTBOX(userId), remaining.filter(e => e.id !== entry.id));
      if (!data.replayed) {
        synced.push({ guildKey: entry.guildKey, gold: data.gold ?? 0, grantedMonster: data.granted_monster ?? null });
      }
    }
    return synced;
  })().finally(() => flushing.delete(userId));
  flushing.set(userId, run);
  return run;
}
