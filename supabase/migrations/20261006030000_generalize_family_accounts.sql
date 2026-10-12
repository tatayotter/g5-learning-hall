-- Retire the hardcoded family-account path.
--
-- Two accounts used to be special: defined in app code rather than in
-- `children`, signed in with a separate password (family_credentials,
-- verify_family_login, set_family_password), and hardcoded into
-- link_verified_identity and search_players. They now have ordinary
-- `children` rows under a parent account (created as a data change, keeping
-- their existing ids, so all progress stays attached).
--
-- This migration:
-- 1. Adds children.show_crown (the GM crown and the rewards vault in the app)
--    and exposes it on children_public. It is set for every child that had a
--    family password, so no account ids are needed here.
-- 2. Copies each such account's original creation time onto its children
--    row, so account_created_at() (used to hold back push notifications for
--    accounts under 48 hours old) doesn't treat it as brand new.
-- 3. Removes the family branches from link_verified_identity, search_players
--    and account_created_at. The old link_verified_identity let anyone claim
--    a family account with no credential if its family password row was
--    missing, so dropping the table is only safe after this.
-- 4. Drops verify_family_login, set_family_password and family_credentials.
--
-- Every step is guarded so a re-run, or a replay into an empty database, is a
-- no-op.

-- (1) Crown column, plus copy-over from family_credentials ------------------

alter table public.children
  add column if not exists show_crown boolean not null default false;

do $$ begin
  if to_regclass('public.family_credentials') is not null then
    update public.children c
    set show_crown = true,
        -- (2) keep the original account age
        created_at = least(c.created_at, f.created_at)
    from public.family_credentials f
    where f.id = c.id;
  end if;
end $$;

-- Same columns and filter as before, with show_crown appended (CREATE OR
-- REPLACE VIEW can only add columns at the end). Grants carry over.
create or replace view public.children_public as
select id, full_name, grade, gender, avatar, school_name, show_crown
from public.children
where is_active = true and public.is_parent_approved(parent_id);

-- (3) Functions without the family branches ---------------------------------

create or replace function public.link_verified_identity(p_id text, p_credential text default null)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
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

  if exists (
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

create or replace function public.search_players(p_query text)
 returns table(id text, display_name text, grade text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
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

  limit 20;
$function$;

create or replace function public.account_created_at(p_id text)
 returns timestamp with time zone
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(
    (select created_at from public.children where id = p_id),
    (select created_at from public.classmates where id = p_id),
    (select created_at from public.demo_accounts where user_id = p_id)
  );
$function$;

-- (4) Drop the family password path -----------------------------------------

drop function if exists public.verify_family_login(text, text);
drop function if exists public.set_family_password(text, text, text);
drop table if exists public.family_credentials;
