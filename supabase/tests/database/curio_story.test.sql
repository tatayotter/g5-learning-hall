-- pgTAP tests for 20261022030000_curio_card_story.sql: record_curio_story counts battles and
-- training on one of the caller's own curios, and refuses another player's id or curio.

begin;
create extension if not exists pgtap;
select plan(7);

create temp table fx as
select
  gen_random_uuid() as auth_a, 'pgtap_story_a_' || substr(md5(random()::text), 1, 8) as user_a,
  gen_random_uuid() as auth_b, 'pgtap_story_b_' || substr(md5(random()::text), 1, 8) as user_b,
  gen_random_uuid() as curio_a, gen_random_uuid() as curio_b;

insert into user_identity_map (auth_uid, app_user_id)
select auth_a, user_a from fx
union all
select auth_b, user_b from fx;

insert into user_monsters (id, user_id, monster_id, slot)
select curio_a, user_a, 'emberpup', 1 from fx
union all
select curio_b, user_b, 'emberpup', 1 from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

select ok(
  has_function_privilege('authenticated', 'public.record_curio_story(text, uuid, boolean, boolean)', 'execute'),
  'a signed-in player can call it'
);
select ok(
  not has_function_privilege('anon', 'public.record_curio_story(text, uuid, boolean, boolean)', 'execute'),
  'anon cannot call it'
);

select is(
  (select array[battles_fought, battles_won, quests_trained] from user_monsters where id = (select curio_a from fx)),
  array[0, 0, 0],
  'an existing curio starts at zero'
);

select pg_temp.login_as(auth_a) from fx;
select public.record_curio_story(user_a, curio_a, true) from fx;
select public.record_curio_story(user_a, curio_a, false) from fx;
select public.record_curio_story(user_a, curio_a, true) from fx;
select public.record_curio_story(user_a, curio_a, null, true) from fx;

select is(
  (select array[battles_fought, battles_won, quests_trained] from user_monsters where id = (select curio_a from fx)),
  array[3, 2, 1],
  'two wins, one loss and one trained quest add up'
);

select throws_ok(
  format('select record_curio_story(%L, %L::uuid, true)', (select user_b from fx), (select curio_b from fx)),
  'P0001', 'not authorized',
  'a player cannot pass someone else''s id'
);

select public.record_curio_story(user_a, curio_b, true) from fx;
select is(
  (select battles_fought from user_monsters where id = (select curio_b from fx)),
  0,
  'a player cannot bump a curio that is not theirs'
);
select is(
  (select battles_won from user_monsters where id = (select curio_a from fx)),
  2,
  'their own curio is unchanged by that attempt'
);

select * from finish();
rollback;
