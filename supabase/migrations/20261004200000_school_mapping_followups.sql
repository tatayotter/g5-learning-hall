-- Follow-ups to the reviewed school-name backfill (20261002210000): three
-- proposals the owner confirmed on 2026-10-04.
--
-- Each UPDATE sets school_name, which fires resolve_school_on_save()
-- (20261002200000_schools_directory.sql) and links school_id.

-- 1. "SSCES" is a letter-swap of SCSSES. Made a permanent alias so future
--    sign-ups typing it match too.
update public.schools
  set aliases = array_append(aliases, 'ssces')
  where deped_school_id = '213501'
    and not ('ssces' = any(aliases));

update public.children set school_name = school_name
  where public.normalize_school_name(school_name) = 'ssces';
update public.classmates set school_name = school_name
  where public.normalize_school_name(school_name) = 'ssces';

-- 2. Owner confirmed these locally. One-off relinks, not aliases: "SEC" and
--    "Alegria Central" could mean other schools for someone else.
update public.children set school_name = 'Surigao Education Center'
  where public.normalize_school_name(school_name) = 'sec';
update public.classmates set school_name = 'Surigao Education Center'
  where public.normalize_school_name(school_name) = 'sec';

update public.children set school_name = 'Alegria Elementary School'
  where public.normalize_school_name(school_name) = 'alegria central elementary school';
update public.classmates set school_name = 'Alegria Elementary School'
  where public.normalize_school_name(school_name) = 'alegria central elementary school';
