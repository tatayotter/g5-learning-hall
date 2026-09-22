-- Fix: set_team_slot errored ("more than one row returned by a subquery
-- used as an expression") when a player owns two user_monsters rows for the
-- same species at once — e.g. kept a duplicate wild catch while the
-- original of that species was already on the team/bench. The bare
-- `WHERE user_id = ... AND monster_id = ...` lookup can't disambiguate
-- between them, so moving the "other" copy into a team slot silently failed
-- in the client (see components/monster/TeamPanel.tsx's handleAddMonster).
--
-- Fix has two parts:
--   1. New optional p_monster_row_id lets a caller that already knows the
--      exact user_monsters row (e.g. a bench card in TeamPanel) pin the RPC
--      to that row instead of an ambiguous species lookup.
--   2. The species-only fallback lookup (still used when promoting a fresh
--      catch from user_caught_monsters, which has no existing row id) is
--      made deterministic with ORDER BY id LIMIT 1 instead of erroring out.
--
-- Signature changed (new trailing param) — DROP first so this doesn't leave
-- behind an overloaded duplicate (see docs note on the CREATE OR REPLACE
-- overload trap: replacing under a different arg list creates a second
-- function instead of replacing the first).
--
-- CREATE OR REPLACE, not a bare CREATE: a from-scratch replay hit "function
-- \"set_team_slot\" already exists with same argument types" (SQLSTATE 42723)
-- -- the schema baseline (supabase/migrations/20260806230002_..._c_functions.sql)
-- was introspected from production AFTER this fix was already live there, so
-- it already defines set_team_slot with this exact 7-arg signature. OR
-- REPLACE is safe here specifically because the arg list now matches exactly
-- (unlike the overload trap this comment already guards against, which is
-- about replacing under a genuinely *different* arg list) -- see
-- docs/database-migrations.md's idempotency section.
DROP FUNCTION IF EXISTS public.set_team_slot(text, text, integer, integer, integer, text);

CREATE OR REPLACE FUNCTION public.set_team_slot(
  p_user_id text,
  p_monster_id text,
  p_slot integer,
  p_init_level integer DEFAULT 1,
  p_init_exp integer DEFAULT 0,
  p_init_quality text DEFAULT 'normal'::text,
  p_monster_row_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  incoming_id uuid;
  occupant_id uuid;
BEGIN
  IF p_slot NOT IN (1, 2, 3) THEN
    RETURN NULL;
  END IF;

  IF p_monster_row_id IS NOT NULL THEN
    SELECT id INTO incoming_id FROM user_monsters
    WHERE id = p_monster_row_id AND user_id = p_user_id AND monster_id = p_monster_id;
  ELSE
    SELECT id INTO incoming_id FROM user_monsters
    WHERE user_id = p_user_id AND monster_id = p_monster_id
    ORDER BY id
    LIMIT 1;
  END IF;

  SELECT id INTO occupant_id FROM user_monsters
  WHERE user_id = p_user_id AND slot = p_slot;

  IF incoming_id IS NOT NULL AND incoming_id = occupant_id THEN
    RETURN incoming_id; -- already sitting in that slot
  END IF;

  -- Lock both rows (if they exist) in a stable order before mutating either,
  -- so two concurrent calls for the same user can't deadlock or interleave.
  PERFORM 1 FROM user_monsters
  WHERE id IN (incoming_id, occupant_id)
  ORDER BY id
  FOR UPDATE;

  IF occupant_id IS NOT NULL THEN
    UPDATE user_monsters SET slot = NULL WHERE id = occupant_id;
  END IF;

  IF incoming_id IS NOT NULL THEN
    UPDATE user_monsters SET slot = p_slot WHERE id = incoming_id;
    RETURN incoming_id;
  END IF;

  INSERT INTO user_monsters (user_id, monster_id, monster_exp, monster_level, slot, rest_used, quality)
  VALUES (p_user_id, p_monster_id, p_init_exp, p_init_level, p_slot, 0, p_init_quality)
  RETURNING id INTO incoming_id;

  RETURN incoming_id;
END;
$function$;
