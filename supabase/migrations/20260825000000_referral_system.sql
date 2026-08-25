-- ============================================================
-- Referral system
-- ============================================================
-- Each child account gets a unique 4-char case-sensitive key
-- (a-z A-Z 0-9) auto-generated on insert.
--
-- Referral flow:
--   1. Registrant enters referrer's key at /child-signup.
--   2. apply_referral_code() links them and creates a
--      referral_rewards row.
--   3. Registrant reward (1 Growth Pill + 100 Gold) fires on
--      their first login via claim_registrant_referral_reward().
--   4. Referrer reward (1 Growth Pill + 300 Gold) fires when
--      the registrant's player_progress.level first reaches 5,
--      via a DB trigger.
--
-- Demo accounts (username LIKE 'demo_%') are excluded from
-- all reward paths. Siblings may refer each other.
-- ============================================================

-- ── 1. Columns on children ─────────────────────────────────

-- children.id is text, not uuid — all FK columns must match
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS referral_key         text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_child_id text
    REFERENCES public.children(id) ON DELETE SET NULL;

-- ── 2. Key-generation helper ───────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_unique_referral_key()
RETURNS text
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  key   text;
BEGIN
  LOOP
    key := '';
    FOR i IN 1..4 LOOP
      key := key || substr(chars, floor(random() * 62)::int + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.children WHERE referral_key = key
    );
  END LOOP;
  RETURN key;
END;
$$;

-- ── 3. Auto-assign key on every new children row ───────────

CREATE OR REPLACE FUNCTION public.auto_assign_referral_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.referral_key IS NULL THEN
    NEW.referral_key := public.generate_unique_referral_key();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_referral_key ON public.children;
CREATE TRIGGER trg_auto_assign_referral_key
  BEFORE INSERT ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_referral_key();

-- ── 4. Backfill existing rows ──────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.children WHERE referral_key IS NULL LOOP
    UPDATE public.children
    SET referral_key = public.generate_unique_referral_key()
    WHERE id = r.id;
  END LOOP;
END;
$$;

ALTER TABLE public.children
  ALTER COLUMN referral_key SET NOT NULL;

-- ── 5. referral_rewards ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_child_id           text NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  registrant_child_id         text NOT NULL UNIQUE
                                REFERENCES public.children(id) ON DELETE CASCADE,
  registrant_reward_credited  boolean NOT NULL DEFAULT false,
  referrer_reward_credited    boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
-- All access is via SECURITY DEFINER RPCs; no direct client reads/writes.

-- ── 6. player_notifications ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.player_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL,          -- matches player_progress.user_id (text UUID)
  title      text NOT NULL,
  body       text NOT NULL,
  icon       text NOT NULL DEFAULT '🎁',
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_notifications_user_unread
  ON public.player_notifications (user_id, read)
  WHERE NOT read;

ALTER TABLE public.player_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_notifications: read own" ON public.player_notifications;
CREATE POLICY "player_notifications: read own"
  ON public.player_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

-- Writes only via SECURITY DEFINER RPCs below.

-- ── 7. validate_referral_code ──────────────────────────────
-- Returns the referrer's id + username, or empty if unknown/demo.

DROP FUNCTION IF EXISTS public.validate_referral_code(text);
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS TABLE(referrer_id text, referrer_username text)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT id, username
  FROM public.children
  WHERE referral_key = p_code
    AND username NOT LIKE 'demo_%'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO authenticated;

-- ── 8. apply_referral_code ─────────────────────────────────
-- Called by /api/child-signup after account creation.
-- Links registrant → referrer and inserts a referral_rewards row.
-- No-ops silently if code is invalid, demo, or self-referral.

DROP FUNCTION IF EXISTS public.apply_referral_code(uuid, text);
DROP FUNCTION IF EXISTS public.apply_referral_code(text, text);
CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_registrant_id text,
  p_code          text
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id text;
BEGIN
  -- Resolve referrer (exclude demo accounts)
  SELECT id INTO v_referrer_id
  FROM public.children
  WHERE referral_key = p_code
    AND username NOT LIKE 'demo_%'
  LIMIT 1;

  IF v_referrer_id IS NULL THEN RETURN false; END IF;
  IF v_referrer_id = p_registrant_id THEN RETURN false; END IF;

  -- Don't allow if registrant is demo
  IF EXISTS (
    SELECT 1 FROM public.children
    WHERE id = p_registrant_id AND username LIKE 'demo_%'
  ) THEN RETURN false; END IF;

  -- Idempotent link
  UPDATE public.children
  SET referred_by_child_id = v_referrer_id
  WHERE id = p_registrant_id
    AND referred_by_child_id IS NULL;

  -- Referral reward row (one per registrant — unique constraint handles dupes)
  INSERT INTO public.referral_rewards
    (referrer_child_id, registrant_child_id)
  VALUES
    (v_referrer_id, p_registrant_id)
  ON CONFLICT (registrant_child_id) DO NOTHING;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_referral_code(text, text) TO authenticated;

