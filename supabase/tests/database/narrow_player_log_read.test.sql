-- pgTAP tests for 20261011130000_narrow_player_log_read: anon and a bare anonymous-auth
-- session read no player_log rows; a signed-in player reads only their own; inserts stay
-- owner-only.
--
-- Fixture: fresh random test identities, never real user data.

begin;
create extension if not exists pgtap;
select plan(7);

create temp table fx as
select gen_random_uuid() as kid_a_auth,
       gen_random_uuid() as stray_auth,
       'pgtap_plog_kida' as kid_a,
       'pgtap_plog_kidb' as kid_b;
grant select on fx to anon, authenticated;

insert into user_identity_map (auth_uid, app_user_id) select kid_a_auth, kid_a from fx;

insert into player_log (user_id, week_starting_date, action_type, description)
select u, date '2099-01-04', 'quiz', 'pgtap row' from fx, unnest(array[fx.kid_a, fx.kid_b]) as u;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'player_log' and cmd = 'SELECT'),
  1, 'player_log has exactly one SELECT policy (the old read-all is gone)'
);

-- ── anon ──────────────────────────────────────────────────────────────────────
set local role anon;
select is((select count(*)::int from player_log where description = 'pgtap row'), 0,
  'anon cannot read player_log');

-- ── Bare anonymous-auth session (no mapped player) ────────────────────────────
reset role;
select pg_temp.login_as(stray_auth) from fx;
set local role authenticated;
select is((select count(*)::int from player_log where description = 'pgtap row'), 0,
  'an unmapped authenticated session cannot read player_log');

-- ── Signed-in player ──────────────────────────────────────────────────────────
reset role;
select pg_temp.login_as(kid_a_auth) from fx;
set local role authenticated;
select is((select count(*)::int from player_log where user_id = (select kid_a from fx) and description = 'pgtap row'), 1,
  'a player can read their own log');
select is((select count(*)::int from player_log where user_id = (select kid_b from fx) and description = 'pgtap row'), 0,
  'a player cannot read another player''s log');
select lives_ok(
  $$ insert into player_log (user_id, week_starting_date, action_type, description)
     select kid_a, date '2099-01-04', 'quiz', 'pgtap own insert' from fx $$,
  'a player can still log their own action'
);
select throws_ok(
  $$ insert into player_log (user_id, week_starting_date, action_type, description)
     select kid_b, date '2099-01-04', 'quiz', 'pgtap forged insert' from fx $$,
  '42501', null,
  'a player cannot log an action for someone else'
);

reset role;
select * from finish();
rollback;
