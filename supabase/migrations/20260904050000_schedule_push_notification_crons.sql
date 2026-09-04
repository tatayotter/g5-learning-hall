-- push-queue-dispatch: drains push_notification_queue every minute — the
-- actual sender for every push that isn't self-triggered by the client.
select cron.schedule(
  'push-queue-dispatch-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/push-queue-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '-3YmQGWvvCevWd2GoO1CziYnwWl-tOcy3XMa2_MKczQ'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- detect-completed-missions: checks every 5 minutes for Curio Training
-- Missions whose real-world timer has elapsed while the player was away.
select cron.schedule(
  'detect-completed-missions-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/detect-completed-missions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '-3YmQGWvvCevWd2GoO1CziYnwWl-tOcy3XMa2_MKczQ'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- detect-streak-reminders: once daily at 7pm Philippine time (11:00 UTC),
-- Monday-Friday only (this app's content is scheduled on weekdays).
select cron.schedule(
  'detect-streak-reminders-weekday-evening',
  '0 11 * * 1-5',
  $$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/detect-streak-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '-3YmQGWvvCevWd2GoO1CziYnwWl-tOcy3XMa2_MKczQ'
    ),
    body := '{}'::jsonb
  );
  $$
);
