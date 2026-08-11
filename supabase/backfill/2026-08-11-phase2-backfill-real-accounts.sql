-- Phase 2 backfill: weekly_packages -> content_* / player_progress / player_weekly_journal
-- See docs/weekly-progress-redesign-plan.md.
--
-- NOT a schema migration -- a one-time DATA operation, run manually via the Supabase MCP
-- execute_sql tool (not supabase/migrations/, which is for DDL). Kept here for audit trail.
--
-- SCOPE: real accounts only, per 2026-08-11 decision. Of 135 distinct weekly_packages user_ids,
-- 125 are disposable (120 demo_* ephemeral accounts with their own expiry/rollup mechanism,
-- 5 QA/E2E test fixtures) and were deliberately excluded. The 10 real accounts:
--   - damien (grade 5, content owner)
--   - tala (grade 2, content owner)
--   - carlstiengotostos, fatty, josiahbreydenbalbuena, mikhailkazuedahilan, pauljakebautista,
--     rjniozionpabas, yzia06, zachkyriepredog (all grade 5, real students in `children`/`classmates`)
--
-- Idempotent throughout (ON CONFLICT DO UPDATE / DO NOTHING) -- safe to re-run.

BEGIN;

-- ============================================================================
-- STEP A: content backfill, from the 2 owner rows only (damien=16 total rows across both
-- owners: 10 grade-5 weeks + 6 grade-2 weeks). Non-owner rows have empty package_data (verified
-- 2026-08-11: all 143 non-owner rows are '{}'::jsonb) so there is nothing to extract from them.
-- ============================================================================
DO $$
DECLARE
  wp_row record;
  wk_id uuid;
  day_id uuid;
  quiz_id uuid;
  day_key text;
  subj_key text;
  subj_obj jsonb;
  quiz_arr jsonb;
  q jsonb;
  idx integer;
BEGIN
  FOR wp_row IN
    SELECT wp.user_id, wp.week_starting_date, wp.package_data, gco.grade
    FROM public.weekly_packages wp
    JOIN public.grade_content_owners gco ON gco.user_id = wp.user_id
  LOOP
    INSERT INTO public.content_weeks (grade, week_starting_date, status, created_by)
    VALUES (wp_row.grade, wp_row.week_starting_date, 'published', wp_row.user_id)
    ON CONFLICT (grade, week_starting_date) DO UPDATE SET status = 'published'
    RETURNING id INTO wk_id;

    FOR day_key IN SELECT jsonb_object_keys(wp_row.package_data) LOOP
      CONTINUE WHEN jsonb_typeof(wp_row.package_data -> day_key) <> 'object';

      INSERT INTO public.content_days (content_week_id, weekday)
      VALUES (wk_id, day_key)
      ON CONFLICT (content_week_id, weekday) DO UPDATE SET weekday = EXCLUDED.weekday
      RETURNING id INTO day_id;

      FOR subj_key IN SELECT jsonb_object_keys(wp_row.package_data -> day_key) LOOP
        subj_obj := wp_row.package_data -> day_key -> subj_key;
        CONTINUE WHEN jsonb_typeof(subj_obj) <> 'object';

        quiz_arr := COALESCE(subj_obj -> 'quiz', subj_obj -> 'questions', '[]'::jsonb);

        INSERT INTO public.content_quizzes (content_day_id, subject, summary_markdown)
        VALUES (day_id, subj_key, subj_obj ->> 'summary_markdown')
        ON CONFLICT (content_day_id, subject)
          DO UPDATE SET summary_markdown = EXCLUDED.summary_markdown
        RETURNING id INTO quiz_id;

        DELETE FROM public.content_questions WHERE content_quiz_id = quiz_id;

        idx := 0;
        IF jsonb_typeof(quiz_arr) = 'array' THEN
          FOR q IN SELECT * FROM jsonb_array_elements(quiz_arr) LOOP
            INSERT INTO public.content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
            VALUES (
              quiz_id,
              COALESCE(q ->> 'question', q ->> 'problem_prompt', ''),
              COALESCE(q -> 'options', '[]'::jsonb),
              COALESCE(q ->> 'correct_answer', ''),
              idx
            );
            idx := idx + 1;
          END LOOP;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- STEP B: player_progress -- lifetime totals for the 10 real accounts only.
