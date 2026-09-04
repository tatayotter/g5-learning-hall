import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUSH_CRON_SECRET = Deno.env.get('PUSH_CRON_SECRET')!;

// Not a user-facing endpoint — called only by pg_cron, once daily at 7pm
// Philippine time (11:00 UTC), Monday-Friday only (see migration
// schedule_push_notification_crons — weekends are skipped rather than
// checking each child's actual weekly schedule for "nothing assigned today",
// since that's a fair proxy here: this app's content is scheduled on
// weekdays). Own secret (PUSH_CRON_SECRET), separate from CRON_SECRET.
//
// Reminds any active child who hasn't claimed today's daily-checklist streak
// bonus yet — same "today" the client itself uses (Philippine calendar
// date), computed here server-side rather than trusting a client-supplied
// value since this runs unattended.
Deno.serve(async (req: Request) => {
  const providedSecret = req.headers.get('x-cron-secret');
  if (!PUSH_CRON_SECRET || providedSecret !== PUSH_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // 'YYYY-MM-DD'

  const { data: children, error: childrenErr } = await admin
    .from('children')
    .select('id')
    .eq('is_active', true);

  if (childrenErr) {
    console.error('detect-streak-reminders: failed to list children', childrenErr);
    return new Response(JSON.stringify({ error: 'query failed' }), { status: 500 });
  }

  const { data: claimedRows, error: claimedErr } = await admin
    .from('daily_checklist_claims')
    .select('app_user_id')
    .eq('claim_date', today);

  if (claimedErr) {
    console.error('detect-streak-reminders: failed to list claims', claimedErr);
    return new Response(JSON.stringify({ error: 'query failed' }), { status: 500 });
  }

  const claimedIds = new Set((claimedRows ?? []).map((r) => r.app_user_id as string));
  const candidates = (children ?? []).filter((c) => !claimedIds.has(c.id));

  let queued = 0;
  for (const child of candidates) {
    const { error: insertErr } = await admin.from('push_notification_queue').insert({
      owner_kind: 'app_user',
      owner_id: child.id,
      title: "Don't lose your streak! 🔥",
      body: "You haven't finished today's quests yet — jump back in before the day ends!",
      url: '/play',
    });
    if (!insertErr) queued++;
  }

  return new Response(JSON.stringify({ queued, total: candidates.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
