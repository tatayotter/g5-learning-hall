import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUSH_CRON_SECRET = Deno.env.get('PUSH_CRON_SECRET')!;

// Not a user-facing endpoint — called only by pg_cron on a 5-minute schedule
// (see migration schedule_push_notification_crons), authenticated by a
// shared secret header rather than a user JWT. Own secret (PUSH_CRON_SECRET),
// deliberately separate from the existing CRON_SECRET used by the
// reengagement/renewal-reminder/etc. functions, so this can't be broken by
// (or break) whatever that one currently is set to.
//
// Curio Training Missions finish on a real-world timer (1-8 hours) with no
// client action at the moment they complete — the player might be offline
// for hours — so this has to be detected by polling rather than the usual
// "client calls an RPC when something happens" pattern used elsewhere.
Deno.serve(async (req: Request) => {
  const providedSecret = req.headers.get('x-cron-secret');
  if (!PUSH_CRON_SECRET || providedSecret !== PUSH_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: missions, error } = await admin
    .from('curio_missions')
    .select('id, user_id, mission_name')
    .lte('ends_at', new Date().toISOString())
    .is('claimed_at', null)
    .is('notified_at', null);

  if (error) {
    console.error('detect-completed-missions: query failed', error);
    return new Response(JSON.stringify({ error: 'query failed' }), { status: 500 });
  }

  let queued = 0;

  for (const mission of missions ?? []) {
    const { error: insertErr } = await admin.from('push_notification_queue').insert({
      owner_kind: 'app_user',
      owner_id: mission.user_id,
      title: 'Mission Complete! 🎒',
      body: `"${mission.mission_name}" is done — come collect your curio's reward.`,
      url: '/play',
    });
    if (insertErr) {
      console.error('detect-completed-missions: failed to queue', mission.id, insertErr);
      continue;
    }
    await admin.from('curio_missions').update({ notified_at: new Date().toISOString() }).eq('id', mission.id);
    queued++;
  }

  return new Response(JSON.stringify({ queued, total: missions?.length ?? 0 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
