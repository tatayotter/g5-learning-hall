-- Wave 1 (20260811090857) only migrated respond_to_trade and
-- claim_boss_persona_victory off weekly_packages. Four other live,
-- gold-bearing RPCs were left behind on that table. Since Wave 4
-- (20260811120908) removed the client-side carry-forward that used to
-- create a weekly_packages row for the current week, NOTHING creates that
-- row anymore -- these four RPCs were silently failing (or, worse for
-- claim_daily_checklist_bonus, silently never granting) for every account
-- except the handful backfilled on 2026-08-11. This also collides with the
-- scheduled 2026-08-16 Phase 5 soft-decommission, which renames the
-- weekly_packages-family tables away entirely.
--
-- tutor_curio, spend_gold_and_grant_item, claim_daily_checklist_bonus:
-- migrated to read/write gold on player_progress (lifetime, no week key,
-- auto-creates its row on first use), same pattern as Wave 1's
-- respond_to_trade. award_coins_to_child was already self-healing (it
-- inserts a missing weekly_packages row before writing, so the forward
-- sync trigger carried it through) but is migrated too so it doesn't keep
-- depending on a table scheduled for decommission.

-- ── tutor_curio ──────────────────────────────────────────────────────────
-- Drops the week param entirely — quality-tutoring gold cost has nothing to
-- do with a specific week, same reasoning as Wave 1's trade/battle RPCs.
DROP FUNCTION IF EXISTS public.tutor_curio(text, uuid, date, boolean);

