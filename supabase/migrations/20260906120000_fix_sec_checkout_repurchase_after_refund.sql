-- Critical bug found during a Shop/buying-process sweep: create_sec_checkout_session's
-- ON CONFLICT (child_id, pack_id) DO UPDATE ... WHERE status = 'pending'
-- guard only re-armed the row for an ABANDONED-PENDING retry. A legitimate
-- REPURCHASE after a refund (status = 'refunded', which the upfront
-- `status = 'active'` guard correctly does NOT block) hit the same unique
-- constraint, found the WHERE condition false against the existing
-- 'refunded' row, and per Postgres's documented ON CONFLICT ... DO UPDATE
-- ... WHERE semantics, silently did nothing: no error, no update, the row
-- kept its OLD (refunded) paymongo_checkout_id. The function still returned
-- success. A real PayMongo charge for the NEW checkout id would then
-- proceed, but handle_sec_purchase_webhook later looks up
-- `paymongo_checkout_id = <new id>` and finds zero matching rows -- it
-- just returns false and the webhook responds 200 to PayMongo (which stops
-- retrying, believing it succeeded). Net effect: money taken, access never
-- granted, no error surfaced to the parent, the admin, or in any log beyond
-- an unremarkable `activated: false`.
--
-- Verified live against the real function before this fix: a simulated
-- repurchase of a refunded pack left the entitlement row's status and
-- paymongo_checkout_id completely unchanged.
--
-- Fix: widen the re-arm guard to any non-active status, not just 'pending'
-- -- a refunded row is exactly as re-purchasable as an abandoned-pending
-- one; the upfront EXISTS(...status='active') check above it is still what
-- actually blocks a genuine double-buy.
CREATE OR REPLACE FUNCTION public.create_sec_checkout_session(
  p_parent_id uuid,
  p_child_id text,
  p_pack_id text,
  p_amount_php integer,
  p_checkout_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_parent_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sec_entitlements
    WHERE child_id = p_child_id AND pack_id = p_pack_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'this child already owns this pack';
  END IF;

  INSERT INTO public.sec_entitlements
    (parent_id, child_id, pack_id, paymongo_checkout_id, status, amount_php)
  VALUES
    (p_parent_id, p_child_id, p_pack_id, p_checkout_id, 'pending', p_amount_php)
  ON CONFLICT (child_id, pack_id) DO UPDATE
    SET paymongo_checkout_id = EXCLUDED.paymongo_checkout_id,
        amount_php = EXCLUDED.amount_php,
        parent_id = EXCLUDED.parent_id,
        status = 'pending',
        refunded_at = NULL
    WHERE public.sec_entitlements.status != 'active';
END;
$$;