-- ── 9. claim_registrant_referral_reward ────────────────────
-- First-login reward for the registrant: 1 Growth Pill + 100 Gold.
-- Called client-side from Dashboard/setActiveUser on login.
-- Returns JSON {gold, growth_pills} or null if nothing to claim.

DROP FUNCTION IF EXISTS public.claim_registrant_referral_reward(text);
CREATE OR REPLACE FUNCTION public.claim_registrant_referral_reward(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
AS $$
DECLARE
  v_row referral_rewards%ROWTYPE;
BEGIN
  -- Exclude demo accounts
  IF p_user_id LIKE 'demo_%' THEN RETURN NULL; END IF;

  SELECT * INTO v_row
  FROM public.referral_rewards
  WHERE registrant_child_id::text = p_user_id
    AND NOT registrant_reward_credited
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Grant Growth Pill
  PERFORM public.upsert_inventory(p_user_id, 'growth_pill', 1);

  -- Grant 100 Gold (upsert player_progress so new players get a row)
  INSERT INTO public.player_progress (user_id, gold)
  VALUES (p_user_id, 100)
  ON CONFLICT (user_id) DO UPDATE
    SET gold = public.player_progress.gold + 100;

  -- Inbox notification
  INSERT INTO public.player_notifications (user_id, title, body, icon)
  VALUES (
    p_user_id,
    'Welcome Bonus!',
    'You joined with a referral code and earned 1 Growth Pill + 100 Gold! Keep playing to level up and reward your friend too.',
    '🎁'
  );

  UPDATE public.referral_rewards
  SET registrant_reward_credited = true
  WHERE id = v_row.id;

  RETURN jsonb_build_object('gold', 100, 'growth_pills', 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_registrant_referral_reward(text) TO authenticated;

-- ── 10. Trigger: referrer reward when registrant hits level 5 ─

CREATE OR REPLACE FUNCTION public.trigger_referrer_reward_on_level_5()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row          referral_rewards%ROWTYPE;
  v_registrant   text;
BEGIN
  -- Only fires when level crosses 5 for the first time
  IF NOT (NEW.level >= 5 AND OLD.level < 5) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_row
  FROM public.referral_rewards
  WHERE registrant_child_id = NEW.user_id
    AND NOT referrer_reward_credited
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Exclude demo referrers
  IF EXISTS (
    SELECT 1 FROM public.children
    WHERE id = v_row.referrer_child_id AND username LIKE 'demo_%'
  ) THEN RETURN NEW; END IF;

  -- Grant Growth Pill to referrer
  PERFORM public.upsert_inventory(v_row.referrer_child_id, 'growth_pill', 1);

  -- Grant 300 Gold to referrer
  INSERT INTO public.player_progress (user_id, gold)
  VALUES (v_row.referrer_child_id, 300)
  ON CONFLICT (user_id) DO UPDATE
    SET gold = public.player_progress.gold + 300;

  -- Get registrant username for notification
  SELECT username INTO v_registrant
  FROM public.children WHERE id = v_row.registrant_child_id;

  -- Inbox notification for referrer
  INSERT INTO public.player_notifications (user_id, title, body, icon)
  VALUES (
    v_row.referrer_child_id::text,
    'Referral Reward!',
    format(
      'Your friend %s reached Level 5! You earned 1 Growth Pill + 300 Gold!',
      COALESCE(v_registrant, 'your friend')
    ),
    '🏆'
  );

  UPDATE public.referral_rewards
  SET referrer_reward_credited = true
  WHERE id = v_row.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referrer_reward_level_5 ON public.player_progress;
CREATE TRIGGER trg_referrer_reward_level_5
  AFTER UPDATE OF level ON public.player_progress
  FOR EACH ROW EXECUTE FUNCTION public.trigger_referrer_reward_on_level_5();

-- ── 11. fetch_player_notifications ─────────────────────────

DROP FUNCTION IF EXISTS public.fetch_player_notifications(text);
CREATE OR REPLACE FUNCTION public.fetch_player_notifications(p_user_id text)
RETURNS TABLE(
  id         uuid,
  title      text,
  body       text,
  icon       text,
  read       boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT id, title, body, icon, read, created_at
  FROM public.player_notifications
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.fetch_player_notifications(text) TO authenticated;

-- ── 12. mark_notifications_read ────────────────────────────

DROP FUNCTION IF EXISTS public.mark_notifications_read(text);
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_user_id text)
RETURNS void
LANGUAGE sql
VOLATILE SECURITY DEFINER
AS $$
  UPDATE public.player_notifications
  SET read = true
  WHERE user_id = p_user_id AND NOT read;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notifications_read(text) TO authenticated;
