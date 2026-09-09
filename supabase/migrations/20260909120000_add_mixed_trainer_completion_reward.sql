-- Mixed Trainer Track completion reward: 1 Growth Pill per completed run,
-- capped at once per (user, grade) per calendar day. Matches every other
-- growth_pill grant already in this codebase -- boss fight victory
-- (20260807000000_boss_fight_schema.sql) and the referral bonus
-- (20260825000000_referral_system.sql) both also grant exactly 1 -- and
-- reuses the same server-authoritative upsert_inventory path, per the
-- "never trust a client-computed reward" rule grade_mtap_expansion_answer
-- already established (20260905160000_add_mtap_expansion_attempts_and_grading.sql).
--
-- Proof of a genuine run, not just a client claiming one happened: the
-- caller supplies the question_codes it actually played, and this function
-- requires them to have real graded attempts (from this user, this grade)
-- within the last 2 hours -- generous enough for a real 25-question,
-- up-to-60-seconds-per-question run with normal thinking time, but tying
-- the grant to rows that only ever get written by the already-server-
-- authoritative grade_mtap_expansion_answer RPC, not anything the client
-- could fabricate directly.

CREATE TABLE IF NOT EXISTS public.mtap_mixed_trainer_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  grade integer NOT NULL,
  question_count integer NOT NULL,
  correct_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Drives the daily-cap check: "any completion for this user+grade since
-- midnight?"
CREATE INDEX IF NOT EXISTS idx_mtap_mixed_trainer_completions_daily_cap
  ON public.mtap_mixed_trainer_completions USING btree (user_id, grade, created_at DESC);

ALTER TABLE public.mtap_mixed_trainer_completions ENABLE ROW LEVEL SECURITY;

-- Owner can read their own completion history. No client INSERT/UPDATE/
-- DELETE -- every write goes through claim_mixed_trainer_reward below,
-- same base-table-locked-down pattern as mtap_question_attempts itself.
CREATE POLICY mtap_mixed_trainer_completions_select_own
  ON public.mtap_mixed_trainer_completions FOR SELECT
  TO authenticated
  USING (user_id = public.current_app_user_id());

CREATE OR REPLACE FUNCTION public.claim_mixed_trainer_reward(
  p_user_id text,
  p_grade integer,
  p_question_codes text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_distinct_count integer;
  v_verified_count integer;
  v_correct_count integer;
  v_already_today boolean;
BEGIN
  IF p_user_id IS DISTINCT FROM public.current_app_user_id() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT count(DISTINCT code) INTO v_distinct_count FROM unnest(p_question_codes) AS code;

  -- Floor, not an exact-25 check against MIXED_TRAINER_SET_SIZE: a genuine
  -- small-grade shortfall (the same natural-exhaustion pattern documented
  -- throughout this content pack) can leave a real set a little under
  -- target. 20 is a guard against an obviously-too-short fabricated list,
  -- not a strict equality check against a client-side constant.
  IF v_distinct_count < 20 THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'set_too_small');
  END IF;

  SELECT count(DISTINCT a.question_code) INTO v_verified_count
  FROM public.mtap_question_attempts a
  WHERE a.user_id = p_user_id
    AND a.grade = p_grade
    AND a.question_code = ANY(p_question_codes)
    AND a.created_at > now() - interval '2 hours';

  IF v_verified_count < v_distinct_count THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'unverified');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.mtap_mixed_trainer_completions
    WHERE user_id = p_user_id AND grade = p_grade
      AND created_at > date_trunc('day', now())
  ) INTO v_already_today;

  IF v_already_today THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_claimed_today');
  END IF;

  SELECT count(DISTINCT a.question_code) INTO v_correct_count
  FROM public.mtap_question_attempts a
  WHERE a.user_id = p_user_id
    AND a.grade = p_grade
    AND a.question_code = ANY(p_question_codes)
    AND a.correct = true
    AND a.created_at > now() - interval '2 hours';

  INSERT INTO public.mtap_mixed_trainer_completions (user_id, grade, question_count, correct_count)
  VALUES (p_user_id, p_grade, v_distinct_count, v_correct_count);

  PERFORM public.upsert_inventory(p_user_id, 'growth_pill', 1);

  RETURN jsonb_build_object('granted', true, 'growth_pills', 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_mixed_trainer_reward(text, integer, text[]) TO authenticated;
