-- Force content_weeks.week_starting_date to always be a SUNDAY.
--
-- The app resolves the current week with date-fns `startOfWeek(today)` (see
-- hooks/useWeeklyData.ts — the variable is literally named `currentSunday`),
-- which returns a SUNDAY, and app/api/content/route.ts matches
-- week_starting_date with `.eq()` — exact, no fallback, no tolerance.
--
-- Two writers disagreed on the key. The weekly generation routine writes
-- Sundays. The admin Content Matrix builds its grid from MONDAYS
-- (components/admin/ContentMatrixSection.tsx starts at 2026-06-22) and
-- app/api/admin-content-save/route.ts passed that date straight through.
-- On 2026-08-25 that produced five rows keyed 2026-08-31 (a Monday) — a
-- complete Week 12 package for every grade that no student could ever load,
-- because the app was asking for 2026-08-30. Those rows have been repointed;
-- this stops it recurring.
--
-- Normalizing inside the RPC covers every caller at once (admin-content-save
-- and admin-weekly both funnel through it) rather than patching each route.
-- The CHECK constraint is the backstop for anything that ever bypasses the RPC.

-- ─── 1. Backstop constraint ──────────────────────────────────────────────────
-- extract(dow) is 0 for Sunday. NOT VALID would let existing bad rows linger;
-- every row is already Sunday-keyed, so validate immediately.
ALTER TABLE public.content_weeks
  DROP CONSTRAINT IF EXISTS content_weeks_week_starts_sunday;

ALTER TABLE public.content_weeks
  ADD CONSTRAINT content_weeks_week_starts_sunday
  CHECK (EXTRACT(DOW FROM week_starting_date) = 0);

-- ─── 2. Normalize at the write boundary ──────────────────────────────────────
-- Signature must match the existing function EXACTLY. CREATE OR REPLACE with a
-- differing argument list silently creates a second overload instead of
-- replacing, leaving the old buggy version reachable.
CREATE OR REPLACE FUNCTION public.admin_set_content_week(p_passcode text, p_grade integer, p_week_starting_date date, p_days jsonb, p_created_by text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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

  -- Snap to the Sunday on or before the supplied date. A caller passing the
  -- Monday of the same school week now lands on the key the app reads.
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
