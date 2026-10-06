-- pgTAP tests for 20261006070000_offline_main_quests.sql: the feature flag gate, the
-- login-required answer key, and sync_offline_main_quest's re-grading, one-time reward and
-- claimed-time window.

begin;
create extension if not exists pgtap;
select plan(22);

-- ── Fixture ──────────────────────────────────────────────────────────────────
create temp table fx as
select
  gen_random_uuid() as auth_a, 'pgtap_offq_a_' || substr(md5(random()::text), 1, 8) as user_a,
  gen_random_uuid() as auth_b, 'pgtap_offq_b_' || substr(md5(random()::text), 1, 8) as user_b,
  (now() at time zone 'Asia/Manila')::date as today;

insert into user_identity_map (auth_uid, app_user_id)
select auth_a, user_a from fx
union all
select auth_b, user_b from fx;

insert into content_weeks (grade, week_starting_date) values (5, '2030-02-03');
insert into content_days (content_week_id, weekday)
select id, d from content_weeks, unnest(array['Monday', 'Tuesday']) d
where grade = 5 and week_starting_date = '2030-02-03';
insert into content_quizzes (content_day_id, subject)
select id, 'Mathematics' from content_days
where weekday in ('Monday', 'Tuesday')
  and content_week_id = (select id from content_weeks where grade = 5 and week_starting_date = '2030-02-03');
insert into content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select q.id, p.prompt, '["3","4","5"]'::jsonb, p.answer, p.ord
from content_quizzes q
join content_days d on d.id = q.content_day_id
cross join (values ('2+2?', '4', 1), ('2+3?', '5', 2)) as p(prompt, answer, ord)
where d.content_week_id = (select id from content_weeks where grade = 5 and week_starting_date = '2030-02-03');

alter table fx add column week_id uuid, add column mon_q1 uuid, add column mon_q2 uuid, add column tue_q1 uuid, add column tue_q2 uuid;
update fx set
  week_id = (select id from content_weeks where grade = 5 and week_starting_date = '2030-02-03'),
  mon_q1 = (select cq.id from content_questions cq join content_quizzes q on q.id = cq.content_quiz_id join content_days d on d.id = q.content_day_id
            where d.weekday = 'Monday' and cq.prompt = '2+2?' and d.content_week_id = (select id from content_weeks where grade = 5 and week_starting_date = '2030-02-03')),
  mon_q2 = (select cq.id from content_questions cq join content_quizzes q on q.id = cq.content_quiz_id join content_days d on d.id = q.content_day_id
            where d.weekday = 'Monday' and cq.prompt = '2+3?' and d.content_week_id = (select id from content_weeks where grade = 5 and week_starting_date = '2030-02-03')),
  tue_q1 = (select cq.id from content_questions cq join content_quizzes q on q.id = cq.content_quiz_id join content_days d on d.id = q.content_day_id
            where d.weekday = 'Tuesday' and cq.prompt = '2+2?' and d.content_week_id = (select id from content_weeks where grade = 5 and week_starting_date = '2030-02-03')),
  tue_q2 = (select cq.id from content_questions cq join content_quizzes q on q.id = cq.content_quiz_id join content_days d on d.id = q.content_day_id
            where d.weekday = 'Tuesday' and cq.prompt = '2+3?' and d.content_week_id = (select id from content_weeks where grade = 5 and week_starting_date = '2030-02-03'));

update feature_flags set mode = 'allowlist', allowlist = array[(select user_a from fx)]
where key = 'offline_main_quests';

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

create or replace function pg_temp.answers(q1 uuid, a1 text, q2 uuid, a2 text) returns jsonb as $$
  select jsonb_build_array(
    jsonb_build_object('question_id', q1, 'selected', a1),
    jsonb_build_object('question_id', q2, 'selected', a2));
$$ language sql;

-- ── Flags and answer key ─────────────────────────────────────────────────────

select ok(
  not has_function_privilege('anon', 'public.get_answer_key(text, uuid[])', 'execute'),
  'anon cannot call get_answer_key'
);
select ok(
  not has_function_privilege('authenticated', 'public.feature_enabled_for(text, text)', 'execute'),
  'clients cannot probe other accounts'' flags directly'
);

select pg_temp.login_as(auth_b) from fx;
select is(public.my_feature_flags((select user_b from fx)), '{}'::text[], 'a kid not on the allowlist has no flags');
select throws_ok(
  format('select get_answer_key(%L, array[%L]::uuid[])', (select user_b from fx), (select week_id from fx)),
  'P0001', 'offline main quests are not enabled for this account',
  'the answer key needs the flag'
);
select throws_ok(
  format('select get_answer_key(%L, array[%L]::uuid[])', (select user_a from fx), (select week_id from fx)),
  'P0001', 'not authorized',
  'a kid cannot fetch the key as someone else'
);

