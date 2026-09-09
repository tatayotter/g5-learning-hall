-- Voucher code redemption system — a recurring mechanism for handing out a
-- text code (shared at an event, in a livestream, printed on a flyer, etc.)
-- that any player can type in once to instantly claim a reward. Three
-- reward shapes from day one even though only a curio grant is seeded
-- right now (BONOKBONOK -> kasagbon, see bottom of this file): item and
-- gold plumbing are built in parallel per product request, not bolted on
-- later, so the redeem RPC and admin tooling never need a second migration
-- just to support a gold- or item-reward code.
--
-- Table shape mirrors the reward-claim pattern already in this codebase
-- (mtap_mixed_trainer_completions / claim_mixed_trainer_reward,
-- 20260909120000) and the admin_config passcode-gated admin RPC pattern
-- (boss_gauntlet_rewards / admin_upsert_boss_gauntlet_reward,
-- 20260807000000): a locked-down base table with all writes going through
-- SECURITY DEFINER RPCs, never direct client INSERT/UPDATE/DELETE.

CREATE TABLE IF NOT EXISTS public.voucher_codes (
  code text PRIMARY KEY,
  reward_type text NOT NULL CHECK (reward_type IN ('curio', 'item', 'gold')),
  reward_curio_id text,
  reward_item_key text,
  reward_item_qty integer,
  reward_gold_amount integer,
  -- NULL = unlimited total redemptions (the common case for a public event
  -- code like BONOKBONOK, where every attendee should be able to claim it).
  max_redemptions integer,
  is_active boolean NOT NULL DEFAULT true,
  -- NULL = never expires.
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Exactly the fields for the declared reward_type are set, nothing else —
  -- keeps redeem_voucher_code's per-branch logic from ever reading a stray
  -- leftover value from a code that was previously a different reward_type.
  CONSTRAINT voucher_codes_reward_shape_check CHECK (
    (reward_type = 'curio'
      AND reward_curio_id IS NOT NULL
      AND reward_item_key IS NULL AND reward_item_qty IS NULL AND reward_gold_amount IS NULL)
    OR (reward_type = 'item'
      AND reward_item_key IS NOT NULL AND reward_item_qty IS NOT NULL AND reward_item_qty > 0
      AND reward_curio_id IS NULL AND reward_gold_amount IS NULL)
    OR (reward_type = 'gold'
      AND reward_gold_amount IS NOT NULL AND reward_gold_amount > 0
      AND reward_curio_id IS NULL AND reward_item_key IS NULL AND reward_item_qty IS NULL)
  )
);

ALTER TABLE public.voucher_codes ENABLE ROW LEVEL SECURITY;
-- Deliberately zero policies: a code's existence and reward are only ever
-- learned by successfully redeeming it (or by an admin, via the
-- passcode-gated admin_list_voucher_codes RPC below) — a public SELECT
-- policy would let anyone browse every code in the table, defeating the
-- point of a code being something you have to be told.

CREATE TABLE IF NOT EXISTS public.voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL REFERENCES public.voucher_codes(code) ON DELETE CASCADE,
  user_id text NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  -- One redemption per user per code, ever — the hard stop that makes a
  -- shared/public code like BONOKBONOK a one-time claim per player instead
  -- of a repeatable gold/curio faucet.
  UNIQUE (code, user_id)
);

CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_code ON public.voucher_redemptions USING btree (code);

ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- Owner can see their own redemption history (e.g. to show "already
-- claimed" in the UI without round-tripping through redeem_voucher_code).
-- No INSERT/UPDATE/DELETE policy — every write goes through
-- redeem_voucher_code below.
CREATE POLICY voucher_redemptions_select_own
  ON public.voucher_redemptions FOR SELECT
  TO authenticated
  USING (user_id = public.current_app_user_id());

-- ─── PLAYER-FACING REDEEM RPC ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.redeem_voucher_code(p_user_id text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text := upper(trim(p_code));
  v_voucher public.voucher_codes;
  v_redemption_count integer;
  v_already boolean;
  v_stats jsonb;
BEGIN
  IF p_user_id IS DISTINCT FROM public.current_app_user_id() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_code = '' THEN
    RETURN jsonb_build_object('redeemed', false, 'reason', 'not_found');
  END IF;

  SELECT * INTO v_voucher FROM public.voucher_codes WHERE code = v_code FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('redeemed', false, 'reason', 'not_found');
  END IF;

  IF NOT v_voucher.is_active THEN
    RETURN jsonb_build_object('redeemed', false, 'reason', 'inactive');
  END IF;

  IF v_voucher.expires_at IS NOT NULL AND v_voucher.expires_at < now() THEN
    RETURN jsonb_build_object('redeemed', false, 'reason', 'expired');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.voucher_redemptions WHERE code = v_code AND user_id = p_user_id
  ) INTO v_already;
  IF v_already THEN
    RETURN jsonb_build_object('redeemed', false, 'reason', 'already_redeemed');
  END IF;

  IF v_voucher.max_redemptions IS NOT NULL THEN
    SELECT count(*) INTO v_redemption_count FROM public.voucher_redemptions WHERE code = v_code;
    IF v_redemption_count >= v_voucher.max_redemptions THEN
      RETURN jsonb_build_object('redeemed', false, 'reason', 'exhausted');
    END IF;
  END IF;

  -- Apply the reward. Grant paths reuse the same tables/RPCs every other
  -- reward flow in this codebase already writes through — see
  -- StarterSelection/MonsterGuild's wild-catch insert for
  -- user_caught_monsters, upsert_inventory for items, and spend_gold's
  -- sibling player_progress update for gold — rather than introducing a
  -- parallel grant path.
  IF v_voucher.reward_type = 'curio' THEN
    INSERT INTO public.user_caught_monsters (user_id, monster_id, monster_level, monster_exp)
    VALUES (p_user_id, v_voucher.reward_curio_id, 1, 0);
  ELSIF v_voucher.reward_type = 'item' THEN
    PERFORM public.upsert_inventory(p_user_id, v_voucher.reward_item_key, v_voucher.reward_item_qty);
  ELSIF v_voucher.reward_type = 'gold' THEN
    INSERT INTO public.player_progress (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.player_progress
    SET gold = gold + v_voucher.reward_gold_amount, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.voucher_redemptions (code, user_id) VALUES (v_code, p_user_id);

  SELECT jsonb_build_object('level', level, 'xp', xp, 'gold', gold) INTO v_stats
  FROM public.player_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'redeemed', true,
    'reward_type', v_voucher.reward_type,
    'reward_curio_id', v_voucher.reward_curio_id,
    'reward_item_key', v_voucher.reward_item_key,
    'reward_item_qty', v_voucher.reward_item_qty,
    'reward_gold_amount', v_voucher.reward_gold_amount,
    'stats', v_stats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_voucher_code(text, text) TO authenticated;

-- ─── ADMIN RPCS ───────────────────────────────────────────────────────────────
-- Same passcode-gated shape as admin_upsert_boss_gauntlet_reward /
-- admin_upsert_egg_chain — perform public.check_admin_passcode(p_passcode)
-- first, then the actual write.

CREATE OR REPLACE FUNCTION public.admin_upsert_voucher_code(
  p_passcode text,
  p_code text,
  p_reward_type text,
  p_reward_curio_id text,
  p_reward_item_key text,
  p_reward_item_qty integer,
  p_reward_gold_amount integer,
  p_max_redemptions integer,
  p_expires_at timestamptz,
  p_is_active boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text := upper(trim(p_code));
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  IF v_code = '' THEN
    RAISE EXCEPTION 'code is required';
  END IF;

  INSERT INTO public.voucher_codes (
    code, reward_type, reward_curio_id, reward_item_key, reward_item_qty,
    reward_gold_amount, max_redemptions, expires_at, is_active
  ) VALUES (
    v_code, p_reward_type, p_reward_curio_id, p_reward_item_key, p_reward_item_qty,
    p_reward_gold_amount, p_max_redemptions, p_expires_at, p_is_active
  )
  ON CONFLICT (code) DO UPDATE SET
    reward_type = excluded.reward_type,
    reward_curio_id = excluded.reward_curio_id,
    reward_item_key = excluded.reward_item_key,
    reward_item_qty = excluded.reward_item_qty,
    reward_gold_amount = excluded.reward_gold_amount,
    max_redemptions = excluded.max_redemptions,
    expires_at = excluded.expires_at,
    is_active = excluded.is_active,
    updated_at = now();

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_voucher_code(p_passcode text, p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);
  DELETE FROM public.voucher_codes WHERE code = upper(trim(p_code));
END;
$$;

-- Returns every code plus its live redemption count, for the admin list
-- view — a plain client-side select can't do this (voucher_codes has no
-- SELECT policy at all, see above), so listing has to go through a
-- passcode-gated RPC same as every other write here.
CREATE OR REPLACE FUNCTION public.admin_list_voucher_codes(p_passcode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      vc.*,
      (SELECT count(*) FROM public.voucher_redemptions vr WHERE vr.code = vc.code) AS redemption_count
    FROM public.voucher_codes vc
  ) t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_voucher_code(text, text, text, text, text, integer, integer, integer, timestamptz, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_voucher_code(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_voucher_codes(text) TO authenticated;

-- ─── SEED: BONOKBONOK -> Kasagbon ────────────────────────────────────────────
-- The Surigao bonok-bonok festival code from the Kasagbon/Marabon/Datubon
-- lore drop (lib/monsterConfig.ts) — unlimited redemptions, no expiry, one
-- claim per player. Adjust via the admin Vouchers tab if that ever needs
-- to change (e.g. capping it once the festival window closes).
INSERT INTO public.voucher_codes (code, reward_type, reward_curio_id, max_redemptions, is_active)
VALUES ('BONOKBONOK', 'curio', 'kasagbon', NULL, true)
ON CONFLICT (code) DO NOTHING;
