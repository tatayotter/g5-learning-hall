-- Found during an RLS audit: both children and classmates had a SELECT
-- policy targeting `public` (not scoped to `authenticated`, and with no
-- auth.uid() check at all) covering the ENTIRE row -- including
-- children.pin_plain/pin_hash and classmates.password_hash. RLS policies
-- gate which ROWS are visible, not which COLUMNS a client is allowed to
-- request -- so even though every app component only ever SELECTs the safe
-- display columns (full_name, grade, gender, avatar, school_name), any
-- other client (curl, devtools, a script) holding the project's public
-- anon key -- which is embedded in any page load of this app -- could
-- query the Supabase REST API directly for `select=username,pin_plain` (or
-- `password_hash`) and get every active child/classmate's real login
-- credentials. children's policy also had no auth.uid() = parent_id check
-- at all, so a parent's own children were readable by anyone regardless of
-- who's asking, not just leaking credential columns.
--
-- Fix: safe-column-only public views (matching the _public naming/design
-- pattern already used everywhere else in this schema --
-- content_questions_public, draft_questions_public, etc.), tightened base
-- table RLS, and client reads repointed at the views. children keeps a
-- scoped SELECT policy (a parent really does need to read their OWN
-- children's username, for the Parent Dashboard); classmates has no
-- owner concept at all (flat pre-provisioned account list, no auth.uid()
-- to scope by) so its base table goes to full deny-all -- ALL reads,
-- public and admin alike, go through a view or a passcode-gated API route.

-- ── children ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.children_public AS
SELECT id, full_name, grade, gender, avatar, school_name
FROM public.children
WHERE is_active = true AND public.is_parent_approved(parent_id);

DROP POLICY IF EXISTS "public can read active children of approved parents" ON public.children;

-- A parent reading their own children (Parent Dashboard) still needs
-- username (to display it) and needs to see inactive rows too (e.g. a
-- removed child), so this is a real table policy, not just the view.
CREATE POLICY "parent can read own children" ON public.children
  FOR SELECT TO authenticated
  USING (auth.uid() = parent_id);

-- ── classmates ────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.classmates_public AS
SELECT id, full_name, grade, gender, school_name
FROM public.classmates
WHERE is_active = true;

DROP POLICY IF EXISTS "Allow read" ON public.classmates;
-- No replacement policy -- classmates has no owner to scope a policy by.
-- The admin dashboard's need for username goes through a new passcode-
-- gated list action on /api/classmate-admin (service-role), same pattern
-- as draft_questions' list_drafts action.
