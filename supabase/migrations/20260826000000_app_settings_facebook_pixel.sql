-- Site-wide settings, starting with the Facebook Pixel ID (tatayadmin > System > Site Settings).
-- Single-row table (id fixed to 1) rather than a generic key/value table -- there's exactly one
-- of these right now and a fixed row keeps the read side (every page, unauthenticated) a trivial
-- `select ... limit 1` with no key lookup.
--
-- RLS: public SELECT is intentional -- a Pixel ID is not sensitive (Meta's own pixel snippet is
-- visible in every page's rendered HTML/network requests anyway) and it must be readable by
-- anonymous visitors on every route, including the pre-login splash screen. Writes go through
-- admin_set_facebook_pixel_id only, passcode-gated the same way as every other admin RPC
-- (see check_admin_passcode, used by admin_set_progress_stats etc.) -- no direct INSERT/UPDATE/
-- DELETE policies at all.
CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  facebook_pixel_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings public read" ON public.app_settings;
CREATE POLICY "app_settings public read" ON public.app_settings
  FOR SELECT USING (true);

-- Admin (passcode-gated): sets/clears the Facebook Pixel ID. Empty string is normalized to NULL
-- so FacebookPixel.tsx's "is a pixel configured?" check is a plain not-null check.
CREATE OR REPLACE FUNCTION public.admin_set_facebook_pixel_id(p_passcode text, p_pixel_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  UPDATE public.app_settings
  SET facebook_pixel_id = NULLIF(TRIM(p_pixel_id), ''), updated_at = now()
  WHERE id = 1;
END;
$function$;
