-- pgTAP tests for 20261015070000_curio_tracking_scrolls: buying a Tracking
-- Scroll, filling its meter only with right answers (each question once),
-- summoning at 30, the scroll being used up and leaving the item bar, and
-- nobody acting for another player.

begin;
create extension if not exists pgtap;
select plan(16);

create temp table fx as
select gen_random_uuid() as kid_auth,
       'pgtap_track_kid' as kid,
       gen_random_uuid() as other_auth,
       'pgtap_track_other' as other_kid;
grant select on fx to authenticated;

insert into user_identity_map (auth_uid, app_user_id)
select kid_auth, kid from fx union all select other_auth, other_kid from fx;
insert into user_battle_state (user_id, item_bar)
select kid, '[{"item": "tracking_scroll_embrak"}, {"trash": "paper", "n": 3}, null, null]'::jsonb from fx;
insert into user_monsters (user_id, monster_id, monster_exp, monster_level, slot)
select kid, 'shadrak', 900, 10, 1 from fx;
insert into player_progress (user_id, gold) select kid, 6000 from fx
on conflict (user_id) do update set gold = excluded.gold;

-- 32 questions: 31 answered right, 1 answered wrong.
insert into content_weeks (grade, week_starting_date) values (5, '2030-04-07');
insert into content_days (content_week_id, weekday)
select id, 'Monday' from content_weeks where grade = 5 and week_starting_date = '2030-04-07';
insert into content_quizzes (content_day_id, subject)
select d.id, 'Mathematics' from content_days d
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-04-07';
insert into content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select q.id, 'q' || g, '["a","b"]'::jsonb, 'a', g
from content_quizzes q
join content_days d on d.id = q.content_day_id
join content_weeks w on w.id = d.content_week_id
cross join generate_series(1, 32) g
where w.grade = 5 and w.week_starting_date = '2030-04-07';

create temp table qs as
select cq.id, cq.sort_order as n from content_questions cq
join content_quizzes qz on qz.id = cq.content_quiz_id
join content_days d on d.id = qz.content_day_id
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-04-07';
grant select on qs to authenticated;

insert into player_question_attempts (user_id, content_question_id, correct)
select (select kid from fx), id, n <> 32 from qs;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

select is(
  (select count(*)::int from shop_items where key like 'tracking_scroll_%'), 27,
  'there are 27 Tracking Scrolls (6 starters + 21 wild curios)'
);
select is(
  (select count(*)::int from shop_items where key = 'tracking_scroll_emberwyrm'), 0,
  'legendaries have no Tracking Scroll'
);

select pg_temp.login_as(kid_auth) from fx;
set local role authenticated;

select throws_ok(
  $$ select set_active_tracking((select kid from fx), 'embrak') $$,
  'P0001', null,
  'a scroll the player does not hold cannot be activated'
);

select lives_ok(
  $$ select spend_gold_and_grant_item((select kid from fx), 'tracking_scroll_embrak', 1) $$,
  'a player can buy a Tracking Scroll'
);
select is((select gold from player_progress where user_id = (select kid from fx)), 1000, 'it costs 5,000 gold');

select is(
  (select set_active_tracking((select kid from fx), 'embrak') ->> 'progress')::int, 0,
  'activating a new scroll starts its meter at 0'
);

select throws_ok(
  $$ select summon_tracked_curio((select kid from fx), null) $$,
  'P0001', 'catch meter is not full',
  'cannot summon before the meter is full'
);

-- Wrong answer: no progress.
select is(
  (select advance_tracking((select kid from fx), (select id from qs where n = 32)) ->> 'progress')::int, 0,
  'a wrong answer does not fill the meter'
);

-- 29 right answers, then the same question again.
select is(
  (select max((advance_tracking((select kid from fx), id) ->> 'progress')::int) from qs where n <= 29), 29,
  'each right answer adds 1'
);
select is(
  (select advance_tracking((select kid from fx), (select id from qs where n = 1)) ->> 'progress')::int, 29,
  'the same question never counts twice'
);
select is(
  (select max((advance_tracking((select kid from fx), id) ->> 'progress')::int) from qs where n in (30, 31)), 30,
  'the meter stops at 30'
);

select throws_ok(
  $$ select advance_tracking((select other_kid from fx), (select id from qs where n = 1)) $$,
  'P0001', 'not authorized',
  'a player cannot fill another player''s meter'
);

create temp table summoned as select summon_tracked_curio((select kid from fx), 'ledgers_heart') as c;
grant select on summoned to authenticated;

select is(
  (select array[c ->> 'monster_id', c ->> 'tracked', c ->> 'attempts_left'] from summoned),
  array['embrak', 'true', '3'],
  'a full meter summons the tracked curio with 3 tries'
);
select ok(
  (select (c ->> 'level')::int between 9 and 11 from summoned),
  'its level is the active curio''s level give or take 1'
);

reset role;

select is(
  (select array[(item_bar -> 0)::text, (item_bar -> 1 ->> 'n'), coalesce(active_tracking, 'none'), pending_wild_curio ->> 'monster_id']
   from user_battle_state where user_id = (select kid from fx)),
  array['null', '3', 'none', 'embrak'],
  'the used-up scroll leaves its slot (trash stays), tracking stops, and the curio is waiting on the map'
);
select is(
  (select quantity from player_inventory where app_user_id = (select kid from fx) and item_key = 'tracking_scroll_embrak'), 0,
  'the scroll is used up'
);

select * from finish();
rollback;
