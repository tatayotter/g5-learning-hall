-- Phase 4 Wave 3: PackagesSection.tsx's admin editor needs to see correct_answer to let the
-- admin edit/verify content -- but content_questions deliberately has no client SELECT policy
-- (Phase 1), and app/api/admin-weekly/route.ts runs with just the anon key (RLS still applies
-- server-side too, same as every other admin route in this app). This passcode-gated RPC
-- reconstructs the exact same day->subject->{summary_markdown, quiz:[{question,options,
-- correct_answer}]} shape the admin already knows how to paste/edit, from the normalized tables.
CREATE OR REPLACE FUNCTION public.admin_get_content_week(p_passcode text, p_grade integer, p_week_starting_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_week_id uuid;
  result jsonb;
begin
  PERFORM public.check_admin_passcode(p_passcode);

  SELECT id INTO v_week_id FROM public.content_weeks
  WHERE grade = p_grade AND week_starting_date = p_week_starting_date;

  IF v_week_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_object_agg(day.weekday, day.subjects), '{}'::jsonb) INTO result
  FROM (
    SELECT d.weekday,
      (SELECT COALESCE(jsonb_object_agg(quiz.subject, quiz.subject_content), '{}'::jsonb)
       FROM (
         SELECT cq.subject, cq.summary_markdown,
           jsonb_build_object(
             'summary_markdown', cq.summary_markdown,
             'quiz', COALESCE((
               SELECT jsonb_agg(
                 jsonb_build_object('question', q.prompt, 'options', q.options, 'correct_answer', q.correct_answer)
                 ORDER BY q.sort_order
               )
               FROM public.content_questions q WHERE q.content_quiz_id = cq.id
             ), '[]'::jsonb)
           ) AS subject_content
         FROM public.content_quizzes cq WHERE cq.content_day_id = d.id
       ) quiz
      ) AS subjects
    FROM public.content_days d WHERE d.content_week_id = v_week_id
  ) day;

  RETURN result;
end;
$function$;
