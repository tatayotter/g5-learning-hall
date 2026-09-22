-- Close 4 RPC authorization gaps found while building the automated test suite. All are
-- SECURITY DEFINER functions taking a p_user_id/p_child_id — the exact pattern
-- docs/rpc-identity-hardening.md's Group A already covers for 16 other functions, but these
-- were missed (2 predate that audit; 2 are new, introduced by the guild-session-reliability
-- work and never had their default grants tightened).
--
--   1/2. claim_push_gold_bonus_child(p_user_id) / claim_push_gold_bonus_parent(p_user_id):
--        NO auth check at all, and PostgreSQL's default PUBLIC-execute grant was never
--        revoked on them (unlike every hardened function, which explicitly revokes it) —
--        so ANY caller, including anon, could call either with an arbitrary account id and
--        mint 300 gold into it repeatedly (once per un-awarded flag). Confirmed exploitable
--        against the live schema before this fix. Client (lib/pushBonus.ts) only ever passes
--        the caller's own id, so adding the identity check is behavior-preserving for
--        legitimate use.
--
--   3. mark_reengagement_sent(p_child_id): no auth check, PUBLIC-execute grant never
--      revoked. Only ever called from the reengagement-sync edge function via the
--      service-role admin client (supabase/functions/reengagement-sync/index.ts) — never
--      from client code — so it should never have been reachable by authenticated/anon at
--      all. Lower severity than the two above (touches only a timestamp column, no
--      currency), but still unintended client-facing surface.
--
--   4. record_player_event(...): still granted to `authenticated` from when it was first
--      created (player_events_and_activity_view). mark_guild_session_today no longer calls
--      it (guild_session_idempotency inlined the insert directly), so this grant is now
--      dead-but-exposed surface — a client could call it directly to insert an arbitrary
--      'guild_session'-typed player_events row (payload/idempotency_key of its choosing).
--      player_activity's view already excludes 'guild_session' events from the player_events
--      branch (guild_sessions is authoritative for that type), so this couldn't corrupt
--      visible activity data, but least-privilege says it shouldn't be reachable regardless.
--
--   5. get_daily_checklist_streak(p_user_id, p_today): no identity check, granted to
--      anon/authenticated/PUBLIC. UNLIKE the other four, this one is NOT security definer —
--      it runs as the calling role, so daily_checklist_claims' existing "read own" RLS
--      policy (current_app_user_id() = app_user_id) already filtered out any row that didn't
--      belong to the actual caller, regardless of what p_user_id was passed. So this was
--      NOT the exploitable information-disclosure gap it first looked like — a mismatched
--      p_user_id just got zero rows back (RLS as invoker was already the real safety net).
--      Added anyway for defense-in-depth and consistency with every other p_user_id RPC in
--      the codebase, which check explicitly rather than relying on RLS alone; kept as
--      SECURITY INVOKER (not definer) since RLS already does the real work correctly here
--      and there's no reason to bypass it.

-- ── 1/2: push gold bonus claims ──────────────────────────────────────────────

create or replace function public.claim_push_gold_bonus_child(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_has_sub boolean;
begin
  if p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  select exists(
    select 1 from public.push_subscriptions
    where owner_kind = 'app_user' and owner_id = p_user_id
  ) into v_has_sub;

  if not v_has_sub then
    return null;
  end if;

  update public.children
  set push_gold_bonus_child_awarded_at = now()
  where id = p_user_id
    and push_gold_bonus_child_awarded_at is null;

  if not found then
    return null;
  end if;

  insert into public.player_progress (user_id, gold)
  values (p_user_id, 300)
  on conflict (user_id) do update
    set gold = public.player_progress.gold + 300;

  insert into public.player_notifications (user_id, title, body, icon)
  values (p_user_id, 'Notifications On!', 'You turned on push notifications and earned 300 free Gold!', '🔔');

  return jsonb_build_object('gold', 300);
end;
$$;

revoke all on function public.claim_push_gold_bonus_child(text) from public, anon;
grant execute on function public.claim_push_gold_bonus_child(text) to authenticated, service_role;

create or replace function public.claim_push_gold_bonus_parent(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_parent_id uuid;
  v_has_sub boolean;
begin
  if p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  select parent_id into v_parent_id from public.children where id = p_user_id;
  if v_parent_id is null then
    return null;
  end if;

  select exists(
    select 1 from public.push_subscriptions
    where owner_kind = 'parent' and owner_id = v_parent_id::text
  ) into v_has_sub;

  if not v_has_sub then
    return null;
  end if;

  update public.children
  set push_gold_bonus_parent_awarded_at = now()
  where id = p_user_id
    and push_gold_bonus_parent_awarded_at is null;

  if not found then
    return null;
  end if;

  insert into public.player_progress (user_id, gold)
  values (p_user_id, 300)
  on conflict (user_id) do update
    set gold = public.player_progress.gold + 300;

  insert into public.player_notifications (user_id, title, body, icon)
  values (p_user_id, 'Parent Notifications On!', 'Your parent turned on push notifications and you earned 300 free Gold!', '🔔');

  return jsonb_build_object('gold', 300);
end;
$$;

revoke all on function public.claim_push_gold_bonus_parent(text) from public, anon;
grant execute on function public.claim_push_gold_bonus_parent(text) to authenticated, service_role;

-- ── 3: reengagement marker — service_role (cron edge function) only ──────────

revoke all on function public.mark_reengagement_sent(text) from public, anon, authenticated;
grant execute on function public.mark_reengagement_sent(text) to service_role;

-- ── 4: record_player_event — no longer called by any client-facing RPC ───────

revoke all on function public.record_player_event(text, text, integer, jsonb, text) from public, anon, authenticated;
grant execute on function public.record_player_event(text, text, integer, jsonb, text) to service_role;

-- ── 5: checklist streak preview needs the same identity check every other ────
--       p_user_id-taking RPC in this codebase has.

create or replace function public.get_daily_checklist_streak(p_user_id text, p_today date)
returns jsonb
language plpgsql
set search_path to 'public'
as $$
declare
  v_today date := public.app_today();
  v_date date;
  v_streak int;
  v_claimed_today boolean := false;
  v_current_streak int := 0;
  v_next_streak int := 1;
begin
  if p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  select claim_date, streak_day into v_date, v_streak
  from public.daily_checklist_claims
  where app_user_id = p_user_id
  order by claim_date desc
  limit 1;

  if v_date is not null then
    if v_date = v_today then
      v_claimed_today := true;
      v_current_streak := v_streak;
      v_next_streak := v_streak;
    elsif v_date = v_today - 1 then
      v_current_streak := v_streak;
      v_next_streak := v_streak + 1;
    end if;
  end if;

  return jsonb_build_object(
    'claimedToday', v_claimed_today,
    'currentStreak', v_current_streak,
    'nextStreak', v_next_streak,
    'todayGold', case when v_claimed_today then public.daily_checklist_gold_for_streak(v_current_streak) else null end,
    'nextGold', public.daily_checklist_gold_for_streak(v_next_streak)
  );
end;
$$;

revoke all on function public.get_daily_checklist_streak(text, date) from public, anon;
grant execute on function public.get_daily_checklist_streak(text, date) to authenticated, service_role;
