-- pgTAP tests for 20261028160000_hideout.sql and 20261029000000_hideout_tiles_and_trees.sql: buying the Hideout once for 2,000 gold (with a
-- free Tin Watering Can), building plots with wood from the bag, planting with a right answer,
-- watering (and a Silver can watering everything at once), harvesting by the server's clock,
-- a grown tree's wood once a day, replayed entries counting once, and kids never writing or
-- reading someone else's Hideout.

begin;
create extension if not exists pgtap;
select plan(50);

create temp table fx as
select gen_random_uuid() as kid_auth,
       'pgtap_hideout_kid' as kid,
       gen_random_uuid() as other_auth,
       'pgtap_hideout_other' as other;
grant select on fx to authenticated;

insert into user_identity_map (auth_uid, app_user_id) select kid_auth, kid from fx;
insert into user_identity_map (auth_uid, app_user_id) select other_auth, other from fx;
insert into player_progress (user_id, gold) select kid, 100 from fx
on conflict (user_id) do update set gold = excluded.gold;

insert into content_weeks (grade, week_starting_date) values (5, '2030-06-16');
insert into content_days (content_week_id, weekday)
select id, 'Monday' from content_weeks where grade = 5 and week_starting_date = '2030-06-16';
insert into content_quizzes (content_day_id, subject)
select d.id, 'Science' from content_days d
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-06-16';
insert into content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select q.id, 'q' || g, '["a","b"]'::jsonb, 'a', g
from content_quizzes q
join content_days d on d.id = q.content_day_id
join content_weeks w on w.id = d.content_week_id
cross join generate_series(1, 16) g
where w.grade = 5 and w.week_starting_date = '2030-06-16';

create temp table qs as
select cq.id, cq.sort_order as n from content_questions cq
join content_quizzes qz on qz.id = cq.content_quiz_id
join content_days d on d.id = qz.content_day_id
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-06-16';
grant select on qs to authenticated;

create temp table entry as select gen_random_uuid() as id;
grant select on entry to authenticated;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

create or replace function pg_temp.plant(p_plot text, p_item text, p_n int, p_selected text default 'a', p_entry uuid default null)
returns jsonb as $$
  select public.plant_hideout_plot((select kid from fx), p_plot, p_item, (select id from qs where n = p_n), p_selected, coalesce(p_entry, gen_random_uuid()));
$$ language sql;

create or replace function pg_temp.water(p_plot text, p_n int, p_selected text default 'a')
returns jsonb as $$
  select public.water_hideout_plot((select kid from fx), p_plot, (select id from qs where n = p_n), p_selected, gen_random_uuid());
$$ language sql;

create or replace function pg_temp.build(p_plot text) returns jsonb as $$
  select public.build_hideout_plot((select kid from fx), p_plot);
$$ language sql;

create or replace function pg_temp.harvest(p_plot text) returns jsonb as $$
  select public.harvest_hideout_plot((select kid from fx), p_plot);
$$ language sql;

select is((select count(*)::int from hideout_plot_defs where part_of is null), 12, 'the island has 12 plots');
select is((select count(*)::int from hideout_plot_defs where part_of = 'bed_3'), 6, 'a garden pen has 6 soil tiles');
select is((select count(*)::int from hideout_plot_defs where kind = 'grove'), 6, 'six of them are tree spots');

update feature_flags set mode = 'allowlist', allowlist = array[(select kid from fx)] where key = 'garden';
select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;

-- ── Buying ──
select is(pg_temp.build('bed_1') ->> 'reason', 'no_hideout', 'no Hideout yet: nothing to build on');
select is(public.buy_hideout((select kid from fx)) ->> 'reason', 'gold', '100 gold is not enough');
reset role;
update player_progress set gold = 2500 where user_id = (select kid from fx);
set local role authenticated;
select is((public.buy_hideout((select kid from fx)) ->> 'ok')::boolean, true, '2,500 gold buys it');
reset role;
select is((select gold from player_progress where user_id = (select kid from fx)), 500, 'it cost 2,000 gold');
select is(public.gear_tier((select kid from fx), 'can'), 1, 'it came with a Tin Watering Can');
set local role authenticated;
select is(public.buy_hideout((select kid from fx)) ->> 'reason', 'owned', 'a second one is never sold');
reset role;
select is((select gold from player_progress where user_id = (select kid from fx)), 500, 'and costs nothing');
set local role authenticated;

-- ── Building ──
select is(pg_temp.build('bed_1') ->> 'reason', 'items', 'no wood: no garden bed');
reset role;
insert into player_bag_items (user_id, item_key, quantity) select kid, 'wood', 30 from fx;
set local role authenticated;
select is((pg_temp.build('bed_1') ->> 'ok')::boolean, true, '6 wood builds a garden bed');
select is((select quantity from player_bag_items where user_id = (select kid from fx) and item_key = 'wood'), 24, 'the wood left the bag');
select is(pg_temp.build('bed_1') ->> 'reason', 'built', 'a bed is built once');
select is((select count(*)::int from player_hideout_plots where user_id = (select kid from fx) and plot_id like 'bed\_1\_%'), 6, 'and comes with its 6 tiles');
select is(pg_temp.build('kitchen') ->> 'reason', 'not_yet', 'the kitchen is not buildable yet');

