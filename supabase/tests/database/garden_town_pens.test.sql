-- pgTAP tests for 20261029030000_garden_town_pens.sql: Inkwell Town's two pens are planted edge
-- to edge (25 tomatoes, 40 pumpkins) and picked like any wild veggie, no tool needed.

begin;
create extension if not exists pgtap;
select plan(7);

create temp table fx as
select gen_random_uuid() as kid_auth, 'pgtap_pen_kid' as kid;
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
cross join generate_series(1, 3) g
where w.grade = 5 and w.week_starting_date = '2030-05-19';

create temp table qs as
select cq.id, cq.sort_order as n from content_questions cq
join content_quizzes qz on qz.id = cq.content_quiz_id
join content_days d on d.id = qz.content_day_id
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-05-19';
grant select on qs to authenticated;

select is((select count(*)::int from wild_plant_nodes where region = 'town' and veggie = 'tomato'), 25, 'the small pen has 25 tomatoes');
select is((select count(*)::int from wild_plant_nodes where region = 'town' and veggie = 'pumpkin'), 40, 'the big pen has 40 pumpkins');
select is(
  (select count(*)::int from wild_plant_nodes where region = 'town' and node_id <> veggie || '_' || tile_x || '_' || tile_y),
  0, 'node ids match lib/gardenConfig.ts (veggie_x_y)'
);
select is(
  (select count(*)::int from wild_plant_nodes where region = 'town'
   and not ((tile_x between 3 and 7 or tile_x between 10 and 17) and tile_y between 23 and 27)),
  0, 'every plant is inside a pen'
);

update feature_flags set mode = 'allowlist', allowlist = array[(select kid from fx)] where key = 'garden';
select set_config('request.jwt.claims', json_build_object('sub', kid_auth, 'role', 'authenticated')::text, true) from fx;
select set_config('request.jwt.claim.sub', kid_auth::text, true) from fx;
set local role authenticated;

create temp table pick as
select public.gather_wild_plant((select kid from fx), 'town', 'pumpkin_12_25', (select id from qs where n = 1), 'a', gen_random_uuid(), null) as r;
select is((select r ->> 'status' from pick), 'picked', 'a right answer picks a pumpkin without any tool');
select is((select r -> 'bag' ->> 'veggie_pumpkin' from pick), '1', 'the pumpkin is in the bag');
select is(
  public.gather_wild_plant((select kid from fx), 'town', 'pumpkin_12_25', (select id from qs where n = 2), 'a', gen_random_uuid(), null) ->> 'status',
  'growing', 'it grows back before it can be picked again'
);

select * from finish();
rollback;
