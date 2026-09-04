import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUSH_CRON_SECRET = Deno.env.get('PUSH_CRON_SECRET')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 100;

// Not a user-facing endpoint — called only by pg_cron every minute (see
// migration schedule_push_notification_crons), authenticated by
// PUSH_CRON_SECRET. This is the one place allowed to send to *any* owner —
// unlike send-push (self-only, RLS-enforced via the caller's own JWT), this
// uses the service role, because everything it sends was queued by trusted
// server-side code (a DB trigger or another cron function), never directly
// by a client. See push_notification_queue's RLS comment.
Deno.serve(async (req: Request) => {
  const providedSecret = req.headers.get('x-cron-secret');
  if (!PUSH_CRON_SECRET || providedSecret !== PUSH_CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: pending, error } = await admin
    .from('push_notification_queue')
    .select('id, owner_kind, owner_id, title, body, url, attempts')
    .is('sent_at', null)
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('push-queue-dispatch: failed to load queue', error);
    return new Response(JSON.stringify({ error: 'query failed' }), { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  let skippedNoSubscription = 0;

  for (const item of pending ?? []) {
    const { data: subs, error: subsErr } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key')
      .eq('owner_kind', item.owner_kind)
      .eq('owner_id', item.owner_id);

    if (subsErr) {
      console.error('push-queue-dispatch: failed to load subscriptions for', item.owner_id, subsErr);
      await admin.from('push_notification_queue').update({ attempts: item.attempts + 1 }).eq('id', item.id);
      failed++;
      continue;
    }

    if (!subs || subs.length === 0) {
      // Owner never enabled push (or unsubscribed since). Mark sent so this
      // row stops being retried — there's nothing to deliver to, and that's
      // not a transient failure that a retry would ever fix.
      await admin.from('push_notification_queue').update({ sent_at: new Date().toISOString() }).eq('id', item.id);
      skippedNoSubscription++;
      continue;
    }

    let anySent = false;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify({ title: item.title, body: item.body, url: item.url }),
        );
        anySent = true;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('push-queue-dispatch: sendNotification failed', item.owner_id, status, err);
        }
      }
    }

    if (anySent) {
      await admin.from('push_notification_queue').update({ sent_at: new Date().toISOString() }).eq('id', item.id);
      sent++;
    } else {
      await admin.from('push_notification_queue').update({ attempts: item.attempts + 1 }).eq('id', item.id);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ sent, failed, skippedNoSubscription, total: pending?.length ?? 0 }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
