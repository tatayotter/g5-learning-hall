-- pgTAP tests for 20261004120000_analytics_parent_self_insert: a parent can
-- log analytics events under their own auth uid, never under someone else's,
-- an unmapped non-parent session can't use the parent path, and the existing
-- child path (user_identity_map) still works.

begin;
create extension if not exists pgtap;
select plan(5);

create temp table fx as
select gen_random_uuid() as parent_id,
       gen_random_uuid() as other_parent_id,
       gen_random_uuid() as stray_auth,
       gen_random_uuid() as kid_auth,
       'pgtap_ae_' || substr(md5(random()::text), 1, 8) as kid;
grant select on fx to authenticated;

insert into auth.users (id, is_sso_user, is_anonymous, email)
select parent_id, false, false, 'pgtap-ae-' || substr(md5(random()::text), 1, 8) || '@test.invalid' from fx
union all
select other_parent_id, false, false, 'pgtap-ae-' || substr(md5(random()::text), 1, 8) || '@test.invalid' from fx;

-- The auth.users signup trigger normally creates these; don't depend on it.
insert into public.parents (id, full_name, phone, status)
select parent_id, 'PGTAP Parent', '09000000000', 'approved' from fx
on conflict (id) do nothing;
insert into public.parents (id, full_name, phone, status)
select other_parent_id, 'PGTAP Other Parent', '09000000001', 'approved' from fx
on conflict (id) do nothing;

insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
select kid, kid, 'x', 'PGTAP Analytics Kid', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx;
insert into user_identity_map (auth_uid, app_user_id) select kid_auth, kid from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- ── Parent: own uid allowed, another parent's uid rejected ────────────────────
select pg_temp.login_as(parent_id) from fx;
set local role authenticated;

select lives_ok(
  $$ insert into analytics_events (user_id, session_id, event_name, properties)
     select parent_id::text, 'pgtap', 'parent_dashboard_viewed', '{}'::jsonb from fx $$,
  'a parent can log their own event'
);
select throws_ok(
  $$ insert into analytics_events (user_id, session_id, event_name)
     select other_parent_id::text, 'pgtap', 'parent_dashboard_viewed' from fx $$,
  '42501', null,
  'a parent cannot log an event under another parent''s id'
);

-- ── A session with no parents row can't use the parent path ───────────────────
reset role;
select pg_temp.login_as(stray_auth) from fx;
set local role authenticated;

select throws_ok(
  $$ insert into analytics_events (user_id, session_id, event_name)
     select stray_auth::text, 'pgtap', 'parent_dashboard_viewed' from fx $$,
  '42501', null,
  'a non-parent session cannot log events under its raw auth uid'
);

-- ── Child path unchanged ──────────────────────────────────────────────────────
reset role;
select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;

select lives_ok(
  $$ insert into analytics_events (user_id, session_id, event_name) select kid, 'pgtap', 'screen_time' from fx $$,
  'a mapped child can still log their own event'
);
select throws_ok(
  $$ insert into analytics_events (user_id, session_id, event_name) select parent_id::text, 'pgtap', 'parent_dashboard_viewed' from fx $$,
  '42501', null,
  'a child session cannot log events as a parent'
);

reset role;
select * from finish();
rollback;
