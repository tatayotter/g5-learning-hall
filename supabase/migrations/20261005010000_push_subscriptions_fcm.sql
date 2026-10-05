-- Native push for the Google Play app (Firebase Cloud Messaging).
--
-- The Play app is a Capacitor WebView, which has no Web Push, so it registers
-- an FCM device token instead. Those rows live in the same table so every
-- existing per-owner rule (RLS, the push gold bonus, account deletion, the
-- dispatcher's "no subscription" skip) covers them unchanged:
--   kind = 'web': endpoint is the browser push URL, p256dh/auth_key required.
--   kind = 'fcm': endpoint holds the FCM token, p256dh/auth_key are null.
-- endpoint stays the unique "delivery address", so the client's
-- upsert-on-endpoint works the same for both kinds.

alter table public.push_subscriptions
  add column if not exists kind text not null default 'web';

alter table public.push_subscriptions alter column p256dh drop not null;
alter table public.push_subscriptions alter column auth_key drop not null;

-- Every existing row is a web subscription with both keys, so neither check
-- can fail on production data.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'push_subscriptions_kind_check'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table only public.push_subscriptions
      add constraint push_subscriptions_kind_check check (kind in ('web', 'fcm'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'push_subscriptions_web_keys_check'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table only public.push_subscriptions
      add constraint push_subscriptions_web_keys_check
      check (kind <> 'web' or (p256dh is not null and auth_key is not null));
  end if;
end $$;
