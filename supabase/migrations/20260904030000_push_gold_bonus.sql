-- 300-gold welcome bonuses for turning on push notifications, one per
-- trigger source (parent opting in on their own device, and the child
-- opting in on theirs) — both credited to the child, same shape as
-- claim_marketing_gold_bonus (20260826040000_marketing_optin_gold_bonus_v2.sql):
-- idempotent, safe to call on every login, checks current state rather than
-- trusting a client-supplied "I just subscribed" claim.
alter table public.children
  add column if not exists push_gold_bonus_child_awarded_at timestamptz,
  add column if not exists push_gold_bonus_parent_awarded_at timestamptz;

create or replace function public.claim_push_gold_bonus_child(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_has_sub boolean;
begin
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
$function$;

grant execute on function public.claim_push_gold_bonus_child(text) to authenticated;

create or replace function public.claim_push_gold_bonus_parent(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_parent_id uuid;
  v_has_sub boolean;
begin
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
$function$;

grant execute on function public.claim_push_gold_bonus_parent(text) to authenticated;
