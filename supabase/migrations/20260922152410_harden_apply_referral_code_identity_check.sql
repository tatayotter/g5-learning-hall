-- Security fix: apply_referral_code(p_registrant_id, p_code) is SECURITY DEFINER, granted
-- EXECUTE to anon/authenticated, and had no check that p_registrant_id matched the caller's
-- own identity -- the exact gap docs/rpc-identity-hardening.md's Group A already closed for
-- 16 other functions, missed here because this function was added after that audit.
--
-- Exploitable: any caller could invoke this directly via PostgREST with an arbitrary
-- p_registrant_id and their own referral code, silently registering someone else's account
-- as "referred by me" (referral_rewards.registrant_child_id has a unique constraint, so
-- whichever call lands first wins) -- stealing a future referral-reward credit the attacker
-- didn't earn, or griefing a real referral by occupying that registrant's row before their
-- actual referrer's legitimate call (which would then silently no-op on the ON CONFLICT).
--
-- Confirmed safe to add the standard check: the only live call site is
-- app/api/child-signup/route.ts, called immediately after create_unclaimed_child_account
-- (which inserts the user_identity_map row for this exact auth session as part of the same
-- signup flow, before this call), always passing the just-created account's own id --
-- current_app_user_id() already resolves correctly by the time this runs. The lib/referral.ts
-- wrapper (applyReferralCode) is unused dead code, not a second call site with different
-- semantics. Verified in a rolled-back transaction: an unauthenticated/mismatched caller now
-- gets `not authorized` instead of silently succeeding.
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_registrant_id text, p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id text;
BEGIN
  IF p_registrant_id IS DISTINCT FROM public.current_app_user_id() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT app_user_id INTO v_referrer_id
  FROM public.player_referral_keys
  WHERE referral_key = p_code
    AND app_user_id NOT LIKE 'demo_%'
  LIMIT 1;

  IF v_referrer_id IS NULL THEN RETURN false; END IF;
  IF v_referrer_id = p_registrant_id THEN RETURN false; END IF;
  IF p_registrant_id LIKE 'demo_%' THEN RETURN false; END IF;

  INSERT INTO public.referral_rewards (referrer_child_id, registrant_child_id)
  VALUES (v_referrer_id, p_registrant_id)
  ON CONFLICT (registrant_child_id) DO NOTHING;

  RETURN true;
END;
$function$;
