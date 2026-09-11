// lib/wander.ts
// Shared "wander around a home tile" stepper. Originally written just for
// the fixed set of bot classmates (hooks/useBotPresence.ts); extracted here
// once hooks/useMapPresence.ts started using the exact same trick for real
// online players (see that file's header for why: syncing every real step
// over Supabase Realtime presence was tripping its per-client rate limit,
// so real players are now marked online/offline only, with a purely
// client-local randomized walk animated around their entry tile in between).

export const WANDER_RADIUS = 3;    // max tile drift from home before bias pulls back
export const TICK_MS_MIN = 3000;   // per-entity minimum move interval
export const TICK_MS_MAX = 7000;   // per-entity maximum move interval
// Each entity's first tick is further staggered by up to this many ms so a
// batch that all start at once doesn't move in lockstep.
export const STAGGER_MS_MAX = 4000;

/** Compute the next position for one wandering entity given its current position. */
export function wanderStep(
  x: number,
  y: number,
  homeX: number,
  homeY: number,
): { x: number; y: number } {
  // Bias back toward home when drifted too far
  const dxBias = Math.abs(x - homeX) >= WANDER_RADIUS ? Math.sign(homeX - x) : 0;
  const dyBias = Math.abs(y - homeY) >= WANDER_RADIUS ? Math.sign(homeY - y) : 0;
  const dx = dxBias !== 0 ? dxBias : (Math.random() < 0.5 ? 1 : -1);
  const dy = dyBias !== 0 ? dyBias : (Math.random() < 0.5 ? 1 : -1);
  // 70% chance to actually step on each axis — sometimes the entity just
  // stands still for a tick, adding further variety.
  return {
    x: Math.max(1, x + (Math.random() < 0.7 ? dx : 0)),
    y: Math.max(1, y + (Math.random() < 0.7 ? dy : 0)),
  };
}
