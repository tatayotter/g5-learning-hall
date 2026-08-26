// lib/analytics.ts
// First-party analytics event log, mirroring the fire-and-forget insert
// pattern in lib/playerlog.ts. Never throws — a failed analytics write must
// never break gameplay.
import { supabase } from '@/lib/supabase';
import { getActiveUser, USERS } from '@/lib/userSession';
import { isOfflineStorageAvailable } from '@/lib/localDataSource';
import { isAppOffline } from '@/lib/offlineState';

const SESSION_STORAGE_KEY = 'g5_analytics_session_id';
const ATTRIBUTION_STORAGE_KEY = 'g5_analytics_attribution';
const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
] as const;

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

// First-touch ad attribution. Reads utm_*/fbclid off the current URL and
// pins them in sessionStorage so they survive internal navigation (e.g.
// /welcome?utm_source=fb -> /register carries no query string of its own).
// Call once per page load; a no-op once something is already stored, so the
// *first* landing page a visitor hits within the session wins — later
// internal navigation never overwrites it with an empty result.
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const attribution: Record<string, string> = {};
    for (const key of ATTRIBUTION_PARAMS) {
      const value = params.get(key);
      if (value) attribution[key] = value;
    }
    if (Object.keys(attribution).length === 0) return;
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // sessionStorage unavailable (private mode, etc.) — analytics, not worth failing over
  }
}

export function getStoredAttribution(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
  appTab?: string
) {
  const userId = getActiveUser();
  if (!userId) return; // no-op before login — nothing meaningful to attribute yet
  // Skipped rather than queued when offline — analytics, not user-facing
  // progress, not worth the sync complexity.
  if (isOfflineStorageAvailable() && isAppOffline()) return;

  const { error } = await supabase.from('analytics_events').insert({
    user_id: userId,
    session_id: getOrCreateSessionId(),
    event_name: eventName,
    properties: { ...getStoredAttribution(), ...properties },
    is_family: USERS[userId]?.isFamily ?? false,
    app_tab: appTab ?? null,
    client_ts: new Date().toISOString(),
  });
  if (error) {
    console.error('Failed to write analytics event:', error);
  }
}
