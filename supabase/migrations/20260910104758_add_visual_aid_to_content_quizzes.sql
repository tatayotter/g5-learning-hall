-- Adds an optional visual_aid column to content_quizzes so per-subject/day
-- quiz content can carry a structured diagram spec (cycle / steps /
-- bar-compare — see lib/visualAid.ts) alongside summary_markdown, rendered
-- client-side by components/quest/VisualAid.tsx. Null/absent means "no
-- diagram for this lesson" — most lessons won't have one; it's authored only
-- where a diagram genuinely helps (see prompt rules in lib/promptBuilder.ts).
alter table public.content_quizzes
  add column if not exists visual_aid jsonb;

-- admin_set_content_week now accepts and persists visual_aid from the same
-- per-subject JSON object that already carries quiz/summary_markdown.
-- Signature is unchanged from the original (p_passcode, p_grade,
-- p_week_starting_date, p_days, p_created_by) — see
-- docs/rpc-identity-hardening.md / project memory on the CREATE OR REPLACE
-- overload trap for why that matters.
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

      INSERT INTO public.content_quizzes (content_day_id, subject, summary_markdown, visual_aid)
      VALUES (day_id, subj_key, subj_obj ->> 'summary_markdown', subj_obj -> 'visual_aid')
      ON CONFLICT (content_day_id, subject)
        DO UPDATE SET summary_markdown = EXCLUDED.summary_markdown,
                       visual_aid = EXCLUDED.visual_aid
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

-- content_questions_public gains visual_aid alongside summary_markdown. It
-- still structurally never selects correct_answer, regardless of caller
-- privilege — see app/api/content/route.ts's comment on why that matters.
create or replace view public.content_questions_public as
 SELECT cq.id,
    cq.content_quiz_id,
    cq.prompt,
    cq.options,
    cq.sort_order,
    quiz.subject,
    quiz.content_day_id,
    day.weekday,
    day.content_week_id,
    week.grade,
    week.week_starting_date,
    week.status,
    quiz.summary_markdown,
    quiz.visual_aid
   FROM content_questions cq
     JOIN content_quizzes quiz ON quiz.id = cq.content_quiz_id
     JOIN content_days day ON day.id = quiz.content_day_id
     JOIN content_weeks week ON week.id = day.content_week_id;
