-- pgTAP tests for 20261101050000_forgetful_on_the_map.sql: meet_forgetful pays 2 gold for
-- "forget", 10 gold + 15 EXP for remembering a question right (and marks it right), nothing for a
-- wrong try, at most 2 paid meetings a day, once per entry id, only with the switch on, never in
-- town, and never for someone else.

begin;
create extension if not exists pgtap;
select plan(14);

create temp table fx as
select gen_random_uuid() as kid_auth, 'pgtap_forgetful_kid' as kid,
       gen_random_uuid() as other_auth, 'pgtap_forgetful_other' as other;
grant select on fx to authenticated;

insert into user_identity_map (auth_uid, app_user_id) select kid_auth, kid from fx;
insert into user_identity_map (auth_uid, app_user_id) select other_auth, other from fx;
insert into player_progress (user_id, gold, xp, level) select kid, 0, 0, 1 from fx
on conflict (user_id) do update set gold = 0, xp = 0, level = 1;

insert into content_weeks (grade, week_starting_date) values (4, '2030-07-07');
insert into content_days (content_week_id, weekday)
select id, 'Monday' from content_weeks where grade = 4 and week_starting_date = '2030-07-07';
insert into content_quizzes (content_day_id, subject)
select d.id, 'Mathematics' from content_days d
join content_weeks w on w.id = d.content_week_id
where w.grade = 4 and w.week_starting_date = '2030-07-07';
insert into content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select q.id, 'q' || g, '["a","b"]'::jsonb, 'a', g
from content_quizzes q
join content_days d on d.id = q.content_day_id
join content_weeks w on w.id = d.content_week_id
cross join generate_series(1, 3) g
where w.grade = 4 and w.week_starting_date = '2030-07-07';

create temp table qs as
select cq.id, cq.sort_order as n from content_questions cq
join content_quizzes qz on qz.id = cq.content_quiz_id
join content_days d on d.id = qz.content_day_id
join content_weeks w on w.id = d.content_week_id
where w.grade = 4 and w.week_starting_date = '2030-07-07';
grant select on qs to authenticated;

-- The kid got question 1 wrong before.
insert into player_question_attempts (user_id, content_question_id, correct)
select kid, (select id from qs where n = 1), false from fx;

create temp table ids as select n, gen_random_uuid() as id from generate_series(1, 6) n;
grant select on ids to authenticated;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

create or replace function pg_temp.meet(p_n int, p_choice text, p_q int default null, p_sel text default null, p_region text default 'cinderreach') returns jsonb as $$
  select public.meet_forgetful((select kid from fx), (select id from ids where n = p_n), p_region, p_choice,
    (select id from qs where n = p_q), p_sel);
$$ language sql;

select pg_temp.login_as(kid_auth) from fx;

select throws_ok($$ select pg_temp.meet(1, 'forget') $$, 'P0001', 'forgetful is not on for this player', 'nothing happens with the switch off');

reset role;
update feature_flags set mode = 'allowlist', allowlist = array[(select kid from fx)] where key = 'forgetful';
select pg_temp.login_as(kid_auth) from fx;

select throws_ok($$ select pg_temp.meet(1, 'forget', null, null, 'town') $$, 'P0001', 'the Forgetful never come here: town', 'never in town');

-- Remembering question 1 right.
select is(pg_temp.meet(1, 'remember', 1, 'a') ->> 'status', 'remembered', 'a right answer remembers');
select is((select array[gold, xp] from player_progress where user_id = (select kid from fx)), array[10, 15], 'remembering pays 10 gold and 15 EXP');
select is((select correct from player_question_attempts where user_id = (select kid from fx) and content_question_id = (select id from qs where n = 1)), true, 'the question counts as right now');

-- The same meeting again pays nothing more.
select is(pg_temp.meet(1, 'remember', 1, 'a') ->> 'replayed', 'true', 'a retried call is a replay');
select is((select gold from player_progress where user_id = (select kid from fx)), 10, 'and pays once');

-- A wrong try: no penalty, nothing paid (still uses one of the day''s two meetings).
select is(pg_temp.meet(2, 'remember', 2, 'b') ->> 'status', 'wrong', 'a wrong answer is just wrong');
select is((select gold from player_progress where user_id = (select kid from fx)), 10, 'a wrong try pays nothing and takes nothing');

-- Two meetings used: the third pays nothing.
select is(pg_temp.meet(3, 'forget') ->> 'status', 'tired', 'a third meeting in a day pays nothing');
select is((select gold from player_progress where user_id = (select kid from fx)), 10, 'no gold for it');

-- "Forget it" on a fresh day pays 2.
reset role;
update forgetful_meetings set met_on = met_on - 1 where user_id = (select kid from fx);
select pg_temp.login_as(kid_auth) from fx;
select is(pg_temp.meet(4, 'forget') ->> 'gold', '2', 'forgetting pays 2 gold');

select throws_ok(
  format('select public.meet_forgetful(%L, gen_random_uuid(), %L, %L)', (select other from fx), 'cinderreach', 'forget'),
  'P0001', 'not authorized', 'a kid cannot meet the Forgetful for someone else');

select ok(not has_function_privilege('anon', 'public.meet_forgetful(text, uuid, text, text, uuid, text)', 'execute'), 'anon cannot call it');

select * from finish();
