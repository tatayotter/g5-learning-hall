-- pgTAP tests for 20261022120000_garden_wild_plants.sql: the garden switch, picking a wild
-- veggie with one right answer, the 20-minute regrow, the rest after 3 wrong answers, a
-- re-sent offline entry never picking twice, bag counts that only the functions can change,
-- and selling veggies (never seed packets) for 2 gold each.

begin;
create extension if not exists pgtap;
select plan(22);

create temp table fx as
select gen_random_uuid() as kid_auth,
       'pgtap_garden_kid' as kid,
       gen_random_uuid() as other_auth,
       'pgtap_garden_other' as other_kid,
       gen_random_uuid() as entry_right;
grant select on fx to authenticated;

insert into user_identity_map (auth_uid, app_user_id)
select kid_auth, kid from fx union all select other_auth, other_kid from fx;
insert into player_progress (user_id, gold) select kid, 100 from fx
on conflict (user_id) do update set gold = excluded.gold;

insert into content_weeks (grade, week_starting_date) values (5, '2030-05-05');
insert into content_days (content_week_id, weekday)
select id, 'Monday' from content_weeks where grade = 5 and week_starting_date = '2030-05-05';
insert into content_quizzes (content_day_id, subject)
select d.id, 'Science' from content_days d
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-05-05';
insert into content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select q.id, 'q' || g, '["a","b"]'::jsonb, 'a', g
from content_quizzes q
join content_days d on d.id = q.content_day_id
join content_weeks w on w.id = d.content_week_id
cross join generate_series(1, 8) g
where w.grade = 5 and w.week_starting_date = '2030-05-05';

create temp table qs as
select cq.id, cq.sort_order as n from content_questions cq
join content_quizzes qz on qz.id = cq.content_quiz_id
join content_days d on d.id = qz.content_day_id
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-05-05';
grant select on qs to authenticated;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- One pick attempt by the kid at a plant, answering question n with p_selected.
create or replace function pg_temp.pick(p_node text, p_n int, p_selected text, p_entry uuid default gen_random_uuid())
returns jsonb as $$
  select public.gather_wild_plant((select kid from fx), 'ledgers_heart', p_node, (select id from qs where n = p_n), p_selected, p_entry, null);
$$ language sql;

select is((select mode from feature_flags where key = 'garden'), 'off', 'the garden switch exists and starts off');
select is((select count(*)::int from wild_plant_nodes where region = 'ledgers_heart'), 8, 'The Ledger''s Heart has 8 veggie plants');

select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;

select throws_ok(
  $$ select pg_temp.pick('tomato_1', 1, 'a') $$,
  'P0001', 'garden is not on for this player',
  'nobody can pick while the garden is off'
);

reset role;
update feature_flags set mode = 'allowlist', allowlist = array[(select kid from fx)] where key = 'garden';
set local role authenticated;

select is(pg_temp.pick('tomato_1', 1, 'b') ->> 'status', 'wrong', 'a wrong answer picks nothing');
select is((select count(*)::int from player_bag_items where user_id = (select kid from fx)), 0, 'the bag is still empty');

create temp table first_pick as select pg_temp.pick('tomato_1', 2, 'a', (select entry_right from fx)) as r;
select is((select r ->> 'status' from first_pick), 'picked', 'a right answer picks the veggie');
select is((select quantity from player_bag_items where user_id = (select kid from fx) and item_key = 'veggie_tomato'), 1, 'a tomato is in the bag');
select is((select r -> 'bag' ->> 'veggie_tomato' from first_pick), '1', 'the result carries the new bag');
select ok((select (r ->> 'seeds')::int in (0, 1) from first_pick), 'sometimes a seed packet comes with it');
select ok(
  (select (r ->> 'seeds')::int = coalesce((select quantity from player_bag_items where user_id = (select kid from fx) and item_key = 'seeds_tomato'), 0) from first_pick),
  'a seed packet, when there is one, is in the bag'
);

select is(
  (select pg_temp.pick('tomato_1', 2, 'a', (select entry_right from fx)) ->> 'replayed'), 'true',
  'sending the same entry again (an offline retry) is a replay'
);
select is((select quantity from player_bag_items where user_id = (select kid from fx) and item_key = 'veggie_tomato'), 1, 'a replay never picks twice');

select is(pg_temp.pick('tomato_1', 3, 'a') ->> 'status', 'growing', 'a picked plant is regrowing');
select is(pg_temp.pick('corn_1', 3, 'a') ->> 'veggie', 'corn', 'other plants are still ripe');

-- 20 minutes later the tomato is ripe again.
reset role;
update player_gather_nodes set last_picked_at = now() - interval '21 minutes'
where user_id = (select kid from fx) and node_id = 'tomato_1';
set local role authenticated;
select is(pg_temp.pick('tomato_1', 4, 'a') ->> 'status', 'picked', 'it can be picked again once it regrows');

-- Three wrong answers in a row and the plant rests.
create temp table wrong1 as select pg_temp.pick('pumpkin_1', 5, 'b');
create temp table wrong2 as select pg_temp.pick('pumpkin_1', 6, 'b');
select ok((select pg_temp.pick('pumpkin_1', 7, 'b') ->> 'rest_until') is not null, 'the third wrong answer in a row starts a rest');
select is(pg_temp.pick('pumpkin_1', 8, 'a') ->> 'status', 'resting', 'a resting plant cannot be picked');

select throws_ok(
  $$ insert into player_bag_items (user_id, item_key, quantity) values ((select kid from fx), 'veggie_corn', 500) $$,
  '42501', null,
  'a player cannot add bag items by writing the table'
);

select throws_ok(
  $$ select gather_wild_plant((select other_kid from fx), 'ledgers_heart', 'beans_1', (select id from qs where n = 1), 'a', gen_random_uuid(), null) $$,
  'P0001', 'not authorized',
  'a player cannot pick for another player'
);

-- Selling: 2 tomatoes and 1 corn, plus seed packets that must stay.
reset role;
delete from player_bag_items where user_id = (select kid from fx) and item_key like 'seeds\_%';
insert into player_bag_items (user_id, item_key, quantity)
select kid, 'seeds_corn', 2 from fx;
set local role authenticated;

select is(
  (select sell_garden_items((select kid from fx), '{"veggie_tomato": 1, "seeds_corn": 2}'::jsonb) - 'bag' - 'progress'),
  '{"gold": 2, "sold": {"veggie_tomato": 1}}'::jsonb,
  'one tomato sells for 2 gold; seed packets do not sell'
);
select is(
  (select sell_garden_items((select kid from fx)) -> 'bag'),
  '{"seeds_corn": 2}'::jsonb,
  'selling everything empties the veggies and keeps the seeds'
);

reset role;
select is(
  (select array[gold, wild_plants_picked_total] from player_progress where user_id = (select kid from fx)),
  array[106, 3],
  'the gold arrived (3 veggies x 2) and 3 picks are counted'
);

select * from finish();
rollback;
