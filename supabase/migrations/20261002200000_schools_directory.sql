-- Schools directory for registration autocomplete (2026-10-02).
--
-- children.school_name was free text, so one school ended up under many
-- spellings (the Surigao City Special Science ES alone appeared as SCSSES,
-- scsses, SSES, "Special science elementary school ", a double-spaced full
-- name, ...). Registration forms now autocomplete from this table, and a
-- trigger links each account to a school row whenever the saved name (or a
-- known alias) matches, storing the official name. A name that matches
-- nothing is kept as typed with school_id null = "unverified" — the forms
-- allow that on purpose so a missing school never blocks sign-up.
--
-- Seed sources:
--   - source 'deped_nid': every elementary school in the Surigao City
--     division, from DepEd's National Inventory Dashboard
--     (nid.deped.gov.ph/public-dashboard/region/CARAGA/division/Surigao City),
--     read 2026-10-02, with school IDs. The registry abbreviates names
--     inconsistently (ES, MCES, Mem., Sch.); they're written out in full here.
--   - source 'user_entered': full school names kids/parents had already typed,
--     cleaned up (case, spacing) but NOT verified against DepEd. No IDs.
-- Existing accounts are not touched here; their messy names get mapped in a
-- separate, reviewed step (docs/school-name-mapping-review.md).

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- normalize_school_name() forms of short names people actually type.
  aliases text[] not null default '{}',
  city text,
  province text,
  deped_school_id text unique,
  source text not null check (source in ('deped_nid', 'user_entered', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.normalize_school_name(p_name text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select nullif(lower(regexp_replace(regexp_replace(trim(coalesce(p_name, '')), '[^a-zA-Z0-9 ]', '', 'g'), '\s+', ' ', 'g')), '');
$function$;

create unique index if not exists schools_name_city_key
  on public.schools (public.normalize_school_name(name), coalesce(city, ''));

alter table public.schools enable row level security;

-- Public directory: the sign-up form reads it before any account exists.
-- No client write policies — rows are added by migrations or the admin
-- (service role).
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'schools' and policyname = 'schools_public_read') then
    create policy schools_public_read on public.schools for select to anon, authenticated using (true);
  end if;
end $$;

alter table public.children add column if not exists school_id uuid references public.schools (id) on delete set null;
alter table public.classmates add column if not exists school_id uuid references public.schools (id) on delete set null;

-- ─── Link accounts to schools on save ──────────────────────────────────────
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
    new.school_id := null;
    new.school_name := regexp_replace(trim(new.school_name), '\s+', ' ', 'g');
  end if;
  return new;
end;
$function$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'children_resolve_school' and tgrelid = 'public.children'::regclass) then
    create trigger children_resolve_school before insert or update of school_name on public.children
      for each row execute function public.resolve_school_on_save();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'classmates_resolve_school' and tgrelid = 'public.classmates'::regclass) then
    create trigger classmates_resolve_school before insert or update of school_name on public.classmates
      for each row execute function public.resolve_school_on_save();
  end if;
end $$;

-- ─── Seed ──────────────────────────────────────────────────────────────────
insert into public.schools (deped_school_id, name, aliases, city, province, source) values
  ('132242', 'Aurora Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132243', 'Vicente C. Cabilao Memorial Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132244', 'Bitaugan Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132245', 'Melquiades N. Cagasan Memorial Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132246', 'Cagutsan Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132247', 'Canlanipa Central Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132248', 'Cantiasay Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132249', 'Day-asan Elementary School', '{"dayasan es","day asan elementary school"}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132250', 'Hanigad Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132251', 'Lagundi Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132252', 'Lisondra Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132253', 'Manjagao Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132254', 'Mariano Espina Memorial Central Elementary School', '{"memces"}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132255', 'Nonoc Elementary School', '{"nonoc es"}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132256', 'Orok Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132257', 'Ouano Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132258', 'San Isidro Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132259', 'San Jose Elementary School', '{"san jose es"}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132260', 'Sugbay Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132261', 'Talisay Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132262', 'Zaragoza Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132263', 'Bonifacio Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132264', 'Sarvida Yuipco Memorial Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132265', 'Capalayan Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132266', 'Martinez Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132267', 'Nabago Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132268', 'Navarro Memorial Central Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132269', 'Quezon Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132270', 'Roxas Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132271', 'Surigao City Central Elementary School', '{"scces"}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132272', 'Surigao City Pilot School', '{"scps","pilot","pilot school","surigao city pilot sch"}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132273', 'Alang-Alang Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132274', 'Alegria Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132275', 'Anomar Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132276', 'Arturo Borja Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132277', 'Bay-bay Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132278', 'Bilabid Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132279', 'Buenavista Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132280', 'Catadman Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132281', 'Danawan Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132282', 'Emerico Borja Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132283', 'Kaningag Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132284', 'Libuac Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132285', 'Tomas Florya Eder Memorial Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132286', 'Sukailang Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132287', 'Surigao West Central Elementary School', '{"swces","surigao west ces"}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132288', 'Tugonan Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132289', 'B. Vasquez Memorial Central Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132290', 'C.V. Diez Memorial Central Elementary School', '{"cvdmces","cv diez elementary school","cv diez elementary school surigao city"}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132291', 'Calderon Village Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132292', 'Danao Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132293', 'Ipil Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132294', 'Josefa E. Fernandez Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132295', 'Serna Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132296', 'Lipata Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132297', 'Mabua Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132298', 'Margarita Memorial Central Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132299', 'Mat-i Central Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132300', 'J. R. Clavero Memorial Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132301', 'Punta Bilar Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132302', 'San Roque Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132303', 'Sumilom Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132304', 'Sabang Elementary School', '{}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('132336', 'Lope R. Ruiz Memorial Elementary School', '{"japson elementary school","japson es"}', 'Surigao City', 'Surigao del Norte', 'deped_nid'),
  ('213501', 'Surigao City Special Science Elementary School', '{"scsses","sses","special science elementary school","special science es","surigao city special science es"}', 'Surigao City', 'Surigao del Norte', 'deped_nid')
on conflict (deped_school_id) do nothing;

insert into public.schools (name, aliases, city, province, source) values
  ('St. Paul University Surigao', '{"spus"}', 'Surigao City', 'Surigao del Norte', 'user_entered'),
  ('Surigao Education Center', '{}', 'Surigao City', 'Surigao del Norte', 'user_entered'),
  ('Butuan Child Academy Inc.', '{}', 'Butuan City', 'Agusan del Norte', 'user_entered'),
  ('Tubajon Central Elementary School', '{}', 'Tubajon', 'Dinagat Islands', 'user_entered'),
  ('Kitcharao Central Elementary School', '{"kitcharao central es"}', 'Kitcharao', 'Agusan del Norte', 'user_entered'),
  ('Oslao Elementary School', '{}', null, null, 'user_entered'),
  ('Banlic Elementary School', '{}', null, null, 'user_entered'),
  ('Amontay Elementary School', '{}', null, null, 'user_entered'),
  ('Bay-Ang Elementary School', '{}', null, null, 'user_entered'),
  ('Tejero Elementary School', '{}', null, null, 'user_entered'),
  ('Bungtod Elementary School', '{}', null, null, 'user_entered'),
  ('Asuncion Elementary School', '{"asuncion elem school"}', null, null, 'user_entered'),
  ('Obrero Elementary School', '{}', null, null, 'user_entered'),
  ('Pines Elementary School', '{}', null, null, 'user_entered'),
  ('Mater Carmeli School', '{}', null, null, 'user_entered'),
  ('Homeschool Pilipinas', '{}', null, null, 'user_entered')
on conflict do nothing;
