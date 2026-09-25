-- pgTAP tests for daily_checklist_quest_done: the Main Quest requirement behind the daily
-- checklist bonus.
--
-- Regression coverage for the "finished every to-do but couldn't claim the reward" bug that hit
-- every Friday: the server demanded a `Friday_<subject>` mastered-quiz key for each subject the
-- content holds on Friday, but the app collapses Friday into a single "Weekly Review" quest, so
-- the only Friday key a student can ever earn is `Friday_Weekly Review`.
--
-- The rule lives in its own function taking the weekday as an argument precisely so this can be
-- exercised for 'Friday' regardless of which day CI runs on.

begin;
create extension if not exists pgtap;
select plan(11);

-- Week A: Monday + Friday content, mirroring the real format where Friday repeats Mon-Thu subjects.
-- Week B: Friday content only (nothing to review). Distinct past Sundays so they never collide with
-- real fixtures; grade differs so (grade, week_starting_date) stays unique regardless.
create temp table fx as
select
  gen_random_uuid() as week_a, gen_random_uuid() as mon_a, gen_random_uuid() as fri_a,
  gen_random_uuid() as quiz_mon_a, gen_random_uuid() as quiz_fri_a,
  gen_random_uuid() as week_b, gen_random_uuid() as fri_b, gen_random_uuid() as quiz_fri_b,
  (public.current_week_start() - 700)::date as sunday_a,
  (public.current_week_start() - 707)::date as sunday_b;

insert into content_weeks (id, grade, week_starting_date, status)
select week_a, 5, sunday_a, 'published' from fx
union all select week_b, 5, sunday_b, 'published' from fx;

insert into content_days (id, content_week_id, weekday)
select mon_a, week_a, 'Monday' from fx
union all select fri_a, week_a, 'Friday' from fx
union all select fri_b, week_b, 'Friday' from fx;

insert into content_quizzes (id, content_day_id, subject)
select quiz_mon_a, mon_a, 'English' from fx
union all select quiz_fri_a, fri_a, 'English' from fx
union all select quiz_fri_b, fri_b, 'English' from fx;

insert into content_questions (content_quiz_id, prompt, options, correct_answer)
select q, 'placeholder question', '["a","b"]'::jsonb, 'a'
from fx, unnest(array[quiz_mon_a, quiz_fri_a, quiz_fri_b]) as q;

-- ── Friday: one combined Weekly Review quest ──────────────────────────────────

select is(
  daily_checklist_quest_done((select week_a from fx), 'Friday', '["Friday_Weekly Review"]'::jsonb),
  true,
  'Friday is done once the Weekly Review is mastered, even though Friday content is stored per subject'
);

select is(
  daily_checklist_quest_done((select week_a from fx), 'Friday', '[]'::jsonb),
  false,
  'Friday is not done before the Weekly Review is mastered'
);

select is(
  daily_checklist_quest_done((select week_a from fx), 'Friday', null),
  false,
  'a missing mastered_quizzes value (no journal row yet) leaves Friday not done'
);

select is(
  daily_checklist_quest_done((select week_a from fx), 'Friday', '["Monday_English"]'::jsonb),
  false,
  'mastering earlier days'' quests does not satisfy Friday''s Weekly Review'
);

select is(
  daily_checklist_quest_done((select week_a from fx), 'Friday', '["Friday_English"]'::jsonb),
  false,
  'a per-subject Friday key is not what the Weekly Review records, so it does not count'
);

select is(
  daily_checklist_quest_done((select week_b from fx), 'Friday', '[]'::jsonb),
  true,
  'no Mon-Thu content to review: Friday counts as done, matching the client''s "no quest scheduled today"'
);

-- ── Monday-Thursday: unchanged per-subject rule ───────────────────────────────

select is(
  daily_checklist_quest_done((select week_a from fx), 'Monday', '["Monday_English"]'::jsonb),
  true,
  'Monday is done once that day''s subject is mastered'
);

select is(
  daily_checklist_quest_done((select week_a from fx), 'Monday', '[]'::jsonb),
  false,
  'Monday is not done while that day''s subject is unmastered'
);

select is(
  daily_checklist_quest_done((select week_a from fx), 'Monday', '["Friday_Weekly Review"]'::jsonb),
  false,
  'the Friday Weekly Review key does not satisfy a weekday quest'
);

select is(
  daily_checklist_quest_done((select week_a from fx), 'Tuesday', '[]'::jsonb),
  true,
  'a weekday with nothing scheduled counts as done'
);

select is(
  daily_checklist_quest_done(null, 'Friday', null),
  true,
  'no content week at all counts as done (the journal requirement is what blocks a premature claim)'
);

select * from finish();
rollback;
