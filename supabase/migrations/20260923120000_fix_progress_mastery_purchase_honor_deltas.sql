-- Fixes player_progress.mastery_count / purchased_items / honor_grants being silently
-- overwritten with THIS WEEK's (reset-to-0-weekly) value on nearly every save.
--
-- BUG: apply_progress_update (Phase 4 Wave 4) treated p_mastery_count / p_purchased_items /
-- p_honor_grants as ABSOLUTE values (`mastery_count = COALESCE(p_mastery_count, mastery_count)`),
-- and hooks/useWeeklyData.ts's updateStatsAndJournal sent it the WeeklyData value — which
-- EMPTY_JOURNAL_FIELDS zeroes every week — on every call, whether or not that call had
-- anything to do with masteries/purchases/honors. So every quest completion, guild session,
-- battle win, or vault claim reset the lifetime totals to whatever this week's count was.
-- Confirmed against production (2026-09-24): the two most active accounts each had 60-80
-- perfect quizzes and 67-85 "Completed X" player_log rows but mastery_count = 6, and
-- purchased_items = 0 despite 114-175 reward_claims.
--
-- FIX (SQL half; the client half is in hooks/useWeeklyData.ts and ships in a FOLLOW-UP PR,
-- merged only after this migration has been approved and applied): three NEW params,
-- p_mastery_delta / p_purchased_items_delta / p_honor_grants_delta, ADDED to the lifetime
-- totals — exactly how the 12 *_total counters on the same function already work. The three
-- old absolute params stay in the signature (so callers using them still resolve) but are
-- now IGNORED. New params are appended last with defaults, so no positional caller shifts.
--
-- Because the signature changes, CREATE OR REPLACE alone would leave the old function in
-- place next to the new one (a second overload — PostgREST then can't disambiguate). So the
-- old signature is DROPped first, and the grants are re-stated explicitly, matching the live
-- ACL (postgres, anon, authenticated, service_role; nothing for PUBLIC) — a DROP discards them.
--
-- ROLLOUT: planned order is this migration FIRST (merge, then approve in
-- deploy-migrations.yml), the client PR after. Old clients keep working against the new DB
-- (row 2 below). The other rows cover deploy-order skew regardless — a merge deploys the
-- client at once, while a migration waits on the manual approval click:
--   new client + old DB   the client sends the *_delta params, gets PGRST202 (unknown named
--                         params), retries without them. xp/gold/other counters save
--                         normally; the 3 lifetime counters just don't move (the old function
--                         keeps a counter when its absolute param is NULL) until this lands.
--   old client + new DB   (browser tabs open across the deploy) the old client sends this
--                         week's absolute value in p_mastery_count etc. Ignored here — so it
--                         can neither clobber nor inflate the totals. Those tabs' increments
--                         to the 3 counters are skipped until they reload; nothing else changes.
--   new client + new DB   the intended end state.
--   old client + old DB   today's bug; this migration's backfill repairs it.
-- (Same optional-param-first pattern as p_count_lifetime in 20260922014300_guild_session_idempotency.)
--
-- The identity check (`p_user_id IS DISTINCT FROM current_app_user_id()`) is preserved as it
-- exists in the LIVE function (verified against production 2026-09-24 — it is NOT in the
-- earlier wave4_journal_write_path migration, which this replaces).
--
-- BACKFILL: recompute mastery_count and purchased_items from insert-only sources of truth:
--   mastery_count   <- player_log rows: action_type 'quiz', description 'Completed %' (written
--                      once per perfect main-quest completion, ActiveQuestView.tsx; the event
--                      quiz path uses 'event_quiz', and curio-training rows use a different
--                      description, so neither is counted)
--   purchased_items <- reward_claims rows (one per Reward Vault claim — the only thing that
--                      increments purchased_items; Curio Arena Shop buys log a 'purchase' row
--                      but never counted toward it, so player_log 'purchase' is NOT used)
-- honor_grants is NOT backfilled: admin_award_progress_gold never wrote a player_log row, so
-- there is no trail to reconstruct it from. Grants already lost to the clobber are gone; this
-- stops any further loss. The backfill only ever RAISES a value (GREATEST), never lowers it.
--
-- Idempotent: DROP ... IF EXISTS + CREATE OR REPLACE (a re-run replaces the new function with
-- itself), GRANT/REVOKE are repeatable, and the UPDATE recomputes from source tables (only
-- touching rows whose current value is below what the ledgers show).

DROP FUNCTION IF EXISTS public.apply_progress_update(
  text, integer, integer, integer, integer, integer, integer, integer, integer, integer,
  integer, integer, integer, integer, integer, integer, integer, integer, text[]
);

CREATE OR REPLACE FUNCTION public.apply_progress_update(
  p_user_id text,
  p_xp_delta integer DEFAULT 0,
  p_gold_delta integer DEFAULT 0,
  -- DEPRECATED: p_mastery_count / p_purchased_items / p_honor_grants were absolute values
  -- and are ignored now; use the *_delta params at the end of the list.
  p_mastery_count integer DEFAULT NULL,
  p_purchased_items integer DEFAULT NULL,
  p_honor_grants integer DEFAULT NULL,
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
  p_honor_grants_delta integer DEFAULT 0
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

  final_xp := cur_xp + p_xp_delta;
  final_level := cur_level;
  final_gold := cur_gold + p_gold_delta;

  WHILE final_xp >= (500 + final_level * 100) LOOP
    final_xp := final_xp - (500 + final_level * 100);
    final_level := final_level + 1;
  END LOOP;

  new_achievements := COALESCE(cur_achievements, '{}'::jsonb);
  FOREACH aid IN ARRAY p_new_achievement_ids LOOP
    new_achievements := jsonb_set(new_achievements, ARRAY[aid], 'true'::jsonb, true);
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
  RETURNING jsonb_build_object('level', level, 'xp', xp, 'gold', gold) INTO result;

  RETURN result;
end;
$function$;

REVOKE ALL ON FUNCTION public.apply_progress_update(
  text, integer, integer, integer, integer, integer, integer, integer, integer, integer,
  integer, integer, integer, integer, integer, integer, integer, integer, text[],
  integer, integer, integer
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_progress_update(
  text, integer, integer, integer, integer, integer, integer, integer, integer, integer,
  integer, integer, integer, integer, integer, integer, integer, integer, text[],
  integer, integer, integer
) TO authenticated;

-- Backfill (see header for sources and why honor_grants is left alone).
-- GREATEST(current, reconstructed): the bug only ever LOST counts, so this only raises. A
-- few small accounts already hold a higher value than the ledgers show (e.g. vault claims
-- that predate reward_claims) and must not be lowered. Previewed against production
-- 2026-09-24: 4 rows change (the two most active accounts gain 61 and 79 masteries and
-- 114 and 175 purchases; two small accounts gain 2-3 masteries); every other row unchanged.
UPDATE public.player_progress pp
SET mastery_count = GREATEST(pp.mastery_count, counts.mastery_count),
    purchased_items = GREATEST(pp.purchased_items, counts.purchased_items),
    updated_at = now()
FROM (
  SELECT
    p.user_id,
    (SELECT count(*) FROM public.player_log l
       WHERE l.user_id = p.user_id AND l.action_type = 'quiz' AND l.description LIKE 'Completed %')::integer AS mastery_count,
    (SELECT count(*) FROM public.reward_claims rc
       WHERE rc.app_user_id = p.user_id)::integer AS purchased_items
  FROM public.player_progress p
) counts
WHERE counts.user_id = pp.user_id
  AND (counts.mastery_count > pp.mastery_count
    OR counts.purchased_items > pp.purchased_items);
