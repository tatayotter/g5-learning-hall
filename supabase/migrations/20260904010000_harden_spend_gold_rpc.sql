-- Ultrareview-flagged security regression: spend_gold (added earlier this PR
-- in 20260904000000_add_spend_gold_rpc.sql) shipped without the
-- current_app_user_id() identity check that Group A hardening
-- (docs/rpc-identity-hardening.md, 2026-09-03) added to every other
-- gameplay RPC taking p_user_id — being SECURITY DEFINER with the same
-- default EXECUTE grant as its sibling spend_gold_and_grant_item, an
-- unauthenticated/anon caller could pass any real player's user_id (readable
-- via player_progress's public "read all" policy) and drain their gold.
-- Also closes a second gap: p_amount was trusted from the client with only a
-- ">= 1" floor, no ceiling — a tampered client could call spend_gold with
-- p_amount=1 to skip a battle question for 1 gold instead of the real
-- BATTLE_CONSTANTS.QUESTION_SKIP_GOLD_COST (5). spend_gold has exactly one
-- caller today (the "skip for gold" battle mechanic), so pinning the amount
-- to that fixed cost server-side — the same reasoning spend_gold_and_grant_item
-- uses to look its cost up from shop_items rather than trust a client-supplied
-- one — closes it without losing anything a real caller needs. If a future
-- caller needs a different amount, give it its own RPC with its own fixed
-- cost rather than widening this back into a client-priced generic debit.
--
-- NOT addressed here (documented, deliberately out of scope for this pass):
-- the 100-gold MAX_GOLD_SPENT_PER_BATTLE cap is still enforced client-side
-- only. NPC and same-session PvP battles have no server-tracked battle
-- session to key a per-battle ledger off of, and even live PvP's real
-- battleId would need a new ledger table to enforce it there specifically.
-- A cheater bypassing this cap only spends down their OWN real (server-
-- debited) gold faster than the UI intends — it doesn't let them gain
-- anything at another player's expense, unlike the identity gap above.
--
-- Signature is unchanged (text, integer), so plain CREATE OR REPLACE is safe
-- here — no DROP FUNCTION needed, this isn't the overload trap.
CREATE OR REPLACE FUNCTION public.spend_gold(p_user_id text, p_amount integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_gold integer;
  new_stats jsonb;
BEGIN
  IF p_user_id IS DISTINCT FROM public.current_app_user_id() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Fixed to BATTLE_CONSTANTS.QUESTION_SKIP_GOLD_COST (lib/monsterConfig.ts) —
  -- keep both in sync if that constant ever changes.
  IF p_amount != 5 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;

  INSERT INTO public.player_progress (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT gold INTO current_gold FROM public.player_progress WHERE user_id = p_user_id FOR UPDATE;

  IF current_gold < p_amount THEN
    RAISE EXCEPTION 'insufficient gold';
  END IF;

  UPDATE public.player_progress
  SET gold = gold - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING jsonb_build_object('level', level, 'xp', xp, 'gold', gold) INTO new_stats;

  RETURN new_stats;
END;
$function$;
