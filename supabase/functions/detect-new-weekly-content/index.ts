import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUSH_CRON_SECRET = Deno.env.get('PUSH_CRON_SECRET')!;

// Not a user-facing endpoint — called only by pg_cron every 30 minutes on
// Sundays (see migration schedule_new_weekly_content_cron), authenticated by
// PUSH_CRON_SECRET. Polling repeatedly through the day (rather than one
// fixed hour) rather than assuming when the admin will have actually
// finished authoring that grade's content — the admin_set_content_week save
// itself doesn't trigger this directly since content can be pre-authored
// days ahead of when it should actually notify (see the app's
// push-notification research doc/thread for why a trigger-based approach
// was tried and reverted in favor of this).
//
// Fires at most once per (grade, week) — content_weeks.notified_at is the
// guard — even though this polls repeatedly all day.
Deno.serve(async (req: Request) => {
  const providedSecret = req.headers.get('x-cron-secret');
  if (!PUSH_CRON_SECRET || providedSecret !== PUSH_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // 'YYYY-MM-DD'
  const dow = new Date(`${today}T00:00:00+08:00`).getUTCDay(); // matches Asia/Manila local weekday
  const currentSunday = new Date(`${today}T00:00:00+08:00`);
  currentSunday.setUTCDate(currentSunday.getUTCDate() - dow);
  const currentSundayStr = currentSunday.toISOString().slice(0, 10);

  const { data: weeks, error } = await admin
    .from('content_weeks')
    .select('id, grade')
    .eq('week_starting_date', currentSundayStr)
    .is('notified_at', null);

  if (error) {
    console.error('detect-new-weekly-content: query failed', error);
    return new Response(JSON.stringify({ error: 'query failed' }), { status: 500 });
  }

  let notifiedGrades = 0;
  let queued = 0;

  for (const week of weeks ?? []) {
    const { count: dayCount } = await admin
      .from('content_days')
      .select('id', { count: 'exact', head: true })
      .eq('content_week_id', week.id);

    if (!dayCount) continue; // week row exists but admin hasn't actually saved content yet

    const gradeLabel = `Grade ${week.grade}`;
    const [{ data: children }, { data: classmates }] = await Promise.all([
      admin.from('children').select('id').eq('grade', gradeLabel).eq('is_active', true),
      admin.from('classmates').select('id').eq('grade', gradeLabel).eq('is_active', true),
    ]);

    const recipients = [...(children ?? []), ...(classmates ?? [])];
    if (recipients.length > 0) {
      const rows = recipients.map((r) => ({
        owner_kind: 'app_user' as const,
        owner_id: r.id as string,
        title: 'New Quests This Week! 📖',
        body: `${gradeLabel} content is ready — jump in and see what's new!`,
        url: '/?tab=board',
      }));
      const { error: insertErr } = await admin.from('push_notification_queue').insert(rows);
      if (insertErr) {
        console.error('detect-new-weekly-content: failed to queue', gradeLabel, insertErr);
        continue;
      }
      queued += rows.length;
    }

    await admin.from('content_weeks').update({ notified_at: new Date().toISOString() }).eq('id', week.id);
    notifiedGrades++;
  }

  return new Response(JSON.stringify({ notifiedGrades, queued, weeksChecked: weeks?.length ?? 0 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
