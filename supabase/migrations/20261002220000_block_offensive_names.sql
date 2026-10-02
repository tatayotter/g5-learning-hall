-- Block slurs and offensive language in usernames, display names and school
-- names (2026-10-02). Prompted by troll accounts whose name/school were a
-- slur and Tagalog vulgarities — visible to other kids in player search.
--
-- Enforced by a trigger on children/classmates, so every path is covered
-- (kid self-signup, parent registration, parent "add child", admin). The
-- forms call check_signup_names() first so the kid sees which field to fix
-- before anything is created (parent registration creates the parent login
-- before the children, so a late rejection would strand a half-registered
-- parent).
--
-- Matching (after lowercasing and mapping look-alikes 0→o 1→i 3→e 4→a 5→s
-- 7→t @→a $→s !→i):
--   'contains' terms: unambiguous words, matched inside each word with
--     repeated letters squeezed ("Bitchboy", "fuuuck", "b1tch"). Terms are
--     stored already squeezed (e.g. 'pusy', 'fagot').
--   'word' terms: short or ambiguous words, matched only as a whole word, so
--     real names survive (Nazir, Bayotas, Cassandra, Assumption, grape).
-- Spelled-out letters ("f u c k") are joined and checked too.
-- The list lives in a table so the admin can add terms without a deploy;
-- clients can't read it (RLS, no policies) — they only get a field name back.

create table if not exists public.blocked_name_terms (
  term text primary key,
  match_type text not null check (match_type in ('contains', 'word')),
  created_at timestamptz not null default now()
);
alter table public.blocked_name_terms enable row level security;

insert into public.blocked_name_terms (term, match_type) values
  -- English
  ('fuck', 'contains'), ('fuk', 'contains'), ('shit', 'contains'), ('bitch', 'contains'), ('bich', 'contains'),
  ('cunt', 'contains'), ('niga', 'contains'), ('niger', 'contains'), ('fagot', 'contains'), ('pusy', 'contains'),
  ('slut', 'contains'), ('whore', 'contains'), ('porn', 'contains'), ('penis', 'contains'), ('vagina', 'contains'),
  ('bastard', 'contains'), ('retard', 'contains'), ('hitler', 'contains'), ('ashole', 'contains'), ('trany', 'contains'),
  ('dildo', 'contains'), ('horny', 'contains'), ('buthole', 'contains'),
  ('ass', 'word'), ('dick', 'word'), ('cock', 'word'), ('fag', 'word'), ('tits', 'word'), ('boob', 'word'),
  ('boobs', 'word'), ('sex', 'word'), ('sexy', 'word'), ('rape', 'word'), ('nazi', 'word'), ('kys', 'word'),
  ('chink', 'word'), ('kike', 'word'), ('spic', 'word'), ('jizz', 'word'), ('cum', 'word'),
  -- Filipino / Bisaya
  ('putang', 'contains'), ('tangina', 'contains'), ('tangna', 'contains'), ('kingina', 'contains'), ('pakyu', 'contains'),
  ('kantot', 'contains'), ('jakol', 'contains'), ('jakul', 'contains'), ('pokpok', 'contains'), ('pekpek', 'contains'),
  ('tarantado', 'contains'), ('punyeta', 'contains'), ('kupal', 'contains'), ('bulbol', 'contains'), ('tamod', 'contains'),
  ('gago', 'word'), ('ulol', 'word'), ('ulul', 'word'), ('bobo', 'word'), ('tanga', 'word'), ('puke', 'word'),
  ('puki', 'word'), ('titi', 'word'), ('tite', 'word'), ('burat', 'word'), ('bilat', 'word'), ('oten', 'word'),
  ('otin', 'word'), ('yawa', 'word'), ('piste', 'word'), ('pisti', 'word'), ('bayot', 'word'), ('bakla', 'word'),
  ('puta', 'word'), ('pota', 'word')
on conflict (term) do nothing;

create or replace function public.contains_blocked_term(p_text text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_letters text;
  v_tokens text[];
  v_token text;
  v_squeezed text;
  v_single int := 0;
begin
  if p_text is null or trim(p_text) = '' then
    return false;
  end if;

  -- Hyphens stay inside a word ("Tanga-an", "Day-asan" are real names), then
  -- get dropped per word, which also catches "f-u-c-k".
  v_letters := trim(regexp_replace(translate(lower(p_text), '013457@$!', 'oieastasi'), '[^a-z-]+', ' ', 'g'));
  if replace(v_letters, '-', '') = '' then
    return false;
  end if;
  v_tokens := string_to_array(v_letters, ' ');

  foreach v_token in array v_tokens loop
    v_token := replace(v_token, '-', '');
    continue when v_token = '';
    if length(v_token) = 1 then v_single := v_single + 1; end if;
    v_squeezed := regexp_replace(v_token, '(.)\1+', '\1', 'g');
    if exists (
      select 1 from public.blocked_name_terms t
      where (t.match_type = 'contains' and position(t.term in v_squeezed) > 0)
         or (t.match_type = 'word' and (t.term = v_token or t.term = regexp_replace(v_token, '(.)\1{2,}', '\1\1', 'g')))
    ) then
      return true;
    end if;
  end loop;

  -- "f u c k" / "b i t c h": check the spelled-out letters joined together.
  if v_single >= 3 then
    v_squeezed := regexp_replace(replace(replace(v_letters, ' ', ''), '-', ''),'(.)\1+', '\1', 'g');
    if exists (select 1 from public.blocked_name_terms t where t.match_type = 'contains' and position(t.term in v_squeezed) > 0) then
      return true;
    end if;
  end if;

  return false;
end;
$function$;

revoke all on function public.contains_blocked_term(text) from public;

-- For the forms: returns the first offending field ('username', 'full_name',
-- 'school_name') or null. Only a field name comes back, never the list.
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
  end;
$function$;

revoke all on function public.check_signup_names(text, text, text) from public;
grant execute on function public.check_signup_names(text, text, text) to anon, authenticated;

-- Backstop on every write. Only new or changed values are checked, so
-- re-saving an existing row (e.g. the school-name backfill) never trips on
-- an old value — offending existing accounts are handled by deactivating.
create or replace function public.enforce_clean_account_names()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if (tg_op = 'INSERT' or new.username is distinct from old.username) and public.contains_blocked_term(new.username) then
    raise exception 'NAME_NOT_ALLOWED:username';
  end if;
  if (tg_op = 'INSERT' or new.full_name is distinct from old.full_name) and public.contains_blocked_term(new.full_name) then
    raise exception 'NAME_NOT_ALLOWED:full_name';
  end if;
  if (tg_op = 'INSERT' or new.school_name is distinct from old.school_name) and public.contains_blocked_term(new.school_name) then
    raise exception 'NAME_NOT_ALLOWED:school_name';
  end if;
  return new;
end;
$function$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'children_enforce_clean_names' and tgrelid = 'public.children'::regclass) then
    create trigger children_enforce_clean_names before insert or update of username, full_name, school_name on public.children
      for each row execute function public.enforce_clean_account_names();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'classmates_enforce_clean_names' and tgrelid = 'public.classmates'::regclass) then
    create trigger classmates_enforce_clean_names before insert or update of username, full_name, school_name on public.classmates
      for each row execute function public.enforce_clean_account_names();
  end if;
end $$;
