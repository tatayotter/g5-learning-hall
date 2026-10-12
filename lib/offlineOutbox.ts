// lib/offlineOutbox.ts
//
// How much one account has played offline on this device and not yet synced, across every
// outbox (lib/offlineQuests.ts, lib/offlineGuilds.ts, lib/offlineMap.ts, lib/offlineTrainers.ts).
// The outboxes are kept per account, and the server only takes an account's entries while that
// account is signed in here, so on a shared device each hero's count waits for that hero.
import { pendingQuestEntries } from '@/lib/offlineQuests';
import { pendingGuildEntries } from '@/lib/offlineGuilds';
import { pendingMapEntries } from '@/lib/offlineMap';
import { pendingTrainerBattles } from '@/lib/offlineTrainers';

export function countUnsynced(userId: string): number {
  return pendingQuestEntries(userId).length + pendingGuildEntries(userId).length
    // Where the player stood on the map is synced too, but isn't progress worth counting.
    + pendingMapEntries(userId).filter(e => e.kind !== 'position').length
    + pendingTrainerBattles(userId).length;
}
