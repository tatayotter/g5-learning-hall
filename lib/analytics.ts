// lib/analytics.ts
// First-party analytics event log, mirroring the fire-and-forget insert
// pattern in lib/playerlog.ts. Never throws — a failed analytics write must
// never break gameplay.
import { supabase } from '@/lib/supabase';
import { getActiveUser, USERS } from '@/lib/userSession';
import { isIosDevice, isRunningInstalled } from '@/lib/installPrompt';

const SESSION_STORAGE_KEY = 'g5_analytics_session_id';
const ATTRIBUTION_STORAGE_KEY = 'g5_analytics_attribution';
const LAUNCH_CONTEXT_STORAGE_KEY = 'g5_analytics_launch_context';
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

// How this session was launched, stamped on every event so retention can be
// split by it: 'browser' (a tab), 'installed' (home-screen web app), or 'twa'
// (the Android app, a Trusted Web Activity — also standalone, told apart by
// its android-app:// referrer, which only exists on the launch page load, so
// it's resolved once and pinned for the session).
type DisplayMode = 'browser' | 'installed' | 'twa';
type Device = 'android' | 'ios' | 'desktop';

function getLaunchContext(): { display_mode: DisplayMode; device: Device } | Record<string, never> {
  if (typeof window === 'undefined') return {};
  try {
    const cached = sessionStorage.getItem(LAUNCH_CONTEXT_STORAGE_KEY);
    if (cached) return JSON.parse(cached);
    const display_mode: DisplayMode = document.referrer.startsWith('android-app://')
      ? 'twa'
      : isRunningInstalled() ? 'installed' : 'browser';
    const device: Device = isIosDevice() ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : 'desktop';
    const context = { display_mode, device };
    sessionStorage.setItem(LAUNCH_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    return context;
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

  const { error } = await supabase.from('analytics_events').insert({
    user_id: userId,
    session_id: getOrCreateSessionId(),
    event_name: eventName,
    properties: { ...getLaunchContext(), ...getStoredAttribution(), ...properties },
    is_family: USERS[userId]?.isFamily ?? false,
    app_tab: appTab ?? null,
    client_ts: new Date().toISOString(),
  });
  if (error) {
    console.error('Failed to write analytics event:', error);
  }
}
