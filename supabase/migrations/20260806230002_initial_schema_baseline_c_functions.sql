-- Initial schema baseline, part C of D: FUNCTIONS (61 total).
--
-- See part A (20260806230001_initial_schema_baseline_a_tables.sql) for the full rationale,
-- versioning note, and idempotency notes shared by this whole baseline. In short: this
-- file's version prefix is deliberately earlier than 20260807000000_boss_fight_schema.sql
-- (which calls current_app_user_id(), defined here) so a from-scratch replay succeeds in
-- order, and the version Supabase actually recorded for this file at apply time is a later
-- timestamp reflecting when it was applied against production, not this filename.
--
-- Idempotency: CREATE OR REPLACE FUNCTION is natively idempotent. The REVOKE/GRANT
-- statements that follow some functions are themselves idempotent (revoking a privilege
-- that isn't held, or granting one already held, is a no-op) and replicate the least-
-- privilege grants those specific functions carry in production today (RPCs meant only for
-- admin/service_role use, not the default anon+authenticated PostgREST grant).
--
-- Generated directly from production via pg_get_functiondef + has_function_privilege,
-- not hand-transcribed. One bug was found and fixed while assembling this file: the first
-- draft of the REVOKE/GRANT lines had a doubled "public.public." schema prefix, which would
-- have failed outright (invalid function reference) -- caught and fixed before this was ever
-- applied anywhere.

-- account_created_at
CREATE OR REPLACE FUNCTION public.account_created_at(p_id text)
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select created_at from public.family_credentials where id = p_id),
    (select created_at from public.children where id = p_id),
    (select created_at from public.classmates where id = p_id),
    (select created_at from public.demo_accounts where user_id = p_id)
  );
$function$;

-- admin_delete_egg_chain
CREATE OR REPLACE FUNCTION public.admin_delete_egg_chain(p_passcode text, p_species_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.check_admin_passcode(p_passcode);
  delete from public.curio_egg_chains where species_id = p_species_id;
end;
$function$;

-- admin_list_children
CREATE OR REPLACE FUNCTION public.admin_list_children()
 RETURNS TABLE(id text, parent_id uuid, parent_email text, parent_status text, username text, full_name text, grade text, gender text, school_name text, avatar text, is_active boolean, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select c.id, c.parent_id, u.email, p.status,
         c.username, c.full_name, c.grade, c.gender,
         c.school_name, c.avatar, c.is_active, c.created_at
  from public.children c
  left join public.parents p on p.id = c.parent_id
  left join auth.users u on u.id = p.id
  where (select admin_email from public.admin_config where id = true) = (auth.jwt()->>'email')
  order by c.full_name;
$function$;

-- admin_list_egg_chains
CREATE OR REPLACE FUNCTION public.admin_list_egg_chains(p_passcode text)
 RETURNS SETOF curio_egg_chains
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.check_admin_passcode(p_passcode);
  return query select * from public.curio_egg_chains order by species_id;
end;
$function$;

-- admin_list_parents
CREATE OR REPLACE FUNCTION public.admin_list_parents()
 RETURNS TABLE(id uuid, email text, full_name text, phone text, status text, marketing_opt_in boolean, created_at timestamp with time zone, children jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select p.id, u.email, p.full_name, p.phone, p.status, p.marketing_opt_in, p.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
          'id', c.id, 'full_name', c.full_name, 'grade', c.grade,
          'school_name', c.school_name, 'is_active', c.is_active
        ) order by c.full_name)
       from public.children c where c.parent_id = p.id),
      '[]'::jsonb
    ) as children
  from public.parents p
  join auth.users u on u.id = p.id
  where (select admin_email from public.admin_config where id = true) = (auth.jwt()->>'email')
  order by p.created_at desc;
$function$;

