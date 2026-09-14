-- Main quest daily attempt cap: a board-tab quest (day_subject quiz, incl.
-- the synthetic Friday "Weekly Review") now allows at most 2 attempts per
-- real calendar day. If the 2nd attempt that day isn't a perfect score, the
-- quest locks until the next calendar day, which grants 2 fresh attempts.
--
-- Scoped by (user_id, week_starting_date, weekday, subject, attempt_date)
-- rather than by content_week_id/question ids — the Weekly Review "quest"
-- (lib/weeklyReview.ts) mixes questions from four different weekday/subject
-- pairs into one submission, so deriving quest identity from the answered
-- questions themselves would be wrong; the client already knows exactly
-- which quest it's submitting for (the day/subject the board card is
-- keyed by) and passes that explicitly instead.
CREATE TABLE public.main_quest_daily_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  week_starting_date date not null,
  weekday text not null,
  subject text not null,
  attempt_date date not null,
  attempts_used integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, week_starting_date, weekday, subject, attempt_date)
);

-- RLS is auto-enabled on new public tables by the rls_auto_enable event
-- trigger; add the read-own policy explicitly (writes only ever happen
-- through grade_content_quiz below, a SECURITY DEFINER function, which
-- bypasses RLS) — same shape as "player_question_attempts: read own".
CREATE POLICY "main_quest_daily_attempts: read own" ON public.main_quest_daily_attempts
  FOR SELECT USING (current_app_user_id() = user_id);

-- Signature is gaining 4 required params — DROP first so this doesn't leave
-- the old 2-arg version behind as a separate overload (CREATE OR REPLACE
-- only replaces a function with the exact same argument list).
DROP FUNCTION IF EXISTS public.grade_content_quiz(text, jsonb);

CREATE FUNCTION public.grade_content_quiz(
  p_user_id text,
  p_answers jsonb,
  p_week_starting_date date,
  p_weekday text,
  p_subject text,
  p_today date
)
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
  v_attempts_used int;
begin
  IF p_user_id IS DISTINCT FROM public.current_app_user_id() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Reserve today's attempt row for this quest before checking/incrementing
  -- it, so two concurrent submissions for the same quest can't both slip
  -- past the 2-attempt cap.
  INSERT INTO public.main_quest_daily_attempts (user_id, week_starting_date, weekday, subject, attempt_date, attempts_used)
  VALUES (p_user_id, p_week_starting_date, p_weekday, p_subject, p_today, 0)
  ON CONFLICT (user_id, week_starting_date, weekday, subject, attempt_date) DO NOTHING;

  SELECT attempts_used INTO v_attempts_used
  FROM public.main_quest_daily_attempts
  WHERE user_id = p_user_id AND week_starting_date = p_week_starting_date
    AND weekday = p_weekday AND subject = p_subject AND attempt_date = p_today
  FOR UPDATE;

  IF v_attempts_used >= 2 THEN
    RETURN jsonb_build_object(
      'locked', true,
      'attempts_used_today', v_attempts_used,
      'correct_count', 0,
      'total', 0,
      'is_perfect', false,
      'results', '[]'::jsonb
    );
  END IF;

  UPDATE public.main_quest_daily_attempts
  SET attempts_used = attempts_used + 1, updated_at = now()
  WHERE user_id = p_user_id AND week_starting_date = p_week_starting_date
    AND weekday = p_weekday AND subject = p_subject AND attempt_date = p_today;
  v_attempts_used := v_attempts_used + 1;

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

    v_results := v_results || jsonb_build_array(jsonb_build_object('question_id', v_question_id, 'correct', v_is_correct, 'correct_answer', v_correct_answer));
  END LOOP;

  RETURN jsonb_build_object(
    'locked', false,
    'correct_count', v_correct_count,
    'total', v_total,
    'is_perfect', (v_total > 0 AND v_correct_count = v_total),
    'results', v_results,
    'attempts_used_today', v_attempts_used
  );
end;
$function$;
