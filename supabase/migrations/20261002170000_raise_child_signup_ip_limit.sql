-- Raise create_unclaimed_child_account's per-IP cap from 5 to 60 sign-ups/hour.
--
-- A school's Wi-Fi reaches us as a single public IP (and PH mobile carriers
-- put many subscribers behind shared CGNAT IPs too), so 5/hour blocked a
-- classroom demo on 2026-10-02 after the 5th student: ~45 legitimate
-- attempts from one school network were rejected over the next 25 minutes.
-- 60/hour fits a full class registering at once while still stopping bulk
-- scripted account creation. The rest of the function is unchanged.

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

  if v_recent_count >= 60 then
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
