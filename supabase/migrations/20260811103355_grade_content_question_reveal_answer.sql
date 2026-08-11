-- Phase 4 Wave 3: the Monster Arena battle UI reveals the correct answer after each question
-- (green highlight, a real UX feature carried over from grade_monster_question's response shape)
-- -- but grade_content_question (Phase 1) deliberately returns only a boolean, since it was
-- designed before any app code actually called it. Fixing that now, before first real use:
-- return {correct, correct_answer} instead, matching the old RPC's shape so
-- components/battle/shared.tsx's BattleQuestionModal needs minimal changes.
-- Return-type change requires DROP+CREATE, not a plain CREATE OR REPLACE.

DROP FUNCTION IF EXISTS public.grade_content_question(text, uuid, text);

CREATE OR REPLACE FUNCTION public.grade_content_question(p_user_id text, p_question_id uuid, p_selected text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  answer text;
  is_correct boolean;
begin
  SELECT correct_answer INTO answer FROM public.content_questions WHERE id = p_question_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such content question: %', p_question_id;
  END IF;

  is_correct := (p_selected = answer);

  INSERT INTO public.player_question_attempts (user_id, content_question_id, correct)
  VALUES (p_user_id, p_question_id, is_correct)
  ON CONFLICT (user_id, content_question_id)
  DO UPDATE SET correct = EXCLUDED.correct, answered_at = now();

  RETURN jsonb_build_object('correct', is_correct, 'correct_answer', answer);
end;
$function$;

-- Also fixing content_questions_public: it was created in Phase 1 before content_quizzes had a
-- summary_markdown column (added later, same day, for the lesson-text field discovered during
-- the Phase 2 backfill). The view never picked it up. The content-fetch hook being written for
-- Wave 3 needs it to reconstruct the per-subject lesson summary.
-- summary_markdown appended at the end, not inserted alongside `subject` -- Postgres's
-- CREATE OR REPLACE VIEW only allows adding columns at the end, not reordering/inserting.
CREATE OR REPLACE VIEW public.content_questions_public AS
SELECT
  cq.id,
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
  quiz.summary_markdown
FROM public.content_questions cq
JOIN public.content_quizzes quiz ON quiz.id = cq.content_quiz_id
JOIN public.content_days day ON day.id = quiz.content_day_id
JOIN public.content_weeks week ON week.id = day.content_week_id;

GRANT SELECT ON public.content_questions_public TO authenticated;