-- Level/xp/gold taken from the row with the latest week_starting_date that has non-null
-- character_stats (skips the pre-staged-future-week null-sentinel row, e.g. damien's 08-16).
-- All 12 counters summed across every historical row for that user (nulls treated as 0).
-- ============================================================================
WITH real_users AS (
  SELECT unnest(ARRAY[
    'damien', 'tala', 'carlstiengotostos', 'fatty', 'josiahbreydenbalbuena',
    'mikhailkazuedahilan', 'pauljakebautista', 'rjniozionpabas', 'yzia06', 'zachkyriepredog'
  ]) AS user_id
),
latest_stats AS (
  SELECT DISTINCT ON (wp.user_id)
    wp.user_id, wp.character_stats
  FROM public.weekly_packages wp
  JOIN real_users ru ON ru.user_id = wp.user_id
  WHERE wp.character_stats IS NOT NULL
  ORDER BY wp.user_id, wp.week_starting_date DESC
),
totals AS (
  SELECT
    wp.user_id,
    SUM(COALESCE(wp.guild_sessions_count, 0)) AS guild_sessions_count_total,
    SUM(COALESCE(wp.monster_battles_won, 0)) AS monster_battles_won_total,
    SUM(COALESCE(wp.sibling_battles_won, 0)) AS sibling_battles_won_total,
    SUM(COALESCE(wp.perfect_quizzes, 0)) AS perfect_quizzes_total,
    SUM(COALESCE(wp.dummy_battles_won, 0)) AS dummy_battles_won_total,
    SUM(COALESCE(wp.eggs_hatched, 0)) AS eggs_hatched_total,
    SUM(COALESCE(wp.curios_graduated, 0)) AS curios_graduated_total,
    SUM(COALESCE(wp.trades_completed, 0)) AS trades_completed_total,
    SUM(COALESCE(wp.legendaries_caught, 0)) AS legendaries_caught_total,
    SUM(COALESCE(wp.tutor_rerolls, 0)) AS tutor_rerolls_total,
    SUM(COALESCE(wp.tatay_battles_won, 0)) AS tatay_battles_won_total,
    SUM(COALESCE(wp.tatay_battles_lost, 0)) AS tatay_battles_lost_total,
    -- Union every row's achievements object; unlock flags are additive so overlapping keys
    -- from different weeks are harmless (jsonb_object_agg keeps the last value per key, which
    -- is fine since these are boolean unlock flags, not counters).
    (SELECT jsonb_object_agg(key, value) FROM (
      SELECT key, value FROM public.weekly_packages wp2, jsonb_each(COALESCE(wp2.achievements, '{}'::jsonb))
      WHERE wp2.user_id = wp.user_id
    ) merged) AS achievements_merged
  FROM public.weekly_packages wp
  JOIN real_users ru ON ru.user_id = wp.user_id
  GROUP BY wp.user_id
)
INSERT INTO public.player_progress (
  user_id, level, xp, gold,
  guild_sessions_count_total, monster_battles_won_total, sibling_battles_won_total,
  perfect_quizzes_total, dummy_battles_won_total, eggs_hatched_total, curios_graduated_total,
  trades_completed_total, legendaries_caught_total, tutor_rerolls_total,
  tatay_battles_won_total, tatay_battles_lost_total, achievements
)
SELECT
  t.user_id,
  COALESCE((ls.character_stats ->> 'level')::int, 1),
  COALESCE((ls.character_stats ->> 'xp')::int, 0),
  COALESCE((ls.character_stats ->> 'gold')::int, 0),
  t.guild_sessions_count_total, t.monster_battles_won_total, t.sibling_battles_won_total,
  t.perfect_quizzes_total, t.dummy_battles_won_total, t.eggs_hatched_total, t.curios_graduated_total,
  t.trades_completed_total, t.legendaries_caught_total, t.tutor_rerolls_total,
  t.tatay_battles_won_total, t.tatay_battles_lost_total,
  COALESCE(t.achievements_merged, '{}'::jsonb)
FROM totals t
LEFT JOIN latest_stats ls ON ls.user_id = t.user_id
ON CONFLICT (user_id) DO UPDATE SET
  level = EXCLUDED.level, xp = EXCLUDED.xp, gold = EXCLUDED.gold,
  guild_sessions_count_total = EXCLUDED.guild_sessions_count_total,
  monster_battles_won_total = EXCLUDED.monster_battles_won_total,
  sibling_battles_won_total = EXCLUDED.sibling_battles_won_total,
  perfect_quizzes_total = EXCLUDED.perfect_quizzes_total,
  dummy_battles_won_total = EXCLUDED.dummy_battles_won_total,
  eggs_hatched_total = EXCLUDED.eggs_hatched_total,
  curios_graduated_total = EXCLUDED.curios_graduated_total,
  trades_completed_total = EXCLUDED.trades_completed_total,
  legendaries_caught_total = EXCLUDED.legendaries_caught_total,
  tutor_rerolls_total = EXCLUDED.tutor_rerolls_total,
  tatay_battles_won_total = EXCLUDED.tatay_battles_won_total,
  tatay_battles_lost_total = EXCLUDED.tatay_battles_lost_total,
  achievements = EXCLUDED.achievements,
  updated_at = now();

-- ============================================================================
-- STEP C: player_weekly_journal -- one row per (user, week) for the 10 real accounts,
-- linked to the matching content_weeks row by (grade, week_starting_date). All 8 real
-- students are grade 5 (verified 2026-08-11); damien is grade 5, tala is grade 2 (from
-- grade_content_owners). Every real user's week falls inside their grade's authored range,
-- so this join should never miss -- if it does, that row is silently skipped (inner join),
-- which the verification query after this script checks for.
-- ============================================================================
WITH real_user_grades AS (
  SELECT 'damien' AS user_id, 5 AS grade
  UNION ALL SELECT 'tala', 2
  UNION ALL SELECT 'carlstiengotostos', 5
  UNION ALL SELECT 'fatty', 5
  UNION ALL SELECT 'josiahbreydenbalbuena', 5
  UNION ALL SELECT 'mikhailkazuedahilan', 5
  UNION ALL SELECT 'pauljakebautista', 5
  UNION ALL SELECT 'rjniozionpabas', 5
  UNION ALL SELECT 'yzia06', 5
  UNION ALL SELECT 'zachkyriepredog', 5
)
INSERT INTO public.player_weekly_journal (
  user_id, content_week_id, journal_logs, mastery_count, purchased_items,
  honor_grants, quiz_attempts, mastered_quizzes
)
SELECT
  wp.user_id, cw.id,
  COALESCE(wp.journal_logs, '{}'::jsonb),
  COALESCE(wp.mastery_count, 0),
  COALESCE(wp.purchased_items, 0),
  COALESCE(wp.honor_grants, 0),
  COALESCE(wp.quiz_attempts, '{}'::jsonb),
  COALESCE(wp.mastered_quizzes, '[]'::jsonb)
FROM public.weekly_packages wp
JOIN real_user_grades rug ON rug.user_id = wp.user_id
JOIN public.content_weeks cw ON cw.grade = rug.grade AND cw.week_starting_date = wp.week_starting_date
ON CONFLICT (user_id, content_week_id) DO UPDATE SET
  journal_logs = EXCLUDED.journal_logs,
  mastery_count = EXCLUDED.mastery_count,
  purchased_items = EXCLUDED.purchased_items,
  honor_grants = EXCLUDED.honor_grants,
  quiz_attempts = EXCLUDED.quiz_attempts,
  mastered_quizzes = EXCLUDED.mastered_quizzes,
  updated_at = now();

COMMIT;

-- ============================================================================
-- NOT migrated (documented, not resolved):
-- - player_question_attempts: user_completed_questions.question_id is a synthetic hash of
--   question TEXT (see lib/guildEngine.ts hashQuestionId), not a real content_questions.id --
--   there is no reliable mapping from old hash-ids to new stable UUIDs. 2,797 existing
--   completed-question records across 26 users are NOT backfilled. Answered-state for Monster
--   Arena resets for everyone once the app cuts over to content_questions-based grading. This
--   is a one-time UX blip, not a data-loss risk (no xp/gold/level data lives in that table).
-- ============================================================================
