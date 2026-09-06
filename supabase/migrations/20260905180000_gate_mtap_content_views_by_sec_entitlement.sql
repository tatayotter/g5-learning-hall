-- Closes a real free-access hole found while building the SEC shop
-- (docs/sec-shop-design.md): mtap_expansion_content_public and
-- mtap_expansion_content_reviewer are views owned by `postgres`, same as
-- their base table, with FORCE ROW LEVEL SECURITY off -- so
-- mtap_expansion_content's RLS (enabled, zero policies) never actually
-- applied to queries routed through the views. Any authenticated Supabase
-- session, not just a paying child, could SELECT * from either view via the
-- REST API directly and get the entire Grade 2 MTAP bank -- the reviewer
-- view included the answer key. BonusQuestsTab.tsx's entitlement check
-- (added earlier) only ever hid the UI tile; it never gated the data.
--
-- Fix: bake the entitlement check into the views themselves, so the content
-- endpoints are the real boundary, not the UI. A row is visible to a query
-- only if there's an ACTIVE sec_entitlements row for a pack whose
-- content_ref grade matches this row's grade, owned either by:
--   - the CHILD themself (current_app_user_id() = child_id) -- lets an
--     entitled kid play the quiz / read the reviewer through their own tab, or
--   - the PARENT who bought it (auth.uid() = parent_id) -- lets "for parent,
--     they can view the reviewer anytime" (confirmed decision) work without
--     the parent needing to authenticate as their child.
-- v1 has exactly one grade (2) with content, so this doesn't yet need a
-- content_ref matcher more specific than grade -- matches the same
-- grade-is-the-purchase-boundary decision docs/sec-shop-design.md already
-- made for sec_packs.content_ref.

CREATE OR REPLACE VIEW public.mtap_expansion_content_public AS
SELECT
  c.id,
  c.question_code,
  c.grade,
  c.strand,
  c.archetype,
  c.tier,
  c.question,
  c.options,
  c.time_budget_seconds,
  c.visual
FROM public.mtap_expansion_content c
WHERE EXISTS (
  SELECT 1
  FROM public.sec_entitlements e
  JOIN public.sec_packs p ON p.id = e.pack_id
  WHERE e.status = 'active'
    AND (p.content_ref ->> 'grade')::integer = c.grade
    AND (
      e.child_id = public.current_app_user_id()
      OR e.parent_id = auth.uid()
    )
);

CREATE OR REPLACE VIEW public.mtap_expansion_content_reviewer AS
SELECT
  c.id,
  c.question_code,
  c.grade,
  c.strand,
  c.archetype,
  c.tier,
  c.question,
  c.options,
  c.correct_answer,
  c.solution_steps,
  c.technique,
  c.time_budget_seconds,
  c.visual
FROM public.mtap_expansion_content c
WHERE c.reviewed = true
  AND EXISTS (
    SELECT 1
    FROM public.sec_entitlements e
    JOIN public.sec_packs p ON p.id = e.pack_id
    WHERE e.status = 'active'
      AND (p.content_ref ->> 'grade')::integer = c.grade
      AND (
        e.child_id = public.current_app_user_id()
        OR e.parent_id = auth.uid()
      )
  );

-- Grants unchanged (already `TO authenticated` from the original migrations)
-- -- the entitlement check above is what actually restricts rows now, not
-- the grant.
