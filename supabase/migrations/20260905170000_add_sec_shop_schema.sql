-- Student Enrichment Content (SEC) Shop: catalog + per-child entitlements +
-- purchase-flow RPCs. Implements the data model and purchase flow already
-- speced in docs/sec-shop-design.md — see that doc for the full design
-- rationale (why entitlement is per-child, why one pack = one whole grade's
-- MTAP content, why this branches the existing PayMongo flow instead of
-- generalizing it). ADDITIVE ONLY: new tables + a new webhook-metadata
-- branch (added in a follow-up code change to paymongo-webhook/route.ts,
-- not this migration) — the existing subscription checkout/webhook path is
-- untouched.

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sec_packs (
  id text PRIMARY KEY, -- slug, e.g. 'g2-math-enrichment'
  grade integer NOT NULL CHECK (grade >= 2 AND grade <= 6),
  category text NOT NULL, -- e.g. 'math_enrichment' -- mirrors docs/research/enrichment-dlc-research.xlsx's categories
  title text NOT NULL,
  description text NOT NULL,
  price_php integer NOT NULL CHECK (price_php > 0),
  -- How this pack's questions are actually selected. For the v1 SKU, a fixed
  -- filter into mtap_expansion_content ({"grade": 2}) -- kept as jsonb rather
  -- than a hardcoded join since later SEC categories (reading, spelling,
  -- etc.) won't all be backed by the same content table.
  content_ref jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sec_packs ENABLE ROW LEVEL SECURITY;

-- Public catalog read -- not sensitive, same posture as mtap_expansion_content_public.
CREATE POLICY sec_packs_select_active
  ON public.sec_packs FOR SELECT
  TO authenticated
  USING (active = true);

-- ---------------------------------------------------------------------------
-- Entitlements (one row per child-pack purchase)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sec_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL, -- the buyer (auth.users.id, matches subscriptions.parent_id's own type)
  child_id text NOT NULL, -- which child this unlocks for (app_user_id, matches mtap_question_attempts.user_id's shape)
  pack_id text NOT NULL REFERENCES public.sec_packs(id),
  paymongo_checkout_id text UNIQUE, -- idempotency key, same role as in subscriptions
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  amount_php integer NOT NULL, -- snapshot at purchase time
  purchased_at timestamptz, -- set on activation, not on checkout creation
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sec_entitlements_child_pack_unique UNIQUE (child_id, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_sec_entitlements_parent ON public.sec_entitlements USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_sec_entitlements_child ON public.sec_entitlements USING btree (child_id);

ALTER TABLE public.sec_entitlements ENABLE ROW LEVEL SECURITY;

-- The parent can see their own purchases (My SECs / Shop "Owned" state).
CREATE POLICY sec_entitlements_select_own_as_parent
  ON public.sec_entitlements FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- The child themselves can also check whether THEY have an active
-- entitlement (needed by BonusQuestsTab's own real gating check, which runs
-- under the CHILD's session, not the parent's) -- scoped strictly to their
-- own child_id via current_app_user_id(), same identity bridge every other
-- child-facing RLS policy in this codebase already uses.
CREATE POLICY sec_entitlements_select_own_as_child
  ON public.sec_entitlements FOR SELECT
  TO authenticated
  USING (child_id = public.current_app_user_id());

-- No direct INSERT/UPDATE for anyone -- both RPCs below are SECURITY DEFINER
-- and are the only write path, same lockdown pattern as every other
-- payment-adjacent table in this schema (subscriptions included).

-- ---------------------------------------------------------------------------
-- Purchase flow RPCs
-- ---------------------------------------------------------------------------

-- Called from app/api/create-sec-checkout/route.ts (browser request context,
-- authenticated as the parent) right after PayMongo hands back a checkout
-- session id -- mirrors create_checkout_session's role for subscriptions.
-- Inserts the entitlement row as 'pending'; handle_sec_purchase_webhook
-- (below) is what flips it to 'active' once PayMongo actually confirms
-- payment.
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

  -- A child can retry an abandoned checkout for the same pack (e.g. closed
  -- the PayMongo tab) -- reuse the existing pending row rather than
  -- colliding on the (child_id, pack_id) unique constraint.
  INSERT INTO public.sec_entitlements
    (parent_id, child_id, pack_id, paymongo_checkout_id, status, amount_php)
  VALUES
    (p_parent_id, p_child_id, p_pack_id, p_checkout_id, 'pending', p_amount_php)
  ON CONFLICT (child_id, pack_id) DO UPDATE
    SET paymongo_checkout_id = EXCLUDED.paymongo_checkout_id,
        amount_php = EXCLUDED.amount_php,
        parent_id = EXCLUDED.parent_id
    WHERE public.sec_entitlements.status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sec_checkout_session(uuid, text, text, integer, text) TO authenticated;

-- Called from app/api/paymongo-webhook/route.ts's new sec_purchase branch.
-- Idempotent by design (same reasoning as handle_paymongo_webhook): a
-- retried webhook delivery for an already-active entitlement is a no-op,
-- signaled by returning false so the caller knows not to re-fire any
-- one-time side effect (e.g. a CAPI conversion event) a second time.
CREATE OR REPLACE FUNCTION public.handle_sec_purchase_webhook(
  p_checkout_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  was_activated boolean;
BEGIN
  UPDATE public.sec_entitlements
  SET status = 'active', purchased_at = now()
  WHERE paymongo_checkout_id = p_checkout_id AND status = 'pending'
  RETURNING true INTO was_activated;

  RETURN COALESCE(was_activated, false);
END;
$$;

-- No GRANT to authenticated -- this is only ever called by the webhook
-- route using the service-role client (supabaseAdmin), same as
-- handle_paymongo_webhook's own access pattern.
