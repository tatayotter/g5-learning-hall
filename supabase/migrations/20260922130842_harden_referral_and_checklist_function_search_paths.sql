-- Security hardening: Supabase's advisor flags any function with no explicit
-- `search_path` as `function_search_path_mutable` -- without it, a function's
-- unqualified references resolve against whatever search_path the CALLER has
-- set, which a SECURITY DEFINER function especially can't safely assume.
-- Every function below already qualifies its own table/function references
-- with `public.` (or, for the two `sql`-language helpers, has none to
-- qualify), so this is a pure hardening pass -- `SET search_path TO 'public'`
-- added, bodies otherwise byte-identical to what's already live.

CREATE OR REPLACE FUNCTION public.daily_checklist_gold_for_streak(p_streak integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select least(50 + (least(greatest(p_streak, 1), 5) - 1) * 10, 90);
$function$;

CREATE OR REPLACE FUNCTION public.current_week_start()
 RETURNS date
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT (
    ((now() AT TIME ZONE 'Asia/Manila')::date)
    - (EXTRACT(DOW FROM (now() AT TIME ZONE 'Asia/Manila')::date)::int) * INTERVAL '1 day'
  )::date;
$function$;

CREATE OR REPLACE FUNCTION public.generate_unique_referral_key()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.generate_unique_referral_key_v2()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      SELECT 1 FROM public.player_referral_keys WHERE referral_key = key
    );
  END LOOP;
  RETURN key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_assign_referral_key()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.referral_key IS NULL THEN
    NEW.referral_key := public.generate_unique_referral_key();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_referral_key()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_app_user_id text;
  v_key         text;
BEGIN
  SELECT app_user_id INTO v_app_user_id
  FROM public.user_identity_map
  WHERE auth_uid = auth.uid()
  LIMIT 1;

  IF v_app_user_id IS NULL THEN RETURN NULL; END IF;
  IF v_app_user_id LIKE 'demo_%' THEN RETURN NULL; END IF;

  SELECT referral_key INTO v_key
  FROM public.player_referral_keys
  WHERE app_user_id = v_app_user_id;

  IF v_key IS NOT NULL THEN RETURN v_key; END IF;

  v_key := public.generate_unique_referral_key_v2();
  INSERT INTO public.player_referral_keys (app_user_id, referral_key)
  VALUES (v_app_user_id, v_key)
  ON CONFLICT (app_user_id) DO UPDATE SET referral_key = EXCLUDED.referral_key
  RETURNING referral_key INTO v_key;

  RETURN v_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_referral_code(p_registrant_id text, p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id text;
BEGIN
  SELECT app_user_id INTO v_referrer_id
  FROM public.player_referral_keys
  WHERE referral_key = p_code
    AND app_user_id NOT LIKE 'demo_%'
  LIMIT 1;

  IF v_referrer_id IS NULL THEN RETURN false; END IF;
  IF v_referrer_id = p_registrant_id THEN RETURN false; END IF;
  IF p_registrant_id LIKE 'demo_%' THEN RETURN false; END IF;

  INSERT INTO public.referral_rewards (referrer_child_id, registrant_child_id)
  VALUES (v_referrer_id, p_registrant_id)
  ON CONFLICT (registrant_child_id) DO NOTHING;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_referral_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'total_referrals',    COUNT(*),
    'rewarded_referrals', COUNT(*) FILTER (WHERE referrer_reward_credited),
    'pending_referrals',  COUNT(*) FILTER (WHERE NOT referrer_reward_credited)
  )
  FROM public.referral_rewards
  WHERE referrer_child_id = auth.uid()::text;
$function$;

CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
 RETURNS TABLE(referrer_id text, referrer_username text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT k.app_user_id, k.app_user_id
  FROM public.player_referral_keys k
  WHERE k.referral_key = p_code
    AND k.app_user_id NOT LIKE 'demo_%'
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_referrer_reward_on_level_5()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row          referral_rewards%rowtype;
  v_registrant   text;
begin
  if not (new.level >= 5 and old.level < 5) then
    return new;
  end if;

  select * into v_row
  from public.referral_rewards
  where registrant_child_id = new.user_id
    and not referrer_reward_credited
  for update skip locked;

  if not found then return new; end if;

  if exists (
    select 1 from public.children
    where id = v_row.referrer_child_id and username like 'demo_%'
  ) then return new; end if;

  perform public.upsert_inventory(v_row.referrer_child_id, 'growth_pill', 1);

  insert into public.player_progress (user_id, gold)
  values (v_row.referrer_child_id, 300)
  on conflict (user_id) do update
    set gold = public.player_progress.gold + 300;

  select username into v_registrant
  from public.children where id = v_row.registrant_child_id;

  insert into public.player_notifications (user_id, title, body, icon)
  values (
    v_row.referrer_child_id,
    'Referral Reward!',
    format(
      'Your friend %s reached Level 5! You earned 1 Growth Pill + 300 Gold!',
      coalesce(v_registrant, 'your friend')
    ),
    '🏆'
  );

  insert into public.push_notification_queue (owner_kind, owner_id, title, body, url)
  values (
    'app_user',
    v_row.referrer_child_id,
    'Referral Reward! 🏆',
    format(
      'Your friend %s reached Level 5! You earned 1 Growth Pill + 300 Gold!',
      coalesce(v_registrant, 'your friend')
    ),
    '/?tab=profile'
  );

  update public.referral_rewards
  set referrer_reward_credited = true
  where id = v_row.id;

  return new;
end;
$function$;
