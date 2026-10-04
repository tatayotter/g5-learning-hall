-- Require full school names, not initials (2026-10-04).
--
-- A school typed at sign-up is fine when it matches the directory by name or
-- alias: initials like "SCSSES" are still accepted there, because the
-- resolve_school_on_save() trigger swaps them for the official full name.
-- A name that matches nothing now has to look like a full name
-- (is_full_school_name below), or the write is rejected with
-- SCHOOL_NAME_NOT_FULL, which lib/nameFilter.ts turns into a friendly message.
--
-- Only new or changed names are checked. Existing accounts with initials
-- (CES, CFSI, ...) are left as they are by the owner's choice, and re-saving
-- an unchanged row never trips the check.
--
-- Keep is_full_school_name() in step with looksLikeFullSchoolName() in
-- lib/schools.ts (the form's live hint).

create or replace function public.is_full_school_name(p_name text)
returns boolean
language plpgsql
immutable
set search_path to 'public'
as $function$
declare
  v_words text[];
  -- An all-caps entry ("STA. CRUZ ELEMENTARY SCHOOL") is shouting, not
  -- initials, so the all-caps word check below is skipped for it.
  v_shouting boolean := coalesce(p_name, '') !~ '[a-z]';
  v_has_type boolean := false;
  w text;
begin
  select coalesce(array_agg(t), '{}') into v_words
  from regexp_split_to_table(coalesce(p_name, ''), '[^A-Za-z0-9'']+') as t
  where t <> '';

  if cardinality(v_words) < 2 then
    return false;
  end if;

  foreach w in array v_words loop
    -- Shortened school words: "Kitcharao Central ES", "Tubajon Central Elem.School".
    if lower(w) = any (array['es', 'elem', 'hs', 'nhs', 'shs', 'sch', 'schl', 'natl', 'nat''l', 'mem', 'univ', 'acad', 'inst', 'intl', 'ctr']) then
      return false;
    end if;
    -- Initials inside a name: "XU Ateneo", "SPED Center". Roman numerals are fine.
    if not v_shouting and w ~ '^[A-Z]{2,}$' and w !~ '^[IVX]+$' then
      return false;
    end if;
    if lower(w) ~ '^(schools?|academy|college|university|institute|cent(er|re)|montessori|homeschool(ing)?|seminary|kindergarten|preschool|daycare)$' then
      v_has_type := true;
    end if;
  end loop;

  return v_has_type;
end;
$function$;

-- True when the name is blank, matches the directory, or looks like a full name.
create or replace function public.school_name_acceptable(p_name text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select public.normalize_school_name(p_name) is null
    or exists (
      select 1 from public.schools s
      where public.normalize_school_name(s.name) = public.normalize_school_name(p_name)
         or public.normalize_school_name(p_name) = any(s.aliases)
    )
    or public.is_full_school_name(p_name);
$function$;

revoke all on function public.school_name_acceptable(text) from public;

-- Same as 20261002200000, plus the full-name check in the "no match" branch.
create or replace function public.resolve_school_on_save()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_norm text := public.normalize_school_name(new.school_name);
  v_school public.schools%rowtype;
begin
  if v_norm is null then
    new.school_id := null;
    return new;
  end if;

  select * into v_school
  from public.schools s
  where public.normalize_school_name(s.name) = v_norm
     or v_norm = any(s.aliases)
  -- DepEd-verified rows win over user-entered ones with the same alias.
  order by (s.source = 'deped_nid') desc, s.name
  limit 1;

  if found then
    new.school_id := v_school.id;
    new.school_name := v_school.name;
  else
    if (tg_op = 'INSERT' or new.school_name is distinct from old.school_name)
       and not public.is_full_school_name(new.school_name) then
      raise exception 'SCHOOL_NAME_NOT_FULL';
    end if;
    new.school_id := null;
    new.school_name := regexp_replace(trim(new.school_name), '\s+', ' ', 'g');
  end if;
  return new;
end;
$function$;

-- The forms' pre-submit check gains a 'school_name_short' answer. Blocked
-- words still win, so an offensive name gets that message first.
create or replace function public.check_signup_names(p_username text, p_full_name text, p_school_name text)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    when public.contains_blocked_term(p_username) then 'username'
    when public.contains_blocked_term(p_full_name) then 'full_name'
    when public.contains_blocked_term(p_school_name) then 'school_name'
    when not public.school_name_acceptable(p_school_name) then 'school_name_short'
  end;
$function$;

revoke all on function public.check_signup_names(text, text, text) from public;
grant execute on function public.check_signup_names(text, text, text) to anon, authenticated;
