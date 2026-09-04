-- Guard so detect-new-weekly-content (polled every 30 min on Sundays only)
-- fires exactly once per (grade, week) instead of every time it polls.
alter table public.content_weeks
  add column if not exists notified_at timestamptz;

-- detect-new-weekly-content: polls every 30 minutes, Sundays only (day-of-week
-- 0), so it catches whenever the admin actually finishes that grade's weekly
-- save during the day rather than guessing a fixed hour. Guarded by
-- content_weeks.notified_at so each grade only ever fires once per week.
select cron.schedule(
  'detect-new-weekly-content-sundays',
  '*/30 * * * 0',
  $$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/detect-new-weekly-content',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '-3YmQGWvvCevWd2GoO1CziYnwWl-tOcy3XMa2_MKczQ'
    ),
    body := '{}'::jsonb
  );
  $$
);
