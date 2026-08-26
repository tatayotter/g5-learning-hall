-- Rework of 20260826030000_marketing_optin_gold_bonus.sql.
--
-- That first attempt tried to credit gold synchronously, inside
-- create_child_account/set_marketing_opt_in, via apply_character_deltas()
-- onto weekly_packages.character_stats. Two problems, found by actually
-- testing it end-to-end:
--   1. weekly_packages is no longer the authoritative gold store — per
--      hooks/useWeeklyData.ts, "character_stats/achievements are always
--      read live from player_progress" now. Writing to weekly_packages
--      would silently not show up anywhere in the live game.
--   2. A freshly created child has no weekly_packages row yet (created
--      lazily elsewhere), so apply_character_deltas raised and the award
--      was skipped every time anyway — confirmed live: a real test
--      registration with the opt-in box checked left
--      marketing_gold_bonus_awarded_at NULL.
--
-- This app already has the right pattern for exactly this problem: the
-- referral system's claim_registrant_referral_reward() (see
-- 20260825000000_referral_system.sql) credits player_progress directly via
-- upsert (works even if the child has never logged in) and drops a
-- player_notifications row, claimed idempotently client-side on every
-- login (components/Dashboard.tsx). This migration follows that exact
-- shape instead: revert the two functions to their pre-bonus bodies, and
-- add claim_marketing_gold_bonus(), called the same way.

create or replace function public.create_child_account(
  p_username text,
  p_pin text,
  p_full_name text,
  p_grade text,
  p_gender text,
  p_school_name text,
  p_avatar text
)
returns table(id text, username text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_parent_status text;
  v_id text;
  v_current_count int;
  v_max int;
begin
  select status into v_parent_status from public.parents where parents.id = auth.uid();
  if v_parent_status is null then
    raise exception 'not a parent account';
  end if;
  if v_parent_status = 'rejected' then
    raise exception 'parent account rejected';
  end if;

  select count(*) into v_current_count from public.children c
  where c.parent_id = auth.uid() and c.is_active = true;

  v_max := public.max_children_for_parent(auth.uid());
  if v_current_count >= v_max then
    raise exception 'child account limit reached (% of %) - subscribe or add a child slot to add more', v_current_count, v_max;
  end if;

  v_id := lower(regexp_replace(p_username, '[^a-zA-Z0-9_]', '', 'g'));
  if v_id = '' then
    raise exception 'invalid username';
  end if;

  if exists (select 1 from public.children c where c.id = v_id or c.username = p_username) then
    raise exception 'username already taken';
  end if;

  insert into public.children (id, parent_id, username, pin_hash, pin_plain, full_name, grade, gender, school_name, avatar)
  values (v_id, auth.uid(), p_username, extensions.crypt(p_pin, extensions.gen_salt('bf')), p_pin, p_full_name, p_grade, p_gender, p_school_name, p_avatar);

  return query select v_id, p_username;
end;
$function$;

create or replace function public.set_marketing_opt_in(p_opt_in boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.parents
  set marketing_opt_in = p_opt_in,
      marketing_opt_in_at = case when p_opt_in then now() else null end
  where id = auth.uid();
end;
$function$;

-- Claims the 250-gold welcome bonus for one child, if their parent has
-- opted into email updates and this child hasn't been credited yet.
-- Idempotent — safe to call on every login, mirrors
-- claim_registrant_referral_reward()'s shape exactly.
create or replace function public.claim_marketing_gold_bonus(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_parent_id uuid;
  v_opted_in boolean;
begin
  select c.parent_id, p.marketing_opt_in
  into v_parent_id, v_opted_in
  from public.children c
  join public.parents p on p.id = c.parent_id
  where c.id = p_user_id
    and c.marketing_gold_bonus_awarded_at is null
  for update of c skip locked;

  if not found or not v_opted_in then
    return null;
  end if;

  insert into public.player_progress (user_id, gold)
  values (p_user_id, 250)
  on conflict (user_id) do update
    set gold = public.player_progress.gold + 250;

  insert into public.player_notifications (user_id, title, body, icon)
  values (
    p_user_id,
    'Welcome Bonus!',
    'Your parent subscribed to email updates and you earned 250 free Gold!',
    '🪙'
  );

  update public.children set marketing_gold_bonus_awarded_at = now() where children.id = p_user_id;

  return jsonb_build_object('gold', 250);
end;
$function$;

grant execute on function public.claim_marketing_gold_bonus(text) to authenticated;
