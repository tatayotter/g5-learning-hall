-- Phase 1 of the weekly-progress redesign (see docs/weekly-progress-redesign-plan.md).
--
-- ADDITIVE ONLY. Nothing in this migration touches weekly_packages or any existing table/
-- function. New tables/functions live alongside the old system until Phase 2 (backfill),
-- Phase 3 (dual-write), and Phase 4 (call-site cutover) are done. Safe to apply directly to
-- production.
--
-- Content (admin-authored, grade-keyed, normalized, stable question IDs) replaces the old
-- per-student package_data JSON blob + contentSourceId indirection.
--
-- Progress (player-owned, not week-keyed) replaces weekly_packages' character_stats +
-- weekly-reset counters with lifetime-cumulative totals. Per Phase-1 decision (2026-08-11):
-- achievement thresholds will read these lifetime totals going forward -- a deliberate
-- rebalance, not a bug (see plan doc section 5).

-- ============================================================================
-- current_week_start(): single server-side source of truth for "what week is it".
-- Fixed to Asia/Manila. Sunday-start, matching the existing date-fns startOfWeek() convention
-- used client-side today (Postgres date_trunc('week', ...) truncates to Monday by default,
-- so this explicitly walks back to the most recent Sunday instead).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_week_start()
 RETURNS date
 LANGUAGE sql
 STABLE
AS $$
  SELECT (
    ((now() AT TIME ZONE 'Asia/Manila')::date)
    - (EXTRACT(DOW FROM (now() AT TIME ZONE 'Asia/Manila')::date)::int) * INTERVAL '1 day'
  )::date;
$$;

-- ============================================================================
-- CONTENT: content_weeks / content_days / content_quizzes / content_questions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.content_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade integer NOT NULL CHECK (grade >= 2 AND grade <= 6),
  week_starting_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_weeks_grade_week_unique UNIQUE (grade, week_starting_date)
);

CREATE TABLE IF NOT EXISTS public.content_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_week_id uuid NOT NULL REFERENCES public.content_weeks(id) ON DELETE CASCADE,
  weekday text NOT NULL CHECK (weekday IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  CONSTRAINT content_days_week_weekday_unique UNIQUE (content_week_id, weekday)
);

CREATE TABLE IF NOT EXISTS public.content_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_day_id uuid NOT NULL REFERENCES public.content_days(id) ON DELETE CASCADE,
  subject text NOT NULL,
  CONSTRAINT content_quizzes_day_subject_unique UNIQUE (content_day_id, subject)
);

