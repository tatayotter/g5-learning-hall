// hooks/useLinkedStatus.ts
// Wraps the am_i_linked() RPC (tri-state: true/false/null — see
// components/LinkParentBanner.tsx for why the tri-state must never be
// coerced with Boolean()). Shared by every gate that needs to know whether
// the current session is an unclaimed, self-registered child — the
// Leaderboard tab and PvP challenge flow in components/MonsterGuild.tsx,
// plus the corner nudge banner itself.
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type LinkedStatus = boolean | null | undefined; // undefined = still loading

let cached: { value: LinkedStatus; at: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function useLinkedStatus(): LinkedStatus {
  const [linked, setLinked] = useState<LinkedStatus>(cached?.value);

  useEffect(() => {
    // A fresh cache is already reflected via useState's initializer above —
    // nothing to do here, and re-setting the same value would just trip the
    // "no setState synchronously in an effect" rule for no benefit.
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return;
    }
    let cancelled = false;
    supabase.rpc('am_i_linked').then(({ data, error }) => {
      if (cancelled) return;
      // Fail closed: an RPC error shouldn't nag/gate a normal session, so
      // treat it as "linked" (true) rather than "unclaimed" (false).
      const value = error ? true : (data as boolean | null);
      cached = { value, at: Date.now() };
      setLinked(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return linked;
}

// Call after a successful confirm_parent_link (or whenever the caller knows
// the underlying link state just changed) so every consumer re-fetches
// instead of showing stale gated UI until the 30s cache would naturally expire.
export function invalidateLinkedStatusCache(): void {
  cached = null;
}
