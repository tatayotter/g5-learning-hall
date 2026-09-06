-- Admin authoring for the SEC Shop catalog (docs/sec-shop-design.md open
-- item #5): "admin_* + passcode pattern the rest of the admin surface
-- already uses" -- mirrors admin_upsert_egg_chain / admin_delete_egg_chain
-- exactly (SECURITY DEFINER, check_admin_passcode(p_passcode) as the real
-- gate, not RLS or Supabase Auth). sec_packs' own RLS only lets
-- authenticated/anon read active=true rows (see the shop-facing catalog
-- policy) -- these SECURITY DEFINER functions, owned by the same role as
-- the table with FORCE ROW LEVEL SECURITY off, deliberately see every row
-- (including inactive/unpublished packs), same bypass-by-design the base
-- table's other SECURITY DEFINER admin functions already rely on.
--
-- No delete RPC: sec_packs.id is FK'd from sec_entitlements (real purchase
-- history), so "remove a pack" is admin_set_sec_pack_active(false) --
-- unpublish, never delete -- matching sec_packs.active's own documented
-- purpose ("unpublishing without deleting purchase history").

CREATE OR REPLACE FUNCTION public.admin_list_sec_packs(p_passcode text)
RETURNS SETOF public.sec_packs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);
  RETURN QUERY SELECT * FROM public.sec_packs ORDER BY grade, id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_sec_pack(
  p_passcode text,
  p_id text,
  p_grade integer,
  p_category text,
  p_title text,
  p_description text,
  p_price_php integer,
  p_content_ref jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  IF p_id IS NULL OR p_id = '' OR p_grade IS NULL OR p_category IS NULL OR p_category = ''
     OR p_title IS NULL OR p_title = '' OR p_description IS NULL OR p_description = ''
     OR p_price_php IS NULL OR p_content_ref IS NULL THEN
    RAISE EXCEPTION 'id, grade, category, title, description, price_php, and content_ref are all required';
  END IF;
  IF p_grade < 2 OR p_grade > 6 THEN
    RAISE EXCEPTION 'grade must be between 2 and 6';
  END IF;
  IF p_price_php <= 0 THEN
    RAISE EXCEPTION 'price_php must be positive';
  END IF;

  INSERT INTO public.sec_packs (id, grade, category, title, description, price_php, content_ref)
  VALUES (p_id, p_grade, p_category, p_title, p_description, p_price_php, p_content_ref)
  ON CONFLICT (id) DO UPDATE
  SET grade = EXCLUDED.grade,
      category = EXCLUDED.category,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      price_php = EXCLUDED.price_php,
      content_ref = EXCLUDED.content_ref;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_sec_pack_active(
  p_passcode text,
  p_id text,
  p_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  UPDATE public.sec_packs SET active = p_active WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such pack: %', p_id;
  END IF;
END;
$$;

-- Granted to anon/authenticated deliberately -- check_admin_passcode is the
-- actual gate, matching every other admin_* RPC in this schema (e.g.
-- admin_upsert_egg_chain), called from the admin dashboard's API routes via
-- the plain anon-key client, not a Supabase Auth session.
GRANT EXECUTE ON FUNCTION public.admin_list_sec_packs(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_sec_pack(text, text, integer, text, text, text, integer, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_sec_pack_active(text, text, boolean) TO anon, authenticated;
