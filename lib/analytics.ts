// lib/analytics.ts
// First-party analytics event log, mirroring the fire-and-forget insert
// pattern in lib/playerlog.ts. Never throws — a failed analytics write must
// never break gameplay.
import { supabase } from '@/lib/supabase';
import { getActiveUser, USERS } from '@/lib/userSession';
import { isIosDevice, isRunningInstalled } from '@/lib/installPrompt';
import { getNativeAppBuild, isNativeApp } from '@/lib/platform';

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
// split by it: 'browser' (a tab), 'installed' (home-screen web app), or 'app'
// (the Google Play app, a Capacitor WebView). Resolved once and pinned for the
// session. Rows before 2026-10-05 have 'twa' instead of 'app': that came from
// an android-app:// referrer check, which the Capacitor app never sends — it
// actually caught links opened from other Android apps (Facebook, Gmail), so
// read old 'twa' rows as 'browser'.
type DisplayMode = 'browser' | 'installed' | 'app';
type Device = 'android' | 'ios' | 'desktop';
type LaunchContext = { display_mode: DisplayMode; device: Device; app_build?: string };

function getLaunchContext(): LaunchContext | Record<string, never> {
  if (typeof window === 'undefined') return {};
  try {
    const cached = sessionStorage.getItem(LAUNCH_CONTEXT_STORAGE_KEY);
    if (cached) return JSON.parse(cached);
    const display_mode: DisplayMode = isNativeApp()
      ? 'app'
      : isRunningInstalled() ? 'installed' : 'browser';
    const device: Device = isIosDevice() ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : 'desktop';
    const context: LaunchContext = { display_mode, device };
    sessionStorage.setItem(LAUNCH_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    // The app's versionCode is async — fold it into the pinned context once
    // known, so later events say which native shell the player is on.
    if (display_mode === 'app') {
      void getNativeAppBuild().then((app_build) => {
        if (!app_build) return;
        try {
          sessionStorage.setItem(LAUNCH_CONTEXT_STORAGE_KEY, JSON.stringify({ ...context, app_build }));
        } catch {}
      });
    }
    return context;
  } catch {
    return {};
  }
}

export interface TrackOptions {
  // Send with fetch keepalive instead of supabase-js, so the write survives
  // the page being hidden or closed. Use only for events fired from
  // visibilitychange/pagehide handlers.
  keepalive?: boolean;
}

async function insertEvent(
  userId: string,
  isFamily: boolean,
  eventName: string,
  properties: Record<string, unknown>,
  appTab: string | null,
  options: TrackOptions
) {
  const row = {
    user_id: userId,
    session_id: getOrCreateSessionId(),
    event_name: eventName,
    properties: { ...getLaunchContext(), ...getStoredAttribution(), ...properties },
    is_family: isFamily,
    app_tab: appTab,
    client_ts: new Date().toISOString(),
  };

  if (options.keepalive) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/analytics_events`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(row),
      });
    } catch {
      // page is going away — nothing useful to do with a failure here
    }
    return;
  }

  const { error } = await supabase.from('analytics_events').insert(row);
  if (error) {
    console.error('Failed to write analytics event:', error);
  }
}

export async function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
  appTab?: string,
  options: TrackOptions = {}
) {
  const userId = getActiveUser();
  if (!userId) return; // no-op before login — nothing meaningful to attribute yet
  await insertEvent(userId, USERS[userId]?.isFamily ?? false, eventName, properties, appTab ?? null, options);
}

// Parent-side events. Parents sign in with real Supabase Auth and have no
// user_identity_map row, so they're keyed on their auth uid (= parents.id)
// rather than getActiveUser() — which may still hold a child's id on a shared
// device. RLS ("analytics_events: parent self insert") only accepts this when
// the uid really is a parent.
export async function trackParentEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
  options: TrackOptions = {}
) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user || user.is_anonymous) return;
  await insertEvent(user.id, false, eventName, properties, 'parent', options);
}

// Client crash reporting. Attributed to whoever is signed in on this device:
// a real (parent) Supabase session wins, otherwise the active child. Capped
// and de-duplicated per page load so a render loop can't flood the table.
const MAX_ERRORS_PER_PAGE = 10;
const reportedErrors = new Set<string>();

export async function trackClientError(
  source: 'window' | 'promise' | 'boundary' | 'global_boundary',
  error: unknown,
  extra: Record<string, unknown> = {}
) {
  if (typeof window === 'undefined') return;
  const err = error instanceof Error ? error : null;
  const message = (err?.message ?? String(error ?? 'unknown')).slice(0, 300);
  const key = `${source}:${message}`;
  if (reportedErrors.has(key) || reportedErrors.size >= MAX_ERRORS_PER_PAGE) return;
  reportedErrors.add(key);

  const properties = {
    source,
    message,
    name: err?.name ?? null,
    stack: err?.stack?.slice(0, 1500) ?? null,
    // pathname only — query strings can carry tokens or attribution ids
    path: window.location.pathname,
    ...extra,
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && !session.user.is_anonymous) {
      await insertEvent(session.user.id, false, 'client_error', properties, 'parent', {});
      return;
    }
    const userId = getActiveUser();
    if (userId) {
      await insertEvent(userId, USERS[userId]?.isFamily ?? false, 'client_error', properties, null, {});
    }
  } catch {
    // never let error reporting itself throw
  }
}
