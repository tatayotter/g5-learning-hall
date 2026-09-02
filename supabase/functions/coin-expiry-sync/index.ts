import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SENDFOX_API_TOKEN = Deno.env.get('SENDFOX_API_TOKEN')!;
const SENDFOX_COIN_EXPIRY_LIST_ID = Deno.env.get('SENDFOX_COIN_EXPIRY_LIST_ID')!;
const SENDFOX_GOLD_BALANCE_FIELD_ID = Deno.env.get('SENDFOX_GOLD_BALANCE_FIELD_ID')!;
const COIN_EXPIRY_CRON_SECRET = Deno.env.get('COIN_EXPIRY_CRON_SECRET')!;

// Not a user-facing endpoint — called only by pg_cron on a daily schedule
// (see migration `schedule_coin_and_renewal_reminder_crons`), authenticated
// by a shared secret header rather than a user JWT. Same shape as
// reengagement-sync: pulls candidates from a SECURITY DEFINER RPC, pushes
// each to a dedicated SendFox list (the actual reminder email lives in
// SendFox's automation on that list, not here), then marks it sent so the
// next cron run doesn't re-send for the same subscription period.
Deno.serve(async (req: Request) => {
  const providedSecret = req.headers.get('x-cron-secret');
  if (!COIN_EXPIRY_CRON_SECRET || providedSecret !== COIN_EXPIRY_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: candidates, error } = await admin.rpc('get_coin_expiry_candidates');
  if (error) {
    console.error('get_coin_expiry_candidates failed', error);
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
        lists: [Number(SENDFOX_COIN_EXPIRY_LIST_ID)],
        // Lets the reminder email quote the real unused balance instead of
        // a made-up number — schema confirmed against
        // sendfox.com/developer/docs (POST /contacts contact_fields), not
        // yet verified against a real send; check a synced contact's
        // profile in SendFox after the first live cron run.
        contact_fields: [{ id: Number(SENDFOX_GOLD_BALANCE_FIELD_ID), value: candidate.coin_pool_balance }],
      }),
    });

    if (!sendfoxRes.ok) {
      const detail = await sendfoxRes.text();
      console.error('SendFox coin-expiry sync failed for', candidate.parent_id, sendfoxRes.status, detail);
      failed++;
      continue;
    }

    await admin.rpc('mark_coin_reminder_sent', { p_parent_id: candidate.parent_id });
    synced++;
  }

  return new Response(JSON.stringify({ synced, failed, total: candidates?.length ?? 0 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