CREATE OR REPLACE FUNCTION public.tutor_curio(p_user_id text, p_monster_row_id uuid, p_use_tome boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quality text;
  v_cost integer;
  v_tome_key text;
  v_has_tome boolean := false;
  v_current_gold integer;
  v_p_fail numeric := 0.688;
  v_p_good numeric := 0.25;
  v_p_outstanding numeric := 0.05;
  v_p_perfect numeric := 0.011;
  v_boost numeric := 0.10;
  v_success_mass numeric;
  v_roll numeric;
  v_rolled_tier text;
  v_rank_current integer;
  v_rank_rolled integer;
  v_new_quality text;
  v_success boolean := false;
  v_new_character_stats jsonb;
BEGIN
  SELECT quality INTO v_quality
  FROM user_monsters
  WHERE id = p_monster_row_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_quality = 'perfect' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_perfect');
  END IF;

  v_cost := CASE v_quality WHEN 'normal' THEN 15 WHEN 'good' THEN 30 WHEN 'outstanding' THEN 40 END;
  v_tome_key := CASE v_quality WHEN 'normal' THEN 'tome_novice' WHEN 'good' THEN 'tome_adept' WHEN 'outstanding' THEN 'tome_master' END;

  IF p_use_tome THEN
    UPDATE player_inventory
    SET quantity = quantity - 1, updated_at = now()
    WHERE app_user_id = p_user_id AND item_key = v_tome_key AND quantity > 0;
    IF FOUND THEN
      v_has_tome := true;
      v_success_mass := v_p_good + v_p_outstanding + v_p_perfect;
      v_p_good := v_p_good + v_boost * (v_p_good / v_success_mass);
      v_p_outstanding := v_p_outstanding + v_boost * (v_p_outstanding / v_success_mass);
      v_p_perfect := v_p_perfect + v_boost * (v_p_perfect / v_success_mass);
      v_p_fail := v_p_fail - v_boost;
    END IF;
  END IF;

  -- Gold check + deduction happens server-side, atomically with the roll,
  -- against player_progress instead of weekly_packages -- auto-creates the
  -- row on first use so there's no "no row for this user yet" failure mode.
  INSERT INTO player_progress (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT gold INTO v_current_gold FROM player_progress WHERE user_id = p_user_id FOR UPDATE;

  IF v_current_gold < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_gold');
  END IF;

  UPDATE player_progress
  SET gold = gold - v_cost, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING jsonb_build_object('level', level, 'xp', xp, 'gold', gold) INTO v_new_character_stats;

  v_roll := random();
  IF v_roll < v_p_perfect THEN
    v_rolled_tier := 'perfect';
  ELSIF v_roll < v_p_perfect + v_p_outstanding THEN
    v_rolled_tier := 'outstanding';
  ELSIF v_roll < v_p_perfect + v_p_outstanding + v_p_good THEN
    v_rolled_tier := 'good';
  ELSE
    v_rolled_tier := 'fail';
  END IF;

  v_rank_current := CASE v_quality WHEN 'normal' THEN 0 WHEN 'good' THEN 1 WHEN 'outstanding' THEN 2 WHEN 'perfect' THEN 3 END;
  v_rank_rolled := CASE v_rolled_tier WHEN 'fail' THEN -1 WHEN 'good' THEN 1 WHEN 'outstanding' THEN 2 WHEN 'perfect' THEN 3 END;

  v_new_quality := v_quality;
  IF v_rank_rolled > v_rank_current THEN
    v_new_quality := v_rolled_tier;
    v_success := true;
    UPDATE user_monsters SET quality = v_new_quality WHERE id = p_monster_row_id;
  END IF;

  RETURN jsonb_build_object(
    'success', v_success,
    'rolled_tier', v_rolled_tier,
    'previous_quality', v_quality,
    'new_quality', v_new_quality,
    'gold_spent', v_cost,
    'used_tome', v_has_tome,
    'character_stats', v_new_character_stats
  );
END;
$function$;

-- ── spend_gold_and_grant_item ────────────────────────────────────────────
-- purchased_items redirected to player_progress.purchased_items (the
-- lifetime column, Wave 4 schema) instead of weekly_packages' weekly copy --
-- the client already treats this counter as monotonic/carry-forward (see
-- useWeeklyData.ts's updateStatsAndJournal default `data?.purchased_items`),
-- so this matches existing behavior rather than introducing a new one.
DROP FUNCTION IF EXISTS public.spend_gold_and_grant_item(text, date, text, integer);

CREATE OR REPLACE FUNCTION public.spend_gold_and_grant_item(p_user_id text, p_item_key text, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  current_gold integer;
  unit_cost integer;
  total_cost integer;
  new_stats jsonb;
BEGIN
  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'invalid quantity';
  END IF;

  SELECT cost INTO unit_cost FROM public.shop_items WHERE key = p_item_key AND is_active;
  IF unit_cost IS NULL THEN
    RAISE EXCEPTION 'unknown or inactive item: %', p_item_key;
  END IF;
  total_cost := unit_cost * p_quantity;

  INSERT INTO public.player_progress (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT gold INTO current_gold FROM public.player_progress WHERE user_id = p_user_id FOR UPDATE;

  IF current_gold < total_cost THEN
    RAISE EXCEPTION 'insufficient gold';
  END IF;

  UPDATE public.player_progress
  SET gold = gold - total_cost,
      purchased_items = COALESCE(purchased_items, 0) + 1,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING jsonb_build_object('level', level, 'xp', xp, 'gold', gold) INTO new_stats;

  INSERT INTO public.player_inventory (app_user_id, item_key, quantity)
  VALUES (p_user_id, p_item_key, p_quantity)
  ON CONFLICT (app_user_id, item_key)
  DO UPDATE SET quantity = public.player_inventory.quantity + p_quantity, updated_at = now();

  RETURN new_stats;
END;
$function$;

-- ── claim_daily_checklist_bonus ──────────────────────────────────────────
-- Needs a grade param now (didn't before) to resolve this week's content --
-- journal_done/quest_done used to read weekly_packages.journal_logs/
-- package_data/mastered_quizzes directly; those columns haven't been
-- written to since Wave 3/4, so this check was silently stale even for the
-- backfilled accounts, not just missing for everyone else. Re-derived
-- against player_weekly_journal (this week's journal_logs/mastered_quizzes)
-- and content_questions_public (today's scheduled subjects), matching
-- lib/dailyChecklist.ts's isQuestDayDone client-side mirror exactly.
-- Also drops p_week_starting_date in favor of current_week_start()
-- server-side -- another "trust the client's Sunday" site removed.
DROP FUNCTION IF EXISTS public.claim_daily_checklist_bonus(text, date, text, date);

CREATE OR REPLACE FUNCTION public.claim_daily_checklist_bonus(p_user_id text, p_today date, p_day_name text, p_grade integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_week date := public.current_week_start();
  v_content_week_id uuid;
  v_journal_logs jsonb;
  v_mastered_quizzes jsonb;
  bs record;
  journal_done boolean;
  quest_done boolean;
  battle_done boolean;
  guild_done boolean;
  inserted int;
  v_prev_date date;
  v_prev_streak int;
  v_streak int;
  v_gold int;
begin
  select content_week_id into v_content_week_id
  from public.content_questions_public
  where grade = p_grade and week_starting_date = v_week
  limit 1;

  if v_content_week_id is not null then
    select journal_logs, mastered_quizzes into v_journal_logs, v_mastered_quizzes
    from public.player_weekly_journal
    where user_id = p_user_id and content_week_id = v_content_week_id;
  end if;

  journal_done := coalesce(v_journal_logs, '{}'::jsonb) ? p_today::text;

  -- "no subjects scheduled today" (weekend, or admin hasn't authored this
  -- week yet) counts as done, same as the old package_data-keys check did.
  quest_done := not exists (
    select 1 from (
      select distinct subject from public.content_questions_public
      where content_week_id = v_content_week_id and weekday = p_day_name
    ) subj
    where not (coalesce(v_mastered_quizzes, '[]'::jsonb) @> to_jsonb(array[p_day_name || '_' || subj.subject]))
  );

  select last_wild_encounter_win, guild_last_played into bs
  from public.user_battle_state
  where user_id = p_user_id;

  battle_done := (bs.last_wild_encounter_win = p_today);

  guild_done := (bs.guild_last_played ->> 'lorekeeper' = p_today::text)
    and (bs.guild_last_played ->> 'spellcaster' = p_today::text)
    and (bs.guild_last_played ->> 'number_realm' = p_today::text)
    and (bs.guild_last_played ->> 'logic_labyrinth' = p_today::text)
    and (bs.guild_last_played ->> 'lexicon_arena' = p_today::text);

  if not (journal_done and quest_done and battle_done and guild_done) then
    return jsonb_build_object('granted', false);
  end if;

  select claim_date, streak_day into v_prev_date, v_prev_streak
  from public.daily_checklist_claims
  where app_user_id = p_user_id
  order by claim_date desc
  limit 1;

  if v_prev_date = p_today - 1 then
    v_streak := v_prev_streak + 1;
  else
    v_streak := 1;
  end if;
  v_gold := public.daily_checklist_gold_for_streak(v_streak);

  insert into public.daily_checklist_claims (app_user_id, claim_date, streak_day, gold_awarded)
  values (p_user_id, p_today, v_streak, v_gold)
  on conflict do nothing;
  get diagnostics inserted = row_count;

  if inserted = 0 then
    return jsonb_build_object('granted', false);
  end if;

  insert into public.player_progress (user_id) values (p_user_id) on conflict (user_id) do nothing;
  update public.player_progress
  set gold = gold + v_gold, updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object('granted', true, 'streak', v_streak, 'gold', v_gold);
end;
$function$;

-- ── award_coins_to_child ─────────────────────────────────────────────────
-- Was already self-healing (inserted a missing weekly_packages row before
-- calling the legacy apply_character_deltas, relying on the forward-sync
-- trigger to reach player_progress) -- migrated directly so it doesn't keep
-- depending on a table scheduled for decommission on 2026-08-16.
CREATE OR REPLACE FUNCTION public.award_coins_to_child(p_child_id text, p_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_balance int;
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  if not exists (
    select 1 from public.children c
    where c.id = p_child_id and c.parent_id = auth.uid()
  ) then
    raise exception 'not your child account';
  end if;

  select coin_pool_balance into v_balance
  from public.subscriptions
  where parent_id = auth.uid() and status = 'active'
  for update;

  if v_balance is null then
    raise exception 'no active subscription';
  end if;

  if v_balance < p_amount then
    raise exception 'insufficient coin pool balance';
  end if;

  update public.subscriptions
  set coin_pool_balance = coin_pool_balance - p_amount, updated_at = now()
  where parent_id = auth.uid();

  insert into public.player_progress (user_id) values (p_child_id) on conflict (user_id) do nothing;
  update public.player_progress
  set gold = gold + p_amount, updated_at = now()
  where user_id = p_child_id;
end;
$function$;
