-- Fix: boss fight question pools had no term-boundary filter.
--
-- draft_questions has always had week_starting_date, but no term column.
-- fetchBossPoolCounts / fetchBossQuestionPool queried draft_questions_public
-- by grade+subject only, so published questions from ALL terms appeared in
-- every term's boss fight pool. This will cause Term 1 questions to bleed
-- into Term 2's boss fight when Term 2 starts (Sep 21, 2026).
--
-- Fix:
--   1. Add `term integer NOT NULL DEFAULT 1` to draft_questions.
--      All 1095 existing published rows are Term 1 questions — backfill = 1.
--   2. Add p_term parameter to admin_publish_draft_questions so the admin
--      stamps the correct term when approving questions.
--   3. Recreate draft_questions_public to expose the term column so the
--      client-side pool queries can filter on it.

-- ── 1. Add term column ────────────────────────────────────────────────────

ALTER TABLE public.draft_questions
  ADD COLUMN IF NOT EXISTS term integer NOT NULL DEFAULT 1;

-- ── 2. Recreate admin_publish_draft_questions with p_term ─────────────────

DROP FUNCTION IF EXISTS public.admin_publish_draft_questions(text, uuid[], integer, text, text, date);

CREATE OR REPLACE FUNCTION public.admin_publish_draft_questions(
  p_passcode           text,
  p_ids                uuid[],
  p_grade              integer,
  p_day                text,
  p_subject            text,
  p_week_starting_date date,
  p_term               integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_week_id        uuid;
  v_day_id         uuid;
  v_quiz_id        uuid;
  v_mismatched_count int;
  v_next_sort_order  int;
  v_draft          record;
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  IF p_day NOT IN ('Monday','Tuesday','Wednesday','Thursday','Friday') THEN
    RAISE EXCEPTION 'invalid day %: must be a weekday name', p_day;
  END IF;

  SELECT COUNT(*) INTO v_mismatched_count
  FROM public.draft_questions
  WHERE id = ANY(p_ids) AND grade <> p_grade;
  IF v_mismatched_count > 0 THEN
    RAISE EXCEPTION 'one or more draft ids do not belong to grade %', p_grade;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.draft_questions
    WHERE id = ANY(p_ids) AND grade = p_grade AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'no approved drafts found for the given ids';
  END IF;

  INSERT INTO public.content_weeks (grade, week_starting_date)
  VALUES (p_grade, p_week_starting_date)
  ON CONFLICT (grade, week_starting_date) DO UPDATE SET grade = excluded.grade
  RETURNING id INTO v_week_id;

  INSERT INTO public.content_days (content_week_id, weekday)
  VALUES (v_week_id, p_day)
  ON CONFLICT (content_week_id, weekday) DO UPDATE SET weekday = excluded.weekday
  RETURNING id INTO v_day_id;

  INSERT INTO public.content_quizzes (content_day_id, subject)
  VALUES (v_day_id, p_subject)
  ON CONFLICT (content_day_id, subject) DO UPDATE SET subject = excluded.subject
  RETURNING id INTO v_quiz_id;

  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_next_sort_order
  FROM public.content_questions WHERE content_quiz_id = v_quiz_id;

  FOR v_draft IN
    SELECT question, options, correct_answer
    FROM public.draft_questions
    WHERE id = ANY(p_ids) AND grade = p_grade AND status = 'approved'
    ORDER BY created_at
  LOOP
    INSERT INTO public.content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
    VALUES (v_quiz_id, v_draft.question, v_draft.options, v_draft.correct_answer, v_next_sort_order);
    v_next_sort_order := v_next_sort_order + 1;
  END LOOP;

  -- Stamp term + mark published
  UPDATE public.draft_questions
  SET status = 'published', reviewed_at = now(), term = p_term
  WHERE id = ANY(p_ids) AND grade = p_grade AND status = 'approved';
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_publish_draft_questions(text, uuid[], integer, text, text, date, integer) TO authenticated;

-- ── 3. Recreate draft_questions_public to expose term ─────────────────────

DROP VIEW IF EXISTS public.draft_questions_public;

CREATE VIEW public.draft_questions_public AS
  SELECT id, week_starting_date, grade, subject, tier, topic, question, options, term
  FROM public.draft_questions
  WHERE status = 'published';

GRANT SELECT ON public.draft_questions_public TO anon, authenticated;
