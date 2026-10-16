-- pgTAP tests for 20261016040000_new_nav_flag.sql: the new_nav switch exists, starts off,
-- and reaches only the kids on its allowlist.

begin;
create extension if not exists pgtap;
select plan(4);

create temp table fx as
select
  gen_random_uuid() as auth_a, 'pgtap_nav_a_' || substr(md5(random()::text), 1, 8) as user_a,
  gen_random_uuid() as auth_b, 'pgtap_nav_b_' || substr(md5(random()::text), 1, 8) as user_b;

insert into user_identity_map (auth_uid, app_user_id)
select auth_a, user_a from fx
union all
select auth_b, user_b from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

select is((select mode from feature_flags where key = 'new_nav'), 'off', 'new_nav exists and starts off');

-- Only this test's kid: whatever else is allowlisted is left alone.
update feature_flags set mode = 'off', allowlist = '{}' where key = 'offline_play';
select pg_temp.login_as(auth_a) from fx;
select is(public.my_feature_flags((select user_a from fx)), '{}'::text[], 'nobody has the new nav while it is off');

update feature_flags set mode = 'allowlist', allowlist = array[(select user_a from fx)] where key = 'new_nav';
select is(public.my_feature_flags((select user_a from fx)), '{new_nav}'::text[], 'an allowlisted kid gets the new nav');

select pg_temp.login_as(auth_b) from fx;
select is(public.my_feature_flags((select user_b from fx)), '{}'::text[], 'a kid not on the allowlist keeps the old nav');

select * from finish();
rollback;
