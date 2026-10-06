-- Canonical subject names on main quest content, and a rule that keeps them.
--
-- Root cause: the weeks of 2026-07-12 and 2026-07-19 (Grades 2 and 5) were
-- created on 2026-08-11 by the one-time move from the old per-student
-- weekly_packages into content_weeks. Those packages were hand-written before
-- the subject list was standardised, and the move copied their names as-is:
-- "Math", "MAKABANSA", "Social Studies", "Values Education", "EPP/TLE". Every
-- later week uses the official names (lib/promptBuilder.ts
-- ALL_SUBJECTS_BY_GRADE). Because reports group by subject name, one subject
-- showed up twice for parents (e.g. "Math" and "Mathematics").
--
-- Nothing on the save path checked names: admin_set_content_week accepts any
-- subject, and lib/subjectSchedule.ts getScheduledDay files an unknown one
-- under Friday instead of failing. So:
-- 1. Rename the legacy subjects in place. EPP/TLE becomes "EPP (ICT)": every
--    one of its questions is about browsers, search engines, netiquette and
--    passwords. Skipped if the day already has a quiz under the new name
--    (none do in production; the guard keeps this safe to re-run).
-- 2. Rewrite saved progress keys of the form "<Weekday>_<Subject>" in
--    player_weekly_journal (mastered_quizzes, quiz_attempts) so those weeks'
--    mastery and attempt counts follow the rename. Attempt counts that land on
--    the same key are added together; mastered keys are de-duplicated.
-- 3. Add a CHECK constraint so content_quizzes.subject must be an official
--    subject (the union of every grade's list) or "Weekly Review", the
--    Friday review quest. Adding a new subject now needs a migration that
--    widens this list, alongside ALL_SUBJECTS_BY_GRADE.
--
-- main_quest_daily_attempts only holds legitimate "Weekly Review" rows for
-- these names (it started after these weeks), so it isn't touched.

-- (1) Content ----------------------------------------------------------------

with rename(old_name, new_name) as (values
  ('Math', 'Mathematics'),
  ('MAKABANSA', 'Makabansa'),
  ('Social Studies', 'Araling Panlipunan'),
  ('Values Education', 'GMRC'),
  ('EPP/TLE', 'EPP (ICT)')
)
update public.content_quizzes q
set subject = r.new_name
from rename r
where q.subject = r.old_name
  and not exists (
    select 1 from public.content_quizzes other
    where other.content_day_id = q.content_day_id and other.subject = r.new_name
  );

-- (2) Saved progress keys ----------------------------------------------------

with rename(old_name, new_name) as (values
  ('Math', 'Mathematics'),
  ('MAKABANSA', 'Makabansa'),
  ('Social Studies', 'Araling Panlipunan'),
  ('Values Education', 'GMRC'),
  ('EPP/TLE', 'EPP (ICT)')
),
affected as (
  select j.user_id, j.content_week_id
  from public.player_weekly_journal j
  where exists (
      select 1 from jsonb_array_elements_text(coalesce(j.mastered_quizzes, '[]'::jsonb)) e
      join rename r on substr(e, strpos(e, '_') + 1) = r.old_name
    )
    or exists (
      select 1 from jsonb_object_keys(coalesce(j.quiz_attempts, '{}'::jsonb)) k
      join rename r on substr(k, strpos(k, '_') + 1) = r.old_name
    )
)
update public.player_weekly_journal j
set
  mastered_quizzes = (
    select coalesce(jsonb_agg(distinct key), '[]'::jsonb)
    from (
      select coalesce(split_part(e, '_', 1) || '_' || r.new_name, e) as key
      from jsonb_array_elements_text(coalesce(j.mastered_quizzes, '[]'::jsonb)) e
      left join rename r on substr(e, strpos(e, '_') + 1) = r.old_name
    ) keys
  ),
  quiz_attempts = (
    select coalesce(jsonb_object_agg(key, total), '{}'::jsonb)
    from (
      select coalesce(split_part(kv.key, '_', 1) || '_' || r.new_name, kv.key) as key,
             sum((kv.value)::numeric) as total
      from jsonb_each_text(coalesce(j.quiz_attempts, '{}'::jsonb)) kv
      left join rename r on substr(kv.key, strpos(kv.key, '_') + 1) = r.old_name
      group by 1
    ) counts
  )
from affected a
where j.user_id = a.user_id and j.content_week_id = a.content_week_id;

-- (3) Only official subject names from now on --------------------------------

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'content_quizzes_subject_known' and conrelid = 'public.content_quizzes'::regclass
  ) then
    alter table only public.content_quizzes
      add constraint content_quizzes_subject_known check (subject in (
        'English', 'Mathematics', 'Filipino', 'Science', 'GMRC', 'Makabansa', 'Computer',
        'Araling Panlipunan', 'EPP (ICT)', 'EPP (AFA/FCS/IA)', 'MAPEH',
        'Weekly Review'
      ));
  end if;
end $$;
