-- Expose the caller's own referral_key via a SECURITY DEFINER RPC so
-- RLS on children does not block client reads of this column.
-- auth.uid() matches children.id because create_unclaimed_child_account
-- binds the row to the anonymous session that created it.

CREATE OR REPLACE FUNCTION public.get_my_referral_key()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT referral_key
  FROM public.children
  WHERE id::text = auth.uid()::text
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_key() TO authenticated;
