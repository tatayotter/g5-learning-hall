-- Notifies every active child/classmate of a grade the first time that
-- grade's CURRENT week gets real content saved — not on every re-save/edit
-- (admin fixes typos throughout the week), and not when the admin
-- pre-authors a future week ahead of time (that week isn't playable yet;
-- see the known limitation noted in the app's push-notification research —
-- a week authored ahead of time won't auto-notify once it later becomes
-- current, since there's no separate "week rollover" detector for this yet).
--
-- SUPERSEDED by 20260904070000_revert_admin_set_content_week_push.sql +
-- 20260904080000_schedule_new_weekly_content_cron.sql — kept for history.
-- A trigger tied to the exact save moment turned out to be the wrong shape:
-- the admin can pre-author a week days ahead of when it should actually
-- notify, so this was replaced with a pure time-based Sunday poll instead.
create or replace function public.admin_set_content_week(p_passcode text, p_grade integer, p_week_starting_date date, p_days jsonb, p_created_by text DEFAULT NULL::text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_week_id uuid;
  v_week_start date;
  v_current_sunday date;
  v_had_content_before boolean;
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

  select exists(
    select 1 from public.content_days where content_week_id = v_week_id
  ) into v_had_content_before;

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

  -- Sunday-keyed "today" in Philippine time, matching this app's content-week
  -- convention (project memory: content_weeks is Sunday-keyed).
  v_current_sunday := (now() at time zone 'Asia/Manila')::date
                       - extract(dow from (now() at time zone 'Asia/Manila')::date)::integer;

  if not v_had_content_before and v_week_start = v_current_sunday then
    insert into public.push_notification_queue (owner_kind, owner_id, title, body, url)
    select 'app_user', id, 'New Quests This Week! 📖',
           format('Grade %s content is ready — jump in and see what''s new!', p_grade),
           '/play'
    from public.children
    where grade = ('Grade ' || p_grade) and is_active = true;

    insert into public.push_notification_queue (owner_kind, owner_id, title, body, url)
    select 'app_user', id, 'New Quests This Week! 📖',
           format('Grade %s content is ready — jump in and see what''s new!', p_grade),
           '/play'
    from public.classmates
    where grade = ('Grade ' || p_grade) and is_active = true;
  end if;

  RETURN v_week_id;
end;
$function$;
