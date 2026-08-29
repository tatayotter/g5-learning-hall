-- MTAP Expansion Pack: content storage. Step 1 of the build order in
-- content/mtap-expansion-overview.md ("Next steps"). ADDITIVE ONLY -- new table,
-- touches nothing existing. Deliberately scoped to content storage only: mastery/
-- unlock progress tracking and the grading RPC are step 4 of that build order (the
-- Grade 5 Strand 6 pilot), not this migration -- narrower surface area to review now,
-- matching the "prove the pipeline on one slice" approach the design docs settled on.
--
-- Schema mirrors public.content_questions / content_questions_public exactly (see
-- 20260811083401_add_progress_redesign_phase1_schema.sql): correct_answer (and every
-- other answer-adjacent field) lives only in the base table, which has NO SELECT
-- policy for `authenticated` -- a future grading RPC is the only path to those fields,
-- same as QuestModule.tsx already expects for the regular weekly content.
--
-- Field meanings match the canonical schema in content/mtap-expansion-overview.md's
-- "Question Template Spec" section -- that doc is the source of truth for what each
-- column is for; comments here are intentionally short.

CREATE TABLE IF NOT EXISTS public.mtap_expansion_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Human-readable id per the pack's own scheme, e.g. 'g5-s6-age-avg-0007' --
  -- {grade}-s{strand}-{archetype}-{tier}-{seq}. Kept as a separate unique column
  -- rather than the primary key, matching this project's uuid-PK convention
  -- elsewhere (content_questions, player_progress, etc.).
  question_code text NOT NULL,
  grade integer NOT NULL CHECK (grade >= 2 AND grade <= 6),
  strand integer NOT NULL CHECK (strand > 0),
  archetype text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('easy', 'average', 'difficult')),
  -- The generative variables a template was rendered from -- kept for audit/
  -- regeneration, not read by the client.
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  -- One rationale per wrong option, same order as options minus the correct one --
  -- per Question Template Spec checklist item 2 (distractors must represent real
  -- errors, not filler).
  distractor_rationale jsonb NOT NULL DEFAULT '[]'::jsonb,
  solution_steps text NOT NULL,
  -- Named method from the Technique Library, or NULL where no faster-than-standard
  -- method exists (a real, intentional value -- not a placeholder for missing data).
  technique text,
  -- What the PRECEDING tier already taught that this question relies on. Empty for
  -- easy-tier rows.
  scaffold_note text,
  -- 15 / 30 / 60, matching the tier per the Contest Prep timing table -- drives the
  -- future Speed Round mode's per-question timer.
  time_budget_seconds integer NOT NULL CHECK (time_budget_seconds IN (15, 30, 60)),
  -- Nullable. {"type": "table"|"diagram"|"bar_graph"|"pictograph",
  --            "markdown_table": "...", "image_url": "..."} -- only archetypes that
  -- genuinely need a visual (Reading Data, composite geometry, etc.) set this.
  visual jsonb,
  -- Provenance tag, e.g. a template/prompt version -- never traces back to a real
  -- MTAP reviewer question, per the pack's sourcing policy.
  generated_by text NOT NULL,
  -- Flips true only after the Question Template Spec's verification pass (recompute
  -- the answer from the rendered question, not the params it was written from).
  -- mtap_expansion_content_public (below) only serves reviewed rows.
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mtap_expansion_content_question_code_unique UNIQUE (question_code)
);

CREATE INDEX IF NOT EXISTS idx_mtap_expansion_content_lookup
  ON public.mtap_expansion_content USING btree (grade, strand, archetype, tier);

ALTER TABLE public.mtap_expansion_content ENABLE ROW LEVEL SECURITY;

-- Deliberately no SELECT policy for `authenticated` -- correct_answer, solution_steps,
-- technique, scaffold_note, and distractor_rationale must only ever reach the client
-- through mtap_expansion_content_public (pre-answer, answer-free) or a future grading
-- RPC (post-answer, with the answer-adjacent fields), same split as content_questions.

-- Public/pre-answer view: only what's safe to show before a child answers, and only
-- rows that have passed the verification pass (reviewed = true).
CREATE OR REPLACE VIEW public.mtap_expansion_content_public AS
SELECT
  id,
  question_code,
  grade,
  strand,
  archetype,
  tier,
  question,
  options,
  time_budget_seconds,
  visual
FROM public.mtap_expansion_content
WHERE reviewed = true;

GRANT SELECT ON public.mtap_expansion_content_public TO authenticated;
