// lib/analytics.ts
// First-party analytics event log, mirroring the fire-and-forget insert
// pattern in lib/playerlog.ts. Never throws — a failed analytics write must
// never break gameplay.
import { supabase } from '@/lib/supabase';
import { getActiveUser, USERS } from '@/lib/userSession';

const SESSION_STORAGE_KEY = 'g5_analytics_session_id';

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
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
    properties,
    is_family: USERS[userId]?.isFamily ?? false,
    app_tab: appTab ?? null,
    client_ts: new Date().toISOString(),
  });
  if (error) {
    console.error('Failed to write analytics event:', error);
  }
}
