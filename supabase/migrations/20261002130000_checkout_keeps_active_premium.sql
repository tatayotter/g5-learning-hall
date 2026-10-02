-- Starting a Premium checkout no longer downgrades an already-active
-- subscription before the parent has paid.
--
-- Bug: create_checkout_session upserts the parent's single subscriptions row
-- with `status = 'pending'`, `addon_children = <requested>` and
-- `amount_php = <requested>` unconditionally. For a parent who is already
-- Premium (e.g. tapping "Add a Child Slot"), that immediately:
--   - flips them to 'pending', so max_children_for_parent drops to 1 and every
--     Premium feature (journal, weak topics, coin awards, compare) locks;
--   - overwrites addon_children / amount_php with a purchase that hasn't
--     happened.
-- If the checkout is abandoned, they stay downgraded indefinitely. Found
-- 2026-10-02 while testing an add-slot checkout on a test parent account.
--
-- Fix: the requested purchase is staged in new pending_addon_children /
-- pending_amount_php columns. An active row keeps its status, addon_children
-- and amount_php until payment; a non-active row behaves exactly as before
-- (status 'pending' + requested values written directly). The webhook then
-- applies the staged values when the payment lands — amount_php must be
-- current by then because fireParentSubscribedCapiEvent reads it for revenue.
--
-- Both function signatures are unchanged, so CREATE OR REPLACE replaces them
-- in place (no overload trap) and existing grants carry over.

alter table public.subscriptions
  add column if not exists pending_addon_children integer,
  add column if not exists pending_amount_php numeric;

create or replace function public.create_checkout_session(
  p_addon_children integer,
  p_amount_php numeric,
  p_checkout_id text,
  p_fbp text default null,
  p_fbc text default null,
  p_client_ip text default null,
  p_client_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_addon_children < 0 or p_addon_children > 2 then
    raise exception 'invalid addon_children';
  end if;

  if not exists (select 1 from public.parents where id = auth.uid()) then
    raise exception 'not a parent account';
  end if;

  insert into public.subscriptions (
    parent_id, status, addon_children, amount_php, paymongo_checkout_id,
    pending_addon_children, pending_amount_php,
    fbp, fbc, client_ip, client_user_agent
  )
  values (
    auth.uid(), 'pending', p_addon_children, p_amount_php, p_checkout_id,
    p_addon_children, p_amount_php,
    p_fbp, p_fbc, p_client_ip, p_client_user_agent
  )
  on conflict (parent_id) do update
    set -- An active Premium parent keeps everything they've paid for until
        -- this new checkout is actually paid (see handle_paymongo_webhook).
        status = case when subscriptions.status = 'active' then 'active' else 'pending' end,
        addon_children = case when subscriptions.status = 'active'
                              then subscriptions.addon_children else excluded.addon_children end,
        amount_php = case when subscriptions.status = 'active'
                          then subscriptions.amount_php else excluded.amount_php end,
        pending_addon_children = excluded.pending_addon_children,
        pending_amount_php = excluded.pending_amount_php,
        paymongo_checkout_id = excluded.paymongo_checkout_id,
        fbp = excluded.fbp,
        fbc = excluded.fbc,
        client_ip = excluded.client_ip,
        client_user_agent = excluded.client_user_agent,
        updated_at = now();
end;
$function$;

create or replace function public.handle_paymongo_webhook(p_checkout_id text, p_payment_id text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_activated boolean;
begin
  update public.subscriptions
  set status = 'active',
      current_period_start = now(),
      current_period_end = now() + interval '1 year',
      coin_pool_balance = 10000,
      -- Apply the purchase staged by create_checkout_session. coalesce keeps
      -- rows staged before this migration (pending_* null) working as before.
      addon_children = coalesce(pending_addon_children, addon_children),
      amount_php = coalesce(pending_amount_php, amount_php),
      pending_addon_children = null,
      pending_amount_php = null,
      paymongo_payment_id = p_payment_id,
      updated_at = now()
  where paymongo_checkout_id = p_checkout_id
    and paymongo_payment_id is distinct from p_payment_id;

  v_activated := found;

  if not v_activated then
    if exists (select 1 from public.subscriptions where paymongo_checkout_id = p_checkout_id) then
      return false;
    end if;
    raise exception 'no pending subscription for checkout %', p_checkout_id;
  end if;

  return true;
end;
$function$;
