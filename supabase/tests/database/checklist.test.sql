-- pgTAP tests for the daily checklist bonus: identity enforcement, the move off the legacy
-- guild_last_played JSON onto guild_sessions, and the old 4-arg signature being a true
-- no-op wrapper around the server-derived state (not a second source of truth a client could
-- steer by sending a different date/weekday/grade).
--
-- Fixture builds a minimal-but-real content chain (content_weeks -> content_days ->
-- content_quizzes -> content_questions) so claim_daily_checklist_bonus's journal/quest lookup
-- has something real to find, deliberately scheduling the one quiz on a weekday that is never
-- "today" so quest_done is satisfied without needing to fabricate a mastered-quiz state.

begin;
create extension if not exists pgtap;
select plan(10);

create temp table fx as
select
  gen_random_uuid() as auth_a, 'pgtap_checklist_' || substr(md5(random()::text), 1, 8) as user_a,
  gen_random_uuid() as auth_b, 'pgtap_checklist_' || substr(md5(random()::text), 1, 8) as user_b,
  (now() at time zone 'Asia/Manila')::date as today,
  trim(to_char(now() at time zone 'Asia/Manila', 'Day')) as today_name,
  public.current_week_start() as week_start;

insert into user_identity_map (auth_uid, app_user_id)
select auth_a, user_a from fx union all select auth_b, user_b from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- Minimal content chain: one quiz, scheduled on whichever weekday is NOT today, so
-- quest_done's "nothing scheduled today" branch is trivially satisfied.
create temp table content_fx as
select gen_random_uuid() as week_id, gen_random_uuid() as day_id, gen_random_uuid() as quiz_id,
  (case when (select today_name from fx) = 'Monday' then 'Tuesday' else 'Monday' end) as other_weekday;

insert into content_weeks (id, grade, week_starting_date, status)
select week_id, 5, (select week_start from fx), 'published' from content_fx;
insert into content_days (id, content_week_id, weekday)
select day_id, week_id, other_weekday from content_fx;
insert into content_quizzes (id, content_day_id, subject)
select quiz_id, day_id, 'TestSubject' from content_fx;
insert into content_questions (content_quiz_id, prompt, options, correct_answer)
select quiz_id, 'placeholder question', '["a","b"]'::jsonb, 'a' from content_fx;

-- journal + main quest + wild-battle all satisfied; only the guild requirement is exercised below.
insert into player_weekly_journal (user_id, content_week_id, journal_logs)
select user_a, week_id, jsonb_build_object(today::text, 'did some stuff') from fx, content_fx;
insert into user_battle_state (user_id, last_wild_encounter_win)
select user_a, today from fx;

select pg_temp.login_as(auth_a) from fx;

-- ── Identity ───────────────────────────────────────────────────────────────

select throws_ok(
  format('select claim_daily_checklist_bonus(%L)', (select user_b from fx)),
  'P0001', 'not authorized',
  'a student cannot claim the checklist bonus for a different student'
);

-- ── Only the guild requirement is outstanding: legacy JSON says done, real table says not ──

update user_battle_state
set guild_last_played = jsonb_build_object('lorekeeper', today::text, 'spellcaster', today::text,
  'number_realm', today::text, 'logic_labyrinth', today::text, 'lexicon_arena', today::text)
from fx where user_battle_state.user_id = fx.user_a;

select is(
  (select (claim_daily_checklist_bonus((select user_a from fx)) ->> 'granted')::boolean),
  false,
  'legacy JSON showing all 5 guilds done does not grant the bonus — guild_sessions is the real source now'
);

-- ── Now genuinely play all 5 guilds ────────────────────────────────────────

insert into guild_sessions (user_id, guild_key, played_on)
select user_a, g, today from fx, unnest(array['lorekeeper','spellcaster','number_realm','logic_labyrinth','lexicon_arena']) g;

select is(
  (select (claim_daily_checklist_bonus((select user_a from fx)) ->> 'granted')::boolean),
  true,
  'with journal, quest, battle and all 5 real guild_sessions rows, the bonus grants'
);

select is(
  (select streak_day from daily_checklist_claims where app_user_id = (select user_a from fx)),
  1,
  'first claim starts the streak at 1'
);
select is(
  (select gold_awarded from daily_checklist_claims where app_user_id = (select user_a from fx)),
  50,
  'day-1 streak gold matches the ladder (50)'
);

select is(
  (select (claim_daily_checklist_bonus((select user_a from fx)) ->> 'granted')::boolean),
  false,
  'the same day cannot be claimed twice'
);

-- Old 4-arg signature, called with a deliberately wrong date/weekday/grade: if it used those
-- arguments it would try to insert a NEW claim for 2020-01-01 (no conflict with today's real
-- claim) and return granted=true. It must instead reflect the real "already claimed today"
-- state, proving the arguments are ignored.
select is(
  (select (claim_daily_checklist_bonus((select user_a from fx), '2020-01-01'::date, 'Sunday', 99) ->> 'granted')::boolean),
  false,
  'the legacy 4-arg wrapper ignores a forged date/weekday/grade and reflects real server state'
);

-- ── get_daily_checklist_streak: identity + correct preview after claiming ────

select throws_ok(
  format('select get_daily_checklist_streak(%L, current_date)', (select user_b from fx)),
  'P0001', 'not authorized',
  'a student cannot read another student''s streak preview'
);

select is(
  (select (get_daily_checklist_streak((select user_a from fx), '1999-01-01'::date) ->> 'claimedToday')::boolean),
  true,
  'the streak preview reflects real state even when given a bogus p_today'
);
select is(
  (select (get_daily_checklist_streak((select user_a from fx), current_date) ->> 'currentStreak')::int),
  1,
  'the streak preview shows the real current streak'
);

select * from finish();
rollback;
