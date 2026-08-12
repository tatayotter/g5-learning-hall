-- admin_publish_draft_questions/admin_publish_draft_summary were the only
-- two functions left writing to weekly_packages.package_data via the old
-- grade_content_owners "reference player" model -- dead since Wave 3 moved
-- content reads to content_weeks/content_days/content_quizzes/
-- content_questions (see app/api/content/route.ts). Not a student-facing
-- bug (nothing reads package_data anymore) but a silent no-op for an admin
-- who still uses this draft-approval flow instead of the bulk paste-box:
-- clicking "publish" appeared to succeed and marked the draft as published,
-- but the approved question/summary never actually reached a student.
--
-- Rewritten to insert directly into the same content_weeks/content_days/
-- content_quizzes/content_questions rows admin_set_content_week uses,
-- dropping the grade_content_owners lookup entirely (Wave 3 made content
-- grade-keyed directly, no "owner" indirection needed).

DROP FUNCTION IF EXISTS public.admin_publish_draft_questions(text, uuid[], integer, text, text, date);

CREATE OR REPLACE FUNCTION public.admin_publish_draft_questions(p_passcode text, p_ids uuid[], p_grade integer, p_day text, p_subject text, p_week_starting_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_week_id uuid;
  v_day_id uuid;
  v_quiz_id uuid;
  v_mismatched_count int;
  v_next_sort_order int;
  v_draft record;
begin
  perform public.check_admin_passcode(p_passcode);

  if p_day not in ('Monday','Tuesday','Wednesday','Thursday','Friday') then
    raise exception 'invalid day %: must be a weekday name', p_day;
  end if;

  select count(*) into v_mismatched_count
  from public.draft_questions
  where id = any(p_ids) and grade <> p_grade;
  if v_mismatched_count > 0 then
    raise exception 'one or more draft ids do not belong to grade %', p_grade;
  end if;

  if not exists (
    select 1 from public.draft_questions
    where id = any(p_ids) and grade = p_grade and status = 'approved'
  ) then
    raise exception 'no approved drafts found for the given ids';
  end if;

  insert into public.content_weeks (grade, week_starting_date)
  values (p_grade, p_week_starting_date)
  on conflict (grade, week_starting_date) do update set grade = excluded.grade
  returning id into v_week_id;

  insert into public.content_days (content_week_id, weekday)
  values (v_week_id, p_day)
  on conflict (content_week_id, weekday) do update set weekday = excluded.weekday
  returning id into v_day_id;

  -- Existing quiz row is preserved (not replaced) -- this appends approved
  -- drafts onto whatever's already there, unlike admin_set_content_week's
  -- full-week overwrite, since draft approval is meant to be incremental.
  insert into public.content_quizzes (content_day_id, subject)
  values (v_day_id, p_subject)
  on conflict (content_day_id, subject) do update set subject = excluded.subject
  returning id into v_quiz_id;

  select coalesce(max(sort_order), -1) + 1 into v_next_sort_order
  from public.content_questions where content_quiz_id = v_quiz_id;

  for v_draft in
    select question, options, correct_answer
    from public.draft_questions
    where id = any(p_ids) and grade = p_grade and status = 'approved'
    order by created_at
  loop
    insert into public.content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
    values (v_quiz_id, v_draft.question, v_draft.options, v_draft.correct_answer, v_next_sort_order);
    v_next_sort_order := v_next_sort_order + 1;
  end loop;

  update public.draft_questions
  set status = 'published', reviewed_at = now()
  where id = any(p_ids) and grade = p_grade and status = 'approved';
end;
$function$;

DROP FUNCTION IF EXISTS public.admin_publish_draft_summary(text, uuid, integer, text, text, date);

CREATE OR REPLACE FUNCTION public.admin_publish_draft_summary(p_passcode text, p_id uuid, p_grade integer, p_day text, p_subject text, p_week_starting_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_week_id uuid;
  v_day_id uuid;
  v_summary text;
begin
  perform public.check_admin_passcode(p_passcode);

  if p_day not in ('Monday','Tuesday','Wednesday','Thursday','Friday') then
    raise exception 'invalid day %: must be a weekday name', p_day;
  end if;

  select summary_markdown into v_summary
  from public.draft_summaries
  where id = p_id and grade = p_grade and subject = p_subject and status = 'approved';

  if v_summary is null then
    raise exception 'no approved draft summary found for the given id/grade/subject';
  end if;

  insert into public.content_weeks (grade, week_starting_date)
  values (p_grade, p_week_starting_date)
  on conflict (grade, week_starting_date) do update set grade = excluded.grade
  returning id into v_week_id;

  insert into public.content_days (content_week_id, weekday)
  values (v_week_id, p_day)
  on conflict (content_week_id, weekday) do update set weekday = excluded.weekday
  returning id into v_day_id;

  insert into public.content_quizzes (content_day_id, subject, summary_markdown)
  values (v_day_id, p_subject, v_summary)
  on conflict (content_day_id, subject) do update set summary_markdown = excluded.summary_markdown;

  update public.draft_summaries
  set status = 'published', reviewed_at = now()
  where id = p_id;
end;
$function$;
