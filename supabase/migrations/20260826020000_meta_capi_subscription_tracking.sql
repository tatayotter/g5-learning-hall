-- Meta Conversions API tracking for Parent_Subscribed, to let CAC vs LTV
-- breakeven be computed off real, server-confirmed subscription revenue
-- rather than client-side Pixel events alone (which miss ad-blocked/
-- Safari-ITP-affected browsers and can't be trusted for revenue math).
--
-- Two changes:
-- 1. subscriptions gets fbp/fbc/client_ip/client_user_agent, captured at
--    checkout-creation time (browser context) so the webhook (server-to-
--    server, no browser context of its own) can still send them to Meta
--    for match-quality scoring.
-- 2. handle_paymongo_webhook now returns boolean — true only the first time
--    a given checkout is actually activated, false on a legitimate Paymongo
--    webhook retry. The Next.js route uses this to fire the CAPI event
--    exactly once per real subscription, never on a retry.

alter table public.subscriptions
  add column if not exists fbp text,
  add column if not exists fbc text,
  add column if not exists client_ip text,
  add column if not exists client_user_agent text;

-- CREATE OR REPLACE does NOT replace a function when the parameter list
-- changes -- it creates a new overload and leaves the old signature fully
-- callable alongside it (see feedback_postgres_function_hardening memory).
-- Both signatures below are changing shape, so drop the old ones explicitly
-- first rather than relying on OR REPLACE.
drop function if exists public.create_checkout_session(integer, numeric, text);
drop function if exists public.handle_paymongo_webhook(text, text);

create function public.create_checkout_session(
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
    fbp, fbc, client_ip, client_user_agent
  )
  values (
    auth.uid(), 'pending', p_addon_children, p_amount_php, p_checkout_id,
    p_fbp, p_fbc, p_client_ip, p_client_user_agent
  )
  on conflict (parent_id) do update
    set status = 'pending',
        addon_children = excluded.addon_children,
        amount_php = excluded.amount_php,
        paymongo_checkout_id = excluded.paymongo_checkout_id,
        fbp = excluded.fbp,
        fbc = excluded.fbc,
        client_ip = excluded.client_ip,
        client_user_agent = excluded.client_user_agent,
        updated_at = now();
end;
$function$;

-- Dropping the old signature drops its grants too -- reinstate the same
-- grantees the previous version had (verified via information_schema before
-- writing this migration).
grant execute on function public.create_checkout_session(integer, numeric, text, text, text, text, text) to anon, authenticated, service_role;

create function public.handle_paymongo_webhook(p_checkout_id text, p_payment_id text)
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
      paymongo_payment_id = p_payment_id,
      updated_at = now()
  where paymongo_checkout_id = p_checkout_id
    and paymongo_payment_id is distinct from p_payment_id;

  v_activated := found;

  if not v_activated then
    -- Either no subscription row references this checkout_id at all, or
    -- this exact payment_id was already applied (a legitimate webhook
    -- retry) -- distinguish so a retry is a quiet no-op, not an error,
    -- and so the caller knows not to fire a duplicate conversion event.
    if exists (select 1 from public.subscriptions where paymongo_checkout_id = p_checkout_id) then
      return false;
    end if;
    raise exception 'no pending subscription for checkout %', p_checkout_id;
  end if;

  return true;
end;
$function$;

grant execute on function public.handle_paymongo_webhook(text, text) to anon, authenticated, service_role;
