// lib/fbPixel.ts
// Thin, safe wrapper around window.fbq for firing registration-funnel
// conversion events. FacebookPixel.tsx (mounted in app/layout.tsx) only
// defines window.fbq once an admin has set a Pixel ID *and* the script has
// loaded — both async — so every call here must no-op quietly rather than
// throw when fbq isn't ready yet. Some funnel events (e.g. a CTA click
// during that async window) will simply be missed; that's an accepted
// trade-off for keeping this a no-backend, no-RLS client-side signal.
export function trackPixelEvent(
  event: string,
  params: Record<string, unknown> = {},
  custom = false
) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq(custom ? 'trackCustom' : 'track', event, params);
}
