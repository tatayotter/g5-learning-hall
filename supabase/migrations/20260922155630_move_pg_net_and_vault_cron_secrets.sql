-- Security hardening, two unrelated fixes bundled because both came out of the same
-- advisor-triage pass and both touch pg_cron/pg_net:
--
-- 1. pg_net was registered under the `public` schema (advisor: extension_in_public).
--    All of its actual objects (types, functions, the http_request_queue table) already
--    live in a fixed `net` schema -- pg_net hardcodes that, the "WITH SCHEMA" target only
--    ever affects the extension's own catalog bookkeeping (pg_extension.extnamespace) --
--    so this move touches zero application-visible object names; net.http_post etc. are
--    unchanged. pg_net doesn't support ALTER EXTENSION ... SET SCHEMA (not relocatable),
--    so this has to be DROP + CREATE. Confirmed safe before running: nothing outside the
--    extension has a real catalog dependency on any net.* object (cron.job.command
--    mentioning "net.http_post" in a text column doesn't count), and the request queue was
--    empty at the time (no in-flight rows to lose). Verified in a rolled-back transaction
--    first, then applied for real; grants (EXECUTE to PUBLIC on every net.* function) came
--    back automatically since CREATE EXTENSION recreates its own standard grants.
--
-- 2. All 9 pg_cron jobs that call an Edge Function had their `x-cron-secret` header value
--    hardcoded as a literal string directly in cron.job.command -- readable by anyone with
--    postgres-role DB access, and (for the 4 jobs sharing PUSH_CRON_SECRET) already
--    committed to git in plaintext via 20260904050000_schedule_push_notification_crons.sql
--    and 20260904080000_schedule_new_weekly_content_cron.sql. Moved to Supabase Vault
--    (`vault.decrypted_secrets`, looked up by name) and rotated all 6 distinct secret
--    values -- the old ones are compromised (git history, already-read DB access) so
--    rotating is the only way to actually close this, not just relocate it. The new values
--    were generated and stored directly against production (`vault.create_secret`, run live,
--    deliberately never written to any git-tracked file -- that's the whole point) and are
--    NOT reproduced here. cron.schedule() with an existing job name updates that job in
--    place rather than creating a duplicate (documented pg_cron behavior), so this is safe
--    to re-run.
--
--    This migration also captures 5 of these 9 jobs for the first time --
--    reengagement-sync-daily, execute-due-reassignments-hourly, coin-expiry-sync-daily,
--    renewal-reminder-sync-daily, weekly-digest-campaign-monday were scheduled directly
--    against production and never had a matching local file, the same
--    migrations-don't-match-reality gap this repo's baseline work (see
--    docs/database-migrations.md) already fixed once for the schema itself.
--
--    Rollout note: updating cron.job to send the new secret and updating the Edge
--    Function's own runtime secret (Deno.env.get(...)) can't happen atomically -- one has
--    to land first. Whichever does, the affected job(s) return 401 until the other side
--    catches up. Confirmed empirically: push-queue-dispatch-every-minute went 200 -> 401
--    the run immediately after this migration applied, self-healing once the matching Edge
--    Function secret was updated (a manual step -- setting a Supabase project secret needs
--    the Supabase CLI/dashboard, not available to a migration). Acceptable here: every one
--    of these 9 jobs is a retry-friendly background sync, not a user-facing path -- a few
--    minutes of delay, not data loss.

-- Defensive rather than a bare DROP/CREATE: pg_net is one of the extensions Supabase
-- pre-installs by default (like pgcrypto/uuid-ossp), never captured by an explicit CREATE
-- in this repo's migrations (see the baseline's own header comment) -- so its presence and
-- schema can't be assumed identical across a fresh CI replay vs. production. This makes the
-- move safe to re-run regardless of pg_net's starting state.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_net') then
    execute 'drop extension pg_net';
  end if;
  execute 'create extension if not exists pg_net with schema extensions';
end $$;

select cron.schedule(
  'reengagement-sync-daily', '0 3 * * *', $cmd$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/reengagement-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reengagement_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cmd$
);

select cron.schedule(
  'execute-due-reassignments-hourly', '0 * * * *', $cmd$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/execute-due-reassignments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reassignment_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cmd$
);

select cron.schedule(
  'coin-expiry-sync-daily', '15 3 * * *', $cmd$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/coin-expiry-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'coin_expiry_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cmd$
);

select cron.schedule(
  'renewal-reminder-sync-daily', '30 3 * * *', $cmd$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/renewal-reminder-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'renewal_reminder_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cmd$
);

select cron.schedule(
  'weekly-digest-campaign-monday', '45 3 * * 1', $cmd$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/weekly-digest-campaign',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_digest_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cmd$
);

select cron.schedule(
  'push-queue-dispatch-every-minute', '* * * * *', $cmd$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/push-queue-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cmd$
);

select cron.schedule(
  'detect-completed-missions-every-5-min', '*/5 * * * *', $cmd$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/detect-completed-missions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cmd$
);

select cron.schedule(
  'detect-streak-reminders-weekday-evening', '0 11 * * 1-5', $cmd$
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

select cron.schedule(
  'detect-new-weekly-content-sundays', '*/30 * * * 0', $cmd$
  select net.http_post(
    url := 'https://rsiupmbfhqtihmtahccg.supabase.co/functions/v1/detect-new-weekly-content',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cmd$
);