-- Contains correct_answer -- deliberately NOT readable directly by the authenticated role.
-- Client reads go through content_questions_public (below), which strips the answer, same
-- pattern as weekly_packages -> weekly_packages_public today.
CREATE TABLE IF NOT EXISTS public.content_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_quiz_id uuid NOT NULL REFERENCES public.content_quizzes(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_questions_quiz ON public.content_questions USING btree (content_quiz_id);
CREATE INDEX IF NOT EXISTS idx_content_days_week ON public.content_days USING btree (content_week_id);
CREATE INDEX IF NOT EXISTS idx_content_quizzes_day ON public.content_quizzes USING btree (content_day_id);
CREATE INDEX IF NOT EXISTS idx_content_weeks_grade_week ON public.content_weeks USING btree (grade, week_starting_date);

ALTER TABLE public.content_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_weeks: read all" ON public.content_weeks;
CREATE POLICY "content_weeks: read all" ON public.content_weeks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "content_days: read all" ON public.content_days;
CREATE POLICY "content_days: read all" ON public.content_days FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "content_quizzes: read all" ON public.content_quizzes;
CREATE POLICY "content_quizzes: read all" ON public.content_quizzes FOR SELECT TO authenticated USING (true);

-- Deliberately no SELECT policy on content_questions for `authenticated` -- correct_answer must
-- only ever be readable through content_questions_public or the grading RPC.

-- Public/student-facing view: identical shape to content_questions minus correct_answer.
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
  week.status
FROM public.content_questions cq
JOIN public.content_quizzes quiz ON quiz.id = cq.content_quiz_id
JOIN public.content_days day ON day.id = quiz.content_day_id
JOIN public.content_weeks week ON week.id = day.content_week_id;

GRANT SELECT ON public.content_questions_public TO authenticated;

-- ============================================================================
-- PROGRESS: player_progress / player_question_attempts / player_weekly_journal
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.player_progress (
  user_id text PRIMARY KEY,
  level integer NOT NULL DEFAULT 1,
  xp integer NOT NULL DEFAULT 0,
  gold integer NOT NULL DEFAULT 0,
  guild_sessions_count_total integer NOT NULL DEFAULT 0,
  monster_battles_won_total integer NOT NULL DEFAULT 0,
  sibling_battles_won_total integer NOT NULL DEFAULT 0,
  perfect_quizzes_total integer NOT NULL DEFAULT 0,
  dummy_battles_won_total integer NOT NULL DEFAULT 0,
  eggs_hatched_total integer NOT NULL DEFAULT 0,
  curios_graduated_total integer NOT NULL DEFAULT 0,
  trades_completed_total integer NOT NULL DEFAULT 0,
  legendaries_caught_total integer NOT NULL DEFAULT 0,
  tutor_rerolls_total integer NOT NULL DEFAULT 0,
  tatay_battles_won_total integer NOT NULL DEFAULT 0,
  tatay_battles_lost_total integer NOT NULL DEFAULT 0,
  achievements jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_progress: read all" ON public.player_progress;
CREATE POLICY "player_progress: read all" ON public.player_progress FOR SELECT TO authenticated USING (true);
-- No client INSERT/UPDATE policy -- all writes go through apply_progress_deltas /
-- record_weekly_event (SECURITY DEFINER), same pattern as apply_character_deltas today.

CREATE TABLE IF NOT EXISTS public.player_question_attempts (
  user_id text NOT NULL,
  content_question_id uuid NOT NULL REFERENCES public.content_questions(id) ON DELETE CASCADE,
  answered_at timestamptz NOT NULL DEFAULT now(),
  correct boolean NOT NULL,
  PRIMARY KEY (user_id, content_question_id)
);

ALTER TABLE public.player_question_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_question_attempts: read own" ON public.player_question_attempts;
CREATE POLICY "player_question_attempts: read own" ON public.player_question_attempts
  FOR SELECT TO authenticated USING (current_app_user_id() = user_id);
-- No client INSERT policy -- writes go through grade_content_question (SECURITY DEFINER).

CREATE TABLE IF NOT EXISTS public.player_weekly_journal (
  user_id text NOT NULL,
  content_week_id uuid NOT NULL REFERENCES public.content_weeks(id) ON DELETE CASCADE,
  journal_logs jsonb DEFAULT '{}'::jsonb,
  mastery_count integer DEFAULT 0,
  purchased_items integer DEFAULT 0,
  honor_grants integer DEFAULT 0,
  quiz_attempts jsonb DEFAULT '{}'::jsonb,
  mastered_quizzes jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_week_id)
);

CREATE INDEX IF NOT EXISTS idx_player_weekly_journal_user ON public.player_weekly_journal USING btree (user_id);

ALTER TABLE public.player_weekly_journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_weekly_journal: read all" ON public.player_weekly_journal;
CREATE POLICY "player_weekly_journal: read all" ON public.player_weekly_journal
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "player_weekly_journal: insert own" ON public.player_weekly_journal;
CREATE POLICY "player_weekly_journal: insert own" ON public.player_weekly_journal
  FOR INSERT TO authenticated WITH CHECK (current_app_user_id() = user_id);

DROP POLICY IF EXISTS "player_weekly_journal: update own" ON public.player_weekly_journal;
CREATE POLICY "player_weekly_journal: update own" ON public.player_weekly_journal
  FOR UPDATE TO authenticated
  USING (current_app_user_id() = user_id)
  WITH CHECK (current_app_user_id() = user_id);

-- ============================================================================
-- RPCs
-- ============================================================================

-- Atomically applies xp/gold deltas to a user's lifetime progress and resolves level-ups.
-- Same level-up formula as apply_character_deltas (500 + level*100) -- still duplicated in
-- hooks/useWeeklyData.ts client-side; unifying that is a Phase 4 cleanup, not done here.
-- Auto-creates the player_progress row on first use (no separate "ensure" step needed).
CREATE OR REPLACE FUNCTION public.apply_progress_deltas(p_user_id text, p_xp_delta integer DEFAULT 0, p_gold_delta integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  cur_xp integer;
  cur_gold integer;
  cur_level integer;
  final_xp integer;
  final_level integer;
  final_gold integer;
  result jsonb;
begin
  INSERT INTO public.player_progress (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT xp, gold, level INTO cur_xp, cur_gold, cur_level
  FROM public.player_progress
  WHERE user_id = p_user_id
  FOR UPDATE;

  final_xp := cur_xp + p_xp_delta;
  final_level := cur_level;
  final_gold := cur_gold + p_gold_delta;

  WHILE final_xp >= (500 + final_level * 100) LOOP
    final_xp := final_xp - (500 + final_level * 100);
    final_level := final_level + 1;
  END LOOP;

  UPDATE public.player_progress
  SET xp = final_xp, level = final_level, gold = final_gold, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING jsonb_build_object('xp', xp, 'level', level, 'gold', gold) INTO result;

  RETURN result;
end;
$function$;

-- Atomically increments one of the 12 lifetime counters by 1. Allowlisted column names only
-- (mirrors increment_weekly_counter's allowlist pattern, extended to all 12 -- the old RPC only
-- covered 5). Auto-creates the player_progress row on first use.
CREATE OR REPLACE FUNCTION public.record_progress_event(p_user_id text, p_column text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_column NOT IN (
    'guild_sessions_count_total', 'monster_battles_won_total', 'sibling_battles_won_total',
    'perfect_quizzes_total', 'dummy_battles_won_total', 'eggs_hatched_total',
    'curios_graduated_total', 'trades_completed_total', 'legendaries_caught_total',
    'tutor_rerolls_total', 'tatay_battles_won_total', 'tatay_battles_lost_total'
  ) THEN
    RAISE EXCEPTION 'invalid counter column: %', p_column;
  END IF;

  INSERT INTO public.player_progress (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  EXECUTE format(
    'UPDATE public.player_progress SET %I = %I + 1, updated_at = now() WHERE user_id = $1',
    p_column, p_column
  ) USING p_user_id;
END;
$function$;

-- Grades a question by its stable content_questions.id (replaces text-matching against
-- package_data). Records the attempt in player_question_attempts. Does NOT return
-- correct_answer to the caller -- same non-leaking contract as grade_boss_question.
CREATE OR REPLACE FUNCTION public.grade_content_question(p_user_id text, p_question_id uuid, p_selected text)
 RETURNS boolean
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

  RETURN is_correct;
end;
$function$;

-- Admin (passcode-gated): creates a draft content_weeks row for a grade/week if it doesn't
-- already exist, returns its id either way (idempotent, unlike a bare INSERT).
CREATE OR REPLACE FUNCTION public.admin_create_content_week(p_passcode text, p_grade integer, p_week_starting_date date, p_created_by text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  result_id uuid;
begin
  PERFORM public.check_admin_passcode(p_passcode);

  INSERT INTO public.content_weeks (grade, week_starting_date, created_by)
  VALUES (p_grade, p_week_starting_date, p_created_by)
  ON CONFLICT (grade, week_starting_date) DO UPDATE SET grade = EXCLUDED.grade
  RETURNING id INTO result_id;

  RETURN result_id;
end;
$function$;

-- Admin (passcode-gated): flips a content_weeks row from draft to published.
CREATE OR REPLACE FUNCTION public.admin_publish_content_week(p_passcode text, p_content_week_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  UPDATE public.content_weeks SET status = 'published' WHERE id = p_content_week_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such content week: %', p_content_week_id;
  END IF;
END;
$function$;

-- Admin (passcode-gated): replaces all questions for one (day, subject) in one call.
-- p_questions is a jsonb array of {prompt, options: [...], correct_answer}. Deletes and
-- re-inserts rather than diffing -- simplest correct behavior for content authoring, matching
-- the "paste the whole day's content" admin UX this replaces from PackagesSection.tsx.
-- NOTE: this means editing even one question's wording generates a new content_questions.id,
-- same tradeoff as before but now at least deliberate and documented, since IDs are meant to be
-- stable per *authored version* of a question, not literally forever across edits.
CREATE OR REPLACE FUNCTION public.admin_set_content_day_quiz(p_passcode text, p_content_week_id uuid, p_weekday text, p_subject text, p_questions jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  day_id uuid;
  quiz_id uuid;
  q jsonb;
  idx integer := 0;
begin
  PERFORM public.check_admin_passcode(p_passcode);

  INSERT INTO public.content_days (content_week_id, weekday)
  VALUES (p_content_week_id, p_weekday)
  ON CONFLICT (content_week_id, weekday) DO UPDATE SET weekday = EXCLUDED.weekday
  RETURNING id INTO day_id;

  INSERT INTO public.content_quizzes (content_day_id, subject)
  VALUES (day_id, p_subject)
  ON CONFLICT (content_day_id, subject) DO UPDATE SET subject = EXCLUDED.subject
  RETURNING id INTO quiz_id;

  DELETE FROM public.content_questions WHERE content_quiz_id = quiz_id;

  FOR q IN SELECT * FROM jsonb_array_elements(p_questions) LOOP
    INSERT INTO public.content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
    VALUES (quiz_id, q ->> 'prompt', q -> 'options', q ->> 'correct_answer', idx);
    idx := idx + 1;
  END LOOP;

  RETURN quiz_id;
end;
$function$;
