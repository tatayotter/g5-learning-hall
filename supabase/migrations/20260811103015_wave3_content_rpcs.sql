-- Phase 4, Wave 3 of the weekly-progress redesign (see docs/weekly-progress-redesign-plan.md).
-- Two new RPCs needed for the content cutover: batched quiz grading by stable question id, and
-- an atomic whole-week admin-authoring save (replaces looping the per-cell
-- admin_set_content_day_quiz from the client, which loses atomicity across a whole week).

-- Grades a batch of {question_id, selected} answers in one round trip. Replaces grade_weekly_quiz
-- (day/subject-keyed, graded positionally by array index) and grade_weekly_review_quiz
-- (text-matched against package_data) -- both are superseded by this single id-keyed path, since
-- Weekly Review no longer needs bespoke text matching once questions carry real ids. Records each
-- answer into player_question_attempts, same as grade_content_question (Phase 1) -- this also
-- doubles as "mark completed" for Monster Arena's answered-state tracking, no separate call needed.
CREATE OR REPLACE FUNCTION public.grade_content_quiz(p_user_id text, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ans jsonb;
  v_question_id uuid;
  v_selected text;
  v_correct_answer text;
  v_is_correct boolean;
  v_correct_count int := 0;
  v_total int := 0;
  v_results jsonb := '[]'::jsonb;
begin
  FOR ans IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    v_total := v_total + 1;
    v_question_id := (ans ->> 'question_id')::uuid;
    v_selected := ans ->> 'selected';

    SELECT correct_answer INTO v_correct_answer FROM public.content_questions WHERE id = v_question_id;
    v_is_correct := (v_correct_answer IS NOT NULL AND v_selected = v_correct_answer);
    IF v_is_correct THEN
      v_correct_count := v_correct_count + 1;
    END IF;

    INSERT INTO public.player_question_attempts (user_id, content_question_id, correct)
    VALUES (p_user_id, v_question_id, v_is_correct)
    ON CONFLICT (user_id, content_question_id) DO UPDATE SET correct = EXCLUDED.correct, answered_at = now();

    v_results := v_results || jsonb_build_array(jsonb_build_object('question_id', v_question_id, 'correct', v_is_correct));
  END LOOP;

  RETURN jsonb_build_object(
    'correct_count', v_correct_count,
    'total', v_total,
    'is_perfect', (v_total > 0 AND v_correct_count = v_total),
    'results', v_results
  );
end;
$function$;

-- Admin (passcode-gated): saves an ENTIRE week's content (all days/subjects/questions) in one
-- transaction. p_days matches the shape the admin already pastes today (weekday -> subject ->
-- {quiz|questions: [{question, options, correct_answer}], summary_markdown}) -- no client-side
-- reshaping needed. Replaces looping admin_set_content_day_quiz once per day/subject from the
-- client, which loses atomicity across the whole week (a partial failure mid-loop would leave
-- content half-updated with no rollback); this wraps the same per-cell logic inside a single
-- function call/transaction instead.
CREATE OR REPLACE FUNCTION public.admin_set_content_week(p_passcode text, p_grade integer, p_week_starting_date date, p_days jsonb, p_created_by text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_week_id uuid;
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

  INSERT INTO public.content_weeks (grade, week_starting_date, created_by)
  VALUES (p_grade, p_week_starting_date, p_created_by)
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
