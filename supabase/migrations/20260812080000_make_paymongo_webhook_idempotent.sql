-- handle_paymongo_webhook was not idempotent against webhook redelivery
-- (every payment provider, PayMongo included, retries a webhook that
-- doesn't ack fast enough or on any transient failure). Its writes are all
-- absolute sets, not deltas -- coin_pool_balance = 10000 (not +=) and
-- current_period_end = now() + 1 year (recomputed from the CURRENT instant,
-- not extended from the existing period end). A duplicate delivery for the
-- same successful payment would:
--   - silently refill coin_pool_balance back to 10000 even if the parent
--     had already spent some of it via award_coins_to_child -- a free
--     top-up bug, not just a no-op.
--   - push current_period_end further into the future than what was
--     actually paid for, extending the subscription for free.
--
-- Fix must NOT be a blunt "only ever apply once per row" guard --
-- create_checkout_session (see that RPC) reuses the SAME subscriptions row
-- per parent_id across every purchase/renewal, overwriting
-- paymongo_checkout_id fresh each time while paymongo_payment_id still
-- holds LAST year's value until a new payment succeeds. A guard keyed on
-- "paymongo_payment_id is already set" would silently block every renewal
-- forever after the first successful payment.
--
-- Correct guard: apply only when this specific p_payment_id hasn't already
-- been recorded for this checkout_id. A genuine renewal always carries a
-- brand new payment_id (and checkout_id), so it still applies; a retry of
-- an already-applied delivery carries the same payment_id we already wrote,
-- so it's now a silent no-op instead of a free refill.
CREATE OR REPLACE FUNCTION public.handle_paymongo_webhook(p_checkout_id text, p_payment_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  if not found then
    -- Either no subscription row references this checkout_id at all, or
    -- this exact payment_id was already applied (a legitimate webhook
    -- retry) -- distinguish so a retry is a quiet no-op, not an error.
    if exists (select 1 from public.subscriptions where paymongo_checkout_id = p_checkout_id) then
      return;
    end if;
    raise exception 'no pending subscription for checkout %', p_checkout_id;
  end if;
end;
$function$;
