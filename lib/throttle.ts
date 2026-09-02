// lib/throttle.ts
// Trailing-edge throttle for high-frequency callbacks (position writes fired
// once per tile crossed while walking, etc.) that don't need per-call
// freshness on the network — collapses a burst of calls to "at most once per
// intervalMs" while guaranteeing the LATEST args are always eventually sent,
// never silently dropped. Call `flush()` before unmount/disconnect so a
// pending trailing call (e.g. the player's final position) isn't lost.
export function createTrailingThrottle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  intervalMs: number,
) {
  let lastCallTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Args | null = null;

  const invoke = (...args: Args) => {
    lastCallTime = Date.now();
    fn(...args);
  };

  const call = (...args: Args) => {
    const elapsed = Date.now() - lastCallTime;
    if (elapsed >= intervalMs) {
      if (timer) { clearTimeout(timer); timer = null; }
      pendingArgs = null;
      invoke(...args);
      return;
    }
    pendingArgs = args;
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        if (pendingArgs) {
          const args2 = pendingArgs;
          pendingArgs = null;
          invoke(...args2);
        }
      }, intervalMs - elapsed);
    }
  };

  // Sends a still-pending trailing call immediately (e.g. on unmount) instead
  // of letting it fire after the component is gone.
  const flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (pendingArgs) {
      const args = pendingArgs;
      pendingArgs = null;
      invoke(...args);
    }
  };

  // Drops any pending trailing call without sending it (e.g. the channel is
  // being torn down and a stale position write would be pointless/harmful).
  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    pendingArgs = null;
  };

  return { call, flush, cancel };
}
