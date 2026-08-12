-- draft_questions/draft_summaries had SELECT open to {public} (not even
-- scoped to `authenticated` -- literally anyone with the project's public
-- anon key, which is embedded in any page load of this app, could read
-- these tables directly against the Supabase REST API). Both tables carry
-- correct_answer for quiz content still pending admin review -- the admin
-- passcode only ever gated the mutation RPCs (admin_update_draft_question,
-- admin_publish_draft_questions, etc.), never this plain read, so "draft"
-- content wasn't actually private from a student who opened devtools.
--
-- Locked down to deny-all direct client access, matching content_questions'
-- existing pattern (the raw table with correct_answer is never directly
-- readable; only the answer-stripped content_questions_public view is).
-- The two legitimate client-side readers (components/admin/
-- DraftQuestionsSection.tsx, PackagesSection.tsx) now go through a new
-- passcode-gated list_drafts action on /api/admin-draft-questions using
-- the service-role client, same pattern as every other privileged read in
-- that route.
DROP POLICY IF EXISTS "draft_questions: read all" ON public.draft_questions;
DROP POLICY IF EXISTS "draft_summaries_select" ON public.draft_summaries;
