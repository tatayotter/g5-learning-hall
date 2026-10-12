-- pgTAP tests for 20261006090000_offline_map.sql: sync_offline_map's re-grading, curio EXP
-- as a delta on the player's own curio only, the checklist credit, trash clamping, position,
-- and one-time apply per entry id.

begin;
create extension if not exists pgtap;
select plan(19);

-- ── Fixture ──────────────────────────────────────────────────────────────────
create temp table fx as
select
  gen_random_uuid() as auth_a, 'pgtap_offmap_a_' || substr(md5(random()::text), 1, 8) as user_a,
  gen_random_uuid() as auth_b, 'pgtap_offmap_b_' || substr(md5(random()::text), 1, 8) as user_b,
  (now() at time zone 'Asia/Manila')::date as today;

insert into user_identity_map (auth_uid, app_user_id)
select auth_a, user_a from fx
union all
select auth_b, user_b from fx;

insert into content_weeks (grade, week_starting_date) values (5, '2030-03-03');
insert into content_days (content_week_id, weekday)
select id, 'Monday' from content_weeks where grade = 5 and week_starting_date = '2030-03-03';
insert into content_quizzes (content_day_id, subject)
select d.id, 'Mathematics' from content_days d
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-03-03';
insert into content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select q.id, '2+2?', '["3","4","5"]'::jsonb, '4', 1
from content_quizzes q
join content_days d on d.id = q.content_day_id
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-03-03';

alter table fx add column q uuid, add column curio_a uuid, add column curio_b uuid;
update fx set q = (
  select cq.id from content_questions cq
  join content_quizzes qz on qz.id = cq.content_quiz_id
  join content_days d on d.id = qz.content_day_id
  join content_weeks w on w.id = d.content_week_id
  where w.grade = 5 and w.week_starting_date = '2030-03-03');

insert into user_monsters (user_id, monster_id, monster_exp, monster_level, slot)
select user_a, 'shadrak', 95, 1, 1 from fx
union all
select user_b, 'shadrak', 0, 1, 1 from fx;
update fx set
  curio_a = (select id from user_monsters where user_id = fx.user_a),
  curio_b = (select id from user_monsters where user_id = fx.user_b);

insert into user_battle_state (user_id, questions_since_wild_encounter, map_x, map_y)
select user_a, 2, 5, 5 from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

select ok(
  not has_function_privilege('anon', 'public.sync_offline_map(text, uuid, uuid, uuid, text, integer, integer, integer, integer, timestamptz)', 'execute'),
  'anon cannot call sync_offline_map'
);

select pg_temp.login_as(auth_a) from fx;

-- ── A correct scroll ─────────────────────────────────────────────────────────
create temp table s1 as
select public.sync_offline_map(user_a, '00000000-0000-0000-0000-0000000000d1', curio_a, q, '4', 0, 0, null, null, now() - interval '1 hour') as res
from fx;

select is((select (res ->> 'correct')::boolean from s1), true, 'the server re-grades a correct scroll answer');
select is(
  (select array[monster_exp, monster_level] from user_monsters where id = (select curio_a from fx)),
  array[105, 2],
  'a correct scroll adds 10 EXP to the curio and levels it at 100'
);
select is(
  (select last_wild_encounter_win from user_battle_state where user_id = (select user_a from fx)),
  (select today from fx),
  'a correct scroll gives the day''s training-map checklist credit'
);
select is(
  (select questions_since_wild_encounter from user_battle_state where user_id = (select user_a from fx)),
  3,
  'a correct scroll counts toward the wild-encounter pity timer'
);
select ok(
  exists (select 1 from user_completed_questions where user_id = (select user_a from fx)
          and quest_type = 'monster_arena' and question_id = (select q from fx)),
  'the question is marked done for the Arena'
);
select is(
  (select correct from player_question_attempts where user_id = (select user_a from fx) and content_question_id = (select q from fx)),
  true,
  'the attempt is recorded like grade_content_question'
);

-- ── Replay ───────────────────────────────────────────────────────────────────
select is(
  (select (public.sync_offline_map(user_a, '00000000-0000-0000-0000-0000000000d1', curio_a, q, '4', 0, 0, null, null, now()) ->> 'replayed')::boolean from fx),
  true,
  'retrying the same entry returns the stored result'
);
select is(
  (select monster_exp from user_monsters where id = (select curio_a from fx)),
  105,
  'a retried entry adds no EXP'
);

-- ── A wrong answer, and a curio that isn't yours ─────────────────────────────
select is(
  (select (public.sync_offline_map(user_a, gen_random_uuid(), curio_a, q, '3', 0, 0, null, null, now()) ->> 'exp')::int from fx),
  0,
  'a wrong answer earns no EXP, whatever the phone said'
);
select is(
  (select correct from player_question_attempts where user_id = (select user_a from fx) and content_question_id = (select q from fx)),
  false,
  'the wrong attempt is recorded'
);
select is(
  (select (public.sync_offline_map(user_a, gen_random_uuid(), curio_b, q, '4', 0, 0, null, null, now()) ->> 'exp')::int from fx),
  0,
  'a correct answer cannot level another kid''s curio'
);
select is(
  (select monster_exp from user_monsters where id = (select curio_b from fx)),
  0,
  'the other kid''s curio is untouched'
);

-- ── Trash and position ───────────────────────────────────────────────────────
create temp table gold_before as
select coalesce((select gold from player_progress where user_id = (select user_a from fx)), 0) as gold;

select is(
  (select (public.sync_offline_map(user_a, gen_random_uuid(), null, null, null, 3, 999, null, null, now()) ->> 'gold')::int from fx),
  50,
  'recycler gold is clamped'
);
select is(
  (select gold from player_progress where user_id = (select user_a from fx)),
  (select gold + 50 from gold_before),
  'the clamped trash gold lands in player_progress'
);
select is(
  (select array[trash_collected_total, trash_gold_earned_total] from player_progress where user_id = (select user_a from fx)),
  array[3, 50],
  'the trash counters count what was synced'
);

select public.sync_offline_map(user_a, gen_random_uuid(), null, null, null, 0, 0, 12, 7, now()) from fx;
select is(
  (select array[map_x, map_y] from user_battle_state where user_id = (select user_a from fx)),
  array[12, 7],
  'the last tile stood on is saved'
);

select is(
  (select count(*)::int from player_events where user_id = (select user_a from fx) and event_type = 'map_offline'),
  5,
  'each synced entry is recorded once'
);

-- ── Someone else ─────────────────────────────────────────────────────────────
select throws_ok(
  format('select sync_offline_map(%L, gen_random_uuid(), null, null, null, 1, 1, null, null, now())', (select user_b from fx)),
  'P0001', 'not authorized',
  'a kid cannot sync map play for someone else'
);

select * from finish();
rollback;
