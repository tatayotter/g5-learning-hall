import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface SendPushBody {
  owner_kind: 'app_user' | 'parent';
  owner_id: string;
  title: string;
  body: string;
  url?: string;
}

// This function is deployed with verify_jwt DISABLED. Supabase's platform
// gateway would otherwise authenticate every request — including the CORS
// preflight OPTIONS request browsers send before the real POST — and reject
// the preflight with 401 because a preflight never carries an Authorization
// header (that's the CORS spec, not a bug in the caller). Confirmed live:
// function_edge_logs showed "OPTIONS | 401 | .../send-push" for every real
// browser call, so the POST was never even attempted. The JWT check below
// (and the RLS-scoped client it feeds) does the actual auth work instead —
// verify_jwt at the platform level was redundant with it anyway.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Deliberately scoped to "send to myself" for now (plumbing phase — see
// project memory: push triggers/broadcast are a deliberate follow-up, not
// built here). We forward the caller's own JWT into the Supabase client
// below instead of using the service role — so RLS on push_subscriptions
// (owner must match auth.uid()'s bridged app_user_id or parent id) is what
// actually stops a caller from ever reading/sending to someone else's
// subscriptions, not application logic here.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: SendPushBody;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!payload.owner_kind || !payload.owner_id || !payload.title || !payload.body) {
    return new Response(JSON.stringify({ error: 'owner_kind, owner_id, title, body are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('owner_kind', payload.owner_kind)
    .eq('owner_id', payload.owner_id);

  if (error) {
    console.error('send-push: failed to load subscriptions', error);
    return new Response(JSON.stringify({ error: 'failed to load subscriptions' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        JSON.stringify({ title: payload.title, body: payload.body, url: payload.url }),
      );
      sent++;
    } catch (err) {
      failed++;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // Browser/OS dropped this endpoint permanently — clean it up so
        // future sends don't keep failing against a dead subscription.
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        console.error('send-push: sendNotification failed', status, err);
      }
    }
  }

  return new Response(JSON.stringify({ sent, failed, total: subs?.length ?? 0 }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
