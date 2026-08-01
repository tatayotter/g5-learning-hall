// lib/offlineSync.ts
//
// Drains the on-device sync_queue (written by the offline shell, or by the
// main app's own local writes) against the same Supabase inserts/RPCs the
// online app already uses. Call this from the main app once it's confirmed
// online — see app/page.tsx.
import { Network } from '@capacitor/network';
import { isOfflineStorageAvailable, getUnsyncedQueue, markSynced, type SyncQueueRow } from '@/lib/localDataSource';
import { markQuestionsCompleted } from '@/lib/guildEngine';
import { markGuildSessionToday, claimChecklistBonus, type GuildKey } from '@/lib/dailyChecklist';

async function replay(row: SyncQueueRow): Promise<void> {
  const p = row.payload;
  switch (row.tableTarget) {
    case 'user_completed_questions':
      await markQuestionsCompleted(p.userId, p.questType, p.questionIds);
      return;
    case 'mark_guild_session_today':
      await markGuildSessionToday(p.userId, p.guildKey as GuildKey, p.today);
      return;
    case 'claim_daily_checklist_bonus':
      await claimChecklistBonus(p.userId, p.today, p.dayName, p.weekStartingDate, p.gold);
      return;
    default:
      console.error(`Unknown sync_queue target, skipping: ${row.tableTarget}`);
  }
}

let flushInFlight: Promise<void> | null = null;

export async function flushSyncQueue(): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    let queue: SyncQueueRow[];
    try {
      queue = await getUnsyncedQueue();
    } catch (e) {
      console.error('Failed to read sync_queue (non-fatal):', e);
      return;
    }

    // Replayed in order (oldest first) — see plan doc for why conflict
    // resolution beyond ordering isn't attempted (single-player progress only).
    for (const row of queue) {
      try {
        await replay(row);
        await markSynced(row.id);
      } catch (e) {
        console.error(`Failed to sync queued ${row.tableTarget} row ${row.id} (will retry next flush):`, e);
      }
    }
  })();

  try {
    await flushInFlight;
  } finally {
    flushInFlight = null;
  }
}

// Call once from the main app's root — flushes immediately if already
// online, and again on every offline->online transition.
export function watchAndFlushSyncQueue(): () => void {
  if (!isOfflineStorageAvailable()) return () => {};

  Network.getStatus().then(status => {
    if (status.connected) void flushSyncQueue();
  });

  const listenerPromise = Network.addListener('networkStatusChange', status => {
    if (status.connected) void flushSyncQueue();
  });

  return () => {
    listenerPromise.then(listener => listener.remove());
  };
}
