-- Make apply_progress_update the judge of which achievements are really new.
--
-- The client decides an achievement is newly unlocked by checking its own copy
-- of player_progress.achievements, then sends the id plus the achievement's
-- XP/gold folded into p_xp_delta / p_gold_delta. A second tab or device on the
-- same account holds an older copy, so it re-awards achievements the account
-- already has: the jsonb merge below stored each one once, but the reward was
-- paid again and a duplicate "Unlocked achievement" row was logged every time.
-- Observed 2026-10-09: one account re-awarded 7 achievements in two bursts
-- 10-15 minutes apart (7 of 605 awards since the 2026-09-24 client fix).
--
-- New trailing param p_achievement_rewards: {"<id>": {"xp": n, "gold": n}} for
-- the ids in p_new_achievement_ids. For any id the row ALREADY has (checked
-- under the row lock, so overlapping saves serialize), its reward is taken back
-- out of the deltas before the daily cap is applied. The result now also
-- carries:
--   new_achievement_ids  ids that were actually new for this account (the
--                        client logs only these)
--   achievements         the full merged map, so a stale tab catches up
--
-- Compatibility: an old client omits p_achievement_rewards, so nothing is
-- subtracted (same behaviour as before) and it ignores the extra result keys.
-- A new client against the old function gets PGRST202 and retries without the
-- new param (see hooks/useWeeklyData.ts).
--
-- The lock now comes before consume_reward_allowance (it used to come after)
-- so the duplicate check and the cap see the same row state; the allowance
-- helper only touches reward_daily_ledger, so the order is safe.
--
-- Idempotent: DROP ... IF EXISTS + CREATE OR REPLACE, repeatable GRANT/REVOKE.

DROP FUNCTION IF EXISTS public.apply_progress_update(
  text, integer, integer, integer, integer, integer, integer, integer, integer, integer,
  integer, integer, integer, integer, integer, integer, integer, integer, text[],
  integer, integer, integer
);

