// lib/push.ts
// Push plumbing: subscribe/unsubscribe this device and persist it in
// push_subscriptions. Browsers use Web Push (service worker + VAPID, kind
// 'web'); the Google Play app has no Web Push in its WebView, so it registers
// a Firebase Cloud Messaging token instead (kind 'fcm', see
// supabase/functions/_shared/fcm.ts). Callers don't care which: use
// usePushAvailability / isSubscribedOnThisDevice / isPushBlocked /
// subscribeToPush / unsubscribeFromPush. Two owner
// shapes match every other RLS-scoped table in this app —
// see supabase/migrations/20260904020000_push_subscriptions_infra.sql:
//   - 'app_user': a child/classmate gameplay login, identified by its
//     app-level text id (lib/userSession.ts UserId), bridged to auth.uid()
//     via user_identity_map (already established at login — see linkIdentity).
//   - 'parent': a real Supabase Auth parent session, identified by auth.uid()
//     itself (parents.id = auth.uid()).

import { useSyncExternalStore } from 'react';
import { PushNotifications, type ActionPerformed, type Token } from '@capacitor/push-notifications';
import { supabase } from './supabase';
import { hasNativePlugin } from './platform';

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

export type PushAvailability = 'supported' | 'ios-needs-install' | 'unsupported';

/**
 * True inside a Play app build that ships the push plugin. Older installed
 * builds (versionCode 2 and below) don't have it and stay 'unsupported'.
 */
function isNativePush(): boolean {
  return typeof window !== 'undefined' && hasNativePlugin('PushNotifications');
}

/**
 * iOS/iPadOS only exposes Web Push to a site added to the Home Screen
 * (Safari 16.4+) — in a normal Safari tab PushManager simply doesn't exist,
 * so isPushSupported() alone can't tell "never possible here" from "possible
 * once installed". The Play app uses native push (FCM) when its build has
 * the plugin.
 */
export function getPushAvailability(): PushAvailability {
  if (typeof window === 'undefined') return 'unsupported';
  if (isNativePush() || isPushSupported()) return 'supported';
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isIos && !standalone) return 'ios-needs-install';
  return 'unsupported';
}

const noopSubscribe = () => () => {};

/** getPushAvailability() as a hook — 'unsupported' during SSR, so hydration matches. */
export function usePushAvailability(): PushAvailability {
  return useSyncExternalStore(noopSubscribe, getPushAvailability, () => 'unsupported');
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

// ── Native (Google Play app, FCM) ──────────────────────────────────────────
// The token and the owner it was saved for are kept on the device, so the
// toggle can show "on" without a round trip and app start can refresh a
// rotated token for the same owner.
const FCM_TOKEN_KEY = 'lh_fcm_token';
const FCM_OWNER_KEY = 'lh_fcm_owner';
// Must match ANDROID_CHANNEL_ID in supabase/functions/_shared/fcm.ts and the
// default channel in AndroidManifest.xml.
const ANDROID_CHANNEL_ID = 'learninghall_default';

function ownerKey(owner: PushOwner): string {
  return `${owner.kind}:${owner.id}`;
}

function readStored(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeStored(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — the toggle just won't remember until next save.
  }
}

async function nativePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  const { receive } = await PushNotifications.checkPermissions();
  return receive === 'granted' || receive === 'denied' ? receive : 'prompt';
}

async function ensureChannel(): Promise<void> {
  await PushNotifications.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'Learning Hall',
    description: 'Reminders and game updates',
    importance: 3,
    visibility: 1,
  }).catch(() => {});
}

/** register() answers through events, not its promise; wait for the first one. */
function fetchFcmToken(): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const handles: Promise<{ remove: () => Promise<void> }>[] = [];
    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      handles.forEach((h) => h.then((x) => x.remove()).catch(() => {}));
      resolve(token);
    };
    const timer = setTimeout(() => finish(null), 15000);
    handles.push(PushNotifications.addListener('registration', (t: Token) => finish(t.value)));
    handles.push(PushNotifications.addListener('registrationError', (err) => {
      console.error('FCM registration failed', err);
      finish(null);
    }));
    PushNotifications.register().catch(() => finish(null));
  });
}

async function saveFcmToken(owner: PushOwner, token: string): Promise<boolean> {
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      owner_kind: owner.kind,
      owner_id: owner.id,
      kind: 'fcm',
      endpoint: token,
      p256dh: null,
      auth_key: null,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' },
  );
  if (error) {
    console.error('subscribeToPush: failed to save FCM token', error);
    return false;
  }
  writeStored(FCM_TOKEN_KEY, token);
  writeStored(FCM_OWNER_KEY, ownerKey(owner));
  return true;
}

