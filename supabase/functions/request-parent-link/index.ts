import { createClient } from 'jsr:@supabase/supabase-js@2';

// Child-initiated parent linking — see docs/parent-child-linking-design.md.
// Called by the child's own (JWT-authed) client after they enter a parent
// email in the "link a parent" UI. This function is the only place the raw
// link token ever exists outside the database: it's requested from
// request_parent_link, used immediately to build the emailed link, and then
// discarded — it is never returned in this function's response.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
// Falls back to Resend's shared test sender, which only delivers to the
// Resend account owner's own inbox — real parent invites need a verified
// domain and RESEND_FROM_EMAIL set (see docs/parent-child-linking-design.md).
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Learning Hall PH <onboarding@resend.dev>';
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:3000';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'missing authorization' }), { status: 401, headers: corsHeaders });
  }

  let parentEmail: string;
  try {
    const body = await req.json();
    parentEmail = String(body.parentEmail ?? '').trim();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid request body' }), { status: 400, headers: corsHeaders });
  }

  if (!parentEmail) {
    return new Response(JSON.stringify({ error: 'parentEmail is required' }), { status: 400, headers: corsHeaders });
  }

  // Client-scoped: resolves the caller's own identity, so request_parent_link's
  // auth.uid() checks run as the calling child, not as the service role.
  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'invalid session' }), { status: 401, headers: corsHeaders });
  }

  // request_parent_link enforces the child-account check, the "already
  // linked" block, and the 3/day-per-child + 3/day-per-email rate limits
  // itself — this call either returns a raw token or throws.
  const { data: token, error: rpcError } = await callerClient.rpc('request_parent_link', {
    p_parent_email: parentEmail,
  });

  if (rpcError || !token) {
    // Surface the RPC's message as-is — it's already one of a small set of
    // deliberately generic, non-enumerable strings (see the RPC itself).
    console.error('request_parent_link failed', rpcError);
    return new Response(JSON.stringify({ error: rpcError?.message || 'request failed' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: identity } = await admin
    .from('user_identity_map')
    .select('app_user_id')
    .eq('auth_uid', user.id)
    .single();

  const { data: child } = identity
    ? await admin.from('children').select('full_name').eq('id', identity.app_user_id).single()
    : { data: null };

  const childFirstName = (child?.full_name || 'Your child').split(' ')[0];
  const linkUrl = `${SITE_URL}/link-parent?token=${encodeURIComponent(token)}`;

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [parentEmail],
      subject: `${childFirstName} wants to link you as their parent on Learning Hall PH`,
      html: `
        <p>Hi,</p>
        <p><strong>${childFirstName}</strong> asked to link you as their parent on Learning Hall PH.
        Confirming this link lets you see their progress, set up parental tools, and unlocks
        leaderboards/PvP for their account.</p>
        <p><a href="${linkUrl}">Confirm you're ${childFirstName}'s parent</a></p>
        <p>This link expires in 30 minutes and can only be used once. If you weren't expecting
        this, you can safely ignore this email.</p>
      `,
    }),
  });

  if (!emailRes.ok) {
    const detail = await emailRes.text();
    console.error('Resend send failed', emailRes.status, detail);
    return new Response(JSON.stringify({ error: 'failed to send invite email' }), {
      status: 502,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ sent: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
