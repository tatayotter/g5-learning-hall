-- Public "Support Learning Hall" donation wall: pay-what-you-want
-- contributions via a new PayMongo checkout-session branch (metadata.type =
-- 'donation'), separate from the subscription and SEC-shop flows. ADDITIVE
-- ONLY -- existing checkout/webhook paths are untouched. See
-- app/support/page.tsx for the public page this backs.
--
-- Unlike subscriptions/sec_entitlements, donors are NOT authenticated (this
-- is a public marketing page, no login) -- so there is no "as user" RPC
-- pattern here. The API route writes and reads this table exclusively via
-- supabaseAdmin (service role), and RLS has zero policies: nothing is
-- reachable directly by anon/authenticated Postgrest roles. The only public
-- read surface is the two SECURITY DEFINER functions below, granted to
-- anon+authenticated, which each expose only what the wall is meant to show.

CREATE TABLE IF NOT EXISTS public.support_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL, -- required: needed for the automated receipt email and, if opted in, dev updates. Never exposed on the public wall.
  display_name text, -- NULL or blank = shown as "A Supporter" on the wall
  message text, -- optional public thank-you/support note
  show_name boolean NOT NULL DEFAULT false, -- opt-in; false also hides the name row entirely if blank
  subscribe_updates boolean NOT NULL DEFAULT true, -- opt-out checkbox on the form; "send me dev updates"
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(), -- one-click unsubscribe link, no login needed
  amount_php integer NOT NULL CHECK (amount_php > 0),
  paymongo_checkout_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_contributions_status ON public.support_contributions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_support_contributions_subscribed ON public.support_contributions USING btree (status, subscribe_updates) WHERE status = 'paid' AND subscribe_updates = true;

ALTER TABLE public.support_contributions ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies -- see note above. All access goes through
-- supabaseAdmin (server routes) or the SECURITY DEFINER functions below.

-- ---------------------------------------------------------------------------
-- Public read surface for the wall
-- ---------------------------------------------------------------------------

-- Only paid + opted-in rows, only the columns the wall actually renders.
-- Amount is included even for opted-in rows since "supported with ₱X" is the
-- point of the wall; a donor who wants the amount hidden should also leave
-- show_name off (worded that way on the form itself).
CREATE OR REPLACE FUNCTION public.get_support_wall(p_limit integer DEFAULT 200)
RETURNS TABLE (display_name text, message text, amount_php integer, paid_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    NULLIF(TRIM(sc.display_name), '') AS display_name,
    NULLIF(TRIM(sc.message), '') AS message,
    sc.amount_php,
    sc.paid_at
  FROM public.support_contributions sc
  WHERE sc.status = 'paid' AND sc.show_name = true
  ORDER BY sc.paid_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 500);
$$;

GRANT EXECUTE ON FUNCTION public.get_support_wall(integer) TO anon, authenticated;

-- Running total across ALL paid contributions, including anonymous/opted-out
-- ones -- the total is meant to reflect true community support, not just the
-- publicly-named subset.
CREATE OR REPLACE FUNCTION public.get_support_total()
RETURNS TABLE (total_php bigint, supporter_count bigint)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount_php), 0)::bigint, COUNT(*)::bigint
  FROM public.support_contributions
  WHERE status = 'paid';
$$;

GRANT EXECUTE ON FUNCTION public.get_support_total() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Webhook activation
-- ---------------------------------------------------------------------------

-- Called from app/api/paymongo-webhook/route.ts's new 'donation' branch.
-- Idempotent by design, same reasoning as handle_sec_purchase_webhook: a
-- retried webhook delivery for an already-paid row is a no-op (returns
-- false) so the caller doesn't double-count or double-fire any one-time
-- side effect.
CREATE OR REPLACE FUNCTION public.handle_donation_webhook(p_checkout_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  was_paid boolean;
BEGIN
  UPDATE public.support_contributions
  SET status = 'paid', paid_at = now()
  WHERE paymongo_checkout_id = p_checkout_id AND status = 'pending'
  RETURNING true INTO was_paid;

  RETURN COALESCE(was_paid, false);
END;
$$;

-- No GRANT to anon/authenticated -- only ever called by the webhook route
-- using the service-role client (supabaseAdmin), same access pattern as
-- handle_sec_purchase_webhook.

-- ---------------------------------------------------------------------------
-- Unsubscribe (public, token-based, no login)
-- ---------------------------------------------------------------------------

-- Called from app/api/support-unsubscribe/route.ts. Token-gated rather than
-- auth-gated since donors never create an account -- the token in the
-- receipt/update email IS the credential. Idempotent: unsubscribing twice is
-- harmless, always returns true if the token matches any row at all.
CREATE OR REPLACE FUNCTION public.unsubscribe_support_updates(p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  matched boolean;
BEGIN
  UPDATE public.support_contributions
  SET subscribe_updates = false
  WHERE unsubscribe_token = p_token
  RETURNING true INTO matched;

  RETURN COALESCE(matched, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unsubscribe_support_updates(uuid) TO anon, authenticated;
