// lib/metaCapi.ts — server-only. Sends a conversion event to Meta's
// Conversions API (server-to-server), independent of whether the browser
// Pixel ever fired: ad blockers, Safari ITP, and third-party-cookie
// restrictions all silently drop client-side Pixel events, which makes them
// unreliable for anything revenue math (CAC vs LTV) actually depends on.
// This must only be imported from server code (API routes) — it uses the
// Pixel ID + a private access token, never the anon/publishable key.
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const GRAPH_API_VERSION = 'v21.0';

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

interface CapiUserData {
  email?: string | null;
  phone?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
}

interface SendCapiEventArgs {
  eventName: string;
  eventId: string; // dedup key — reuse the same id if a browser Pixel event ever pairs with this
  eventSourceUrl: string;
  userData: CapiUserData;
  customData?: Record<string, unknown>;
}

/**
 * Fires a single server-side conversion event to Meta CAPI. Never throws —
 * a failed ad-analytics push must never break the caller's actual job
 * (e.g. acking a payment webhook). Logs and returns false on any failure.
 */
export async function sendCapiEvent({
  eventName,
  eventId,
  eventSourceUrl,
  userData,
  customData,
}: SendCapiEventArgs): Promise<boolean> {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('sendCapiEvent: META_CAPI_ACCESS_TOKEN is not set — skipping', eventName);
    return false;
  }

  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('app_settings')
    .select('facebook_pixel_id')
    .eq('id', 1)
    .maybeSingle();
  const pixelId = settings?.facebook_pixel_id?.trim();
  if (settingsError || !pixelId) {
    console.error('sendCapiEvent: no Pixel ID configured — skipping', eventName, settingsError);
    return false;
  }

  const user_data: Record<string, unknown> = {};
  if (userData.email) user_data.em = [sha256(userData.email)];
  if (userData.phone) user_data.ph = [sha256(userData.phone.replace(/[^0-9]/g, ''))];
  if (userData.clientIp) user_data.client_ip_address = userData.clientIp;
  if (userData.clientUserAgent) user_data.client_user_agent = userData.clientUserAgent;
  if (userData.fbp) user_data.fbp = userData.fbp;
  if (userData.fbc) user_data.fbc = userData.fbc;

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: eventSourceUrl,
        user_data,
        custom_data: customData ?? {},
      },
    ],
    // Set META_CAPI_TEST_EVENT_CODE while verifying in Meta Events Manager's
    // Test Events tab; unset (or leave empty) in production — events sent
    // with a test code don't count toward real reporting.
    ...(process.env.META_CAPI_TEST_EVENT_CODE
      ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE }
      : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('sendCapiEvent: Meta API rejected the event', eventName, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('sendCapiEvent: request failed', eventName, err);
    return false;
  }
}
