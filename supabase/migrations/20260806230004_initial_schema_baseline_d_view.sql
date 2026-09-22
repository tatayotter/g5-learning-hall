-- Initial schema baseline, part D of D (view half): the event_quests_public view.
--
-- See part A (20260806230001_initial_schema_baseline_a_tables.sql) for the full rationale,
-- versioning note, and idempotency notes shared by this whole baseline.
--
-- This view depends only on public.strip_event_quiz_answers(jsonb), defined in part C
-- (20260806230002_initial_schema_baseline_c_functions.sql), so it's safe to place here,
-- early in the sequence. The other half of the original "trigger and view" pair --
-- on_auth_user_created_insert_parent -- is NOT here: that trigger calls
-- public.handle_new_parent_signup(), which isn't defined until the real, pre-existing
-- migration 20260826010000_auto_approve_parents.sql. Creating the trigger this early would
-- fail a from-scratch replay with "function handle_new_parent_signup() does not exist", so
-- it's instead its own migration, 20260826010001_initial_schema_baseline_e_trigger.sql,
-- positioned right after that function is defined.
--
-- Idempotency: CREATE OR REPLACE VIEW is natively idempotent.

create or replace view public.event_quests_public
with (security_invoker = true) as
 SELECT id,
    event_id,
    subject_name,
    summary_markdown,
    sort_order,
    created_at,
    grade_level,
    strip_event_quiz_answers(quiz) AS quiz
   FROM event_quests;
