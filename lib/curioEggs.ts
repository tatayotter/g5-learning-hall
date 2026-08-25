// lib/curioEggs.ts
// Curio egg mechanism — a graduated + sufficiently-leveled curio can lay one
// egg, ever, which hatches after a 5-day consecutive login streak into an
// admin-defined predecessor species. See docs/curio-egg-mechanism-design.md
// for the full design and RPC bodies (supabase/ has no local migration
// files — schema lives on project rsiupmbfhqtihmtahccg).
import { supabase } from './supabase';
import { Element, GRADUATION_LEVEL_REQUIREMENT } from './monsterConfig';
import { QualityTier } from './curioQuality';

export type EggStatus = 'incubating' | 'stalled' | 'hatched';

export interface CurioEgg {
  id: string;
  user_id: string;
  parent_user_monster_id: string | null;
  egg_species_id: string;
  element: Element;
  status: EggStatus;
  streak_progress: number;
  last_progress_date: string; // date, 'YYYY-MM-DD'
  claimed_at: string;
  hatched_at: string | null;
  hatched_user_monster_id: string | null;
}

// species_id -> what it hatches into, admin-authored via the EggChainsSection
// admin tool. A species with no entry here never becomes egg-ready — this is
// also the guild/event-curio exclusion mechanism (the admin just never adds
// chain entries for those species).
export type EggChainMap = Record<string, { predecessorSpeciesId: string; element: Element }>;

// Egg-ready level for a given graduation tier: GRADUATION_LEVEL_REQUIREMENT[tier] + 3.
// Mirrored server-side in claim_curio_egg — this is only for client display,
// the RPC re-validates independently.
export function eggReadyLevel(tier: 1 | 2): number {
  return GRADUATION_LEVEL_REQUIREMENT[tier as 1 | 2] + 3;
}

export async function fetchUserEggs(userId: string): Promise<CurioEgg[]> {
  const { data, error } = await supabase
    .from('curio_eggs')
    .select('*')
    .eq('user_id', userId)
    .order('claimed_at', { ascending: true });
  if (error) {
    console.error('fetchUserEggs error:', error);
    return [];
  }
  return (data || []) as CurioEgg[];
}

export interface EggChainRow {
  species_id: string;
  predecessor_species_id: string;
  element: Element;
  updated_at: string;
}

// Admin section's list view — the raw rows, not the lookup map fetchEggChainMap
// builds for eligibility checks. Reads curio_egg_chains directly (public
// SELECT is allowed, see the migration) rather than through an admin RPC —
// only insert/update/delete need the passcode-gated admin_* RPCs.
export async function fetchEggChainList(): Promise<EggChainRow[]> {
  const { data, error } = await supabase
    .from('curio_egg_chains')
    .select('species_id, predecessor_species_id, element, updated_at')
    .order('species_id');
  if (error) {
    console.error('fetchEggChainList error:', error);
    return [];
  }
  return (data || []) as EggChainRow[];
}

export async function fetchEggChainMap(): Promise<EggChainMap> {
  const { data, error } = await supabase
    .from('curio_egg_chains')
    .select('species_id, predecessor_species_id, element');
  if (error) {
    console.error('fetchEggChainMap error:', error);
    return {};
  }
  const map: EggChainMap = {};
  for (const row of data || []) {
    map[row.species_id] = { predecessorSpeciesId: row.predecessor_species_id, element: row.element as Element };
  }
  return map;
}

export interface ClaimEggResult {
  success: boolean;
  error?: 'not_found' | 'not_graduated' | 'level_too_low' | 'already_claimed' | 'no_chain_defined';
  egg_id?: string;
  egg_species_id?: string;
  element?: Element;
}

export async function claimCurioEgg(userId: string, userMonsterRowId: string): Promise<ClaimEggResult | null> {
  const { data, error } = await supabase.rpc('claim_curio_egg', {
    p_user_id: userId,
    p_user_monster_id: userMonsterRowId,
  });
  if (error) {
    console.error('claim_curio_egg error:', error);
    return null;
  }
  return data as ClaimEggResult;
}

export interface IncubateEggResult {
  success: boolean;
  error?: 'not_found' | 'not_stalled';
}

export async function incubateCurioEgg(userId: string, eggId: string): Promise<IncubateEggResult | null> {
  const { data, error } = await supabase.rpc('incubate_curio_egg', {
    p_user_id: userId,
    p_egg_id: eggId,
  });
  if (error) {
    console.error('incubate_curio_egg error:', error);
    return null;
  }
  return data as IncubateEggResult;
}

export interface HatchedEgg {
  egg_id: string;
  user_monster_id: string;
  species_id: string;
  quality: QualityTier;
}

export interface SyncEggProgressResult {
  success: boolean;
  hatched: HatchedEgg[];
}

// Called once per app session (see app/page.tsx, right alongside
// recordLastLogin) — advances every incubating egg's streak by a day,
// stalls any that missed a day, and hatches any that reach 5. Safe to call
// more than once per day (no-ops if today's already counted).
export async function syncEggProgress(userId: string): Promise<SyncEggProgressResult | null> {
  const { data, error } = await supabase.rpc('sync_egg_progress', { p_user_id: userId });
  if (error) {
    console.error('sync_egg_progress error:', error);
    return null;
  }
  return data as SyncEggProgressResult;
}
