-- pgTAP tests for 20261023120000_garden_wild_trees.sql: chopping a ribboned tree with three
-- right answers, misses that cost a clean chop, the 4-hour regrow, the rest after 3 wrong
-- answers, a re-sent offline swing never landing twice, and wood selling for 2 gold while
-- saplings stay.

begin;
create extension if not exists pgtap;
select plan(19);

create temp table fx as
select gen_random_uuid() as kid_auth,
       'pgtap_tree_kid' as kid,
       gen_random_uuid() as entry_swing;
grant select on fx to authenticated;

insert into user_identity_map (auth_uid, app_user_id) select kid_auth, kid from fx;
insert into player_progress (user_id, gold) select kid, 100 from fx
on conflict (user_id) do update set gold = excluded.gold;

insert into content_weeks (grade, week_starting_date) values (5, '2030-06-02');
insert into content_days (content_week_id, weekday)
select id, 'Monday' from content_weeks where grade = 5 and week_starting_date = '2030-06-02';
insert into content_quizzes (content_day_id, subject)
select d.id, 'Science' from content_days d
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-06-02';
insert into content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select q.id, 'q' || g, '["a","b"]'::jsonb, 'a', g
from content_quizzes q
join content_days d on d.id = q.content_day_id
join content_weeks w on w.id = d.content_week_id
cross join generate_series(1, 6) g
where w.grade = 5 and w.week_starting_date = '2030-06-02';

create temp table qs as
select cq.id, cq.sort_order as n from content_questions cq
join content_quizzes qz on qz.id = cq.content_quiz_id
join content_days d on d.id = qz.content_day_id
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-06-02';
grant select on qs to authenticated;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- One swing by the kid at a tree, answering question n with p_selected.
create or replace function pg_temp.swing(p_node text, p_n int, p_selected text, p_entry uuid default gen_random_uuid())
returns jsonb as $$
  select public.chop_wild_tree((select kid from fx), 'ledgers_heart', p_node, (select id from qs where n = p_n), p_selected, p_entry, null);
$$ language sql;

-- How many of an item the kid has.
create or replace function pg_temp.have(p_key text) returns int as $$
  select coalesce((select quantity from player_bag_items where user_id = (select kid from fx) and item_key = p_key), 0);
$$ language sql;

select is((select count(*)::int from wild_tree_nodes where region = 'ledgers_heart'), 4, 'The Ledger''s Heart has 4 ribboned trees');

update feature_flags set mode = 'off' where key = 'garden';
select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;
select throws_ok(
  $$ select pg_temp.swing('maple_1', 1, 'a') $$,
  'P0001', 'garden is not on for this player',
  'nobody can chop while the garden is off'
);

reset role;
update feature_flags set mode = 'allowlist', allowlist = array[(select kid from fx)] where key = 'garden';
set local role authenticated;

-- A clean chop: three right answers in a row.
select is((select pg_temp.swing('maple_1', 1, 'a', (select entry_swing from fx)) ->> 'hits'), '1', 'a right answer lands the first swing');
select is((select pg_temp.swing('maple_1', 1, 'a', (select entry_swing from fx)) ->> 'replayed'), 'true', 'the same swing sent again is a replay');
select is(pg_temp.swing('maple_1', 2, 'a') ->> 'hits', '2', 'a replay never lands a swing twice');
create temp table felled as select pg_temp.swing('maple_1', 3, 'a') as r;
select is((select r ->> 'status' from felled), 'felled', 'the third right answer fells the tree');
select is((select (r ->> 'clean')::boolean from felled), true, 'no misses is a clean chop');
select is(pg_temp.have('wood'), 3, 'the tree gave 3 wood');
select is(pg_temp.have('sapling_maple'), 1, 'a clean chop always gives a sapling of its kind');
select is((select r -> 'bag' ->> 'wood' from felled), '3', 'the result carries the new bag');

select is(pg_temp.swing('maple_1', 4, 'a') ->> 'status', 'growing', 'a chopped tree is growing back');

-- A miss in the middle: the chop still finishes, but it isn't clean.
select is(pg_temp.swing('oak_1', 1, 'b') ->> 'status', 'wrong', 'a wrong answer misses');
create temp table oak as select pg_temp.swing('oak_1', 2, 'a') as a, pg_temp.swing('oak_1', 3, 'a') as b, pg_temp.swing('oak_1', 4, 'a') as c;
select is((select c ->> 'status' from oak), 'felled', 'three right answers fell it even after a miss');
select is((select (c ->> 'clean')::boolean from oak), false, 'a chop with a miss is not clean');
select is(pg_temp.have('wood'), 6, '3 more wood');

-- Four hours later the maple is ready again.
reset role;
update player_gather_nodes set last_picked_at = now() - interval '4 hours 1 minute'
where user_id = (select kid from fx) and node_id = 'maple_1';
set local role authenticated;
select is(pg_temp.swing('maple_1', 5, 'a') ->> 'status', 'hit', 'it can be chopped again once it regrows');

-- Three wrong answers in a row and the tree rests.
create temp table misses as select pg_temp.swing('birch_1', 1, 'b') as a, pg_temp.swing('birch_1', 2, 'b') as b;
select ok((select pg_temp.swing('birch_1', 3, 'b') ->> 'rest_until') is not null, 'the third wrong answer in a row starts a rest');
select is(pg_temp.swing('birch_1', 4, 'a') ->> 'status', 'resting', 'a resting tree cannot be chopped');

-- Selling: wood goes for 2 gold each, saplings stay.
select is(
  (select sell_garden_items((select kid from fx)) - 'bag' - 'progress'),
  '{"gold": 12, "sold": {"wood": 6}}'::jsonb,
  'wood sells for 2 gold each; saplings do not sell'
);

select * from finish();
rollback;
