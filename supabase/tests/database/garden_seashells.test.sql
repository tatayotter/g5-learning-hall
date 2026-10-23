-- pgTAP tests for 20261023200000_garden_seashells.sql: seashells on Tidewrit's beaches are
-- picked up like wild veggies (one right answer), never come with seed packets, wash up again
-- after 20 minutes, and sell at the Recycler for 2 gold.

begin;
create extension if not exists pgtap;
select plan(9);

create temp table fx as
select gen_random_uuid() as kid_auth,
       'pgtap_shell_kid' as kid,
       gen_random_uuid() as other_auth,
       'pgtap_shell_other' as other_kid,
       gen_random_uuid() as entry_right;
grant select on fx to authenticated;

insert into user_identity_map (auth_uid, app_user_id)
select kid_auth, kid from fx union all select other_auth, other_kid from fx;
insert into player_progress (user_id, gold) select kid, 100 from fx
on conflict (user_id) do update set gold = excluded.gold;

insert into content_weeks (grade, week_starting_date) values (5, '2030-05-12');
insert into content_days (content_week_id, weekday)
select id, 'Monday' from content_weeks where grade = 5 and week_starting_date = '2030-05-12';
insert into content_quizzes (content_day_id, subject)
select d.id, 'Science' from content_days d
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-05-12';
insert into content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select q.id, 'q' || g, '["a","b"]'::jsonb, 'a', g
from content_quizzes q
join content_days d on d.id = q.content_day_id
join content_weeks w on w.id = d.content_week_id
cross join generate_series(1, 8) g
where w.grade = 5 and w.week_starting_date = '2030-05-12';

create temp table qs as
select cq.id, cq.sort_order as n from content_questions cq
join content_quizzes qz on qz.id = cq.content_quiz_id
join content_days d on d.id = qz.content_day_id
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-05-12';
grant select on qs to authenticated;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- One pick-up attempt by the kid at a Tidewrit shell, answering question n with p_selected.
create or replace function pg_temp.pick(p_node text, p_n int, p_selected text, p_entry uuid default gen_random_uuid())
returns jsonb as $$
  select public.gather_wild_plant((select kid from fx), 'tidewrit_shallows', p_node, (select id from qs where n = p_n), p_selected, p_entry, null);
$$ language sql;

select is((select count(*)::int from wild_plant_nodes where region = 'tidewrit_shallows' and veggie = 'seashell'), 7, 'Tidewrit has 7 seashell spots');

update feature_flags set mode = 'allowlist', allowlist = array[(select kid from fx)] where key = 'garden';
update player_progress set gold = 100 where user_id = (select kid from fx);
select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;

select is(pg_temp.pick('shell_1', 1, 'b') ->> 'status', 'wrong', 'a wrong answer leaves the shell');
create temp table first_pick as select pg_temp.pick('shell_1', 2, 'a') as r;
select is((select r ->> 'status' from first_pick), 'picked', 'a right answer picks up the shell');
select is((select r ->> 'veggie' from first_pick), 'seashell', 'it is a seashell');
select is((select r -> 'bag' ->> 'veggie_seashell' from first_pick), '1', 'the shell is in the bag');
select is(pg_temp.pick('shell_1', 3, 'a') ->> 'status', 'growing', 'the next shell has not washed up yet');

-- Twenty more pick-ups (each spot "washed up again"): never a seed packet.
reset role;
create temp table more_picks (r jsonb);
grant insert, select on more_picks to authenticated;
do $$
begin
  for i in 1..20 loop
    update player_gather_nodes set last_picked_at = now() - interval '21 minutes'
    where user_id = (select kid from fx) and region = 'tidewrit_shallows';
    perform set_config('role', 'authenticated', true);
    insert into more_picks select pg_temp.pick('shell_' || (1 + i % 7), 1 + i % 8, 'a');
    perform set_config('role', 'postgres', true);
  end loop;
end $$;
select is((select count(*)::int from more_picks where r ->> 'status' = 'picked'), 20, 'every shell washes up again after 20 minutes');
select is(
  (select coalesce(sum(quantity), 0)::int from player_bag_items where user_id = (select kid from fx) and item_key like 'seeds\_%'),
  0, 'shells never give seed packets'
);

set local role authenticated;
select is(
  (select sell_garden_items((select kid from fx), '{"veggie_seashell": 5}'::jsonb) -> 'progress' ->> 'gold'),
  '110', 'the Recycler buys 5 shells for 10 gold'
);

select * from finish();
rollback;
