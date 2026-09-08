-- Bug found during a Shop/buying-process sweep: unpublishing a sec_packs row
-- (admin_set_sec_pack_active(false) — "SEC Refunds"/"SEC Packs" both promise
-- this "keeps existing buyers' access; it just stops new sales") silently
-- broke that promise for the PARENT side. sec_packs only had one RLS policy,
-- `active = true`, so /parent-dashboard/my-secs's `sec_packs` select would
-- come back empty for an unpublished pack, and the page's
-- `.filter(row => row.pack && row.kid)` then dropped that entitlement
-- entirely -- an owning parent's "My SECs" list would just lose the pack,
-- with no way to reach its reviewer, even though they still own it.
--
-- The CHILD side was never affected: BonusQuestsTab/lib/secEngine.ts and the
-- mtap_expansion_content_public/_reviewer views (gated in
-- 20260905180000_gate_mtap_content_views_by_sec_entitlement.sql) only ever
-- check sec_entitlements.status = 'active' -- neither reads sec_packs.active
-- at all. Only the parent-facing catalog metadata lookup was broken.
--
-- Fix: a second, additive SELECT policy -- a parent or child with an active
-- entitlement for a pack can still see that pack's row even after it's
-- unpublished. RLS policies for the same command OR together, so this only
-- ever WIDENS visibility beyond `active = true`, never narrows it -- the
-- Shop's own catalog query (`.eq('active', true)`) is unaffected, since an
-- unpublished pack still correctly disappears from the buyable catalog.
CREATE POLICY sec_packs_select_owned
  ON public.sec_packs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sec_entitlements e
      WHERE e.pack_id = sec_packs.id
        AND e.status = 'active'
        AND (e.parent_id = auth.uid() OR e.child_id = public.current_app_user_id())
    )
  );
