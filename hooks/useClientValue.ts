import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/**
 * Reads a browser-only value (window, localStorage, Capacitor, the URL)
 * without a hydration mismatch: `serverValue` during SSR and hydration, then
 * `read()` on the client. Replaces the "setState in a mount effect" pattern.
 *
 * `read` runs on every render, so keep it cheap and return a primitive (or
 * otherwise stable) value. The value is read once per render and is not
 * subscribed to changes — use real state for anything the page changes.
 */
export function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}

/** False during SSR and hydration, true once running on the client. */
export function useHasMounted(): boolean {
  return useClientValue(() => true, false);
}
