import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SENDFOX_API_TOKEN = Deno.env.get('SENDFOX_API_TOKEN')!;
const SENDFOX_LIST_ID = Deno.env.get('SENDFOX_LIST_ID')!;

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

  // Client-scoped: resolves the caller's identity from their own JWT.
  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'invalid session' }), { status: 401, headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: parent, error: parentError } = await admin
    .from('parents')
    .select('full_name, marketing_opt_in')
    .eq('id', user.id)
    .single();

  if (parentError || !parent) {
    return new Response(JSON.stringify({ error: 'parent record not found' }), { status: 404, headers: corsHeaders });
  }

  if (!parent.marketing_opt_in) {
    return new Response(JSON.stringify({ skipped: true, reason: 'not opted in' }), { status: 200, headers: corsHeaders });
  }

  if (!user.email) {
    return new Response(JSON.stringify({ skipped: true, reason: 'no email on account' }), { status: 200, headers: corsHeaders });
  }

  const sendfoxRes = await fetch('https://api.sendfox.com/contacts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDFOX_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      first_name: parent.full_name || undefined,
      lists: [Number(SENDFOX_LIST_ID)],
    }),
  });

  const sendfoxBody = await sendfoxRes.text();
  console.log('SendFox contact sync response', sendfoxRes.status, sendfoxBody);

  if (!sendfoxRes.ok) {
    return new Response(JSON.stringify({ error: 'sendfox sync failed' }), { status: 502, headers: corsHeaders });
  }

  return new Response(sendfoxBody, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
