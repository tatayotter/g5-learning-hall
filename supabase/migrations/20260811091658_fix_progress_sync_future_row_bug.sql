-- Bug fix found while verifying Phase 4 Wave 1 in the browser preview (see
-- docs/weekly-progress-redesign-plan.md): the "latest row with non-null character_stats"
-- heuristic used by sync_weekly_packages_to_progress (and the Phase 2 backfill) is NOT
-- equivalent to "the current live row" -- it can be fooled by a future/pre-staged week whose
-- character_stats got reset to zeroed defaults instead of staying NULL. This is exactly the
-- carry-forward bug class this whole redesign exists to fix, caught live in production data:
-- tala's 2026-08-16 row (a future week) has character_stats = {level:1, xp:0, gold:0} instead of
-- NULL, sitting after her real 2026-08-09 progress (level 9). The trigger picked up the bad
-- future row as "latest," giving player_progress the wrong level for her.
--
-- The splash screen (components/SplashScreen.tsx) never had this bug -- it queries the CURRENT
-- week's exact row (`.eq('week_starting_date', weekDate)`), never "latest available." Fix:
-- constrain the trigger's "latest known good row" lookup to `week_starting_date <=
-- current_week_start()`, matching that same "never look into the future" invariant, then
-- correct the data already poisoned by the old unconstrained lookup.

CREATE OR REPLACE FUNCTION public.sync_weekly_packages_to_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_grade integer;
  v_content_week_id uuid;
  v_level integer;
  v_xp integer;
  v_gold integer;
  v_mastery_count integer;
  v_purchased_items integer;
  v_honor_grants integer;
begin
  v_grade := public.resolve_user_grade(NEW.user_id);
  IF v_grade IS NULL THEN
    RETURN NEW; -- unresolvable user (demo/test/unknown) -- not synced, matches Phase 2 scope
  END IF;

  -- NEVER look at a future/not-yet-current week here -- a pre-staged row can have non-null
  -- but wrong (zeroed) character_stats, not just NULL. See migration header.
  SELECT (character_stats->>'level')::int, (character_stats->>'xp')::int, (character_stats->>'gold')::int,
         mastery_count, purchased_items, honor_grants
  INTO v_level, v_xp, v_gold, v_mastery_count, v_purchased_items, v_honor_grants
  FROM public.weekly_packages
  WHERE user_id = NEW.user_id
    AND character_stats IS NOT NULL
    AND week_starting_date <= public.current_week_start()
  ORDER BY week_starting_date DESC
  LIMIT 1;

  INSERT INTO public.player_progress (
    user_id, level, xp, gold, mastery_count, purchased_items, honor_grants,
    guild_sessions_count_total, monster_battles_won_total, sibling_battles_won_total,
    perfect_quizzes_total, dummy_battles_won_total, eggs_hatched_total, curios_graduated_total,
    trades_completed_total, legendaries_caught_total, tutor_rerolls_total,
    tatay_battles_won_total, tatay_battles_lost_total
  )
  SELECT
    NEW.user_id,
    COALESCE(v_level, 1), COALESCE(v_xp, 0), COALESCE(v_gold, 0),
    COALESCE(v_mastery_count, 0), COALESCE(v_purchased_items, 0), COALESCE(v_honor_grants, 0),
    COALESCE(SUM(guild_sessions_count), 0), COALESCE(SUM(monster_battles_won), 0), COALESCE(SUM(sibling_battles_won), 0),
    COALESCE(SUM(perfect_quizzes), 0), COALESCE(SUM(dummy_battles_won), 0), COALESCE(SUM(eggs_hatched), 0), COALESCE(SUM(curios_graduated), 0),
    COALESCE(SUM(trades_completed), 0), COALESCE(SUM(legendaries_caught), 0), COALESCE(SUM(tutor_rerolls), 0),
    COALESCE(SUM(tatay_battles_won), 0), COALESCE(SUM(tatay_battles_lost), 0)
  FROM public.weekly_packages
  WHERE user_id = NEW.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    level = EXCLUDED.level, xp = EXCLUDED.xp, gold = EXCLUDED.gold,
    mastery_count = EXCLUDED.mastery_count, purchased_items = EXCLUDED.purchased_items, honor_grants = EXCLUDED.honor_grants,
    guild_sessions_count_total = EXCLUDED.guild_sessions_count_total,
    monster_battles_won_total = EXCLUDED.monster_battles_won_total,
    sibling_battles_won_total = EXCLUDED.sibling_battles_won_total,
    perfect_quizzes_total = EXCLUDED.perfect_quizzes_total,
    dummy_battles_won_total = EXCLUDED.dummy_battles_won_total,
    eggs_hatched_total = EXCLUDED.eggs_hatched_total,
    curios_graduated_total = EXCLUDED.curios_graduated_total,
    trades_completed_total = EXCLUDED.trades_completed_total,
    legendaries_caught_total = EXCLUDED.legendaries_caught_total,
    tutor_rerolls_total = EXCLUDED.tutor_rerolls_total,
    tatay_battles_won_total = EXCLUDED.tatay_battles_won_total,
    tatay_battles_lost_total = EXCLUDED.tatay_battles_lost_total,
    updated_at = now();

  SELECT id INTO v_content_week_id
  FROM public.content_weeks
  WHERE grade = v_grade AND week_starting_date = NEW.week_starting_date;

  IF v_content_week_id IS NOT NULL THEN
    INSERT INTO public.player_weekly_journal (
      user_id, content_week_id, journal_logs, mastery_count, purchased_items,
      honor_grants, quiz_attempts, mastered_quizzes
    ) VALUES (
      NEW.user_id, v_content_week_id,
      COALESCE(NEW.journal_logs, '{}'::jsonb), COALESCE(NEW.mastery_count, 0), COALESCE(NEW.purchased_items, 0),
      COALESCE(NEW.honor_grants, 0), COALESCE(NEW.quiz_attempts, '{}'::jsonb), COALESCE(NEW.mastered_quizzes, '[]'::jsonb)
    )
    ON CONFLICT (user_id, content_week_id) DO UPDATE SET
      journal_logs = EXCLUDED.journal_logs,
      mastery_count = EXCLUDED.mastery_count,
      purchased_items = EXCLUDED.purchased_items,
      honor_grants = EXCLUDED.honor_grants,
      quiz_attempts = EXCLUDED.quiz_attempts,
      mastered_quizzes = EXCLUDED.mastered_quizzes,
      updated_at = now();
  END IF;

  RETURN NEW;
end;
$function$;

-- Data correction: re-derive level/xp/gold/mastery_count/purchased_items/honor_grants for every
-- existing player_progress row using the corrected (week_starting_date <= current_week_start())
-- rule, same as the fixed trigger now uses. This is a read of weekly_packages (unchanged,
-- untouched) re-projected onto player_progress -- not a guess, a recomputation from the same
-- source of truth the trigger already uses.
UPDATE public.player_progress pp
SET level = COALESCE((latest.character_stats->>'level')::int, 1),
    xp = COALESCE((latest.character_stats->>'xp')::int, 0),
    gold = COALESCE((latest.character_stats->>'gold')::int, 0),
    mastery_count = COALESCE(latest.mastery_count, 0),
    purchased_items = COALESCE(latest.purchased_items, 0),
    honor_grants = COALESCE(latest.honor_grants, 0),
    updated_at = now()
FROM (
  SELECT DISTINCT ON (user_id) user_id, character_stats, mastery_count, purchased_items, honor_grants
  FROM public.weekly_packages
  WHERE character_stats IS NOT NULL
    AND week_starting_date <= public.current_week_start()
  ORDER BY user_id, week_starting_date DESC
) latest
WHERE latest.user_id = pp.user_id;
