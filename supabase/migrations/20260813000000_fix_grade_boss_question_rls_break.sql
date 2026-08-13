-- Bug: correct boss-fight answers were being scored as wrong for every student.
--
-- grade_boss_question (20260807000000_boss_fight_schema.sql) reads
-- draft_questions directly but was never SECURITY DEFINER, so it ran with
-- the calling client's own RLS. Yesterday's 20260812100000_lock_down_draft_
-- content_rls.sql correctly denied all direct client access to
-- draft_questions (it carries correct_answer for unreviewed content) --
-- but that also blocked this function's own SELECT for every student. The
-- SELECT then returned no row, `correct_answer = p_selected` evaluated to
-- NULL, and gradeBossQuestion()'s `!!data` treated that as false regardless
-- of whether the selected answer was actually correct.
--
-- Fix: mark it SECURITY DEFINER, matching grade_content_question (added the
-- same day in 20260811083401_add_progress_redesign_phase1_schema.sql), which
-- already does this correctly. Still only returns a boolean -- correct_answer
-- itself never reaches the client, so this doesn't reopen the leak the RLS
-- lockdown closed.
create or replace function public.grade_boss_question(p_question_id uuid, p_selected text)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select correct_answer = p_selected from public.draft_questions where id = p_question_id;
$$;
