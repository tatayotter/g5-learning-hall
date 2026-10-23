-- pgTAP tests for 20261023120000_garden_wild_trees.sql: chopping a tree of today's map with
-- three right answers, misses that cost a clean chop, a stump staying a stump, the rest after 3
-- wrong answers, the 8-trees-a-day limit, a re-sent offline swing never landing twice, trees
-- from another day or of an unknown kind (or a kind from another region), and wood selling for 2 gold while saplings stay.

begin;
create extension if not exists pgtap;
select plan(29);

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

-- Today's tree at trunk tile x_y ("2026-10-23:12_7"), on the Manila day.
create or replace function pg_temp.tree(p_xy text) returns text as $$
  select ((now() at time zone 'Asia/Manila')::date)::text || ':' || p_xy;
$$ language sql;

-- One swing by the kid at a tree, answering question n with p_selected.
create or replace function pg_temp.swing(p_node text, p_n int, p_selected text, p_entry uuid default gen_random_uuid(), p_tree text default 'maple')
returns jsonb as $$
  select public.chop_wild_tree((select kid from fx), 'ledgers_heart', pg_temp.tree(p_node), p_tree, (select id from qs where n = p_n), p_selected, p_entry, null);
$$ language sql;

-- How many of an item the kid has.
create or replace function pg_temp.have(p_key text) returns int as $$
  select coalesce((select quantity from player_bag_items where user_id = (select kid from fx) and item_key = p_key), 0);
$$ language sql;

update feature_flags set mode = 'off' where key = 'garden';
select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;
select throws_ok(
  $$ select pg_temp.swing('1_1', 1, 'a') $$,
  'P0001', 'garden is not on for this player',
  'nobody can chop while the garden is off'
);

reset role;
update feature_flags set mode = 'allowlist', allowlist = array[(select kid from fx)] where key = 'garden';
set local role authenticated;

-- A clean chop: three right answers in a row.
select is((select pg_temp.swing('1_1', 1, 'a', (select entry_swing from fx)) ->> 'hits'), '1', 'a right answer lands the first swing');
select is((select pg_temp.swing('1_1', 1, 'a', (select entry_swing from fx)) ->> 'replayed'), 'true', 'the same swing sent again is a replay');
select is(pg_temp.swing('1_1', 2, 'a') ->> 'hits', '2', 'a replay never lands a swing twice');
create temp table felled as select pg_temp.swing('1_1', 3, 'a') as r;
select is((select r ->> 'status' from felled), 'felled', 'the third right answer fells the tree');
select is((select (r ->> 'clean')::boolean from felled), true, 'no misses is a clean chop');
select is(pg_temp.have('wood'), 3, 'the tree gave 3 wood');
select is(pg_temp.have('sapling_maple'), 1, 'a clean chop always gives a sapling of its kind');
select is((select r -> 'bag' ->> 'wood' from felled), '3', 'the result carries the new bag');

select is(pg_temp.swing('1_1', 4, 'a') ->> 'status', 'stump', 'a chopped tree stays a stump today');

-- A miss in the middle: the chop still finishes, but it isn't clean.
select is(pg_temp.swing('2_2', 1, 'b') ->> 'status', 'wrong', 'a wrong answer misses');
create temp table oak as select pg_temp.swing('2_2', 2, 'a', gen_random_uuid(), 'oak') as a, pg_temp.swing('2_2', 3, 'a', gen_random_uuid(), 'oak') as b, pg_temp.swing('2_2', 4, 'a', gen_random_uuid(), 'oak') as c;
select is((select c ->> 'status' from oak), 'felled', 'three right answers fell it even after a miss');
select is((select (c ->> 'clean')::boolean from oak), false, 'a chop with a miss is not clean');
select is(pg_temp.have('wood'), 6, '3 more wood');