CREATE OR REPLACE FUNCTION public.apply_progress_update(
  p_user_id text,
  p_xp_delta integer DEFAULT 0,
  p_gold_delta integer DEFAULT 0,
  -- DEPRECATED: absolute values, ignored; use the *_delta params at the end of the list.
  p_mastery_count integer DEFAULT NULL::integer,
  p_purchased_items integer DEFAULT NULL::integer,
  p_honor_grants integer DEFAULT NULL::integer,
  p_guild_sessions_delta integer DEFAULT 0,
  p_monster_battles_won_delta integer DEFAULT 0,
  p_sibling_battles_won_delta integer DEFAULT 0,
  p_perfect_quizzes_delta integer DEFAULT 0,
  p_dummy_battles_won_delta integer DEFAULT 0,
  p_eggs_hatched_delta integer DEFAULT 0,
  p_curios_graduated_delta integer DEFAULT 0,
  p_trades_completed_delta integer DEFAULT 0,
  p_legendaries_caught_delta integer DEFAULT 0,
  p_tutor_rerolls_delta integer DEFAULT 0,
  p_tatay_battles_won_delta integer DEFAULT 0,
  p_tatay_battles_lost_delta integer DEFAULT 0,
  p_new_achievement_ids text[] DEFAULT '{}'::text[],
  p_mastery_delta integer DEFAULT 0,
  p_purchased_items_delta integer DEFAULT 0,
  p_honor_grants_delta integer DEFAULT 0,
  p_achievement_rewards jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  cur_xp integer;
  cur_gold integer;
  cur_level integer;
  cur_achievements jsonb;
  final_xp integer;
  final_level integer;
  final_gold integer;
  new_achievements jsonb;
  aid text;
  v_new_achievement_ids text[] := '{}'::text[];
  v_xp integer := coalesce(p_xp_delta, 0);
  v_gold integer := coalesce(p_gold_delta, 0);
  v_rewards jsonb := coalesce(p_achievement_rewards, '{}'::jsonb);
  v_allowed record;
  result jsonb;
begin
  IF p_user_id IS DISTINCT FROM public.current_app_user_id() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.player_progress (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT xp, gold, level, achievements INTO cur_xp, cur_gold, cur_level, cur_achievements
  FROM public.player_progress
  WHERE user_id = p_user_id
  FOR UPDATE;

  new_achievements := COALESCE(cur_achievements, '{}'::jsonb);

  -- Already-owned ids are not new: take their reward back out of the deltas.
  -- Rewards are clamped at >= 0 so a crafted payload can only reduce its own gain.
  FOR aid IN SELECT DISTINCT a FROM unnest(coalesce(p_new_achievement_ids, '{}'::text[])) AS a WHERE a IS NOT NULL LOOP
    IF new_achievements -> aid IS NOT NULL AND new_achievements -> aid <> 'false'::jsonb THEN
      IF jsonb_typeof(v_rewards -> aid) = 'object' THEN
        v_xp := v_xp - greatest(coalesce((v_rewards -> aid ->> 'xp')::integer, 0), 0);
        v_gold := v_gold - greatest(coalesce((v_rewards -> aid ->> 'gold')::integer, 0), 0);
      END IF;
    ELSE
      v_new_achievement_ids := v_new_achievement_ids || aid;
      new_achievements := jsonb_set(new_achievements, ARRAY[aid], 'true'::jsonb, true);
    END IF;
  END LOOP;

  -- Daily cap on gains requested by a player session (see 20261004180000_daily_reward_caps).
  IF v_xp > 0 OR v_gold > 0 THEN
    SELECT * INTO v_allowed FROM public.consume_reward_allowance(p_user_id, v_xp, v_gold, 0);
    IF v_xp > 0 THEN v_xp := v_allowed.xp; END IF;
    IF v_gold > 0 THEN v_gold := v_allowed.gold; END IF;
  END IF;

  final_xp := cur_xp + v_xp;
  final_level := cur_level;
  final_gold := cur_gold + v_gold;

  WHILE final_xp >= (500 + final_level * 100) LOOP
    final_xp := final_xp - (500 + final_level * 100);
    final_level := final_level + 1;
  END LOOP;

  UPDATE public.player_progress SET
    xp = final_xp,
    level = final_level,
    gold = final_gold,
    mastery_count = mastery_count + COALESCE(p_mastery_delta, 0),
    purchased_items = purchased_items + COALESCE(p_purchased_items_delta, 0),
    honor_grants = honor_grants + COALESCE(p_honor_grants_delta, 0),
    guild_sessions_count_total = guild_sessions_count_total + p_guild_sessions_delta,
    monster_battles_won_total = monster_battles_won_total + p_monster_battles_won_delta,
    sibling_battles_won_total = sibling_battles_won_total + p_sibling_battles_won_delta,
    perfect_quizzes_total = perfect_quizzes_total + p_perfect_quizzes_delta,
    dummy_battles_won_total = dummy_battles_won_total + p_dummy_battles_won_delta,
    eggs_hatched_total = eggs_hatched_total + p_eggs_hatched_delta,
    curios_graduated_total = curios_graduated_total + p_curios_graduated_delta,
    trades_completed_total = trades_completed_total + p_trades_completed_delta,
    legendaries_caught_total = legendaries_caught_total + p_legendaries_caught_delta,
    tutor_rerolls_total = tutor_rerolls_total + p_tutor_rerolls_delta,
    tatay_battles_won_total = tatay_battles_won_total + p_tatay_battles_won_delta,
    tatay_battles_lost_total = tatay_battles_lost_total + p_tatay_battles_lost_delta,
    achievements = new_achievements,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING jsonb_build_object(
    'level', level, 'xp', xp, 'gold', gold,
    'new_achievement_ids', to_jsonb(v_new_achievement_ids),
    'achievements', achievements
  ) INTO result;

  RETURN result;
end;
$function$;

REVOKE ALL ON FUNCTION public.apply_progress_update(
  text, integer, integer, integer, integer, integer, integer, integer, integer, integer,
  integer, integer, integer, integer, integer, integer, integer, integer, text[],
  integer, integer, integer, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_progress_update(
  text, integer, integer, integer, integer, integer, integer, integer, integer, integer,
  integer, integer, integer, integer, integer, integer, integer, integer, text[],
  integer, integer, integer, jsonb
) TO authenticated;