-- ── Planting ──
select is(pg_temp.plant('bed_1_0', 'tomato', 1) ->> 'status', 'no_item', 'no tomato seeds: nothing to plant');
reset role;
insert into player_bag_items (user_id, item_key, quantity) select kid, 'seeds_tomato', 2 from fx;
set local role authenticated;
select is(pg_temp.plant('bed_1_0', 'tomato', 2, 'b') ->> 'status', 'wrong', 'a wrong answer plants nothing');
select is((select quantity from player_bag_items where user_id = (select kid from fx) and item_key = 'seeds_tomato'), 2, 'and keeps the seeds');
select is(pg_temp.plant('bed_1_0', 'tomato', 3, 'a', (select id from entry)) ->> 'status', 'planted', 'a right answer plants them');
select is((select quantity from player_bag_items where user_id = (select kid from fx) and item_key = 'seeds_tomato'), 1, 'one seed packet used');
select ok((select ready_at between now() + interval '239 minutes' and now() + interval '241 minutes'
           from player_hideout_plots where user_id = (select kid from fx) and plot_id = 'bed_1_0'), 'tomatoes take 4 hours');
select is((pg_temp.plant('bed_1_0', 'tomato', 3, 'a', (select id from entry)) ->> 'replayed')::boolean, true, 'the same entry again is a replay');
select is((select quantity from player_bag_items where user_id = (select kid from fx) and item_key = 'seeds_tomato'), 1, 'and uses no more seeds');
select is(pg_temp.plant('bed_1_0', 'tomato', 4) ->> 'status', 'busy', 'one seed per tile');
select is(pg_temp.plant('bed_1', 'tomato', 4) ->> 'status', 'cant_plant', 'seeds go in a tile, not the pen');
select is(pg_temp.plant('bed_1_1', 'tomato', 13) ->> 'status', 'planted', 'the next tile takes another seed');
select is(pg_temp.plant('bed_2_0', 'tomato', 4) ->> 'status', 'not_built', 'no planting in an unbuilt bed');

-- ── Watering ──
select is(pg_temp.harvest('bed_1_0') ->> 'status', 'growing', 'not ripe yet');
select is(pg_temp.water('bed_1_0', 5, 'b') ->> 'status', 'wrong', 'a wrong answer waters nothing');
select is(pg_temp.water('bed_1_0', 6) -> 'plots', '["bed_1_0", "bed_1_1"]'::jsonb, 'a right answer waters every tile in the pen');
select ok((select ready_at between now() + interval '143 minutes' and now() + interval '145 minutes'
           from player_hideout_plots where user_id = (select kid from fx) and plot_id = 'bed_1_0'), 'a Tin can takes 40% off');
select is(pg_temp.water('bed_1_1', 7) ->> 'status', 'watered_already', 'once per crop');

-- ── Harvesting ──
reset role;
update player_hideout_plots set ready_at = now() - interval '1 minute' where user_id = (select kid from fx) and plot_id = 'bed_1_0';
set local role authenticated;
select is(pg_temp.harvest('bed_1') ->> 'status', 'nothing', 'the pen itself has nothing to harvest');
select is(pg_temp.harvest('bed_1_0') ->> 'veggies', '2', 'a ripe tile gives 2 tomatoes');
select is((select quantity from player_bag_items where user_id = (select kid from fx) and item_key = 'veggie_tomato'), 2, 'in the bag');
select ok((select quantity from player_bag_items where user_id = (select kid from fx) and item_key = 'seeds_tomato') between 1 and 2, 'and a seed packet or two');
select is((select item from player_hideout_plots where user_id = (select kid from fx) and plot_id = 'bed_1_0'), null, 'the tile is empty again');
select is(pg_temp.harvest('bed_1_1') ->> 'status', 'growing', 'the other tile is still growing');
select is((select crops_harvested from player_hideouts where user_id = (select kid from fx)), 1, 'one crop harvested');

-- ── The grove ──
reset role;
insert into player_bag_items (user_id, item_key, quantity) select kid, 'sapling_oak', 1 from fx;
set local role authenticated;
select is((pg_temp.build('grove_1') ->> 'ok')::boolean, true, '12 wood builds a grove spot');
select is(pg_temp.plant('grove_1', 'tomato', 8) ->> 'status', 'cant_plant', 'veggies go in beds, not the grove');
select is(pg_temp.plant('grove_1', 'oak', 9) ->> 'status', 'planted', 'a sapling goes in the grove');
select is((select trees_planted from player_hideouts where user_id = (select kid from fx)), 1, 'one tree planted');
reset role;
update player_hideout_plots set ready_at = now() - interval '1 minute' where user_id = (select kid from fx) and plot_id = 'grove_1';
set local role authenticated;
select is(pg_temp.harvest('grove_1') ->> 'wood', '2', 'a grown tree drops 2 wood');
select is(pg_temp.harvest('grove_1') ->> 'status', 'collected_today', 'once a day');

-- ── A Silver can waters everything ──
reset role;
update player_gear set tier = 3 where user_id = (select kid from fx) and gear = 'can';
insert into player_bag_items (user_id, item_key, quantity) select kid, 'seeds_cabbage', 2 from fx;
set local role authenticated;
select pg_temp.build('bed_2');
select pg_temp.plant('bed_1_0', 'cabbage', 10);
select pg_temp.plant('bed_2_0', 'cabbage', 11);
select is(pg_temp.water('bed_1_0', 12) -> 'plots', '["bed_1_0", "bed_2_0"]'::jsonb, 'a Silver can waters both beds at once');

-- ── Nobody else's Hideout ──
select pg_temp.login_as(other_auth) from fx;
select throws_ok($$ select public.buy_hideout((select kid from fx)) $$, 'not authorized', 'nobody buys for someone else');
select is((select count(*)::int from player_hideout_plots), 0, 'nobody sees someone else''s plots');
select throws_ok($$ insert into player_hideouts (user_id, cost) values ('pgtap_hideout_other', 0) $$, '42501', null, 'nobody writes a Hideout row');

reset role;
select * from finish();
rollback;
