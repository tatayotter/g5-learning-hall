-- MTAP Expansion Pack: attempt tracking + grading RPC. Step 4 of the build order in
-- content/mtap-expansion-overview.md ("Next steps") -- the piece the original
-- 20260828130000 migration deliberately deferred ("mastery/unlock progress tracking
-- and the grading RPC are step 4... not this migration").
--
-- Full attempt HISTORY, not upsert-latest (unlike player_question_attempts, which
-- the sibling grade_content_question RPC upserts on conflict) -- the mastery rule in
-- content/mtap-expansion-overview.md needs "8 of last 10 attempts correct, across
-- >=2 sessions" for a given (user, archetype, tier), which requires the real
-- sequence of past attempts, not just the latest one per question.
--
-- Mastery/tier-unlock DECISIONS are computed client-side from this table (see
-- lib/mtapEngine.ts) rather than in a server function -- this is a pacing/UX
-- mechanism only, not an economic security boundary: nothing of real value leaks if
-- a child's client miscounts and shows a tier as unlocked a session early, since the
-- actual reward-farming guard (below) is enforced server-side regardless of which
-- tier a question came from.

CREATE TABLE IF NOT EXISTS public.mtap_question_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  question_code text NOT NULL,
  grade integer NOT NULL,
  strand integer NOT NULL,
  archetype text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('easy', 'average', 'difficult')),
  correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Drives both the mastery-window query (last 10 attempts for a user+archetype+tier,
-- most recent first) and the reward-farming guard (has this exact question ever
-- been answered correctly by this user before).
CREATE INDEX IF NOT EXISTS idx_mtap_attempts_mastery_window
  ON public.mtap_question_attempts USING btree (user_id, archetype, tier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mtap_attempts_question_history
  ON public.mtap_question_attempts USING btree (user_id, question_code, correct);

ALTER TABLE public.mtap_question_attempts ENABLE ROW LEVEL SECURITY;

-- Owner can read their own attempt history (needed client-side for the mastery
-- computation above). No client INSERT/UPDATE/DELETE -- every write goes through
-- grade_mtap_expansion_answer below, same base-table-locked-down pattern as
-- mtap_expansion_content itself.
CREATE POLICY mtap_question_attempts_select_own
  ON public.mtap_question_attempts FOR SELECT
  TO authenticated
  USING (user_id = public.current_app_user_id());

-- Grades one MTAP expansion-pack question by question_code, logs the attempt, and
-- reports whether this attempt is reward-eligible -- the reward itself (XP/gold) is
-- credited by the CALLER via the existing apply_progress_deltas RPC, exactly the
-- same client-then-server split the regular weekly QuestModule already uses; this
-- RPC's own job is answer-checking + the anti-farming guard, not currency writes.
--
-- Anti-farming guard (explicitly requested): reward_eligible is true only on a
-- question's FIRST ever correct answer from this user. Re-answering an
-- already-correctly-answered question still returns correct=true (so a child
-- reviewing/practicing sees they got it right) but reward_eligible=false, so
-- replaying the same 8-question tier bank on a loop earns nothing past the first
-- clean pass -- consistent with markQuestionsCompleted's existing
-- correct-answers-only philosophy elsewhere in this codebase (lib/guildEngine.ts),
-- just enforced per-question here instead of per-quiz.
CREATE OR REPLACE FUNCTION public.grade_mtap_expansion_answer(
  p_user_id text,
  p_question_code text,
  p_selected text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  q record;
  is_correct boolean;
  already_earned boolean;
BEGIN
  IF p_user_id IS DISTINCT FROM public.current_app_user_id() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT grade, strand, archetype, tier, correct_answer, solution_steps, technique
    INTO q
    FROM public.mtap_expansion_content
    WHERE question_code = p_question_code AND reviewed = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such mtap expansion question: %', p_question_code;
  END IF;

  is_correct := (p_selected = q.correct_answer);

  SELECT EXISTS (
    SELECT 1 FROM public.mtap_question_attempts
    WHERE user_id = p_user_id AND question_code = p_question_code AND correct = true
  ) INTO already_earned;

  INSERT INTO public.mtap_question_attempts
    (user_id, question_code, grade, strand, archetype, tier, correct)
  VALUES
    (p_user_id, p_question_code, q.grade, q.strand, q.archetype, q.tier, is_correct);

  RETURN jsonb_build_object(
    'correct', is_correct,
    'correct_answer', q.correct_answer,
    'solution_steps', q.solution_steps,
    'technique', q.technique,
    'reward_eligible', (is_correct AND NOT already_earned)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.grade_mtap_expansion_answer(text, text, text) TO authenticated;
