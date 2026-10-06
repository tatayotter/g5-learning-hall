-- pgTAP tests for 20261006100000_fix_add_trash_stats_user_id.sql: add_trash_stats takes this
-- app's text player id (it was uuid, so every call from the Training Map failed before it ran),
-- counts pickups and recycler gold, and refuses another player's id.

begin;
create extension if not exists pgtap;
select plan(7);

create temp table fx as
select
  gen_random_uuid() as auth_a, 'pgtap_trash_a_' || substr(md5(random()::text), 1, 8) as user_a,
  gen_random_uuid() as auth_b, 'pgtap_trash_b_' || substr(md5(random()::text), 1, 8) as user_b;

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

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'add_trash_stats'),
  1,
  'there is exactly one add_trash_stats, so a call is never ambiguous'
);
select ok(
  has_function_privilege('authenticated', 'public.add_trash_stats(text, integer, integer)', 'execute'),
  'a signed-in player can call it with their text id'
);
select ok(
  not has_function_privilege('anon', 'public.add_trash_stats(text, integer, integer)', 'execute'),
  'anon cannot call add_trash_stats'
);

select pg_temp.login_as(auth_a) from fx;

-- A pickup, then a recycler trade, on an account with no player_progress row yet.
select public.add_trash_stats(user_a, 1, 0) from fx;
select public.add_trash_stats(user_a, 1, 0) from fx;
select public.add_trash_stats(user_a, 0, 7) from fx;

select is(
  (select array[trash_collected_total, trash_gold_earned_total] from player_progress where user_id = (select user_a from fx)),
  array[2, 7],
  'pickups and recycler gold both add up'
);
select is(
  (select gold from player_progress where user_id = (select user_a from fx)),
  0,
  'the counter does not pay gold (the trade already did)'
);

select throws_ok(
  format('select add_trash_stats(%L, 1, 0)', (select user_b from fx)),
  'P0001', 'not authorized',
  'a player cannot bump someone else''s counters'
);
select is(
  (select count(*)::int from player_progress where user_id = (select user_b from fx)),
  0,
  'the other player gets no row'
);

select * from finish();
rollback;
