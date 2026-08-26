// lib/tabPrefetch.ts
//
// Each guild mini-game and Curio Guild (MonsterGuild.tsx) fetches its own
// data lazily on first mount — fine on a warm connection, but on a first-ever
// session that fetch can take a couple of seconds, showing a plain
// "Loading..." placeholder where the game should be (reported as "empty
// screens" when a parent first tried the app — see Dashboard.tsx's post-login
// effect for where this gets kicked off).
//
// This module fires those exact same fetches once, eagerly, right after
// login (in parallel with the weekly-data load), and stashes the in-flight
// promises here so the first real mount of each tab can await an
// already-started (often already-resolved) fetch instead of starting from
// scratch. Best-effort only: any entry that isn't ready yet (or was never
// requested, e.g. offline login) just falls through to `undefined`, and the
// calling component runs its normal fetch path exactly as before — nothing
// here is required for correctness, only for perceived speed.
import { fetchQuestionPool, fetchSubclassProfile, fetchAnsweredArenaQuestionIds, SubclassProfile } from '@/lib/guildEngine';
import { fetchInventory, InventoryMap } from '@/lib/inventory';
import { supabase, ensureAnonymousSession } from '@/lib/supabase';
import { isOfflineStorageAvailable } from '@/lib/localDataSource';
import { isAppOffline } from '@/lib/offlineState';
import { gradeToNumber } from '@/lib/userSession';
import { loadTiledArtMap } from '@/lib/tiledArtMap';
import { REGIONS } from '@/lib/regions';

// Same 5 guild tables offlineSeed.ts pre-warms into the SQLite cache — kept
// as a separate literal (rather than importing from there) since that file's
// list is offline-cache-specific and this one feeds the in-memory cache below.
const GUILD_TABLES: [tableName: string, questType: string][] = [
  ['sq_lorekeeper', 'lorekeeper'],
  ['sq_spellcaster', 'spellcaster'],
  ['sq_number_realm', 'number_realm'],
  ['sq_logic_labyrinth', 'logic_labyrinth'],
  ['sq_lexicon_arena', 'lexicon_arena'],
];

export interface MonsterGuildPrefetch {
  userMonsters: any[];
  battleState: any | null;
  inventory: InventoryMap;
  answeredArenaIds: Set<string>;
  caughtMonsters: any[];
  subclassProfile: SubclassProfile | null;
}

const cache = new Map<string, Promise<any>>();
// Guards a stale prefetch from a previously logged-in user (device sharing /
// "switch user") from leaking into the next session's tabs.
let cachedForUserId: string | null = null;

// Fire-and-forget — call once right after login resolves. Skipped entirely
// offline: seedOfflineCache() already pre-warms the SQLite cache for the 5
// guild pools, and none of these live queries would resolve without a
// connection anyway.
export function prefetchAllTabs(userId: string, grade: string | number | undefined) {
  if (isOfflineStorageAvailable() && isAppOffline()) return;

  cache.clear();
  cachedForUserId = userId;
  const gradeLevel = gradeToNumber(grade);

  const subclassProfilePromise = fetchSubclassProfile(userId);
  cache.set('subclassProfile', subclassProfilePromise);
  for (const [tableName, questType] of GUILD_TABLES) {
    cache.set(`guildPool:${questType}`, fetchQuestionPool(userId, tableName, questType, gradeLevel));
  }

  // Curio Guild (MonsterGuild.tsx) — same fetch set as its own loadData().
  cache.set('monsterGuild', (async (): Promise<MonsterGuildPrefetch> => {
    await ensureAnonymousSession();
    const [monstersRes, stateRes, invData, answeredIds, caughtRes, subclassProfile] = await Promise.all([
      supabase.from('user_monsters').select('*').eq('user_id', userId).order('slot'),
      supabase.from('user_battle_state').select('*').eq('user_id', userId).single(),
      fetchInventory(userId),
      fetchAnsweredArenaQuestionIds(userId),
      supabase.from('user_caught_monsters').select('*').eq('user_id', userId).order('caught_at', { ascending: false }),
      subclassProfilePromise,
    ]);
    return {
      userMonsters: monstersRes.data || [],
      battleState: stateRes.data || null,
      inventory: invData || {},
      answeredArenaIds: answeredIds,
      caughtMonsters: caughtRes.data || [],
      subclassProfile,
    };
  })());

  // Training Map's default region (Ledger's Heart) tile art — a static
  // asset fetch+parse, not a DB read, but the same "blank first visit"
  // symptom. loadTiledArtMap keeps its own internal promise cache keyed by
  // URL, so this just warms that cache directly; components call
  // loadTiledArtMap the normal way and transparently get the warm result.
  const heartPath = REGIONS.ledgers_heart.tileArtPath;
  if (heartPath) void loadTiledArtMap(heartPath);
}

// Consumes (and removes) a prefetched entry if one is pending/ready for this
// exact user. Returns undefined — for a different user, a never-requested
// key (offline login), or one already consumed — so callers can do
// `takePrefetch(...) ?? normalFetch(...)` and fall through safely.
export function takePrefetch<T>(userId: string, key: string): Promise<T> | undefined {
  if (cachedForUserId !== userId) return undefined;
  const entry = cache.get(key);
  if (entry) cache.delete(key);
  return entry as Promise<T> | undefined;
}
