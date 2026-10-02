-- Premium (yearly) checkouts no longer downgrade an active subscription, and
-- never touch the parent's child slots.
--
-- Bug: create_checkout_session upserted the parent's single subscriptions row
-- with `status = 'pending'`, `addon_children = <requested>` and
-- `amount_php = <requested>` unconditionally. For an already-active parent
-- that immediately:
--   - flipped them to 'pending', so max_children_for_parent dropped to the
--     free limit and every Premium feature locked until they paid (forever,
--     if they abandoned the checkout);
--   - overwrote addon_children with whatever the checkout requested.
-- Found 2026-10-02 while testing an add-slot checkout on a test parent account.
--
-- Product rules (2026-10-02): Premium is ₱249/year; extra child slots are a
-- separate one-time ₱99 purchase the account keeps forever (see
-- 20261002150000_child_slot_purchase.sql). So a yearly checkout only buys the
-- year — it must never change addon_children.
--
-- Fix:
--   - create_checkout_session no longer writes addon_children at all
--     (p_addon_children is kept in the signature for compatibility and must
--     be 0). An active row keeps its status; the new purchase amount is staged
--     in pending_amount_php. A non-active row goes to 'pending' as before.
--   - handle_paymongo_webhook applies the staged amount (amount_php feeds the
--     Parent_Subscribed CAPI revenue event) and leaves addon_children alone.
-- Signatures are unchanged, so CREATE OR REPLACE replaces in place (no
-- overload trap) and existing grants carry over.

alter table public.subscriptions
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
  -- Slots are bought separately now; a yearly checkout never carries any.
  if p_addon_children is distinct from 0 then
    raise exception 'child slots are purchased separately';
  end if;

  if not exists (select 1 from public.parents where id = auth.uid()) then
    raise exception 'not a parent account';
  end if;

  insert into public.subscriptions (
    parent_id, status, amount_php, pending_amount_php, paymongo_checkout_id,
    fbp, fbc, client_ip, client_user_agent
  )
  values (
    auth.uid(), 'pending', p_amount_php, p_amount_php, p_checkout_id,
    p_fbp, p_fbc, p_client_ip, p_client_user_agent
  )
  on conflict (parent_id) do update
    set -- An active parent keeps Premium until this checkout is actually paid.
        status = case when subscriptions.status = 'active' then 'active' else 'pending' end,
        amount_php = case when subscriptions.status = 'active'
                          then subscriptions.amount_php else excluded.amount_php end,
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
      -- coalesce keeps rows staged before this migration working as before.
      amount_php = coalesce(pending_amount_php, amount_php),
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
