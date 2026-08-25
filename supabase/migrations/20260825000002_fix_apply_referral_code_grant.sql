-- Fix: GRANT for apply_referral_code had wrong signature (uuid, text) instead of (text, text).
-- The previous GRANT was a no-op in Postgres, so authenticated users couldn't call the RPC.
REVOKE EXECUTE ON FUNCTION public.apply_referral_code(text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.apply_referral_code(text, text) TO   authenticated;
