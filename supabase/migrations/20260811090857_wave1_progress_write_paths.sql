-- Phase 4, Wave 1 of the weekly-progress redesign (see docs/weekly-progress-redesign-plan.md
-- and the approved plan in this session). Cuts the WRITE path over to player_progress, which is
-- what actually kills the carry-forward/null-sentinel bug class that started this whole redesign
-- (the Phase 3 dual-write trigger only mirrors weekly_packages writes -- it doesn't prevent a bad
-- one).
--
-- Also fixes a design gap found while writing this migration: mastery_count, purchased_items,
-- and honor_grants are NOT weekly-reset fields (useWeeklyData.ts's carriedForward object carries
-- them forward every week, same treatment as character_stats) -- they should have been on
-- player_progress from Phase 1, not player_weekly_journal. Corrected here: added to
-- player_progress, backfilled from each user's latest known-good row, and kept (redundantly, for
-- now) on player_weekly_journal too since the Phase 3 trigger already populates it there and nothing
-- reads player_weekly_journal yet -- Wave 2/3 will decide the final read-side home.

-- ============================================================================
-- Schema fix: add the 3 misplaced-in-Phase-1 fields to player_progress.
-- ============================================================================
ALTER TABLE public.player_progress ADD COLUMN IF NOT EXISTS mastery_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_progress ADD COLUMN IF NOT EXISTS purchased_items integer NOT NULL DEFAULT 0;
ALTER TABLE public.player_progress ADD COLUMN IF NOT EXISTS honor_grants integer NOT NULL DEFAULT 0;

-- One-time correction: backfill the 3 new columns for whatever rows the Phase 2 backfill /
-- Phase 3 trigger already created, from each user's latest non-null-character_stats row (same
-- "latest known good" rule the trigger itself uses for level/xp/gold).
UPDATE public.player_progress pp
SET mastery_count = latest.mastery_count,
    purchased_items = latest.purchased_items,
    honor_grants = latest.honor_grants
FROM (
  SELECT DISTINCT ON (user_id) user_id, mastery_count, purchased_items, honor_grants
  FROM public.weekly_packages
  WHERE character_stats IS NOT NULL
  ORDER BY user_id, week_starting_date DESC
) latest
WHERE latest.user_id = pp.user_id;

-- ============================================================================
-- Trigger update: sync_weekly_packages_to_progress now also carries mastery_count/
-- purchased_items/honor_grants, using the same "latest known good row" lookup already done for
-- level/xp/gold (just extended to select 3 more columns).
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
  v_mastery_count integer;
  v_purchased_items integer;
  v_honor_grants integer;
begin
  v_grade := public.resolve_user_grade(NEW.user_id);
  IF v_grade IS NULL THEN
    RETURN NEW; -- unresolvable user (demo/test/unknown) -- not synced, matches Phase 2 scope
  END IF;

  SELECT (character_stats->>'level')::int, (character_stats->>'xp')::int, (character_stats->>'gold')::int,
         mastery_count, purchased_items, honor_grants
  INTO v_level, v_xp, v_gold, v_mastery_count, v_purchased_items, v_honor_grants
  FROM public.weekly_packages
  WHERE user_id = NEW.user_id AND character_stats IS NOT NULL
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

-- ============================================================================
-- apply_progress_deltas / record_progress_event already exist from Phase 1 and are unchanged.
-- New/rewritten RPCs below.
-- ============================================================================

