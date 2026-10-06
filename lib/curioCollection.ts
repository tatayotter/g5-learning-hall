// lib/curioCollection.ts
//
// The player's curios as the Curio Arena (components/MonsterGuild.tsx), its login prefetch
// (lib/tabPrefetch.ts) and the Trainer Card (components/HeroProfile.tsx) read them. Kept on the
// device for offline viewing (lib/offlineReads.ts).
import { supabase, ensureAnonymousSession } from '@/lib/supabase';
import { cachedRead, readingOffline } from '@/lib/offlineReads';

export interface CurioCollection {
  userMonsters: any[];
  battleState: any | null;
  caughtMonsters: any[];
}

export async function fetchCurioCollection(userId: string): Promise<CurioCollection> {
  // ensureAnonymousSession needs the network; offline the read comes from the device anyway.
  if (!readingOffline(userId)) await ensureAnonymousSession();
  return cachedRead<CurioCollection>(userId, 'curioCollection', async () => {
    const [monstersRes, stateRes, caughtRes] = await Promise.all([
      supabase.from('user_monsters').select('*').eq('user_id', userId).order('slot'),
      supabase.from('user_battle_state').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_caught_monsters').select('*').eq('user_id', userId).order('caught_at', { ascending: false }),
    ]);
    // Only a failed curio list counts as a failed read: an empty one would offer the starter
    // pick. The other two fall back to empty, as the Arena always did.
    if (monstersRes.error) throw monstersRes.error;
    return {
      userMonsters: monstersRes.data || [],
      battleState: stateRes.data || null,
      caughtMonsters: caughtRes.data || [],
    };
  }, { userMonsters: [], battleState: null, caughtMonsters: [] });
}
