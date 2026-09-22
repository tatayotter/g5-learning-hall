-- Fix: claim_mixed_trainer_reward's "already claimed today" guard was a
-- plain SELECT EXISTS with no lock and no backing unique constraint (unlike
-- every other daily/one-time claim RPC in this schema — see
-- claim_daily_checklist_bonus, claim_boss_gauntlet_reward, claim_event_reward,
-- claim_boss_persona_victory, all of which use INSERT ... ON CONFLICT DO
-- NOTHING + a row-count check against a real unique constraint). Two
-- concurrent/duplicate calls (double-tap, a naive client retry) within the
-- same window could both pass the EXISTS check and both insert a completion
-- row, each granting a growth_pill — a duplicate reward.
--
-- Fix: add a generated `claim_day` column + a unique constraint on
-- (user_id, grade, claim_day), then make the insert idempotent against it
-- the same way every other claim RPC here already does.
--
-- IF NOT EXISTS / explicit existence check, not bare ADD COLUMN / ADD CONSTRAINT: this PR
-- was already applied directly to production back on 2026-09-14 (its own summary says so),
-- but never went through migration tracking until today, well after this repo's CI started
-- requiring idempotency (see docs/database-migrations.md) -- a bare re-run against production,
-- where both already exist, would fail outright.
ALTER TABLE public.mtap_mixed_trainer_completions
  ADD COLUMN IF NOT EXISTS claim_day date GENERATED ALWAYS AS ((created_at AT TIME ZONE 'utc')::date) STORED;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mtap_mixed_trainer_completions_user_grade_day_key'
      and conrelid = 'public.mtap_mixed_trainer_completions'::regclass
  ) then
    alter table public.mtap_mixed_trainer_completions
      add constraint mtap_mixed_trainer_completions_user_grade_day_key unique (user_id, grade, claim_day);
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.claim_mixed_trainer_reward(p_user_id text, p_grade integer, p_question_codes text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_distinct_count integer;
  v_verified_count integer;
  v_correct_count integer;
  v_already_today boolean;
  v_inserted integer;
BEGIN
  IF p_user_id IS DISTINCT FROM public.current_app_user_id() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT count(DISTINCT code) INTO v_distinct_count FROM unnest(p_question_codes) AS code;

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

  -- Cheap early exit for the common (non-racing) case — the real guard
  -- against a duplicate grant is the unique constraint below.
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
  VALUES (p_user_id, p_grade, v_distinct_count, v_correct_count)
  ON CONFLICT (user_id, grade, claim_day) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_claimed_today');
  END IF;

  PERFORM public.upsert_inventory(p_user_id, 'growth_pill', 1);

  RETURN jsonb_build_object('granted', true, 'growth_pills', 1);
END;
$function$;
