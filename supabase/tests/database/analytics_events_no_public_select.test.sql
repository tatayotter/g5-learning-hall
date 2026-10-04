-- pgTAP tests for 20261004130000_drop_analytics_events_public_select:
-- analytics_events has no SELECT policy, anon and authenticated sessions see
-- none of its rows (not even their own), and the child insert path still works.

begin;
create extension if not exists pgtap;
select plan(6);

create temp table fx as
select gen_random_uuid() as kid_auth,
       'pgtap_aes_' || substr(md5(random()::text), 1, 8) as kid;
grant select on fx to anon, authenticated;

insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
select kid, kid, 'x', 'PGTAP Analytics Select Kid', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx;
insert into user_identity_map (auth_uid, app_user_id) select kid_auth, kid from fx;

-- A row owned by the test child, written as the table owner (bypasses RLS).
insert into analytics_events (user_id, session_id, event_name, properties)
select kid, 'pgtap', 'pgtap_fixture', '{"utm_source":"pgtap"}'::jsonb from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- ── Policy shape ──────────────────────────────────────────────────────────────
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'analytics_events' and cmd in ('SELECT', 'ALL')),
  0,
  'analytics_events has no SELECT (or ALL) policy'
);
select ok(
  exists (select 1 from pg_policies
          where schemaname = 'public' and tablename = 'analytics_events'
            and policyname = 'analytics_events: self insert' and cmd = 'INSERT'),
  'the child self-insert policy is still present'
);

-- ── anon sees nothing ─────────────────────────────────────────────────────────
set local role anon;
select is(
  (select count(*)::int from analytics_events),
  0,
  'anon cannot read any analytics_events rows'
);

-- ── authenticated sees nothing, not even its own rows ─────────────────────────
reset role;
select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;

select is(
  (select count(*)::int from analytics_events),
  0,
  'authenticated cannot read any analytics_events rows'
);
select is(
  (select count(*)::int from analytics_events where user_id = (select kid from fx)),
  0,
  'authenticated cannot read even its own analytics_events rows'
);

-- ── Insert path unchanged ─────────────────────────────────────────────────────
select lives_ok(
  $$ insert into analytics_events (user_id, session_id, event_name) select kid, 'pgtap', 'screen_time' from fx $$,
  'a mapped child can still log their own event'
);

reset role;
select * from finish();
rollback;
