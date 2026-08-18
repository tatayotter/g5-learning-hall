-- spend_gold_and_grant_item (added in 20260812060000) was accidentally left
-- without SECURITY DEFINER, unlike its siblings in the same migration
-- (tutor_curio, claim_daily_checklist_bonus, award_coins_to_child), all of
-- which correctly carry it. player_progress has RLS enabled with only a
-- "read all" SELECT policy (TO authenticated) -- no INSERT/UPDATE policy
-- exists at all -- so running as the caller's role instead of the definer's
-- silently blocked the gold-debit UPDATE (and, for anon/first-time callers,
-- the ON CONFLICT DO NOTHING seed INSERT too), surfacing client-side as an
-- empty {} PostgrestError from spend_gold_and_grant_item in lib/inventory.ts.
-- Signature is unchanged (text, text, integer), so plain CREATE OR REPLACE
-- is safe here -- no DROP FUNCTION needed, this isn't the overload trap.
CREATE OR REPLACE FUNCTION public.spend_gold_and_grant_item(p_user_id text, p_item_key text, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_gold integer;
  unit_cost integer;
  total_cost integer;
  new_stats jsonb;
BEGIN
  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'invalid quantity';
  END IF;

  SELECT cost INTO unit_cost FROM public.shop_items WHERE key = p_item_key AND is_active;
  IF unit_cost IS NULL THEN
    RAISE EXCEPTION 'unknown or inactive item: %', p_item_key;
  END IF;
  total_cost := unit_cost * p_quantity;

  INSERT INTO public.player_progress (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT gold INTO current_gold FROM public.player_progress WHERE user_id = p_user_id FOR UPDATE;

  IF current_gold < total_cost THEN
    RAISE EXCEPTION 'insufficient gold';
  END IF;

  UPDATE public.player_progress
  SET gold = gold - total_cost,
      purchased_items = COALESCE(purchased_items, 0) + 1,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING jsonb_build_object('level', level, 'xp', xp, 'gold', gold) INTO new_stats;

  INSERT INTO public.player_inventory (app_user_id, item_key, quantity)
  VALUES (p_user_id, p_item_key, p_quantity)
  ON CONFLICT (app_user_id, item_key)
  DO UPDATE SET quantity = public.player_inventory.quantity + p_quantity, updated_at = now();

  RETURN new_stats;
END;
$function$;
