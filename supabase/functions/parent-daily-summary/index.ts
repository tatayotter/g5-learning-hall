import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUSH_CRON_SECRET = Deno.env.get('PUSH_CRON_SECRET')!;

const SUMMARY_TTL_SECONDS = 4 * 60 * 60;
const QUEST_ACTIONS = new Set(['quiz', 'side_quest']);

function phDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // 'YYYY-MM-DD'
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86_400_000);
}

function firstName(fullName: string | null): string {
  return (fullName ?? '').trim().split(/\s+/)[0] || 'Your child';
}

// Not a user-facing endpoint — called only by pg_cron at 8pm Philippine time
// (12:00 UTC) every day (see migration
// push_open_tracking_and_reengagement_crons), authenticated by
// PUSH_CRON_SECRET.
//
// One push per subscribed parent:
//   - If any of their children played today: a one-line summary per child
//     ("Maria: 3 quests, +120 XP · Jun: not yet").
//   - Otherwise, only if a child is 1-7 days old and has never played: a
//     one-time "help them start" nudge (deduped via the queue row's tag).
//   - Otherwise nothing — no "nobody played" nag every night.
//
// Kids who are linked to a parent retain ~7x better, so this is the
// cheapest lever for getting the parent to sit down with them.
Deno.serve(async (req: Request) => {
  const providedSecret = req.headers.get('x-cron-secret');
  if (!PUSH_CRON_SECRET || providedSecret !== PUSH_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const today = phDate(new Date());
  const startOfTodayPh = new Date(`${today}T00:00:00+08:00`).toISOString();

  const { data: subs, error: subsErr } = await admin
    .from('push_subscriptions')
    .select('owner_id')
    .eq('owner_kind', 'parent');

  if (subsErr) {
    console.error('parent-daily-summary: failed to list subscriptions', subsErr);
    return new Response(JSON.stringify({ error: 'query failed' }), { status: 500 });
  }

  const parentIds = [...new Set((subs ?? []).map((s) => s.owner_id as string))];
  if (parentIds.length === 0) {
    return new Response(JSON.stringify({ queued: 0, parents: 0 }), { status: 200 });
  }

  const { data: children, error: childrenErr } = await admin
    .from('children')
    .select('id, full_name, created_at, parent_id')
    .in('parent_id', parentIds)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (childrenErr) {
    console.error('parent-daily-summary: failed to list children', childrenErr);
    return new Response(JSON.stringify({ error: 'query failed' }), { status: 500 });
  }

  type ChildDay = {
    id: string;
    parentId: string;
    name: string;
    ageDays: number;
    quests: number;
    xp: number;
    playedToday: boolean;
    everPlayed: boolean;
  };

  const days: ChildDay[] = await Promise.all(
    (children ?? []).map(async (c) => {
      const [{ data: todayRows }, { count: everCount }] = await Promise.all([
        admin.from('player_log').select('action_type, xp_change').eq('user_id', c.id).gte('created_at', startOfTodayPh),
        admin.from('player_log').select('id', { count: 'exact', head: true }).eq('user_id', c.id),
      ]);
      const rows = todayRows ?? [];
      return {
        id: c.id as string,
        parentId: c.parent_id as string,
        name: firstName(c.full_name as string),
        ageDays: daysBetween(phDate(new Date(c.created_at as string)), today),
        quests: rows.filter((r) => QUEST_ACTIONS.has(r.action_type as string)).length,
        xp: rows.reduce((sum, r) => sum + Math.max(0, (r.xp_change as number) ?? 0), 0),
        playedToday: rows.length > 0,
        everPlayed: (everCount ?? 0) > 0,
      };
    }),
  );

  const rows: Record<string, unknown>[] = [];
  let summaries = 0;
  let firstQuestNudges = 0;

  for (const parentId of parentIds) {
    const kids = days.filter((d) => d.parentId === parentId);
    if (kids.length === 0) continue;

    if (kids.some((k) => k.playedToday)) {
      const lines = kids.map((k) => {
        if (!k.playedToday) return `${k.name}: not yet`;
        const xp = k.xp > 0 ? `, +${k.xp} XP` : '';
        if (k.quests === 0) return `${k.name}: played${xp}`;
        return `${k.name}: ${k.quests} ${k.quests === 1 ? 'quest' : 'quests'}${xp}`;
      });
      const played = kids.filter((k) => k.playedToday);
      rows.push({
        owner_kind: 'parent',
        owner_id: parentId,
        title: played.length === 1 && kids.length === 1 ? `${played[0].name} learned today` : 'Today in Learning Hall',
        body: lines.join(' · '),
        url: '/parent-dashboard',
        ttl_seconds: SUMMARY_TTL_SECONDS,
        tag: 'parent-summary',
      });
      summaries++;
      continue;
    }

    // One-time nudge for a new child who hasn't tried anything yet.
    for (const k of kids) {
      if (k.everPlayed || k.ageDays < 1 || k.ageDays > 7) continue;
      const tag = `first-quest-${k.id}`;
      const { count: alreadySent } = await admin
        .from('push_notification_queue')
        .select('id', { count: 'exact', head: true })
        .eq('owner_kind', 'parent')
        .eq('owner_id', parentId)
        .eq('tag', tag);
      if ((alreadySent ?? 0) > 0) continue;
      rows.push({
        owner_kind: 'parent',
        owner_id: parentId,
        title: `Help ${k.name} start their first quest`,
        body: `${k.name} hasn't tried a quest yet. Sit with them tonight and pick today's lesson together.`,
        url: '/parent-dashboard',
        ttl_seconds: SUMMARY_TTL_SECONDS,
        tag,
      });
      firstQuestNudges++;
      break; // at most one push per parent per night
    }
  }

  if (rows.length > 0) {
    const { error: insertErr } = await admin.from('push_notification_queue').insert(rows);
    if (insertErr) {
      console.error('parent-daily-summary: failed to queue', insertErr);
      return new Response(JSON.stringify({ error: 'insert failed' }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ queued: rows.length, summaries, firstQuestNudges, parents: parentIds.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
