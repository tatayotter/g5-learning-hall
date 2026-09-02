import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SENDFOX_API_TOKEN = Deno.env.get('SENDFOX_API_TOKEN')!;
const SENDFOX_REENGAGEMENT_LIST_ID = Deno.env.get('SENDFOX_REENGAGEMENT_LIST_ID')!;
const SENDFOX_CHILD_NAME_FIELD_ID = Deno.env.get('SENDFOX_CHILD_NAME_FIELD_ID')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET')!;

// Not a user-facing endpoint — called only by pg_cron on a daily schedule
// (see migration `schedule_reengagement_cron`), authenticated by a shared
// secret header rather than a user JWT.
Deno.serve(async (req: Request) => {
  const providedSecret = req.headers.get('x-cron-secret');
  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: candidates, error } = await admin.rpc('get_reengagement_candidates');
  if (error) {
    console.error('get_reengagement_candidates failed', error);
    return new Response(JSON.stringify({ error: 'query failed' }), { status: 500 });
  }

  let synced = 0;
  let failed = 0;

  for (const candidate of candidates ?? []) {
    const sendfoxRes = await fetch('https://api.sendfox.com/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDFOX_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: candidate.parent_email,
        first_name: candidate.parent_first_name || undefined,
        lists: [Number(SENDFOX_REENGAGEMENT_LIST_ID)],
        // Lets the automation email say the child's actual name instead of
        // "your child" — schema confirmed against sendfox.com/developer/docs
        // (POST /contacts contact_fields), not yet verified against a real
        // send; check a synced contact's profile in SendFox after the first
        // live cron run.
        contact_fields: candidate.child_full_name
          ? [{ id: Number(SENDFOX_CHILD_NAME_FIELD_ID), value: candidate.child_full_name }]
          : undefined,
      }),
    });

    if (!sendfoxRes.ok) {
      const detail = await sendfoxRes.text();
      console.error('SendFox re-engagement sync failed for', candidate.child_id, sendfoxRes.status, detail);
      failed++;
      continue;
    }

    await admin.rpc('mark_reengagement_sent', { p_child_id: candidate.child_id });
    synced++;
  }

  return new Response(JSON.stringify({ synced, failed, total: candidates?.length ?? 0 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