async function subscribeNative(owner: PushOwner): Promise<boolean> {
  let permission = await nativePermission();
  if (permission === 'prompt') {
    const { receive } = await PushNotifications.requestPermissions();
    permission = receive === 'granted' ? 'granted' : 'denied';
  }
  if (permission !== 'granted') return false;
  await ensureChannel();
  const token = await fetchFcmToken();
  return token ? saveFcmToken(owner, token) : false;
}

async function unsubscribeNative(): Promise<boolean> {
  const token = readStored(FCM_TOKEN_KEY);
  let ok = true;
  if (token) {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', token);
    ok = !error;
  }
  await PushNotifications.unregister().catch(() => {});
  writeStored(FCM_TOKEN_KEY, null);
  writeStored(FCM_OWNER_KEY, null);
  return ok;
}

let tapListenerAdded = false;

/**
 * Opens the screen a tapped notification points to. Called at startup from
 * instrumentation-client.ts, before anyone is signed in: the plugin holds a
 * tap (including the one that cold-started the app) until this listener
 * exists, so registering it only after login lost taps on the login screen.
 * No-op on the web and on Play app builds without the push plugin.
 */
export function listenForNotificationTaps(): void {
  if (!isNativePush() || tapListenerAdded) return;
  tapListenerAdded = true;
  void PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    const data = (action.notification.data ?? {}) as { url?: string; qid?: string };
    const target = new URL(data.url || '/', window.location.origin);
    if (target.origin !== window.location.origin) return;
    // Same ?pq= the web service worker adds, so recordPushOpenFromUrl counts it.
    if (data.qid) target.searchParams.set('pq', data.qid);
    window.location.assign(target.pathname + target.search + target.hash);
  });
}

/**
 * Call once a page knows who is signed in (Dashboard, parent dashboard).
 * Re-saves the device token for the same owner in case Firebase rotated it.
 * No-op on the web and on Play app builds without the push plugin.
 */
export function initNativePush(owner: PushOwner): void {
  if (!isNativePush()) return;
  listenForNotificationTaps();

  void (async () => {
    if (readStored(FCM_OWNER_KEY) !== ownerKey(owner)) return;
    if ((await nativePermission()) !== 'granted') return;
    await ensureChannel();
    const token = await fetchFcmToken();
    if (!token) return;
    const previous = readStored(FCM_TOKEN_KEY);
    if ((await saveFcmToken(owner, token)) && previous && previous !== token) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', previous);
    }
  })().catch((err) => console.error('initNativePush failed', err));
}

/** Whether this device currently has push on (either kind). */
export async function isSubscribedOnThisDevice(): Promise<boolean> {
  if (isNativePush()) {
    return !!readStored(FCM_TOKEN_KEY) && (await nativePermission()) === 'granted';
  }
  return !!(await getExistingSubscription());
}

/** True once the user has blocked notifications — only device settings can undo it. */
export async function isPushBlocked(): Promise<boolean> {
  if (isNativePush()) return (await nativePermission()) === 'denied';
  return typeof Notification !== 'undefined' && Notification.permission === 'denied';
}

/**
 * Requests notification permission (if needed), subscribes this device to
 * push, and upserts the subscription row for `owner`. Returns false on any
 * failure (permission denied, unsupported browser, RLS rejection, etc.) —
 * callers should treat that as "stay unsubscribed" rather than throw.
 */
export async function subscribeToPush(owner: PushOwner): Promise<boolean> {
  if (isNativePush()) return subscribeNative(owner);
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

/** Unsubscribes this device and removes its row from push_subscriptions. */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (isNativePush()) return unsubscribeNative();
  const subscription = await getExistingSubscription();
  if (!subscription) return true;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return !error;
}

/**
 * Records that a queued push was tapped: the service worker (web) or
 * initNativePush's tap handler (Play app) appends the queue row id as ?pq=. Call once on page load, before anything strips the
 * query string. Fire-and-forget — a failed write only loses a stat.
 */
export function recordPushOpenFromUrl(): void {
  if (typeof window === 'undefined') return;
  const qid = new URLSearchParams(window.location.search).get('pq');
  if (!qid || !/^[0-9a-f-]{36}$/i.test(qid)) return;
  supabase.rpc('mark_push_opened', { p_queue_id: qid }).then(({ error }) => {
    if (error) console.error('mark_push_opened failed', error);
  });
}

/** Asks the send-push Edge Function to deliver a test notification to `owner`. */
export async function sendTestPush(owner: PushOwner): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: {
      owner_kind: owner.kind,
      owner_id: owner.id,
      title: 'Learning Hall',
      body: 'Push notifications are working!',
    },
  });
  if (error) {
    console.error('sendTestPush failed', error);
    return false;
  }
  return !!data?.sent;
}
