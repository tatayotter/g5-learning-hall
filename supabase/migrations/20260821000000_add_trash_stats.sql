-- Migration: add lifetime trash-stats counters to player_progress
-- Date: 2026-08-21
-- Tracks total trash items collected and total gold earned from recycler trades,
-- persisted across sessions for achievement criteria.

ALTER TABLE player_progress
  ADD COLUMN IF NOT EXISTS trash_collected_total  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trash_gold_earned_total integer NOT NULL DEFAULT 0;

-- RPC: atomically increment both trash counters for a player.
-- SECURITY DEFINER so the anonymous-auth bridge can call it under the
-- authenticated role without a direct table-write grant.
-- Auth guard: callers may only bump their own row (auth.uid() == p_user_id).
CREATE OR REPLACE FUNCTION add_trash_stats(
  p_user_id  uuid,
  p_collected integer DEFAULT 0,
  p_gold      integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the authenticated user may write their own row.
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Upsert: create the row on first use (matches apply_progress_update pattern).
  INSERT INTO player_progress (user_id, trash_collected_total, trash_gold_earned_total, updated_at)
  VALUES (p_user_id, p_collected, p_gold, now())
  ON CONFLICT (user_id) DO UPDATE
    SET trash_collected_total  = player_progress.trash_collected_total  + EXCLUDED.trash_collected_total,
        trash_gold_earned_total = player_progress.trash_gold_earned_total + EXCLUDED.trash_gold_earned_total,
        updated_at = now();
END;
$$;
