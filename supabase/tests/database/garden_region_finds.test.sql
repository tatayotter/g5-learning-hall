-- pgTAP tests for 20261023234000_garden_region_finds.sql: storm crystals, ink pearls and golden
-- petals are picked up like seashells (one right answer), never come with seed packets, and sell
-- at the Recycler for 2 gold.

begin;
create extension if not exists pgtap;
select plan(9);

create temp table fx as
select gen_random_uuid() as kid_auth,
       'pgtap_find_kid' as kid;
grant select on fx to authenticated;

insert into user_identity_map (auth_uid, app_user_id) select kid_auth, kid from fx;
insert into player_progress (user_id, gold) select kid, 100 from fx
on conflict (user_id) do update set gold = excluded.gold;

insert into content_weeks (grade, week_starting_date) values (5, '2030-05-19');
insert into content_days (content_week_id, weekday)
select id, 'Monday' from content_weeks where grade = 5 and week_starting_date = '2030-05-19';
insert into content_quizzes (content_day_id, subject)
select d.id, 'Science' from content_days d
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-05-19';
insert into content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select q.id, 'q' || g, '["a","b"]'::jsonb, 'a', g
from content_quizzes q
join content_days d on d.id = q.content_day_id
join content_weeks w on w.id = d.content_week_id
cross join generate_series(1, 8) g
where w.grade = 5 and w.week_starting_date = '2030-05-19';

create temp table qs as
select cq.id, cq.sort_order as n from content_questions cq
join content_quizzes qz on qz.id = cq.content_quiz_id
join content_days d on d.id = qz.content_day_id
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-05-19';
grant select on qs to authenticated;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

create or replace function pg_temp.pick(p_region text, p_node text, p_n int, p_selected text)
returns jsonb as $$
  select public.gather_wild_plant((select kid from fx), p_region, p_node, (select id from qs where n = p_n), p_selected, gen_random_uuid(), null);
$$ language sql;

select is((select count(*)::int from wild_plant_nodes where region = 'stormrun_reaches' and veggie = 'crystal'), 7, 'Stormrun has 7 crystal spots');
select is((select count(*)::int from wild_plant_nodes where region = 'unread_margins' and veggie = 'inkpearl'), 7, 'the Margins have 7 ink pearl spots');
select is((select count(*)::int from wild_plant_nodes where region = 'radiant_archive' and veggie = 'petal'), 7, 'the Archive has 7 petal spots');

update feature_flags set mode = 'allowlist', allowlist = array[(select kid from fx)] where key = 'garden';
select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;

select is(pg_temp.pick('stormrun_reaches', 'crystal_1', 1, 'a') ->> 'status', 'picked', 'a right answer picks up a crystal');
select is(pg_temp.pick('unread_margins', 'pearl_1', 2, 'a') ->> 'status', 'picked', 'a right answer picks up an ink pearl');
create temp table last_pick as select pg_temp.pick('radiant_archive', 'petal_1', 3, 'a') as r;
select is((select r -> 'bag' ->> 'veggie_petal' from last_pick), '1', 'the petal is in the bag');

-- Twenty more pick-ups across the three regions: never a seed packet.
reset role;
do $$
declare
  v_regions text[] := array['stormrun_reaches', 'unread_margins', 'radiant_archive'];
  v_nodes text[] := array['crystal_', 'pearl_', 'petal_'];
  k int;
begin
  for i in 1..20 loop
    update player_gather_nodes set last_picked_at = now() - interval '21 minutes'
    where user_id = (select kid from fx);
    k := 1 + i % 3;
    perform set_config('role', 'authenticated', true);
    perform pg_temp.pick(v_regions[k], v_nodes[k] || (1 + i % 7), 1 + i % 8, 'a');
    perform set_config('role', 'postgres', true);
  end loop;
end $$;
select is(
  (select coalesce(sum(quantity), 0)::int from player_bag_items where user_id = (select kid from fx) and item_key like 'veggie\_%'),
  23, 'every find turned up again after 20 minutes'
);
select is(
  (select coalesce(sum(quantity), 0)::int from player_bag_items where user_id = (select kid from fx) and item_key like 'seeds\_%'),
  0, 'finds never give seed packets'
);

set local role authenticated;
select is(
  (select sell_garden_items((select kid from fx), '{"veggie_crystal": 2, "veggie_inkpearl": 2, "veggie_petal": 1}'::jsonb) -> 'progress' ->> 'gold'),
  '110', 'the Recycler buys 5 finds for 10 gold'
);

select * from finish();
rollback;
