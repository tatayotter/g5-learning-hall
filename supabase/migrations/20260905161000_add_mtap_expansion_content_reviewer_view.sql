-- MTAP Expansion Pack: a second public view over mtap_expansion_content, this one
-- deliberately INCLUDING correct_answer and solution_steps — for the untimed
-- Reviewer feature (per-strand study guide, opened via a "Study this topic group"
-- button, no timer, no grading). This is intentionally different from
-- mtap_expansion_content_public (the quiz's answer-free view): the Reviewer's whole
-- purpose is to show the worked answer up front, unlike the timed quiz which must
-- never leak it before grading. Two views, two different trust boundaries for the
-- same base table — not a relaxation of the quiz view's guarantee.
CREATE OR REPLACE VIEW public.mtap_expansion_content_reviewer AS
SELECT
  id,
  question_code,
  grade,
  strand,
  archetype,
  tier,
  question,
  options,
  correct_answer,
  solution_steps,
  technique,
  time_budget_seconds,
  visual
FROM public.mtap_expansion_content
WHERE reviewed = true;

GRANT SELECT ON public.mtap_expansion_content_reviewer TO authenticated;
