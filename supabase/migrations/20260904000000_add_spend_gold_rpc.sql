-- Atomic gold-only debit, for spends that don't grant an inventory item
-- (e.g. paying gold mid-battle to skip an attack's question) — a stripped-down
-- sibling of spend_gold_and_grant_item (20260812060000 /
-- 20260814000000_fix_spend_gold_and_grant_item_security_definer.sql), same
-- SECURITY DEFINER + FOR UPDATE pattern so a caller can't spend gold that
-- was never actually deducted. Cost is passed in by the caller (there's no
-- shop_items row for "skip a question"), but the amount is still validated
-- and the deduction is still atomic/server-side, so a client can't lie about
-- how much gold it has.
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
  IF p_amount < 1 THEN
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
