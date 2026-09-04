-- Revert: 20260904060000 added a push-notification insert directly into
-- admin_set_content_week, tied to the exact moment the admin saves.
-- Superseded by a pure time-based Sunday cron check instead (simpler, and
-- what was actually asked for) — restoring this function to its original
-- body, no notification side effect here. See
-- 20260904080000_schedule_new_weekly_content_cron.sql for the replacement.
create or replace function public.admin_set_content_week(p_passcode text, p_grade integer, p_week_starting_date date, p_days jsonb, p_created_by text DEFAULT NULL::text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_week_id uuid;
  v_week_start date;
  day_key text;
  subj_key text;
  subj_obj jsonb;
  quiz_arr jsonb;
  day_id uuid;
  quiz_id uuid;
  q jsonb;
  idx integer;
begin
  PERFORM public.check_admin_passcode(p_passcode);

  v_week_start := p_week_starting_date
                  - (EXTRACT(DOW FROM p_week_starting_date))::integer;

  INSERT INTO public.content_weeks (grade, week_starting_date, created_by)
  VALUES (p_grade, v_week_start, p_created_by)
  ON CONFLICT (grade, week_starting_date) DO UPDATE SET grade = EXCLUDED.grade
  RETURNING id INTO v_week_id;

  FOR day_key IN SELECT jsonb_object_keys(p_days) LOOP
    CONTINUE WHEN jsonb_typeof(p_days -> day_key) <> 'object';

    INSERT INTO public.content_days (content_week_id, weekday)
    VALUES (v_week_id, day_key)
    ON CONFLICT (content_week_id, weekday) DO UPDATE SET weekday = EXCLUDED.weekday
    RETURNING id INTO day_id;

    FOR subj_key IN SELECT jsonb_object_keys(p_days -> day_key) LOOP
      subj_obj := p_days -> day_key -> subj_key;
      CONTINUE WHEN jsonb_typeof(subj_obj) <> 'object';

      quiz_arr := COALESCE(subj_obj -> 'quiz', subj_obj -> 'questions', '[]'::jsonb);

      INSERT INTO public.content_quizzes (content_day_id, subject, summary_markdown)
      VALUES (day_id, subj_key, subj_obj ->> 'summary_markdown')
      ON CONFLICT (content_day_id, subject)
        DO UPDATE SET summary_markdown = EXCLUDED.summary_markdown
      RETURNING id INTO quiz_id;

      DELETE FROM public.content_questions WHERE content_quiz_id = quiz_id;

      idx := 0;
      IF jsonb_typeof(quiz_arr) = 'array' THEN
        FOR q IN SELECT * FROM jsonb_array_elements(quiz_arr) LOOP
          INSERT INTO public.content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
          VALUES (
            quiz_id,
            COALESCE(q ->> 'question', q ->> 'problem_prompt', ''),
            COALESCE(q -> 'options', '[]'::jsonb),
            COALESCE(q ->> 'correct_answer', ''),
            idx
          );
          idx := idx + 1;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_week_id;
end;
$function$;
