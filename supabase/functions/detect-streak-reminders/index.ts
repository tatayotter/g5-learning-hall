import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUSH_CRON_SECRET = Deno.env.get('PUSH_CRON_SECRET')!;

// Delivered only while it's still the same evening — see
// push_notification_queue.ttl_seconds.
const REMINDER_TTL_SECONDS = 3 * 60 * 60;

// Not a user-facing endpoint — called only by pg_cron, once daily at 7pm
// Philippine time (11:00 UTC), Monday-Friday only (see migration
// schedule_push_notification_crons — weekends are skipped since this app's
// content is scheduled on weekdays). Own secret (PUSH_CRON_SECRET), separate
// from CRON_SECRET.
//
// Reminds subscribed players who haven't done anything in the game yet
// today (Philippine calendar date). "Anything" = any player_log row: quizzes,
// guild quests, battles and missions all write one. This used to key off
// daily_checklist_claims — the all-guilds bonus that almost nobody has ever
// claimed — so nearly every kid got "you haven't finished today's quests"
// every night, including ones who had just played.
//
// Only owners with a push subscription are queued at all; the queue used to
// get a row per active child, ~97% of which had nothing to deliver to.
Deno.serve(async (req: Request) => {
  const providedSecret = req.headers.get('x-cron-secret');
  if (!PUSH_CRON_SECRET || providedSecret !== PUSH_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // 'YYYY-MM-DD'
  const startOfTodayPh = new Date(`${today}T00:00:00+08:00`).toISOString();

  const { data: subs, error: subsErr } = await admin
    .from('push_subscriptions')
    .select('owner_id')
    .eq('owner_kind', 'app_user');

  if (subsErr) {
    console.error('detect-streak-reminders: failed to list subscriptions', subsErr);
    return new Response(JSON.stringify({ error: 'query failed' }), { status: 500 });
  }

  const subscriberIds = [...new Set((subs ?? []).map((s) => s.owner_id as string))];
  if (subscriberIds.length === 0) {
    return new Response(JSON.stringify({ queued: 0, total: 0 }), { status: 200 });
  }

  const [{ data: children }, { data: classmates }] = await Promise.all([
    admin.from('children').select('id').in('id', subscriberIds).eq('is_active', true),
    admin.from('classmates').select('id').in('id', subscriberIds).eq('is_active', true),
  ]);
  const activeIds = [...(children ?? []), ...(classmates ?? [])].map((r) => r.id as string);

  // One head-count per player rather than selecting today's log rows for
  // everyone at once — that select would silently cap at PostgREST's 1000
  // rows and drop players who did play from the "played today" set.
  const playedChecks = await Promise.all(
    activeIds.map(async (id) => {
      const { count, error } = await admin
        .from('player_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', id)
        .gte('created_at', startOfTodayPh);
      // On a read error, err on the side of not nagging.
      return { id, played: !!error || (count ?? 0) > 0 };
    }),
  );
  const candidates = playedChecks.filter((c) => !c.played).map((c) => c.id);

  if (candidates.length === 0) {
    return new Response(JSON.stringify({ queued: 0, total: 0 }), { status: 200 });
  }

  const { error: insertErr } = await admin.from('push_notification_queue').insert(
    candidates.map((id) => ({
      owner_kind: 'app_user' as const,
      owner_id: id,
      title: "Today's quests are waiting",
      body: 'A quick quest before bedtime keeps your curios strong.',
      url: '/?tab=board',
      ttl_seconds: REMINDER_TTL_SECONDS,
      tag: 'daily-reminder',
    })),
  );

  if (insertErr) {
    console.error('detect-streak-reminders: failed to queue', insertErr);
    return new Response(JSON.stringify({ error: 'insert failed' }), { status: 500 });
  }

  return new Response(JSON.stringify({ queued: candidates.length, total: candidates.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
