import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUSH_CRON_SECRET = Deno.env.get('PUSH_CRON_SECRET')!;

// Delivered only while it's still the same evening — see
// push_notification_queue.ttl_seconds.
const REMINDER_TTL_SECONDS = 3 * 60 * 60;

type Segment = 'comeback' | 'regular' | 'lapsed3' | 'lapsed7';

const COPY: Record<Segment, { title: string; body: string }> = {
  comeback: {
    title: 'Your adventure is waiting',
    body: "You started yesterday. Today's quest is ready when you are!",
  },
  regular: {
    title: "Today's quests are waiting",
    body: 'A quick quest before bedtime keeps your curios strong.',
  },
  lapsed3: {
    title: 'Your curios miss you',
    body: "It's been a few days. One quick quest is all it takes to jump back in.",
  },
  lapsed7: {
    title: 'The Forgetting is creeping in',
    body: 'A whole week away! Your guilds need you. Come back for one quick quest.',
  },
};

function phDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // 'YYYY-MM-DD'
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86_400_000);
}

// Not a user-facing endpoint — called only by pg_cron at 7pm Philippine time
// (11:00 UTC) every day (see migration
// push_open_tracking_and_reengagement_crons). Own secret (PUSH_CRON_SECRET),
// separate from CRON_SECRET.
//
// Only subscribed, active players who haven't done anything in the game
// today (Philippine date; any player_log row counts) are considered, then
// sorted by how long they've been away:
//   - signed up yesterday           -> comeback copy (any day)
//   - last played 1-2 days ago      -> regular reminder (weekdays only —
//                                      content is scheduled Mon-Fri)
//   - last played exactly 3 or 7    -> lapsed copy (any day)
//   - anything else                 -> nothing. A kid who drifted away
//                                      shouldn't get a nag every night;
//                                      two well-timed nudges, then quiet.
Deno.serve(async (req: Request) => {
  const providedSecret = req.headers.get('x-cron-secret');
  if (!PUSH_CRON_SECRET || providedSecret !== PUSH_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const today = phDate(new Date());
  const startOfTodayPh = new Date(`${today}T00:00:00+08:00`).toISOString();
  const phWeekday = new Date(`${today}T12:00:00Z`).getUTCDay(); // weekday of the PH calendar date, 0 = Sunday
  const isWeekday = phWeekday >= 1 && phWeekday <= 5;

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
    return new Response(JSON.stringify({ queued: 0 }), { status: 200 });
  }

  const [{ data: children }, { data: classmates }] = await Promise.all([
    admin.from('children').select('id, created_at').in('id', subscriberIds).eq('is_active', true),
    admin.from('classmates').select('id, created_at').in('id', subscriberIds).eq('is_active', true),
  ]);
  const players = [...(children ?? []), ...(classmates ?? [])] as { id: string; created_at: string }[];

  // Latest activity per player, one small query each — selecting today's
  // rows for everyone at once would silently cap at PostgREST's 1000 rows.
  const classified = await Promise.all(
    players.map(async (p): Promise<{ id: string; segment: Segment | null }> => {
      const { data: last, error } = await admin
        .from('player_log')
        .select('created_at')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      // On a read error, err on the side of not nagging.
      if (error) return { id: p.id, segment: null };
      if (last && new Date(last.created_at) >= new Date(startOfTodayPh)) return { id: p.id, segment: null };

      const signupDate = phDate(new Date(p.created_at));
      if (daysBetween(signupDate, today) === 1) return { id: p.id, segment: 'comeback' };

      const lastActiveDate = phDate(new Date(last?.created_at ?? p.created_at));
      const daysAway = daysBetween(lastActiveDate, today);
      if (daysAway === 1 || daysAway === 2) return { id: p.id, segment: isWeekday ? 'regular' : null };
      if (daysAway === 3) return { id: p.id, segment: 'lapsed3' };
      if (daysAway === 7) return { id: p.id, segment: 'lapsed7' };
      return { id: p.id, segment: null };
    }),
  );

  const rows = classified
    .filter((c): c is { id: string; segment: Segment } => c.segment !== null)
    .map((c) => ({
      owner_kind: 'app_user' as const,
      owner_id: c.id,
      title: COPY[c.segment].title,
      body: COPY[c.segment].body,
      url: '/?tab=board',
      ttl_seconds: REMINDER_TTL_SECONDS,
      tag: 'daily-reminder',
    }));

  if (rows.length > 0) {
    const { error: insertErr } = await admin.from('push_notification_queue').insert(rows);
    if (insertErr) {
      console.error('detect-streak-reminders: failed to queue', insertErr);
      return new Response(JSON.stringify({ error: 'insert failed' }), { status: 500 });
    }
  }

  const bySegment: Record<string, number> = {};
  for (const c of classified) {
    const key = c.segment ?? 'skipped';
    bySegment[key] = (bySegment[key] ?? 0) + 1;
  }

  return new Response(JSON.stringify({ queued: rows.length, bySegment }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