select pg_temp.login_as(auth_a) from fx;
select is(public.my_feature_flags((select user_a from fx)), '{offline_main_quests}'::text[], 'an allowlisted kid sees the flag');
select is(
  public.get_answer_key((select user_a from fx), array[(select week_id from fx)]),
  (select jsonb_build_object(mon_q1, '4', mon_q2, '5', tue_q1, '4', tue_q2, '5') from fx),
  'the key maps every question of the week to its answer'
);
select throws_ok(
  format('select get_answer_key(%L, %L::uuid[])', (select user_a from fx),
    (select array_agg(gen_random_uuid())::text from generate_series(1, 21))),
  'P0001', 'too many weeks requested (max 20)',
  'the key is capped at 20 weeks per call'
);

-- ── Sync: perfect score pays once ────────────────────────────────────────────

create temp table r1 as
select public.sync_offline_main_quest(user_a, '00000000-0000-0000-0000-0000000000a1', week_id, 'Monday', 'Mathematics',
  pg_temp.answers(mon_q1, '4', mon_q2, '5'), now()) as res from fx;

select is((select (res ->> 'is_perfect')::boolean from r1), true, 'the server re-grades the queued answers');
select is((select (res ->> 'gold')::int from r1), 50, 'a first-attempt perfect pays 50 gold');
select is(
  (select gold from player_progress where user_id = (select user_a from fx)), 50,
  'the gold lands in player_progress'
);
select ok(
  (select mastered_quizzes ? 'Monday_Mathematics' from player_weekly_journal
   where user_id = (select user_a from fx) and content_week_id = (select week_id from fx)),
  'the quest is marked mastered for the week'
);

select is(
  (select (public.sync_offline_main_quest(user_a, '00000000-0000-0000-0000-0000000000a1', week_id, 'Monday', 'Mathematics',
    pg_temp.answers(mon_q1, '4', mon_q2, '5'), now()) ->> 'replayed')::boolean from fx),
  true,
  'retrying the same entry id returns the stored result'
);
select is(
  (select gold from player_progress where user_id = (select user_a from fx)), 50,
  'the retry pays nothing more'
);
select is(
  (select attempts_used from main_quest_daily_attempts
   where user_id = (select user_a from fx) and weekday = 'Monday' and attempt_date = (select today from fx)),
  1,
  'the retry does not use up another daily attempt'
);

select is(
  (select (public.sync_offline_main_quest(user_a, '00000000-0000-0000-0000-0000000000a2', week_id, 'Monday', 'Mathematics',
    pg_temp.answers(mon_q1, '4', mon_q2, '5'), now()) ->> 'already_mastered')::boolean from fx),
  true,
  'a second perfect entry for a mastered quest is recognised'
);
select is(
  (select gold from player_progress where user_id = (select user_a from fx)), 50,
  'and pays nothing again'
);

-- ── Sync: a miss, played three days ago ──────────────────────────────────────

create temp table r2 as
select public.sync_offline_main_quest(user_a, '00000000-0000-0000-0000-0000000000b1', week_id, 'Tuesday', 'Mathematics',
  pg_temp.answers(tue_q1, '4', tue_q2, '3'), now() - interval '3 days') as res from fx;

select is((select (res ->> 'correct_count')::int from r2), 1, 'a wrong answer is graded wrong, whatever the phone said');
select is(
  (select (res ->> 'played_on')::date from r2),
  ((now() - interval '3 days') at time zone 'Asia/Manila')::date,
  'a claimed time inside the window counts against the day it was played'
);
select is(
  (select (quiz_attempts ->> 'Tuesday_Mathematics')::int from player_weekly_journal
   where user_id = (select user_a from fx) and content_week_id = (select week_id from fx)),
  1,
  'the miss counts as an attempt for reward scaling'
);

select is(
  (select (public.sync_offline_main_quest(user_a, '00000000-0000-0000-0000-0000000000b2', week_id, 'Tuesday', 'Mathematics',
    pg_temp.answers(tue_q1, '4', tue_q2, '3'), now() + interval '2 days') ->> 'played_on')::date from fx),
  (select today from fx),
  'a claimed time in the future is replaced by server time'
);

select throws_ok(
  format('select sync_offline_main_quest(%L, gen_random_uuid(), %L, %L, %L, %L::jsonb, now())',
    (select user_b from fx), (select week_id from fx), 'Monday', 'Mathematics', '[]'),
  'P0001', 'not authorized',
  'a kid cannot sync for someone else'
);

select * from finish();
rollback;
