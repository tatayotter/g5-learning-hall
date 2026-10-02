-- Push notifications, step 3 (2026-10-02): click tracking + re-engagement crons.
--
-- 1. push_notification_queue.opened_at: push-queue-dispatch puts the row id
--    in the payload, the service worker appends it to the deep link as
--    ?pq=<id>, and the page calls mark_push_opened() on load. Lets us see
--    which pushes actually bring anyone back (delivered_count alone can't).
-- 2. detect-streak-reminders now runs every day: the regular "today's
--    quests" reminder is still weekdays-only (checked inside the function),
--    but the day-after-signup comeback and the 3-/7-day lapsed nudges need
--    to land on whatever day they fall on.
-- 3. parent-daily-summary: 8pm PH, pushes each subscribed parent a summary
--    of what their children did today.

alter table public.push_notification_queue
  add column if not exists opened_at timestamptz;

-- Callable by anyone holding the row id: the id is an unguessable uuid that
-- only ever travels inside the push payload to the recipient's own device,
-- and the only effect is stamping opened_at once. Granted to anon too
-- because a tapped push can land on the login screen before the session
-- is restored.
create or replace function public.mark_push_opened(p_queue_id uuid)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update public.push_notification_queue
  set opened_at = now()
  where id = p_queue_id
    and opened_at is null
    and sent_at is not null;
$function$;

revoke all on function public.mark_push_opened(uuid) from public;
grant execute on function public.mark_push_opened(uuid) to anon, authenticated;

-- ─── Crons ─────────────────────────────────────────────────────────────────
-- Renamed (it's no longer weekday-only), so drop the old job by name first.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'detect-streak-reminders-weekday-evening') then
    perform cron.unschedule('detect-streak-reminders-weekday-evening');
  end if;
end $$;

select cron.schedule(
  'detect-streak-reminders-daily-evening', '0 11 * * *', $cmd$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/detect-streak-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cmd$
);

-- 8pm Philippine time (12:00 UTC).
select cron.schedule(
  'parent-daily-summary-evening', '0 12 * * *', $cmd$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/parent-daily-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cmd$
);