-- admin_list_pending_parents
CREATE OR REPLACE FUNCTION public.admin_list_pending_parents()
 RETURNS TABLE(id uuid, email text, full_name text, phone text, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select p.id, u.email, p.full_name, p.phone, p.created_at
  from public.parents p
  join auth.users u on u.id = p.id
  where p.status = 'pending'
    and (select admin_email from public.admin_config where id = true) = (auth.jwt()->>'email');
$function$;
revoke all on function public.admin_list_pending_parents() from public, anon;
grant execute on function public.admin_list_pending_parents() to authenticated, service_role;

-- admin_request_child_reassignment
CREATE OR REPLACE FUNCTION public.admin_request_child_reassignment(p_passcode text, p_child_id text, p_new_parent_email text, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_new_parent_id uuid;
  v_old_parent_id uuid;
  v_token text;
  v_admin_email text;
  v_old_parent_email text;
  v_child_full_name text;
  v_new_parent_full_name text;
begin
  perform public.check_admin_passcode(p_passcode);

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'reason is required';
  end if;

  select full_name into v_child_full_name from public.children where id = p_child_id;
  if v_child_full_name is null then
    raise exception 'unknown child';
  end if;

  select id, coalesce(raw_user_meta_data->>'full_name', 'Parent') into v_new_parent_id, v_new_parent_full_name
  from auth.users
  where lower(email) = lower(trim(p_new_parent_email));

  if v_new_parent_id is null then
    raise exception 'no registered account found for that email';
  end if;

  -- Ensure a parents row exists (accounts predating the
  -- on_auth_user_created_insert_parent trigger may not have one) --
  -- preserves any existing status rather than overwriting it.
  insert into public.parents (id, full_name, status)
  values (v_new_parent_id, v_new_parent_full_name, 'approved')
  on conflict (id) do nothing;

  select parent_id into v_old_parent_id from public.children where id = p_child_id;
  select admin_email into v_admin_email from public.admin_config where id = true;

  if v_old_parent_id is not null then
    select email into v_old_parent_email from auth.users where id = v_old_parent_id;
  end if;

  update public.pending_parent_reassignments
    set status = 'cancelled', cancelled_at = now()
    where child_id = p_child_id and status = 'pending';

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.pending_parent_reassignments
    (child_id, old_parent_id, new_parent_id, reason, admin_email, cancel_token_hash)
  values
    (p_child_id, v_old_parent_id, v_new_parent_id, p_reason, v_admin_email,
     encode(extensions.digest(v_token, 'sha256'), 'hex'));

  return jsonb_build_object(
    'cancel_token', v_token,
    'old_parent_email', v_old_parent_email,
    'new_parent_email', lower(trim(p_new_parent_email)),
    'child_full_name', v_child_full_name
  );
end;
$function$;

-- admin_set_child_active
CREATE OR REPLACE FUNCTION public.admin_set_child_active(p_child_id text, p_is_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if (select admin_email from public.admin_config where id = true) is distinct from (auth.jwt()->>'email') then
    raise exception 'not authorized';
  end if;

  update public.children set is_active = p_is_active where id = p_child_id;
end;
$function$;

-- admin_set_draft_question_status
CREATE OR REPLACE FUNCTION public.admin_set_draft_question_status(p_passcode text, p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  perform public.check_admin_passcode(p_passcode);

  if p_status not in ('pending_review', 'approved', 'rejected') then
    raise exception 'invalid status %: must be pending_review, approved, or rejected', p_status;
  end if;

  update public.draft_questions
  set status = p_status,
      reviewed_at = case when p_status in ('approved','rejected') then now() else reviewed_at end
  where id = p_id;

  if not found then
    raise exception 'draft % not found', p_id;
  end if;
end;
$function$;

-- admin_set_draft_summary_status
CREATE OR REPLACE FUNCTION public.admin_set_draft_summary_status(p_passcode text, p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  perform public.check_admin_passcode(p_passcode);
  if p_status not in ('pending_review','approved','rejected') then
    raise exception 'invalid status %: must be pending_review, approved, or rejected', p_status;
  end if;
  update public.draft_summaries
  set status = p_status, reviewed_at = now()
  where id = p_id;
  if not found then
    raise exception 'draft summary not found';
  end if;
end;
$function$;

-- admin_set_event_status
CREATE OR REPLACE FUNCTION public.admin_set_event_status(p_passcode text, p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  IF p_status NOT IN ('draft', 'scheduled', 'active', 'archived') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  UPDATE public.custom_events SET status = p_status, updated_at = now() WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no custom_event with id %', p_id;
  END IF;
END;
$function$;

-- admin_set_parent_status
CREATE OR REPLACE FUNCTION public.admin_set_parent_status(p_parent_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if (select admin_email from public.admin_config where id = true) is distinct from (auth.jwt()->>'email') then
    raise exception 'not authorized';
  end if;
  if p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid status';
  end if;

  update public.parents
  set status = p_status,
      approved_at = case when p_status = 'approved' then now() else approved_at end,
      approved_by = case when p_status = 'approved' then auth.uid() else approved_by end
  where id = p_parent_id;
end;
$function$;

-- admin_set_reward_claim_status
CREATE OR REPLACE FUNCTION public.admin_set_reward_claim_status(p_passcode text, p_id bigint, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  IF p_status NOT IN ('pending', 'supplied') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  UPDATE public.reward_claims SET status = p_status WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no reward claim with id %', p_id;
  END IF;
END;
$function$;

-- admin_update_draft_question
CREATE OR REPLACE FUNCTION public.admin_update_draft_question(p_passcode text, p_id uuid, p_question text, p_options jsonb, p_correct_answer text, p_topic text, p_tier integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  perform public.check_admin_passcode(p_passcode);

  update public.draft_questions
  set question = p_question,
      options = p_options,
      correct_answer = p_correct_answer,
      topic = p_topic,
      tier = p_tier
  where id = p_id
    and status = 'pending_review';

  if not found then
    raise exception 'draft % not found or not editable (must be pending_review)', p_id;
  end if;
end;
$function$;

-- admin_update_draft_summary
CREATE OR REPLACE FUNCTION public.admin_update_draft_summary(p_passcode text, p_id uuid, p_summary_markdown text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  perform public.check_admin_passcode(p_passcode);
  update public.draft_summaries
  set summary_markdown = p_summary_markdown
  where id = p_id and status = 'pending_review';
  if not found then
    raise exception 'draft summary not found or not pending review';
  end if;
end;
$function$;

-- admin_upsert_egg_chain
CREATE OR REPLACE FUNCTION public.admin_upsert_egg_chain(p_passcode text, p_species_id text, p_predecessor_species_id text, p_element text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.check_admin_passcode(p_passcode);

  if p_species_id is null or p_species_id = '' or p_predecessor_species_id is null or p_predecessor_species_id = '' or p_element is null or p_element = '' then
    raise exception 'species_id, predecessor_species_id, and element are required';
  end if;

  insert into public.curio_egg_chains (species_id, predecessor_species_id, element, updated_at)
  values (p_species_id, p_predecessor_species_id, p_element, now())
  on conflict (species_id) do update
  set predecessor_species_id = excluded.predecessor_species_id,
      element = excluded.element,
      updated_at = now();
end;
$function$;

-- admin_upsert_event_quests
CREATE OR REPLACE FUNCTION public.admin_upsert_event_quests(p_passcode text, p_event_id uuid, p_rows jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);

  INSERT INTO public.event_quests (event_id, subject_name, summary_markdown, quiz, sort_order, grade_level)
  SELECT
    p_event_id,
    r.subject_name,
    r.summary_markdown,
    r.quiz,
    r.sort_order,
    r.grade_level
  FROM jsonb_to_recordset(p_rows) AS r(
    subject_name text, summary_markdown text, quiz jsonb, sort_order integer, grade_level integer
  )
  ON CONFLICT (event_id, subject_name, grade_level) DO UPDATE SET
    summary_markdown = EXCLUDED.summary_markdown,
    quiz = EXCLUDED.quiz,
    sort_order = EXCLUDED.sort_order;
END;
$function$;

-- am_i_linked
CREATE OR REPLACE FUNCTION public.am_i_linked()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select c.parent_id is not null
  from public.children c
  join public.user_identity_map m on m.app_user_id = c.id
  where m.auth_uid = auth.uid();
$function$;

-- approve_parent
CREATE OR REPLACE FUNCTION public.approve_parent(p_parent_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if (select admin_email from public.admin_config where id = true) is distinct from (auth.jwt()->>'email') then
    raise exception 'not authorized';
  end if;

  update public.parents
  set status = 'approved', approved_at = now(), approved_by = auth.uid()
  where id = p_parent_id and status = 'pending';
end;
$function$;
revoke all on function public.approve_parent(p_parent_id uuid) from public, anon;
grant execute on function public.approve_parent(p_parent_id uuid) to authenticated, service_role;

-- cancel_child_reassignment
CREATE OR REPLACE FUNCTION public.cancel_child_reassignment(p_cancel_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_hash text := encode(extensions.digest(coalesce(p_cancel_token, ''), 'sha256'), 'hex');
begin
  update public.pending_parent_reassignments
  set status = 'cancelled', cancelled_at = now()
  where cancel_token_hash = v_hash and status = 'pending';

  if not found then
    raise exception 'invalid or already resolved' using errcode = 'P0001';
  end if;
end;
$function$;

-- cancel_trade_request
CREATE OR REPLACE FUNCTION public.cancel_trade_request(p_trade_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me text := public.current_app_user_id();
  v_updated int;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  update public.trades
    set status = 'cancelled', responded_at = now()
    where id = p_trade_id and initiator_id = v_me and status = 'pending';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$function$;

-- check_admin_passcode
CREATE OR REPLACE FUNCTION public.check_admin_passcode(p_passcode text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  stored_hash text;
BEGIN
  SELECT passcode_hash INTO stored_hash FROM public.admin_config WHERE id = true;
  IF stored_hash IS NULL OR p_passcode IS NULL OR stored_hash <> extensions.crypt(p_passcode, stored_hash) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
END;
$function$;
revoke all on function public.check_admin_passcode(p_passcode text) from public, anon, authenticated;
grant execute on function public.check_admin_passcode(p_passcode text) to service_role;

-- check_reassignment_cron_secret
CREATE OR REPLACE FUNCTION public.check_reassignment_cron_secret(p_secret text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  stored_hash text;
begin
  select secret_hash into stored_hash from public.reassignment_cron_secret where id = true;
  if stored_hash is null or p_secret is null or stored_hash <> extensions.crypt(p_secret, stored_hash) then
    raise exception 'not authorized';
  end if;
end;
$function$;

-- claim_curio_egg
CREATE OR REPLACE FUNCTION public.claim_curio_egg(p_user_id text, p_user_monster_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_monster record;
  v_predecessor text;
  v_element text;
  v_required_level integer;
  v_egg_id uuid;
begin
  if p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  if p_user_id like 'demo\_%' escape '\' then
    return jsonb_build_object('success', false, 'error', 'demo_not_supported');
  end if;

  select id, monster_id, graduation_tier, monster_level into v_monster
  from public.user_monsters
  where id = p_user_monster_id and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if coalesce(v_monster.graduation_tier, 0) < 1 then
    return jsonb_build_object('success', false, 'error', 'not_graduated');
  end if;

  v_required_level := case v_monster.graduation_tier
    when 1 then 20 + 3
    when 2 then 32 + 3
    else null
  end;

  if v_required_level is null or v_monster.monster_level < v_required_level then
    return jsonb_build_object('success', false, 'error', 'level_too_low');
  end if;

  if exists (select 1 from public.curio_eggs where parent_user_monster_id = p_user_monster_id) then
    return jsonb_build_object('success', false, 'error', 'already_claimed');
  end if;

  select predecessor_species_id, element into v_predecessor, v_element
  from public.curio_egg_chains
  where species_id = v_monster.monster_id;

  if v_predecessor is null then
    return jsonb_build_object('success', false, 'error', 'no_chain_defined');
  end if;

  insert into public.curio_eggs (user_id, parent_user_monster_id, egg_species_id, element)
  values (p_user_id, p_user_monster_id, v_predecessor, v_element)
  returning id into v_egg_id;

  return jsonb_build_object('success', true, 'egg_id', v_egg_id, 'egg_species_id', v_predecessor, 'element', v_element);
exception when unique_violation then
  return jsonb_build_object('success', false, 'error', 'already_claimed');
end;
$function$;

-- consume_inventory_item
CREATE OR REPLACE FUNCTION public.consume_inventory_item(p_user_id text, p_item_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  affected int;
begin
  update player_inventory
  set quantity = quantity - 1, updated_at = now()
  where app_user_id = p_user_id
    and item_key = p_item_key
    and quantity > 0;
  get diagnostics affected = row_count;
  return affected > 0;
end;
$function$;

-- counter_trade_request
CREATE OR REPLACE FUNCTION public.counter_trade_request(p_trade_id uuid, p_my_monster_ids uuid[], p_their_monster_ids uuid[], p_my_gold integer DEFAULT 0, p_their_gold integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me text := public.current_app_user_id();
  v_trade record;
  v_new_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  select * into v_trade from public.trades where id = p_trade_id for update;
  if not found then
    raise exception 'trade not found';
  end if;
  if v_me <> v_trade.recipient_id then
    raise exception 'only the recipient can counter this trade';
  end if;
  if v_trade.status <> 'pending' then
    raise exception 'trade is no longer pending';
  end if;
  if now() > v_trade.expires_at then
    update public.trades set status = 'expired' where id = p_trade_id;
    raise exception 'trade request has expired';
  end if;

  v_new_id := public._create_trade_internal(
    v_me, v_trade.initiator_id, p_my_monster_ids, p_their_monster_ids, p_my_gold, p_their_gold,
    v_trade.thread_id, p_trade_id
  );

  update public.trades set status = 'countered', responded_at = now() where id = p_trade_id;

  return v_new_id;
end;
$function$;

-- create_classmate
CREATE OR REPLACE FUNCTION public.create_classmate(p_id text, p_username text, p_password text, p_full_name text, p_grade text, p_gender text DEFAULT 'boy'::text, p_passcode text DEFAULT NULL::text, p_school_name text DEFAULT 'Surigao City Special Science Elementary School'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);
  insert into public.classmates (id, username, password_hash, full_name, grade, gender, is_active, school_name)
  values (p_id, p_username, extensions.crypt(p_password, extensions.gen_salt('bf')), p_full_name, p_grade, p_gender, true, p_school_name);
END;
$function$;

-- create_trade_request
CREATE OR REPLACE FUNCTION public.create_trade_request(p_recipient_id text, p_my_monster_ids uuid[], p_their_monster_ids uuid[], p_my_gold integer DEFAULT 0, p_their_gold integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me text := public.current_app_user_id();
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  return public._create_trade_internal(
    v_me, p_recipient_id, p_my_monster_ids, p_their_monster_ids, p_my_gold, p_their_gold,
    gen_random_uuid(), null
  );
end;
$function$;

-- create_unclaimed_child_account
CREATE OR REPLACE FUNCTION public.create_unclaimed_child_account(p_ip text, p_username text, p_pin text, p_full_name text, p_grade text, p_gender text, p_school_name text, p_avatar text)
 RETURNS TABLE(id text, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_id text;
  v_recent_count int;
begin
  if auth.uid() is null then
    raise exception 'no authenticated session' using errcode = 'P0001';
  end if;

  select count(*) into v_recent_count
  from public.child_signup_rate_limit
  where ip = p_ip and created_at > now() - interval '1 hour';

  if v_recent_count >= 5 then
    raise exception 'signup rate limit exceeded' using errcode = 'P0001';
  end if;

  insert into public.child_signup_rate_limit (ip) values (p_ip);

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'pin must be 4 digits';
  end if;

  v_id := lower(regexp_replace(p_username, '[^a-zA-Z0-9_]', '', 'g'));
  if v_id = '' then
    raise exception 'invalid username';
  end if;

  if exists (select 1 from public.children c where c.id = v_id or c.username = p_username) then
    raise exception 'username already taken';
  end if;

  insert into public.children (id, parent_id, username, pin_hash, pin_plain, full_name, grade, gender, school_name, avatar)
  values (v_id, null, p_username, extensions.crypt(p_pin, extensions.gen_salt('bf')), p_pin, p_full_name, p_grade, p_gender, p_school_name, p_avatar);

  insert into public.user_identity_map (auth_uid, app_user_id)
  values (auth.uid(), v_id)
  on conflict (auth_uid) do update set app_user_id = excluded.app_user_id;

  return query select v_id, p_username;
end;
$function$;

-- current_app_user_id
CREATE OR REPLACE FUNCTION public.current_app_user_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select app_user_id from public.user_identity_map where auth_uid = auth.uid();
$function$;

-- daily_checklist_gold_for_streak
CREATE OR REPLACE FUNCTION public.daily_checklist_gold_for_streak(p_streak integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select least(50 + (least(greatest(p_streak, 1), 5) - 1) * 10, 90);
$function$;

-- execute_due_child_reassignments
CREATE OR REPLACE FUNCTION public.execute_due_child_reassignments(p_cron_secret text)
 RETURNS TABLE(child_id text, child_full_name text, old_parent_email text, new_parent_email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_row record;
  v_current_count int;
  v_max int;
  v_old_email text;
  v_new_email text;
  v_child_name text;
begin
  perform public.check_reassignment_cron_secret(p_cron_secret);

  for v_row in
    select * from public.pending_parent_reassignments
    where status = 'pending' and effective_at <= now()
    for update skip locked
  loop
    select count(*) into v_current_count from public.children c
    where c.parent_id = v_row.new_parent_id and c.is_active = true;
    v_max := public.max_children_for_parent(v_row.new_parent_id);

    if v_current_count >= v_max then
      continue;
    end if;

    update public.children set parent_id = v_row.new_parent_id where id = v_row.child_id
      returning full_name into v_child_name;
    update public.pending_parent_reassignments
      set status = 'completed', completed_at = now()
      where id = v_row.id;

    select email into v_old_email from auth.users where id = v_row.old_parent_id;
    select email into v_new_email from auth.users where id = v_row.new_parent_id;

    child_id := v_row.child_id;
    child_full_name := v_child_name;
    old_parent_email := v_old_email;
    new_parent_email := v_new_email;
    return next;
  end loop;
end;
$function$;

-- generate_unique_referral_key_v2
CREATE OR REPLACE FUNCTION public.generate_unique_referral_key_v2()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
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

-- get_child_journal
CREATE OR REPLACE FUNCTION public.get_child_journal(p_child_id text, p_limit integer DEFAULT 10)
 RETURNS TABLE(entry_date date, done_today text, tomorrow_plan text, hardest_challenge text, gratitude text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select je.entry_date, je.done_today, je.tomorrow_plan, je.hardest_challenge, je.gratitude
  from public.journal_entries je
  where je.user_id = p_child_id
    and exists (
      select 1 from public.children c
      where c.id = p_child_id and c.parent_id = auth.uid()
    )
    and exists (
      select 1 from public.subscriptions s
      where s.parent_id = auth.uid() and s.status = 'active'
    )
  order by je.entry_date desc
  limit greatest(p_limit, 0);
$function$;

-- get_child_pin
CREATE OR REPLACE FUNCTION public.get_child_pin(p_child_id text)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select c.pin_plain
  from public.children c
  where c.id = p_child_id
    and c.parent_id = auth.uid();
$function$;

-- get_child_streak
CREATE OR REPLACE FUNCTION public.get_child_streak(p_child_id text)
 RETURNS TABLE(claim_date date)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select dcc.claim_date
  from public.daily_checklist_claims dcc
  where dcc.app_user_id = p_child_id
    and exists (
      select 1 from public.children c
      where c.id = p_child_id and c.parent_id = auth.uid()
    )
  order by dcc.claim_date desc
  limit 60;
$function$;

-- get_reengagement_candidates
CREATE OR REPLACE FUNCTION public.get_reengagement_candidates()
 RETURNS TABLE(child_id text, child_full_name text, parent_email text, parent_first_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  select c.id, c.full_name, u.email::text, p.full_name
  from public.children c
  join public.parents p on p.id = c.parent_id
  join public.user_last_login ull on ull.user_id = c.id
  join auth.users u on u.id = p.id
  where p.status = 'approved'
    and p.marketing_opt_in = true
    and c.is_active = true
    and ull.last_login <= now() - interval '3 days'
    and (c.last_reengagement_sent_at is null or c.last_reengagement_sent_at < ull.last_login)
    and u.email is not null;
end;
$function$;

-- get_top_traders
CREATE OR REPLACE FUNCTION public.get_top_traders(p_limit integer DEFAULT 10)
 RETURNS TABLE(user_id text, total_fees bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select payer, sum(fee)::bigint as total_fees
  from (
    select initiator_id as payer, coalesce(initiator_fee_gold, 0) as fee
    from public.trades where status = 'completed'
    union all
    select recipient_id as payer, coalesce(recipient_fee_gold, 0) as fee
    from public.trades where status = 'completed'
  ) fees
  group by payer
  having sum(fee) > 0
  order by total_fees desc
  limit p_limit;
$function$;

-- grade_event_quiz
CREATE OR REPLACE FUNCTION public.grade_event_quiz(p_event_quest_id uuid, p_selected jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  quiz_arr jsonb;
  q jsonb;
  idx int := 0;
  correct_count int := 0;
  total int := 0;
  correct_answers jsonb := '[]'::jsonb;
  selected_opt text;
begin
  select quiz into quiz_arr from public.event_quests where id = p_event_quest_id;

  if quiz_arr is null or jsonb_typeof(quiz_arr) <> 'array' then
    return jsonb_build_object('correct_count', 0, 'total', 0, 'is_perfect', false, 'correct_answers', '[]'::jsonb);
  end if;

  for q in select * from jsonb_array_elements(quiz_arr) loop
    total := total + 1;
    selected_opt := p_selected ->> idx::text;
    if selected_opt = (q ->> 'correct_answer') then
      correct_count := correct_count + 1;
    end if;
    correct_answers := correct_answers || jsonb_build_array(q -> 'correct_answer');
    idx := idx + 1;
  end loop;

  return jsonb_build_object(
    'correct_count', correct_count,
    'total', total,
    'is_perfect', (total > 0 and correct_count = total),
    'correct_answers', correct_answers
  );
end;
$function$;

-- graduate_monster
CREATE OR REPLACE FUNCTION public.graduate_monster(p_user_id text, p_monster_row_id uuid, p_required_level integer, p_target_tier integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  current_tier int;
  current_level int;
  affected int;
BEGIN
  IF p_target_tier NOT IN (1, 2) THEN
    RETURN false;
  END IF;

  SELECT graduation_tier, monster_level INTO current_tier, current_level
  FROM user_monsters
  WHERE id = p_monster_row_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF current_tier <> p_target_tier - 1 THEN
    RETURN false;
  END IF;

  IF current_level < p_required_level THEN
    RETURN false;
  END IF;

  UPDATE player_inventory
  SET quantity = quantity - 1, updated_at = now()
  WHERE app_user_id = p_user_id
    AND item_key = 'graduation_scroll'
    AND quantity > 0;
  GET DIAGNOSTICS affected = row_count;

  IF affected = 0 THEN
    RETURN false;
  END IF;

  UPDATE user_monsters
  SET graduation_tier = p_target_tier
  WHERE id = p_monster_row_id AND user_id = p_user_id;

  RETURN true;
END;
$function$;

-- incubate_curio_egg
CREATE OR REPLACE FUNCTION public.incubate_curio_egg(p_user_id text, p_egg_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_status text;
begin
  if p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  select status into v_status from public.curio_eggs
  where id = p_egg_id and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_status <> 'stalled' then
    return jsonb_build_object('success', false, 'error', 'not_stalled');
  end if;

  update public.curio_eggs
  set status = 'incubating', last_progress_date = (timezone('utc', now()))::date
  where id = p_egg_id;

  return jsonb_build_object('success', true);
end;
$function$;

-- is_parent_approved
CREATE OR REPLACE FUNCTION public.is_parent_approved(p_parent_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.parents WHERE id = p_parent_id AND status = 'approved'
  );
$function$;

-- learn_monster_skill
CREATE OR REPLACE FUNCTION public.learn_monster_skill(p_user_id text, p_monster_row_id uuid, p_slot_index integer, p_skill_id text, p_scroll_item_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  current_slot text;
  affected int;
BEGIN
  -- Legendary skills are an exclusive default kit for legendary monsters
  -- (see LEGENDARY_SKILL_BY_ELEMENT in lib/monsterConfig.ts) and are never
  -- sold as scrolls. Reject here too, since p_skill_id/p_scroll_item_key are
  -- independent parameters and nothing above this function checks they match.
  IF p_skill_id LIKE 'legendary_%' THEN
    RETURN false;
  END IF;

  SELECT equipped_skills[p_slot_index] INTO current_slot
  FROM user_monsters
  WHERE id = p_monster_row_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF current_slot IS DISTINCT FROM 'EMPTY' THEN
    RETURN false;
  END IF;

  UPDATE player_inventory
  SET quantity = quantity - 1, updated_at = now()
  WHERE app_user_id = p_user_id
    AND item_key = p_scroll_item_key
    AND quantity > 0;
  GET DIAGNOSTICS affected = row_count;

  IF affected = 0 THEN
    RETURN false;
  END IF;

  UPDATE user_monsters
  SET equipped_skills[p_slot_index] = p_skill_id
  WHERE id = p_monster_row_id AND user_id = p_user_id;

  RETURN true;
END;
$function$;

-- link_verified_identity
CREATE OR REPLACE FUNCTION public.link_verified_identity(p_id text, p_credential text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_auth_uid uuid := auth.uid();
  v_current text;
  v_ok boolean := false;
begin
  if v_auth_uid is null then
    return false;
  end if;

  select app_user_id into v_current from public.user_identity_map where auth_uid = v_auth_uid;

  -- Reconfirming the same claim (e.g. on page reload) never needs a credential.
  if v_current = p_id then
    return true;
  end if;

  -- Family profiles (damien/tala) are unprotected until a password is set via
  -- the Admin Dashboard, mirroring lib/userSession.ts:isFamilyProtected.
  if p_id in ('damien', 'tala') and not exists (
    select 1 from public.family_credentials where id = p_id
  ) then
    v_ok := true;
  elsif exists (
    select 1 from public.family_credentials
    where id = p_id and password_hash = extensions.crypt(coalesce(p_credential, ''), password_hash)
  ) then
    v_ok := true;
  elsif exists (
    select 1 from public.children c
    left join public.parents p on p.id = c.parent_id
    where c.id = p_id and c.is_active = true
      and (c.parent_id is null or p.status = 'approved')
      and c.pin_hash = extensions.crypt(coalesce(p_credential, ''), c.pin_hash)
  ) then
    v_ok := true;
  elsif exists (
    select 1 from public.classmates
    where id = p_id and is_active = true
      and password_hash = extensions.crypt(coalesce(p_credential, ''), password_hash)
  ) then
    v_ok := true;
  end if;

  if not v_ok then
    return false;
  end if;

  insert into public.user_identity_map (auth_uid, app_user_id)
  values (v_auth_uid, p_id)
  on conflict (auth_uid) do update set app_user_id = excluded.app_user_id;

  return true;
end;
$function$;

-- mark_reengagement_sent
CREATE OR REPLACE FUNCTION public.mark_reengagement_sent(p_child_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.children
  set last_reengagement_sent_at = now()
  where id = p_child_id;
end;
$function$;
revoke all on function public.mark_reengagement_sent(p_child_id text) from public, anon, authenticated;
grant execute on function public.mark_reengagement_sent(p_child_id text) to service_role;

-- max_children_for_parent
CREATE OR REPLACE FUNCTION public.max_children_for_parent(p_parent_id uuid)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when exists (
      select 1 from public.subscriptions s
      where s.parent_id = p_parent_id and s.status = 'active'
    )
    then least(5, 3 + coalesce((select addon_children from public.subscriptions where parent_id = p_parent_id), 0))
    else 1
  end;
$function$;

-- preview_parent_link
CREATE OR REPLACE FUNCTION public.preview_parent_link(p_token text)
 RETURNS TABLE(child_first_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_hash text := encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  v_id uuid;
  v_full_name text;
begin
  select plr.id, c.full_name into v_id, v_full_name
  from public.parent_link_requests plr
  join public.children c on c.id = plr.child_id
  where plr.token_hash = v_hash and plr.status = 'pending' and plr.expires_at > now();

  if not found then
    raise exception 'invalid or expired link' using errcode = 'P0001';
  end if;

  update public.parent_link_requests set attempts = attempts + 1 where id = v_id;

  return query select split_part(v_full_name, ' ', 1);
end;
$function$;

-- reject_parent
CREATE OR REPLACE FUNCTION public.reject_parent(p_parent_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if (select admin_email from public.admin_config where id = true) is distinct from (auth.jwt()->>'email') then
    raise exception 'not authorized';
  end if;

  delete from public.parents where id = p_parent_id and status = 'pending';
  delete from auth.users where id = p_parent_id;
end;
$function$;
revoke all on function public.reject_parent(p_parent_id uuid) from public, anon;
grant execute on function public.reject_parent(p_parent_id uuid) to authenticated, service_role;

-- rls_auto_enable
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to service_role;

-- search_players
CREATE OR REPLACE FUNCTION public.search_players(p_query text)
 RETURNS TABLE(id text, display_name text, grade text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select c.id, c.full_name, c.grade
  from public.children c
  where c.is_active = true
    and c.id <> coalesce(public.current_app_user_id(), '')
    and c.full_name ilike '%' || p_query || '%'

  union all

  select c.id, c.full_name, c.grade
  from public.classmates c
  where c.is_active = true
    and c.id <> coalesce(public.current_app_user_id(), '')
    and c.full_name ilike '%' || p_query || '%'

  union all

  select f.id,
    case f.id when 'damien' then 'Damien' when 'tala' then 'Tala' end,
    case f.id when 'damien' then 'Grade 5' when 'tala' then 'Grade 2' end
  from (values ('damien'), ('tala')) as f(id)
  where f.id <> coalesce(public.current_app_user_id(), '')
    and f.id ilike '%' || p_query || '%'

  limit 20;
$function$;

-- set_family_password
CREATE OR REPLACE FUNCTION public.set_family_password(p_id text, p_password text, p_passcode text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);
  insert into public.family_credentials (id, password_hash)
  values (p_id, extensions.crypt(p_password, extensions.gen_salt('bf')))
  on conflict (id) do update set password_hash = excluded.password_hash;
END;
$function$;

-- set_team_slot
CREATE OR REPLACE FUNCTION public.set_team_slot(p_user_id text, p_monster_id text, p_slot integer, p_init_level integer DEFAULT 1, p_init_exp integer DEFAULT 0, p_init_quality text DEFAULT 'normal'::text, p_monster_row_id uuid DEFAULT NULL::uuid)
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

-- strip_event_quiz_answers
CREATE OR REPLACE FUNCTION public.strip_event_quiz_answers(quiz jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare
  new_quiz jsonb := '[]'::jsonb;
  q jsonb;
begin
  if quiz is null or jsonb_typeof(quiz) <> 'array' then
    return quiz;
  end if;
  for q in select * from jsonb_array_elements(quiz) loop
    new_quiz := new_quiz || jsonb_build_array(q - 'correct_answer');
  end loop;
  return new_quiz;
end;
$function$;

-- sync_egg_progress
CREATE OR REPLACE FUNCTION public.sync_egg_progress(p_user_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_today date := (timezone('utc', now()))::date;
  r record;
  v_new_streak integer;
  v_roll numeric;
  v_quality text;
  v_new_monster_id uuid;
  v_hatched jsonb := '[]'::jsonb;
begin
  if p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  if p_user_id like 'demo\_%' escape '\' then
    return jsonb_build_object('success', true, 'hatched', v_hatched);
  end if;

  for r in
    select * from public.curio_eggs
    where user_id = p_user_id and status = 'incubating'
    for update
  loop
    if r.last_progress_date = v_today then
      continue; -- already counted today, no-op
    elsif r.last_progress_date = v_today - 1 then
      v_new_streak := r.streak_progress + 1;

      if v_new_streak >= 5 then
        v_roll := random();
        v_quality := case
          when v_roll < 0.011 then 'perfect'
          when v_roll < 0.061 then 'outstanding'
          when v_roll < 0.311 then 'good'
          else 'normal'
        end;

        insert into public.user_monsters
          (user_id, monster_id, monster_exp, monster_level, slot, rest_used, graduation_tier, acquired_via, quality)
        values
          (p_user_id, r.egg_species_id, 0, 1, null, 0, 0, 'egg', v_quality)
        returning id into v_new_monster_id;

        update public.curio_eggs
        set status = 'hatched', streak_progress = v_new_streak, last_progress_date = v_today,
            hatched_at = now(), hatched_user_monster_id = v_new_monster_id
        where id = r.id;

        v_hatched := v_hatched || jsonb_build_object(
          'egg_id', r.id, 'user_monster_id', v_new_monster_id,
          'species_id', r.egg_species_id, 'quality', v_quality
        );
      else
        update public.curio_eggs
        set streak_progress = v_new_streak, last_progress_date = v_today
        where id = r.id;
      end if;
    else
      -- gap of 2+ days: streak broken, pause and wait for the player to
      -- press Incubate in the Hatchery.
      update public.curio_eggs
      set status = 'stalled', streak_progress = 0
      where id = r.id;
    end if;
  end loop;

  return jsonb_build_object('success', true, 'hatched', v_hatched);
end;
$function$;

-- try_claim_daily_items
CREATE OR REPLACE FUNCTION public.try_claim_daily_items(p_user_id text, p_today date)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  affected int;
begin
  insert into player_inventory (app_user_id, item_key, quantity)
  values (p_user_id, 'health_potion', 0)
  on conflict (app_user_id, item_key) do nothing;

  update player_inventory
  set last_daily_claim = p_today
  where app_user_id = p_user_id
    and item_key = 'health_potion'
    and (last_daily_claim is distinct from p_today);
  get diagnostics affected = row_count;
  return affected > 0;
end;
$function$;

-- unlearn_monster_skill
CREATE OR REPLACE FUNCTION public.unlearn_monster_skill(p_user_id text, p_monster_row_id uuid, p_slot_index integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  current_slot text;
  affected int;
BEGIN
  SELECT equipped_skills[p_slot_index] INTO current_slot
  FROM user_monsters
  WHERE id = p_monster_row_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF current_slot = 'EMPTY' THEN
    RETURN false;
  END IF;

  UPDATE player_inventory
  SET quantity = quantity - 1, updated_at = now()
  WHERE app_user_id = p_user_id
    AND item_key = 'unlearn_scroll'
    AND quantity > 0;
  GET DIAGNOSTICS affected = row_count;

  IF affected = 0 THEN
    RETURN false;
  END IF;

  UPDATE user_monsters
  SET equipped_skills[p_slot_index] = 'EMPTY'
  WHERE id = p_monster_row_id AND user_id = p_user_id;

  RETURN true;
END;
$function$;

-- update_classmate
CREATE OR REPLACE FUNCTION public.update_classmate(p_id text, p_username text, p_full_name text, p_grade text, p_is_active boolean DEFAULT NULL::boolean, p_password text DEFAULT NULL::text, p_gender text DEFAULT NULL::text, p_passcode text DEFAULT NULL::text, p_school_name text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.check_admin_passcode(p_passcode);
  update public.classmates
  set username = p_username,
      full_name = p_full_name,
      grade = p_grade,
      is_active = coalesce(p_is_active, is_active),
      gender = coalesce(p_gender, gender),
      school_name = coalesce(p_school_name, school_name),
      password_hash = case when p_password is not null and p_password <> '' then extensions.crypt(p_password, extensions.gen_salt('bf')) else password_hash end
  where id = p_id;
END;
$function$;

-- upsert_inventory
CREATE OR REPLACE FUNCTION public.upsert_inventory(p_user_id text, p_item_key text, p_quantity_delta integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO player_inventory (app_user_id, item_key, quantity)
  VALUES (p_user_id, p_item_key, GREATEST(0, p_quantity_delta))
  ON CONFLICT (app_user_id, item_key)
  DO UPDATE SET
    quantity = GREATEST(0, player_inventory.quantity + p_quantity_delta),
    updated_at = now();
END;
$function$;

-- use_growth_pill
CREATE OR REPLACE FUNCTION public.use_growth_pill(p_user_id text, p_monster_row_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  current_exp int;
  new_exp int;
  affected int;
BEGIN
  SELECT monster_exp INTO current_exp
  FROM user_monsters
  WHERE id = p_monster_row_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE player_inventory
  SET quantity = quantity - 1, updated_at = now()
  WHERE app_user_id = p_user_id
    AND item_key = 'growth_pill'
    AND quantity > 0;
  GET DIAGNOSTICS affected = row_count;

  IF affected = 0 THEN
    RETURN false;
  END IF;

  new_exp := current_exp + 500;

  UPDATE user_monsters
  SET monster_exp = new_exp,
      monster_level = LEAST(FLOOR(new_exp / 100) + 1, 100)
  WHERE id = p_monster_row_id AND user_id = p_user_id;

  RETURN true;
END;
$function$;

-- verify_classmate_login
CREATE OR REPLACE FUNCTION public.verify_classmate_login(p_id text, p_password text)
 RETURNS TABLE(full_name text, grade text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select c.full_name, c.grade
  from public.classmates c
  where c.id = p_id
    and c.is_active = true
    and c.password_hash = extensions.crypt(p_password, c.password_hash);
$function$;

-- verify_family_login
CREATE OR REPLACE FUNCTION public.verify_family_login(p_id text, p_password text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select exists (
    select 1 from public.family_credentials
    where id = p_id and password_hash = extensions.crypt(p_password, password_hash)
  );
$function$;
