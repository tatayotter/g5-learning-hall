-- pgTAP tests for 20261028090000_gear_tools_and_earning_trims.sql: no tool means no chopping,
-- mining or digging (veggies stay free); buying gear one tier at a time with the kid's gold;
-- the fishing rod not for sale yet; the bag working without the garden switch; what Bronze,
-- Silver and Gold tools do; Storm Gems and Old Coins selling for 10; trainer gold paid once on a
-- first win; and kids never writing their own gear.

begin;
create extension if not exists pgtap;
select plan(36);

create temp table fx as
select gen_random_uuid() as kid_auth,
       'pgtap_gear_kid' as kid,
       gen_random_uuid() as other_auth,
       'pgtap_gear_other' as other;
grant select on fx to authenticated;

insert into user_identity_map (auth_uid, app_user_id) select kid_auth, kid from fx;
insert into user_identity_map (auth_uid, app_user_id) select other_auth, other from fx;
insert into player_progress (user_id, gold) select kid, 100 from fx
on conflict (user_id) do update set gold = excluded.gold;

insert into content_weeks (grade, week_starting_date) values (5, '2030-06-09');
insert into content_days (content_week_id, weekday)
select id, 'Monday' from content_weeks where grade = 5 and week_starting_date = '2030-06-09';
insert into content_quizzes (content_day_id, subject)
select d.id, 'Science' from content_days d
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-06-09';
insert into content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select q.id, 'q' || g, '["a","b"]'::jsonb, 'a', g
from content_quizzes q
join content_days d on d.id = q.content_day_id
join content_weeks w on w.id = d.content_week_id
cross join generate_series(1, 8) g
where w.grade = 5 and w.week_starting_date = '2030-06-09';

create temp table qs as
select cq.id, cq.sort_order as n from content_questions cq
join content_quizzes qz on qz.id = cq.content_quiz_id
join content_days d on d.id = qz.content_day_id
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-06-09';
grant select on qs to authenticated;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

create or replace function pg_temp.pick(p_region text, p_node text, p_n int, p_selected text default 'a')
returns jsonb as $$
  select public.gather_wild_plant((select kid from fx), p_region, p_node, (select id from qs where n = p_n), p_selected, gen_random_uuid(), null);
$$ language sql;

create or replace function pg_temp.swing(p_xy text, p_n int, p_selected text default 'a')
returns jsonb as $$
  select public.chop_wild_tree((select kid from fx), 'ledgers_heart', ((now() at time zone 'Asia/Manila')::date)::text || ':' || p_xy,
                               'maple', (select id from qs where n = p_n), p_selected, gen_random_uuid(), null);
$$ language sql;

create or replace function pg_temp.buy(p_gear text) returns jsonb as $$
  select public.buy_gear((select kid from fx), p_gear);
$$ language sql;

select is((select count(*)::int from gear_tiers), 23, 'the Shopkeeper lists 23 tiers of gear');

update feature_flags set mode = 'allowlist', allowlist = array[(select kid from fx)] where key = 'garden';
select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;

-- ── No tools ──
select is(pg_temp.pick('stormrun_reaches', 'crystal_1', 1) ->> 'status', 'no_tool', 'no pickaxe: no crystal');
select is(pg_temp.pick('unread_margins', 'pearl_1', 2) ->> 'status', 'no_tool', 'no shovel: no ink pearl');
select is(pg_temp.swing('12_7', 3) ->> 'status', 'no_tool', 'no axe: no chopping');
select is(pg_temp.pick('ledgers_heart', 'corn_1', 4) ->> 'status', 'picked', 'veggies need no tool');
reset role;
select is(
  (select count(*)::int from player_question_attempts where user_id = (select kid from fx)),
  1, 'a no-tool try grades nothing'
);
set local role authenticated;

-- ── Buying ──
select is(pg_temp.buy('axe') ->> 'reason', 'gold', 'not enough gold for a Stone Axe');
reset role;
update player_progress set gold = 50000 where user_id = (select kid from fx);
set local role authenticated;
select is(pg_temp.buy('axe') - 'progress', '{"ok": true, "gear": "axe", "tier": 1, "cost": 150}'::jsonb, 'buys the Stone Axe for 150');
select is((select gold from player_progress where user_id = (select kid from fx)), 49850, 'the gold is taken');
select is((select tier from player_gear where user_id = (select kid from fx) and gear = 'axe'), 1, 'the kid can see their axe');
select is((pg_temp.buy('axe') ->> 'tier')::int, 2, 'the next buy is the Bronze Axe');
select is((select gold from player_progress where user_id = (select kid from fx)), 48850, 'the Bronze Axe costs 1,000');
select is(pg_temp.buy('rod') ->> 'reason', 'not_for_sale', 'the fishing rod is not for sale yet');
select is(pg_temp.buy('can') ->> 'reason', 'not_for_sale', 'the watering can is not for sale yet');
reset role;
select is(
  (select count(*)::int from player_events where user_id = (select kid from fx) and event_type = 'gear_purchase'),
  2, 'each purchase is on record'
);
set local role authenticated;
select throws_ok(
  $$ select public.buy_gear((select other from fx), 'axe') $$,
  'not authorized', 'nobody buys gear for another kid'
);
select throws_ok(
  $$ insert into player_gear (user_id, gear, tier) select kid, 'pickaxe', 4 from fx $$,
  '42501', null, 'kids cannot hand themselves a tool'
);

