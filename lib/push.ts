// lib/push.ts
// Web Push plumbing: register the service worker, subscribe/unsubscribe this
// browser, and persist the subscription in push_subscriptions. Two owner
// shapes match every other RLS-scoped table in this app —
// see supabase/migrations/20260904020000_push_subscriptions_infra.sql:
//   - 'app_user': a child/classmate gameplay login, identified by its
//     app-level text id (lib/userSession.ts UserId), bridged to auth.uid()
//     via user_identity_map (already established at login — see linkIdentity).
//   - 'parent': a real Supabase Auth parent session, identified by auth.uid()
//     itself (parents.id = auth.uid()).

import { supabase } from './supabase';

export type PushOwner =
  | { kind: 'app_user'; id: string }
  | { kind: 'parent'; id: string };

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

/** Current subscription state for this browser, without prompting anything. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/**
 * Requests notification permission (if needed), subscribes this browser to
 * push, and upserts the subscription row for `owner`. Returns false on any
 * failure (permission denied, unsupported browser, RLS rejection, etc.) —
 * callers should treat that as "stay unsubscribed" rather than throw.
 */
export async function subscribeToPush(owner: PushOwner): Promise<boolean> {
  if (!isPushSupported()) return false;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error('subscribeToPush: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await registerServiceWorker();
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      owner_kind: owner.kind,
      owner_id: owner.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth_key: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' },
  );

  if (error) {
    console.error('subscribeToPush: failed to save subscription', error);
    return false;
  }
  return true;
}

/** Unsubscribes this browser and removes its row from push_subscriptions. */
export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getExistingSubscription();
  if (!subscription) return true;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return !error;
}

const AUTO_PROMPT_KEY_PREFIX = 'g5_push_auto_prompted_';

/**
 * Fires the browser's native permission prompt automatically, once per
 * browser per owner — used so kids/parents don't have to find the manual
 * toggle first (there's a 300-gold bonus for enabling, see lib/pushBonus.ts).
 * No-ops if unsupported, already decided (granted/denied), already
 * subscribed, or already attempted once in this browser — browsers won't
 * re-show a dismissed prompt anyway, and calling subscribe() repeatedly on
 * a 'default' permission that keeps getting silently dismissed would just
 * nag every page load.
 */
export async function autoPromptForPush(owner: PushOwner): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission !== 'default') return false;

  const flagKey = `${AUTO_PROMPT_KEY_PREFIX}${owner.kind}_${owner.id}`;
  if (typeof window !== 'undefined' && window.localStorage.getItem(flagKey)) return false;

  const existing = await getExistingSubscription();
  if (existing) return false;

  try {
    window.localStorage.setItem(flagKey, '1');
  } catch {
    // Storage unavailable (private mode, etc.) — proceed anyway, worst case
    // this prompts again next load.
  }

  // Resolves only once the user has actually answered the native prompt
  // (or it's been silently suppressed) — callers that award a bonus for
  // subscribing should wait on this rather than checking state immediately,
  // since the prompt itself can sit open for several seconds while a human
  // reads and taps it.
  return subscribeToPush(owner);
}

/** Asks the send-push Edge Function to deliver a test notification to `owner`. */
export async function sendTestPush(owner: PushOwner): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: {
      owner_kind: owner.kind,
      owner_id: owner.id,
      title: 'Learning Hall 🔔',
      body: 'Push notifications are working!',
    },
  });
  if (error) {
    console.error('sendTestPush failed', error);
    return false;
  }
  return !!data?.sent;
}
