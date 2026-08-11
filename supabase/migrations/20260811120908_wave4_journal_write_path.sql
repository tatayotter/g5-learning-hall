-- Phase 4 "Wave 4" (see docs/weekly-progress-redesign-plan.md): moves the LAST remaining write
-- path off weekly_packages. Waves 1-3 moved stats/content reads and stats writes off it, but
-- journal_logs/counters/quiz_attempts/mastered_quizzes/achievements were left on the original
-- weekly_packages carry-forward machinery -- including the exact fetch-error/carry-forward bug
-- class this whole redesign exists to kill (see hooks/useWeeklyData.ts's old fetchData, which
-- carried forward mastery_count/purchased_items/honor_grants and defaulted everything else to
-- zero on every new week, guarded only by client-side error handling).
--
-- player_weekly_journal (Phase 1) was already being dual-written to by the sync trigger, but
-- only mirrored journal_logs/mastery_count/purchased_items/honor_grants/quiz_attempts/
-- mastered_quizzes -- not the 12 per-week battle/activity counters (those only existed on
-- weekly_packages, reset-to-zero client-side on a new week, summed into player_progress's
-- *_total columns by the trigger). Adding them here so player_weekly_journal becomes a complete
-- replacement, not a partial one.

ALTER TABLE public.player_weekly_journal
  ADD COLUMN IF NOT EXISTS guild_sessions_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monster_battles_won integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sibling_battles_won integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perfect_quizzes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dummy_battles_won integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eggs_hatched integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS curios_graduated integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trades_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS legendaries_caught integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tutor_rerolls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tatay_battles_won integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tatay_battles_lost integer NOT NULL DEFAULT 0;

-- One-shot atomic write for hooks/useWeeklyData.ts's updateStatsAndJournal: applies the xp/gold
-- delta + level-up (same formula as apply_progress_deltas), sets mastery_count/purchased_items/
-- honor_grants to their new absolute values (these have always behaved as lifetime-equivalent
-- carried-forward values, not weekly resets -- unchanged semantics, just written directly now
-- instead of via weekly_packages carry-forward), increments the 12 lifetime *_total counters by
-- the given per-call deltas (replaces the old trigger's SUM-over-weekly_packages approach, which
-- only worked because weekly_packages existed as the row to sum), and merges any newly-unlocked
-- achievement ids into player_progress.achievements (previously stored per-week on
-- weekly_packages.achievements and never actually synced to player_progress at all -- this is
-- also a correctness fix, achievements should only ever unlock once, lifetime, not per week).
-- journal_logs/quiz_attempts/mastered_quizzes/the 12 this-week counter values are NOT written
-- here -- the client upserts those directly to player_weekly_journal (RLS already allows a user
-- to write their own row; no SECURITY DEFINER needed for that half).
CREATE OR REPLACE FUNCTION public.apply_progress_update(
  p_user_id text,
  p_xp_delta integer DEFAULT 0,
  p_gold_delta integer DEFAULT 0,
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
  p_new_achievement_ids text[] DEFAULT '{}'
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
    mastery_count = COALESCE(p_mastery_count, mastery_count),
    purchased_items = COALESCE(p_purchased_items, purchased_items),
    honor_grants = COALESCE(p_honor_grants, honor_grants),
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

REVOKE ALL ON FUNCTION public.apply_progress_update FROM public;
GRANT EXECUTE ON FUNCTION public.apply_progress_update TO authenticated;
