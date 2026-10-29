-- pgTAP tests for 20261029090000_crafting_step1.sql: a wood for each tree and its price, Hideout
-- build costs that rise (and take gold), the Workbench, Compost Bin and Kitchen and their recipes
-- (wrong answers use nothing, replays count once, trash comes off the server's copy), and bond
-- hearts: feeding twice a day, fading one a day, at most 5, and never set by the player.

begin;
create extension if not exists pgtap;
select plan(55);

create temp table fx as
select gen_random_uuid() as kid_auth,
       'pgtap_craft_kid' as kid,
       gen_random_uuid() as other_auth,
       'pgtap_craft_other' as other;
grant select on fx to authenticated;

insert into user_identity_map (auth_uid, app_user_id) select kid_auth, kid from fx;
insert into user_identity_map (auth_uid, app_user_id) select other_auth, other from fx;
insert into player_progress (user_id, gold) select kid, 100 from fx
on conflict (user_id) do update set gold = excluded.gold;

insert into content_weeks (grade, week_starting_date) values (5, '2030-06-23');
insert into content_days (content_week_id, weekday)
select id, 'Monday' from content_weeks where grade = 5 and week_starting_date = '2030-06-23';
insert into content_quizzes (content_day_id, subject)
select d.id, 'Science' from content_days d
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-06-23';
insert into content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select q.id, 'q' || g, '["a","b"]'::jsonb, 'a', g
from content_quizzes q
join content_days d on d.id = q.content_day_id
join content_weeks w on w.id = d.content_week_id
cross join generate_series(1, 16) g
where w.grade = 5 and w.week_starting_date = '2030-06-23';

create temp table qs as
select cq.id, cq.sort_order as n from content_questions cq
join content_quizzes qz on qz.id = cq.content_quiz_id
join content_days d on d.id = qz.content_day_id
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-06-23';
grant select on qs to authenticated;

create temp table entry as select gen_random_uuid() as id;
grant select on entry to authenticated;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

create or replace function pg_temp.build(p_plot text) returns jsonb as $$
  select public.build_hideout_plot((select kid from fx), p_plot);
$$ language sql;

create or replace function pg_temp.harvest(p_plot text) returns jsonb as $$
  select public.harvest_hideout_plot((select kid from fx), p_plot);
$$ language sql;


create or replace function pg_temp.craft(p_recipe text, p_n int, p_selected text default 'a', p_entry uuid default null)
returns jsonb as $$
  select public.craft_item((select kid from fx), p_recipe, (select id from qs where n = p_n), p_selected, coalesce(p_entry, gen_random_uuid()));
$$ language sql;

create or replace function pg_temp.have(p_key text) returns int as $$
  select coalesce((select quantity from player_bag_items where user_id = (select kid from fx) and item_key = p_key), 0);
$$ language sql;

create or replace function pg_temp.gold() returns int as $$
  select gold from player_progress where user_id = (select kid from fx);
$$ language sql;

create or replace function pg_temp.give(p_items jsonb) returns void as $$
  insert into player_bag_items (user_id, item_key, quantity)
  select (select kid from fx), key, value::int from jsonb_each_text(p_items)
  on conflict (user_id, item_key) do update set quantity = player_bag_items.quantity + excluded.quantity;
$$ language sql;

update feature_flags set mode = 'allowlist', allowlist = array[(select kid from fx)] where key = 'garden';
update player_progress set gold = 3000 where user_id = (select kid from fx);
insert into user_battle_state (user_id, bag_trash) select kid, '{"paper": 4, "bottle": 3, "wrapper": 1}' from fx;
insert into user_monsters (id, user_id, monster_id, slot) select gen_random_uuid(), kid, 'emberpup', 1 from fx;
create temp table mon as select id from user_monsters where user_id = (select kid from fx);
grant select on mon to authenticated;
select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;
select public.buy_hideout((select kid from fx));

-- ── Woods and costs ──
reset role;
select is(public.garden_sell_price('wood_oak'), 2, 'a town wood sells for 2 gold');
select is(public.garden_sell_price('wood_mangrove'), 3, 'a region''s wood sells for 3 gold');
select is(public.hideout_build_cost((select kid from fx), 'bed_3'), '{"cost": {"wood_oak": 10, "wood_maple": 10}, "gold": 50}'::jsonb,
  'the first garden bed costs 20 wood and 50 gold, whichever spot it is');
select pg_temp.give('{"wood_maple": 10, "wood_oak": 10}');
set local role authenticated;
select is((pg_temp.build('bed_3') ->> 'gold_cost')::int, 50, 'building it takes the gold');
reset role;
select is(public.hideout_build_cost((select kid from fx), 'bed_1'), '{"cost": {"wood_pine": 10, "wood_palm": 10, "wood_birch": 10}, "gold": 100}'::jsonb,
  'the second costs more, in other woods');
select is(public.hideout_build_cost((select kid from fx), 'grove_1') -> 'cost' -> 'stone_ring', '1'::jsonb, 'a tree spot needs a Stone Ring');
select is(pg_temp.gold(), 950, '2,000 for the Hideout, 50 for the bed');

-- ── A station first ──
set local role authenticated;
select is(pg_temp.craft('stone_ring', 1) ->> 'status', 'no_station', 'no Workbench: nothing to make there');
select is(pg_temp.build('workbench') ->> 'reason', 'items', 'the Workbench needs its wood');
reset role;
select pg_temp.give('{"wood_maple": 15, "wood_birch": 10}');
set local role authenticated;
select is((pg_temp.build('workbench') ->> 'ok')::boolean, true, '15 Maple, 10 Birch and 100 gold build the Workbench');
select is(pg_temp.gold(), 850, 'it cost 100 gold');

-- ── The Workbench: a Stone Ring ──
select is(pg_temp.craft('stone_ring', 1) ->> 'status', 'items', 'no crystals: no Stone Ring');
reset role;
select pg_temp.give('{"veggie_crystal": 7}');
set local role authenticated;
select is(pg_temp.craft('stone_ring', 2, 'b') ->> 'status', 'wrong', 'a wrong answer makes nothing');
select is(pg_temp.have('veggie_crystal'), 7, 'and uses nothing');
create temp table ring as select pg_temp.craft('stone_ring', 3, 'a', (select id from entry)) as r;
select is((select r ->> 'status' from ring), 'crafted', 'a right answer makes it');
select is((select (r ->> 'first')::boolean from ring), true, 'the first one goes in the recipe book');
select is(pg_temp.have('stone_ring'), 1, 'a Stone Ring in the bag');
select is(pg_temp.have('veggie_crystal'), 4, '3 crystals used');
select is(pg_temp.gold(), 830, 'and 20 gold');
select is((pg_temp.craft('stone_ring', 3, 'a', (select id from entry)) ->> 'replayed')::boolean, true, 'the same entry again is a replay');
select is(pg_temp.have('stone_ring'), 1, 'and makes no more');
select is((pg_temp.craft('stone_ring', 4) ->> 'first')::boolean, false, 'the second one is not new');
select is((select times from player_recipes where recipe_id = 'stone_ring'), 2, 'the recipe book counts 2');

-- ── The Compost Bin: trash and a veggie ──
reset role;
select pg_temp.give('{"wood_pine": 10, "wood_mangrove": 10, "veggie_tomato": 3, "veggie_carrot": 1}');
set local role authenticated;
select is((pg_temp.build('compost') ->> 'ok')::boolean, true, 'the Compost Bin is built');
create temp table soil as select pg_temp.craft('garden_soil', 5) as r;
select is((select r ->> 'status' from soil), 'crafted', 'Garden Soil is made');
select is((select r -> 'trash_used' from soil), '{"paper": 4, "bottle": 1}'::jsonb, 'it takes 5 trash, biggest piles first');
select is((select bag_trash from user_battle_state where user_id = (select kid from fx)), '{"paper": 0, "bottle": 2, "wrapper": 1}'::jsonb, 'the trash left the bag');
select is((select r -> 'trash' from soil), '{"bottle": 2, "wrapper": 1}'::jsonb, 'the answer says what trash is left');
select is(pg_temp.have('veggie_tomato'), 2, 'and the biggest veggie pile gave one');
select is(pg_temp.craft('garden_soil', 6) ->> 'status', 'items', '3 trash is not enough');

-- ── The Kitchen: curio food and battle food ──
reset role;
select pg_temp.give('{"wood_ember": 15, "wood_pine": 15, "veggie_corn": 2, "veggie_beans": 1}');
set local role authenticated;
select is((pg_temp.build('kitchen') ->> 'ok')::boolean, true, 'the Kitchen is built');
select is(pg_temp.craft('curio_kibble', 7) ->> 'output_qty', '3', 'Curio Kibble makes 3');
select is(pg_temp.have('food_kibble'), 3, 'in the bag');
select is(pg_temp.have('veggie_corn'), 0, '2 corn used');
select is(pg_temp.craft('veggie_stew', 8) ->> 'status', 'crafted', 'Veggie Stew from any 3 veggies');
select is((select quantity from player_inventory where app_user_id = (select kid from fx) and item_key = 'veggie_stew'), 1, 'it goes with the battle items');
reset role;
update player_progress set gold = 10 where user_id = (select kid from fx);
select pg_temp.give('{"veggie_tomato": 3}');
set local role authenticated;
select is(pg_temp.craft('veggie_stew', 9) ->> 'status', 'gold', 'not enough gold: nothing made');
select is(pg_temp.have('veggie_tomato'), 3, 'and nothing used');

-- ── Feeding and bond hearts ──
select is(public.feed_curio((select kid from fx), (select id from mon), 'food_kibble') ->> 'status', 'no_camp', 'no Curio Camp: no feeding');
reset role;
update player_progress set gold = 500 where user_id = (select kid from fx);
select pg_temp.give('{"wood_oak": 10, "wood_elder": 10, "wood_bamboo": 10, "food_mash": 2}');
set local role authenticated;
select is((pg_temp.build('camp') ->> 'ok')::boolean, true, 'the Curio Camp is built');
create temp table fed as select public.feed_curio((select kid from fx), (select id from mon), 'food_kibble') as r;
select is((select r ->> 'status' from fed), 'fed', 'a curio eats Kibble');
select is((select r -> 'curio_row' ->> 'bond_hearts' from fed), '1', 'and gets a heart');
select is(pg_temp.have('food_kibble'), 2, 'one Kibble used');
select is(public.feed_curio((select kid from fx), (select id from mon), 'food_mash') -> 'curio_row' ->> 'bond_hearts', '2', 'Veggie Mash gives a heart too');
select is(public.feed_curio((select kid from fx), (select id from mon), 'food_kibble') ->> 'status', 'full', 'twice a day');
select throws_ok($$ select public.feed_curio((select kid from fx), (select id from mon), 'veggie_tomato') $$, 'P0001', null, 'only curio food');
update user_monsters set bond_hearts = 5 where id = (select id from mon);
reset role;
select is((select bond_hearts from user_monsters where id = (select id from mon)), 2, 'a player cannot set hearts');
set local role authenticated;
select is(public.take_curio_snack((select kid from fx), (select id from mon)), 'food_mash', 'the last snack goes on the next mission');
select is(public.take_curio_snack((select kid from fx), (select id from mon)), null, 'once');
reset role;
-- Hearts fade one a day, and never go past 5.
update user_monsters set bond_at = now() - interval '49 hours' where id = (select id from mon);
select is((select public.bond_hearts_now(bond_hearts, bond_at) from user_monsters where id = (select id from mon)), 0, 'two days later both hearts faded');
update user_monsters set bond_hearts = 5, bond_at = now() - interval '25 hours', fed_day = null where id = (select id from mon);
set local role authenticated;
select is(public.feed_curio((select kid from fx), (select id from mon), 'food_kibble') -> 'curio_row' ->> 'bond_hearts', '5', '4 left after a day, fed back to 5');
select is(public.feed_curio((select kid from fx), (select id from mon), 'food_kibble') -> 'curio_row' ->> 'bond_hearts', '5', 'never more than 5');

-- ── Nobody else ──
select pg_temp.login_as(other_auth) from fx;
select throws_ok($$ select pg_temp.craft('stone_ring', 10) $$, 'not authorized', 'nobody crafts for someone else');
select throws_ok($$ select public.feed_curio((select kid from fx), (select id from mon), 'food_kibble') $$, 'not authorized', 'nobody feeds someone else''s curio');
select is((select count(*)::int from player_recipes), 0, 'nobody reads someone else''s recipe book');

reset role;
select * from finish();
rollback;