-- Admin (passcode-gated): overwrites a user's player_progress level/xp/gold outright.
-- Auto-creates the row if it doesn't exist yet (unlike the old admin_set_character_stats, which
-- required a pre-existing weekly_packages row).
CREATE OR REPLACE FUNCTION public.admin_set_progress_stats(p_passcode text, p_user_id text, p_character_stats jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  INSERT INTO public.player_progress (user_id, level, xp, gold)
  VALUES (
    p_user_id,
    COALESCE((p_character_stats->>'level')::int, 1),
    COALESCE((p_character_stats->>'xp')::int, 0),
    COALESCE((p_character_stats->>'gold')::int, 0)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    level = EXCLUDED.level, xp = EXCLUDED.xp, gold = EXCLUDED.gold, updated_at = now();
END;
$function$;

-- Admin (passcode-gated): awards gold and bumps honor_grants on player_progress. Auto-creates
-- the row if needed.
CREATE OR REPLACE FUNCTION public.admin_award_progress_gold(p_passcode text, p_user_id text, p_amount integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  new_stats jsonb;
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  INSERT INTO public.player_progress (user_id, gold, honor_grants)
  VALUES (p_user_id, p_amount, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    gold = public.player_progress.gold + p_amount,
    honor_grants = public.player_progress.honor_grants + 1,
    updated_at = now()
  RETURNING jsonb_build_object('level', level, 'xp', xp, 'gold', gold) INTO new_stats;

  RETURN new_stats;
END;
$function$;

-- claim_boss_persona_victory: drop the week-keyed 5-arg version, replace with a 4-arg version
-- that calls apply_progress_deltas instead of apply_character_deltas. Different arg count means
-- CREATE OR REPLACE would just add an overload -- explicitly drop the old one so it can't still
-- be called with a stale signature.
DROP FUNCTION IF EXISTS public.claim_boss_persona_victory(text, date, integer, text, integer);

CREATE OR REPLACE FUNCTION public.claim_boss_persona_victory(p_user_id text, p_grade integer, p_subject text, p_term integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  inserted int;
  stats jsonb;
begin
  insert into public.boss_persona_defeats (user_id, grade, subject, term)
  values (p_user_id, p_grade, p_subject, p_term)
  on conflict do nothing;
  get diagnostics inserted = row_count;

  if inserted = 0 then
    return jsonb_build_object('newly_defeated', false);
  end if;

  stats := public.apply_progress_deltas(p_user_id, 200, 150);
  perform public.upsert_inventory(p_user_id, 'growth_pill', 1);

  return jsonb_build_object(
    'newly_defeated', true,
    'xp_gained', 200,
    'gold_gained', 150,
    'character_stats', stats
  );
end;
$function$;

-- respond_to_trade: drop the week-keyed 3-arg version, replace with a 2-arg version that reads/
-- writes gold on player_progress instead of weekly_packages (no more row-locking/looking up a
-- specific week's package), and uses current_week_start() (server-side, Phase 1) instead of a
-- client-supplied date for the player_log timestamp -- the last "trust the client's Sunday" call
-- site the original redesign plan flagged.
DROP FUNCTION IF EXISTS public.respond_to_trade(uuid, boolean, date);

CREATE OR REPLACE FUNCTION public.respond_to_trade(p_trade_id uuid, p_accept boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me text := public.current_app_user_id();
  v_trade record;
  v_total_items int;
  v_mismatch int;
  v_initiator_gold_fee int;
  v_recipient_gold_fee int;
  v_curio_fee int;
  v_initiator_total_fee int;
  v_recipient_total_fee int;
  v_initiator_debit int;
  v_recipient_debit int;
  v_lo text;
  v_hi text;
  v_initiator_bal int;
  v_recipient_bal int;
  v_initiator_items int;
  v_recipient_items int;
  v_week date := public.current_week_start();
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  select * into v_trade from public.trades where id = p_trade_id for update;
  if not found then
    raise exception 'trade not found';
  end if;
  if v_me <> v_trade.recipient_id then
    raise exception 'only the recipient can respond to this trade';
  end if;
  if v_trade.status <> 'pending' then
    return jsonb_build_object('status', v_trade.status);
  end if;

  if now() > v_trade.expires_at then
    update public.trades set status = 'expired' where id = p_trade_id;
    return jsonb_build_object('status', 'expired');
  end if;

  if not p_accept then
    update public.trades set status = 'declined', responded_at = now() where id = p_trade_id;
    return jsonb_build_object('status', 'declined');
  end if;

  select count(*) into v_mismatch
  from public.trade_items ti
  join public.user_monsters um on um.id = ti.user_monster_id
  where ti.trade_id = p_trade_id
    and ((ti.side = 'initiator' and um.user_id <> v_trade.initiator_id)
      or (ti.side = 'recipient' and um.user_id <> v_trade.recipient_id));

  if v_mismatch > 0 then
    update public.trades set status = 'failed', fail_reason = 'one or more curios changed hands before this trade was confirmed', responded_at = now()
      where id = p_trade_id;
    return jsonb_build_object('status', 'failed', 'reason', 'items_unavailable');
  end if;

  select count(*) filter (where side = 'initiator'), count(*) filter (where side = 'recipient'), count(*)
    into v_initiator_items, v_recipient_items, v_total_items
    from public.trade_items where trade_id = p_trade_id;

  v_curio_fee := 250 * v_total_items;
  v_initiator_gold_fee := case when v_trade.initiator_gold > 0 then greatest(1, ceil(v_trade.initiator_gold * 0.08)::int) else 0 end;
  v_recipient_gold_fee := case when v_trade.recipient_gold > 0 then greatest(1, ceil(v_trade.recipient_gold * 0.08)::int) else 0 end;

  v_initiator_total_fee := v_curio_fee + v_initiator_gold_fee;
  v_recipient_total_fee := v_recipient_gold_fee;

  v_initiator_debit := v_trade.initiator_gold + v_initiator_total_fee;
  v_recipient_debit := v_trade.recipient_gold + v_recipient_total_fee;

  v_lo := least(v_trade.initiator_id, v_trade.recipient_id);
  v_hi := greatest(v_trade.initiator_id, v_trade.recipient_id);

  insert into public.player_progress (user_id) values (v_lo) on conflict (user_id) do nothing;
  insert into public.player_progress (user_id) values (v_hi) on conflict (user_id) do nothing;

  perform 1 from public.player_progress where user_id = v_lo for update;
  perform 1 from public.player_progress where user_id = v_hi for update;

  select gold into v_initiator_bal from public.player_progress where user_id = v_trade.initiator_id;
  select gold into v_recipient_bal from public.player_progress where user_id = v_trade.recipient_id;

  if v_initiator_bal is null or v_recipient_bal is null then
    update public.trades set status = 'failed', fail_reason = 'missing player progress row', responded_at = now() where id = p_trade_id;
    return jsonb_build_object('status', 'failed', 'reason', 'no_player_progress');
  end if;

  if v_initiator_bal < v_initiator_debit then
    update public.trades set status = 'failed', fail_reason = 'initiator has insufficient gold', responded_at = now() where id = p_trade_id;
    return jsonb_build_object('status', 'failed', 'reason', 'initiator_insufficient_gold');
  end if;
  if v_recipient_bal < v_recipient_debit then
    update public.trades set status = 'failed', fail_reason = 'recipient has insufficient gold', responded_at = now() where id = p_trade_id;
    return jsonb_build_object('status', 'failed', 'reason', 'recipient_insufficient_gold');
  end if;

  update public.player_progress set gold = v_initiator_bal - v_initiator_debit + v_trade.recipient_gold, updated_at = now()
    where user_id = v_trade.initiator_id;

  update public.player_progress set gold = v_recipient_bal - v_recipient_debit + v_trade.initiator_gold, updated_at = now()
    where user_id = v_trade.recipient_id;

  update public.user_monsters um
    set user_id = v_trade.recipient_id, slot = null, acquired_via = 'traded'
    from public.trade_items ti
    where ti.trade_id = p_trade_id and ti.side = 'initiator' and um.id = ti.user_monster_id;

  update public.user_monsters um
    set user_id = v_trade.initiator_id, slot = null, acquired_via = 'traded'
    from public.trade_items ti
    where ti.trade_id = p_trade_id and ti.side = 'recipient' and um.id = ti.user_monster_id;

  update public.trades
    set status = 'completed', responded_at = now(),
        initiator_fee_gold = v_initiator_total_fee, recipient_fee_gold = v_recipient_total_fee
    where id = p_trade_id;

  insert into public.player_log (user_id, week_starting_date, action_type, description, xp_change, gold_change)
  values (
    v_trade.initiator_id, v_week, 'trade',
    format('🔄 Traded %s curio(s)%s with %s for %s curio(s)%s (fee: %s gold)',
      v_initiator_items,
      case when v_trade.initiator_gold > 0 then format(' + %s gold', v_trade.initiator_gold) else '' end,
      v_trade.recipient_id,
      v_recipient_items,
      case when v_trade.recipient_gold > 0 then format(' + %s gold', v_trade.recipient_gold) else '' end,
      v_initiator_total_fee
    ),
    0,
    v_trade.recipient_gold - v_initiator_debit
  );

  insert into public.player_log (user_id, week_starting_date, action_type, description, xp_change, gold_change)
  values (
    v_trade.recipient_id, v_week, 'trade',
    format('🔄 Traded %s curio(s)%s with %s for %s curio(s)%s%s',
      v_recipient_items,
      case when v_trade.recipient_gold > 0 then format(' + %s gold', v_trade.recipient_gold) else '' end,
      v_trade.initiator_id,
      v_initiator_items,
      case when v_trade.initiator_gold > 0 then format(' + %s gold', v_trade.initiator_gold) else '' end,
      case when v_recipient_total_fee > 0 then format(' (fee: %s gold)', v_recipient_total_fee) else '' end
    ),
    0,
    v_trade.initiator_gold - v_recipient_debit
  );

  return jsonb_build_object(
    'status', 'completed',
    'initiator_fee_gold', v_initiator_total_fee,
    'recipient_fee_gold', v_recipient_total_fee
  );
end;
$function$;
