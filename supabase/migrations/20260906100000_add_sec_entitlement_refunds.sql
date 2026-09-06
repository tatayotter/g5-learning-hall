-- Resolves docs/sec-shop-design.md open item #6 ("refund/access-revocation
-- policy -- not decided"). Decision: a SEC pack can be refunded within 7
-- days of purchase, and only if the child has not yet used it (checked by
-- the admin against mtap_question_attempts before refunding -- this
-- migration doesn't hard-block on that itself, since a support agent may
-- still need judgment for edge cases like an accidental double-buy; it
-- exists so the app/terms page's stated policy has a real mechanism behind
-- it, not just words). A refund revokes access immediately: every gate
-- that checks sec_entitlements already filters on status = 'active'
-- (BonusQuestsTab's fetchOwnedSecPackIds, and the
-- mtap_expansion_content_public/_reviewer views from
-- 20260905180000_gate_mtap_content_views_by_sec_entitlement.sql), so a
-- 'refunded' row simply falls out of every one of those checks with no
-- further code changes needed.
--
-- Actually returning the parent's money happens outside this app (PayMongo
-- dashboard / bank transfer) -- this migration only ever revokes the
-- in-app entitlement and records that a refund happened, it never touches
-- payment rails itself.

ALTER TABLE public.sec_entitlements
  DROP CONSTRAINT sec_entitlements_status_check,
  ADD CONSTRAINT sec_entitlements_status_check CHECK (status IN ('pending', 'active', 'refunded'));

ALTER TABLE public.sec_entitlements
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE OR REPLACE FUNCTION public.admin_refund_sec_entitlement(
  p_passcode text,
  p_entitlement_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  UPDATE public.sec_entitlements
  SET status = 'refunded', refunded_at = now()
  WHERE id = p_entitlement_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no active entitlement with that id (already refunded, still pending, or does not exist)';
  END IF;
END;
$$;

-- Lets the admin see a child's purchases + whether they've actually played
-- the pack yet before deciding on a refund -- joins in an attempt count so
-- the "hasn't used it" eligibility check in docs/sec-shop-design.md can be
-- applied by a human, not silently auto-approved.
CREATE OR REPLACE FUNCTION public.admin_list_sec_entitlements_for_child(
  p_passcode text,
  p_child_id text
)
RETURNS TABLE (
  id uuid,
  pack_id text,
  pack_title text,
  status text,
  amount_php integer,
  purchased_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz,
  attempt_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  RETURN QUERY
  SELECT
    e.id, e.pack_id, p.title, e.status, e.amount_php, e.purchased_at, e.refunded_at, e.created_at,
    (
      SELECT count(*) FROM public.mtap_question_attempts a
      WHERE a.user_id = e.child_id AND a.grade = p.grade
    ) AS attempt_count
  FROM public.sec_entitlements e
  JOIN public.sec_packs p ON p.id = e.pack_id
  WHERE e.child_id = p_child_id
  ORDER BY e.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_refund_sec_entitlement(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_sec_entitlements_for_child(text, text) TO anon, authenticated;
