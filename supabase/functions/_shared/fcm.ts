// Firebase Cloud Messaging (HTTP v1) sender for the Google Play app's
// push_subscriptions rows (kind = 'fcm', endpoint = device token).
//
// Auth: the FCM_SERVICE_ACCOUNT_JSON secret holds the Firebase project's
// service-account key (the whole downloaded JSON). We sign a short-lived JWT
// with its private key and swap it for an OAuth access token, cached per
// function instance until shortly before it expires. No SDK, so nothing
// extra to bundle.

const SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
// Must match the channel lib/push.ts creates in the app (Android 8+ drops
// notifications for channels that don't exist into "Miscellaneous").
const ANDROID_CHANNEL_ID = 'learninghall_default';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface FcmMessage {
  title: string;
  body: string;
  url?: string | null;
  tag?: string | null;
  /** push_notification_queue row id, echoed back on tap for mark_push_opened. */
  qid?: string | null;
  ttlSeconds: number;
}

export type FcmResult =
  | { ok: true }
  // dead: the token is gone for good (app uninstalled, data cleared) and the
  // row should be deleted, same as web push's 404/410.
  | { ok: false; dead: boolean; status: number; detail: string };

let account: ServiceAccount | null | undefined;
let cachedToken: { value: string; expiresAt: number } | null = null;

function getAccount(): ServiceAccount | null {
  if (account === undefined) {
    try {
      account = SERVICE_ACCOUNT_JSON ? JSON.parse(SERVICE_ACCOUNT_JSON) as ServiceAccount : null;
    } catch {
      console.error('fcm: FCM_SERVICE_ACCOUNT_JSON is not valid JSON');
      account = null;
    }
  }
  return account ?? null;
}

/** False when the secret is missing, so callers can skip fcm rows cleanly. */
export function isFcmConfigured(): boolean {
  return getAccount() !== null;
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' +
    base64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${base64url(signature)}`,
    }),
  });
  if (!res.ok) throw new Error(`fcm: token exchange failed ${res.status} ${await res.text()}`);
  const json = await res.json() as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export async function sendFcm(token: string, msg: FcmMessage): Promise<FcmResult> {
  const sa = getAccount();
  if (!sa) return { ok: false, dead: false, status: 0, detail: 'FCM_SERVICE_ACCOUNT_JSON not set' };

  let accessToken: string;
  try {
    accessToken = await getAccessToken(sa);
  } catch (err) {
    return { ok: false, dead: false, status: 0, detail: String(err) };
  }

  // data values must all be strings. The app's tap handler reads url + qid.
  const data: Record<string, string> = {};
  if (msg.url) data.url = msg.url;
  if (msg.qid) data.qid = msg.qid;

  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: msg.title, body: msg.body },
        data,
        android: {
          // Same reasoning as web push's TTL: a stale reminder is worse than none.
          ttl: `${Math.max(0, Math.floor(msg.ttlSeconds))}s`,
          priority: 'NORMAL',
          notification: {
            channel_id: ANDROID_CHANNEL_ID,
            // Same tag replaces the earlier notification instead of stacking.
            ...(msg.tag ? { tag: msg.tag } : {}),
          },
        },
      },
    }),
  });

  if (res.ok) return { ok: true };

  const text = await res.text();
  // FCM reports a dead token as 404 NOT_FOUND and/or errorCode UNREGISTERED.
  const dead = res.status === 404 || text.includes('UNREGISTERED');
  return { ok: false, dead, status: res.status, detail: text.slice(0, 500) };
}
