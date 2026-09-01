-- Repurposes the Topic Mastery Gauntlet onto the weekly Monster Arena
-- question bank (content_questions_public) instead of draft_questions —
-- draft_questions was only ever authored for Grade 2 and Grade 5 (the Term
-- Exam Boss Fight's original scope), so Grades 3/4/6 got an empty Gauntlet.
-- content_questions_public already exists for every grade (it's populated
-- every week by ordinary BOW content generation) and already denormalizes
-- grade/subject/week_starting_date, so "review the previous weeks'
-- questions" needs no new authoring at all — it just works for whichever
-- grades already have weekly content, which is all of them.
--
-- Per-question correctness is now read from player_question_attempts (the
-- Monster Arena's own attempt log, already correctness-tracked) instead of
-- a parallel gauntlet-only table — grading goes through the existing
-- grade_content_question RPC via lib/guildEngine.ts's gradeMonsterQuestion,
-- not a new gauntlet-specific one.
--
-- Nothing here has ever been played by a real student (checked: zero rows
-- in mastery_gauntlet_attempts/mastery_gauntlet_sessions, zero claims on the
-- live Term 1 Review event before this migration), so it's safe to drop the
-- now-unused pieces outright rather than deprecate them in place.

drop function if exists public.grade_mastery_gauntlet_question(uuid, text, text, int, text, int);
drop table if exists public.mastery_gauntlet_attempts;

-- mastery_gauntlet_sessions (day-completion tracking) and
-- custom_events.content_source/gauntlet_term are unchanged — still needed,
-- unrelated to where the questions come from. gauntlet_term is no longer
-- read by the client (there's no "term" filter anymore, just "before this
-- event's start_date") but the column stays as harmless optional metadata
-- rather than forcing another schema churn.
