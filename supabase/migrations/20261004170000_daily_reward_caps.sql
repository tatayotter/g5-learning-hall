-- Daily caps on client-requested rewards, and close the legacy weekly_packages
-- side door.
--
-- apply_progress_deltas / apply_progress_update / upsert_inventory take the
-- reward amount from the browser and only checked that the caller was
-- changing their own account, so one devtools call could grant any amount of
-- gold, XP or items. This keeps the client-computed reward flow but clamps
-- what a player can be granted per Manila day:
--   20,000 XP and 10,000 gold (the highest real day in the last 60 days was
--   8,495 XP / 4,544 gold; p99 ~4,700 / ~2,700), and 30 item units added to
--   player_inventory from a player session (the daily bundle is 4; unlearning
--   a skill hands a scroll back, so leave room for toggling).
-- Over-cap amounts are clamped, never rejected, so a legitimate save can't
-- fail; what was granted and clamped is recorded in reward_daily_ledger.
-- Negative deltas (spending, consuming) are never capped.
--
-- Items are capped by a trigger on player_inventory rather than inside
-- upsert_inventory, because the table's own "update own" policy would
-- otherwise let a player set quantity directly.
--
-- Not capped: service-role calls (resolve-live-battle) and server-side grants
-- that run inside SECURITY DEFINER functions (vouchers, referral and
-- parent-link rewards, shop purchases), which write as the function owner.
--
-- Also:
-- * apply_progress_deltas lets service-role calls through its identity check.
--   resolve-live-battle credits PvP win gold with the service role, and the
--   2026-09-03 identity hardening made that call fail silently ever since.
-- * weekly_packages still syncs into player_progress via
--   trg_sync_weekly_packages_to_progress, so its two client write policies
--   and apply_character_deltas / increment_weekly_counter (no callers left)
--   would bypass the caps. Policies dropped, EXECUTE revoked.

