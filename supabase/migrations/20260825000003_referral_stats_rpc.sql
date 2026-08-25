-- RPC: get_my_referral_stats
-- Returns aggregate stats for the calling player's referral activity.
-- Uses auth.uid() so no p_user_id arg is needed — safe from data leaks.

DROP FUNCTION IF EXISTS public.get_my_referral_stats();
CREATE OR REPLACE FUNCTION public.get_my_referral_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_referrals',    COUNT(*),
    'rewarded_referrals', COUNT(*) FILTER (WHERE referrer_reward_credited),
    'pending_referrals',  COUNT(*) FILTER (WHERE NOT referrer_reward_credited)
  )
  FROM public.referral_rewards
  WHERE referrer_child_id = auth.uid()::text;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_stats() TO authenticated;