-- Yesterday's tree, and a tree that isn't a kind we grow.
select throws_ok(
  $$ select public.chop_wild_tree((select kid from fx), 'ledgers_heart', ((now() at time zone 'Asia/Manila')::date - 2)::text || ':5_5', 'maple', (select id from qs where n = 1), 'a', gen_random_uuid(), null) $$,
  'P0001', null, 'a tree from an older day''s map cannot be chopped'
);
select throws_ok(
  $$ select pg_temp.swing('5_5', 1, 'a', gen_random_uuid(), 'gold') $$,
  'P0001', null, 'only real kinds of tree'
);
-- Each region grows its own trees: fire trees only in the Cinderreach.
select throws_ok(
  $$ select pg_temp.swing('5_5', 1, 'a', gen_random_uuid(), 'ember') $$,
  'P0001', null, 'no Ember Trees in the Ledger''s Heart'
);
select is(
  public.chop_wild_tree((select kid from fx), 'cinderreach', pg_temp.tree('9_9'), 'ember', (select id from qs where n = 1), 'a', gen_random_uuid(), null) ->> 'status',
  'hit', 'an Ember Tree in the Cinderreach can be chopped'
);
select is(
  public.chop_wild_tree((select kid from fx), 'tidewrit_shallows', pg_temp.tree('8_8'), 'palm', (select id from qs where n = 1), 'a', gen_random_uuid(), null) ->> 'status',
  'hit', 'a Palm Tree in the Tidewrit Shallows can be chopped'
);
select is(
  public.chop_wild_tree((select kid from fx), 'rootbound_wilds', pg_temp.tree('31_31'), 'elder', (select id from qs where n = 1), 'a', gen_random_uuid(), null) ->> 'status',
  'hit', 'an Elder Tree in the Rootbound Wilds can be chopped'
);
select throws_ok(
  $$ select public.chop_wild_tree((select kid from fx), 'rootbound_wilds', pg_temp.tree('32_32'), 'palm', (select id from qs where n = 1), 'a', gen_random_uuid(), null) $$,
  'P0001', null, 'no Palm Trees in the Rootbound Wilds'
);
select throws_ok(
  $$ select public.chop_wild_tree((select kid from fx), 'cinderreach', pg_temp.tree('7_7'), 'palm', (select id from qs where n = 1), 'a', gen_random_uuid(), null) $$,
  'P0001', null, 'no Palm Trees in the Cinderreach'
);
select throws_ok(
  $$ select public.chop_wild_tree((select kid from fx), 'ledgers_heart', 'maple_1', 'maple', (select id from qs where n = 1), 'a', gen_random_uuid(), null) $$,
  'P0001', null, 'a tree id names its day and tile'
);

-- Three wrong answers in a row and the tree rests.
create temp table misses as select pg_temp.swing('3_3', 1, 'b') as a, pg_temp.swing('3_3', 2, 'b') as b;
select ok((select pg_temp.swing('3_3', 3, 'b') ->> 'rest_until') is not null, 'the third wrong answer in a row starts a rest');
select is(pg_temp.swing('3_3', 4, 'a') ->> 'status', 'resting', 'a resting tree cannot be chopped');

-- 8 trees a day: two felled so far, six more, then the kid is tired.
create temp table more as
select x, pg_temp.swing(x || '_9', 1, 'a') as a, pg_temp.swing(x || '_9', 2, 'a') as b, pg_temp.swing(x || '_9', 3, 'a') as c
from generate_series(10, 15) x;
select is((select count(*)::int from more where c ->> 'status' = 'felled'), 6, 'six more trees fall');
select is(pg_temp.swing('20_20', 1, 'a') ->> 'status', 'tired', 'the ninth tree today: too tired to chop');
select is(pg_temp.have('wood'), 24, '8 trees gave 24 wood');
reset role;
delete from player_bag_items where user_id = (select kid from fx) and item_key = 'wood';
insert into player_bag_items (user_id, item_key, quantity) select kid, 'wood', 6 from fx;
set local role authenticated;

-- Selling: wood goes for 2 gold each, saplings stay.
select is(
  (select sell_garden_items((select kid from fx)) - 'bag' - 'progress'),
  '{"gold": 12, "sold": {"wood": 6}}'::jsonb,
  'wood sells for 2 gold each; saplings do not sell'
);

select * from finish();
rollback;