-- ── Bronze axe: two swings ──
select is(pg_temp.swing('12_7', 1) ->> 'status', 'hit', 'Bronze: first swing hits');
select is(pg_temp.swing('12_7', 2) ->> 'status', 'felled', 'Bronze: the second swing fells the tree');

-- ── The bag works without the garden ──
reset role;
update feature_flags set mode = 'off' where key = 'garden';
set local role authenticated;
select is((pg_temp.buy('bag') ->> 'tier')::int, 1, 'the Bigger Bag is for everyone');
select throws_ok($$ select pg_temp.buy('pickaxe') $$, 'garden is not on for this player', 'tools need the garden');
reset role;
update feature_flags set mode = 'allowlist', allowlist = array[(select kid from fx)] where key = 'garden';
set local role authenticated;
do $$ begin perform pg_temp.buy('bag'); end $$;
select is((pg_temp.buy('bag') ->> 'tier')::int, 3, 'the Huge Bag is the third');
select is(pg_temp.buy('bag') ->> 'reason', 'max', 'no bag after the Huge Bag');

-- ── Gold axe: 12 trees a day, a sapling every tree, 3 or 6 wood ──
do $$ begin perform pg_temp.buy('axe'); end $$;
select is((pg_temp.buy('axe') ->> 'tier')::int, 4, 'Silver then Gold Axe');
select is(pg_temp.buy('axe') ->> 'reason', 'max', 'nothing after the Gold Axe');
create temp table felled (r jsonb);
grant all on felled to authenticated;
do $$
begin
  for i in 1..11 loop
    perform pg_temp.swing(i || '_1', 1, 'b');
    perform pg_temp.swing(i || '_1', 2);
    insert into felled select pg_temp.swing(i || '_1', 3);
  end loop;
end $$;
select is((select count(*)::int from felled where r ->> 'status' = 'felled'), 11, 'eleven more trees fall');
select ok((select bool_and((r ->> 'saplings')::int = 1) from felled), 'Silver and up: a sapling every tree, even after a miss');
select ok((select bool_and((r ->> 'wood')::int in (3, 6)) from felled), 'Gold: 3 wood, sometimes 6');
select is(pg_temp.swing('99_9', 4) ->> 'status', 'tired', 'the thirteenth tree today: too tired');

-- ── Gold shovel: sometimes two, sometimes an Old Coin ──
do $$ begin for i in 1..4 loop perform pg_temp.buy('shovel'); end loop; end $$;
create temp table digs (r jsonb);
grant all on digs to authenticated;
reset role;
do $$
begin
  for i in 1..40 loop
    update player_gather_nodes set last_picked_at = now() - interval '21 minutes' where user_id = (select kid from fx);
    perform set_config('role', 'authenticated', true);
    insert into digs select pg_temp.pick('tidewrit_shallows', 'shell_' || (1 + i % 7), 1 + i % 8);
    perform set_config('role', 'postgres', true);
  end loop;
end $$;
select ok((select bool_and(r ->> 'status' = 'picked' and (r ->> 'count')::int in (1, 2)) from digs), 'Gold shovel: one or two shells a dig');
select ok((select bool_or((r ->> 'count')::int = 2) from digs), 'Gold shovel: two shells half the time');
select is(
  (select coalesce(quantity, 0) from player_bag_items where user_id = (select kid from fx) and item_key = 'find_coin'),
  (select count(*)::int from digs where r ->> 'rare' = 'find_coin'),
  'every Old Coin dug up is in the bag'
);

-- ── Selling rare finds ──
delete from player_bag_items where user_id = (select kid from fx);
insert into player_bag_items (user_id, item_key, quantity) select kid, k, 1 from fx, unnest(array['find_gem', 'find_coin']) k;
set local role authenticated;
select is(
  (select sell_garden_items((select kid from fx), null) - 'bag' - 'progress'),
  '{"gold": 20, "sold": {"find_coin": 1, "find_gem": 1}}'::jsonb,
  'a Storm Gem and an Old Coin sell for 10 gold each'
);

-- ── Trainer gold, once per trainer ──
select is(public.claim_trainer_first_win((select kid from fx), 'ember_acolyte') ->> 'reason', 'no_win', 'no win, no gold');
reset role;
insert into monster_battle_log (user_id, opponent, result) select kid, 'ember_acolyte', 'win' from fx;
set local role authenticated;
select is((public.claim_trainer_first_win((select kid from fx), 'ember_acolyte') ->> 'gold')::int, 40, 'the first win pays the trainer''s 40 gold');
select is(public.claim_trainer_first_win((select kid from fx), 'ember_acolyte') ->> 'reason', 'already_paid', 'only once per trainer');

select * from finish();
rollback;
