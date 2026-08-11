-- Phase 3 of the weekly-progress redesign (see docs/weekly-progress-redesign-plan.md).
--
-- Dual-write via a DB trigger instead of touching app call sites. Every INSERT/UPDATE on
-- weekly_packages (from ANY existing call site -- apply_character_deltas, increment_weekly_counter,
-- admin_* RPCs, offline sync replay, boss fight claims, direct client .update()s -- present or
-- future) now automatically mirrors into player_progress and player_weekly_journal. This is
-- more robust than manually duplicating writes at each of the ~8 TS call sites: it can't be
-- missed by a call site nobody remembered to update.
--
-- Reads still come from weekly_packages/weekly_packages_public -- nothing in the app reads the
-- new tables yet. That's Phase 4.
--
-- Scope matches Phase 2's backfill decision: only users resolvable to a grade (content owners in
-- grade_content_owners, or real students in children/classmates) get synced. demo_*/QA/unknown
-- users are silently skipped -- same "real accounts only" boundary as the backfill.
--
-- Known limitation, accepted for this phase: `achievements` (unlock-flag jsonb) is NOT merged
-- by this trigger -- Phase 4 will redesign achievement checks to read player_progress's lifetime
-- counters directly rather than the per-week weekly_packages.achievements blob, making a mirror
-- of the old semantics moot. The one-time backfill already captured historical achievements as
-- of 2026-08-11; anything unlocked between now and Phase 4 cutover won't appear in
-- player_progress.achievements until Phase 4 recomputes it properly.

-- ============================================================================
-- resolve_user_grade(): grade lookup used only by the sync trigger. Checks the content-owner
-- mapping first (covers legacy damien/tala, who predate children/classmates), then the real
-- children/classmates tables (grade stored as free text like "Grade 5" -- extract the digits).
-- Returns NULL for anything unresolvable (demo/test/unknown), which the trigger treats as
-- "don't sync this user".
-- ============================================================================
CREATE OR REPLACE FUNCTION public.resolve_user_grade(p_user_id text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $$
  SELECT COALESCE(
    (SELECT grade FROM public.grade_content_owners WHERE user_id = p_user_id),
    (SELECT NULLIF(regexp_replace(c.grade, '\D', '', 'g'), '')::int FROM public.children c WHERE c.id = p_user_id),
    (SELECT NULLIF(regexp_replace(cm.grade, '\D', '', 'g'), '')::int FROM public.classmates cm WHERE cm.id = p_user_id)
  );
$$;

-- ============================================================================
-- sync_weekly_packages_to_progress(): AFTER INSERT/UPDATE trigger function.
-- Recomputes the affected user's full lifetime totals from scratch on every write (cheap at
-- this data volume) rather than tracking incremental deltas, so it's correct-by-construction
-- and self-healing -- no drift possible between weekly_packages and player_progress.
-- ============================================================================
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
begin
  v_grade := public.resolve_user_grade(NEW.user_id);
  IF v_grade IS NULL THEN
    RETURN NEW; -- unresolvable user (demo/test/unknown) -- not synced, matches Phase 2 scope
  END IF;

  SELECT (character_stats->>'level')::int, (character_stats->>'xp')::int, (character_stats->>'gold')::int
  INTO v_level, v_xp, v_gold
  FROM public.weekly_packages
  WHERE user_id = NEW.user_id AND character_stats IS NOT NULL
  ORDER BY week_starting_date DESC
  LIMIT 1;

  INSERT INTO public.player_progress (
    user_id, level, xp, gold,
    guild_sessions_count_total, monster_battles_won_total, sibling_battles_won_total,
    perfect_quizzes_total, dummy_battles_won_total, eggs_hatched_total, curios_graduated_total,
    trades_completed_total, legendaries_caught_total, tutor_rerolls_total,
    tatay_battles_won_total, tatay_battles_lost_total
  )
  SELECT
    NEW.user_id,
    COALESCE(v_level, 1), COALESCE(v_xp, 0), COALESCE(v_gold, 0),
    COALESCE(SUM(guild_sessions_count), 0), COALESCE(SUM(monster_battles_won), 0), COALESCE(SUM(sibling_battles_won), 0),
    COALESCE(SUM(perfect_quizzes), 0), COALESCE(SUM(dummy_battles_won), 0), COALESCE(SUM(eggs_hatched), 0), COALESCE(SUM(curios_graduated), 0),
    COALESCE(SUM(trades_completed), 0), COALESCE(SUM(legendaries_caught), 0), COALESCE(SUM(tutor_rerolls), 0),
    COALESCE(SUM(tatay_battles_won), 0), COALESCE(SUM(tatay_battles_lost), 0)
  FROM public.weekly_packages
  WHERE user_id = NEW.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    level = EXCLUDED.level, xp = EXCLUDED.xp, gold = EXCLUDED.gold,
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
  -- else: no content_weeks row for this grade/week yet (content not authored). Progress still
  -- synced above; journal sync catches up next time this row is written after content exists.

  RETURN NEW;
end;
$function$;

DROP TRIGGER IF EXISTS trg_sync_weekly_packages_to_progress ON public.weekly_packages;
CREATE TRIGGER trg_sync_weekly_packages_to_progress
  AFTER INSERT OR UPDATE ON public.weekly_packages
  FOR EACH ROW EXECUTE FUNCTION public.sync_weekly_packages_to_progress();