-- ── Ledger ────────────────────────────────────────────────────────────────────
create table if not exists public.reward_daily_ledger (
  user_id text not null,
  day date not null,
  xp_granted integer not null default 0,
  gold_granted integer not null default 0,
  items_granted integer not null default 0,
  xp_clamped integer not null default 0,
  gold_clamped integer not null default 0,
  items_clamped integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.reward_daily_ledger enable row level security;
-- No policies: only the SECURITY DEFINER helper below reads or writes it.
revoke all on public.reward_daily_ledger from anon, authenticated;

-- ── Allowance helper ──────────────────────────────────────────────────────────
-- Returns how much of the requested (positive) xp/gold/items may be granted
-- today and books it. Callable by authenticated because the invoker-rights
-- upsert_inventory calls it as the player; a direct call can only spend the
-- caller's own allowance.
create or replace function public.consume_reward_allowance(
  p_user_id text, p_xp integer, p_gold integer, p_items integer
) returns table (xp integer, gold integer, items integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_day date := (now() at time zone 'Asia/Manila')::date;
  v_row public.reward_daily_ledger%rowtype;
  v_xp integer := greatest(coalesce(p_xp, 0), 0);
  v_gold integer := greatest(coalesce(p_gold, 0), 0);
  v_items integer := greatest(coalesce(p_items, 0), 0);
  a_xp integer;
  a_gold integer;
  a_items integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  insert into public.reward_daily_ledger (user_id, day) values (p_user_id, v_day)
  on conflict (user_id, day) do nothing;

  select * into v_row from public.reward_daily_ledger
  where user_id = p_user_id and day = v_day
  for update;

  a_xp := least(v_xp, greatest(20000 - v_row.xp_granted, 0));
  a_gold := least(v_gold, greatest(10000 - v_row.gold_granted, 0));
  a_items := least(v_items, greatest(30 - v_row.items_granted, 0));

  update public.reward_daily_ledger set
    xp_granted = xp_granted + a_xp,
    gold_granted = gold_granted + a_gold,
    items_granted = items_granted + a_items,
    xp_clamped = xp_clamped + (v_xp - a_xp),
    gold_clamped = gold_clamped + (v_gold - a_gold),
    items_clamped = items_clamped + (v_items - a_items),
    updated_at = now()
  where user_id = p_user_id and day = v_day;

  return query select a_xp, a_gold, a_items;
end;
$function$;

revoke execute on function public.consume_reward_allowance(text, integer, integer, integer) from public, anon;
grant execute on function public.consume_reward_allowance(text, integer, integer, integer) to authenticated, service_role;

-- ── apply_progress_deltas ─────────────────────────────────────────────────────
create or replace function public.apply_progress_deltas(p_user_id text, p_xp_delta integer DEFAULT 0, p_gold_delta integer DEFAULT 0)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  cur_xp integer;
  cur_gold integer;
  cur_level integer;
  final_xp integer;
  final_level integer;
  final_gold integer;
  v_xp integer := coalesce(p_xp_delta, 0);
  v_gold integer := coalesce(p_gold_delta, 0);
  v_allowed record;
  result jsonb;
begin
  IF coalesce(auth.role(), '') <> 'service_role' AND p_user_id IS DISTINCT FROM public.current_app_user_id() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Daily cap on gains requested by a player session (see header).
  IF coalesce(auth.role(), '') <> 'service_role' AND (v_xp > 0 OR v_gold > 0) THEN
    SELECT * INTO v_allowed FROM public.consume_reward_allowance(p_user_id, v_xp, v_gold, 0);
    IF v_xp > 0 THEN v_xp := v_allowed.xp; END IF;
    IF v_gold > 0 THEN v_gold := v_allowed.gold; END IF;
  END IF;

  INSERT INTO public.player_progress (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT xp, gold, level INTO cur_xp, cur_gold, cur_level
  FROM public.player_progress
  WHERE user_id = p_user_id
  FOR UPDATE;

  final_xp := cur_xp + v_xp;
  final_level := cur_level;
  final_gold := cur_gold + v_gold;

  WHILE final_xp >= (500 + final_level * 100) LOOP
    final_xp := final_xp - (500 + final_level * 100);
    final_level := final_level + 1;
  END LOOP;

  UPDATE public.player_progress
  SET xp = final_xp, level = final_level, gold = final_gold, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING jsonb_build_object('xp', xp, 'level', level, 'gold', gold) INTO result;

  RETURN result;
end;
$function$;

-- ── apply_progress_update ─────────────────────────────────────────────────────
-- Same body as 20260923120000_fix_progress_mastery_purchase_honor_deltas, plus
-- the daily cap on xp/gold gains.
create or replace function public.apply_progress_update(
  p_user_id text, p_xp_delta integer DEFAULT 0, p_gold_delta integer DEFAULT 0,
  p_mastery_count integer DEFAULT NULL::integer, p_purchased_items integer DEFAULT NULL::integer,
  p_honor_grants integer DEFAULT NULL::integer, p_guild_sessions_delta integer DEFAULT 0,
  p_monster_battles_won_delta integer DEFAULT 0, p_sibling_battles_won_delta integer DEFAULT 0,
  p_perfect_quizzes_delta integer DEFAULT 0, p_dummy_battles_won_delta integer DEFAULT 0,
  p_eggs_hatched_delta integer DEFAULT 0, p_curios_graduated_delta integer DEFAULT 0,
  p_trades_completed_delta integer DEFAULT 0, p_legendaries_caught_delta integer DEFAULT 0,
  p_tutor_rerolls_delta integer DEFAULT 0, p_tatay_battles_won_delta integer DEFAULT 0,
  p_tatay_battles_lost_delta integer DEFAULT 0, p_new_achievement_ids text[] DEFAULT '{}'::text[],
  p_mastery_delta integer DEFAULT 0, p_purchased_items_delta integer DEFAULT 0,
  p_honor_grants_delta integer DEFAULT 0
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  v_xp integer := coalesce(p_xp_delta, 0);
  v_gold integer := coalesce(p_gold_delta, 0);
  v_allowed record;
  result jsonb;
begin
  IF p_user_id IS DISTINCT FROM public.current_app_user_id() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Daily cap on gains requested by a player session (see header).
  IF v_xp > 0 OR v_gold > 0 THEN
    SELECT * INTO v_allowed FROM public.consume_reward_allowance(p_user_id, v_xp, v_gold, 0);
    IF v_xp > 0 THEN v_xp := v_allowed.xp; END IF;
    IF v_gold > 0 THEN v_gold := v_allowed.gold; END IF;
  END IF;

  INSERT INTO public.player_progress (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT xp, gold, level, achievements INTO cur_xp, cur_gold, cur_level, cur_achievements
  FROM public.player_progress
  WHERE user_id = p_user_id
  FOR UPDATE;

  final_xp := cur_xp + v_xp;
  final_level := cur_level;
  final_gold := cur_gold + v_gold;

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

-- ── Item cap: trigger on player_inventory ─────────────────────────────────────
-- Caps quantity increases made from a player session (direct table writes and
-- invoker-rights RPCs alike). SECURITY DEFINER callers write as the function
-- owner, so current_user is not a client role and they pass through.
create or replace function public.cap_player_inventory_increase()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_increase integer;
  v_allowed record;
begin
  if current_user in ('authenticated', 'anon') then
    v_increase := coalesce(new.quantity, 0) - coalesce(case when tg_op = 'UPDATE' then old.quantity end, 0);
    if v_increase > 0 then
      select * into v_allowed from public.consume_reward_allowance(new.app_user_id, 0, 0, v_increase);
      new.quantity := new.quantity - (v_increase - v_allowed.items);
    end if;
  end if;
  return new;
end;
$function$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_cap_player_inventory_increase' and tgrelid = 'public.player_inventory'::regclass
  ) then
    create trigger trg_cap_player_inventory_increase
      before insert or update of quantity on public.player_inventory
      for each row execute function public.cap_player_inventory_increase();
  end if;
end $$;

-- ── upsert_inventory ──────────────────────────────────────────────────────────
-- Same behaviour, but update-then-insert instead of INSERT ... ON CONFLICT DO
-- UPDATE: an upsert that hits a conflict fires both the BEFORE INSERT and the
-- BEFORE UPDATE trigger, which would book the same grant twice.
create or replace function public.upsert_inventory(p_user_id text, p_item_key text, p_quantity_delta integer)
returns void
language plpgsql
set search_path to 'public'
as $function$
BEGIN
  UPDATE player_inventory
  SET quantity = GREATEST(0, quantity + p_quantity_delta), updated_at = now()
  WHERE app_user_id = p_user_id AND item_key = p_item_key;

  IF NOT FOUND THEN
    INSERT INTO player_inventory (app_user_id, item_key, quantity)
    VALUES (p_user_id, p_item_key, GREATEST(0, p_quantity_delta))
    ON CONFLICT (app_user_id, item_key) DO NOTHING;
    -- Lost a race with a concurrent first insert: apply the delta to that row.
    IF NOT FOUND THEN
      UPDATE player_inventory
      SET quantity = GREATEST(0, quantity + p_quantity_delta), updated_at = now()
      WHERE app_user_id = p_user_id AND item_key = p_item_key;
    END IF;
  END IF;
END;
$function$;

-- ── Legacy weekly_packages side door ──────────────────────────────────────────
drop policy if exists "weekly_packages: insert own" on public.weekly_packages;
drop policy if exists "weekly_packages: update own" on public.weekly_packages;
revoke execute on function public.apply_character_deltas(text, date, integer, integer) from public, anon, authenticated;
revoke execute on function public.increment_weekly_counter(text, text) from public, anon, authenticated;
