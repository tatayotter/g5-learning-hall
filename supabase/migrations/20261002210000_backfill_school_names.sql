-- Backfill existing accounts onto the schools directory (2026-10-02),
-- following the reviewed mapping (local file docs/school-name-mapping-review.md,
-- not committed: it lists user-typed data).
--
-- Every UPDATE below sets school_name, which fires resolve_school_on_save()
-- (20261002200000_schools_directory.sql): matching names/aliases get the
-- official name + school_id, everything else is kept as typed with spacing
-- tidied. Initials the owner didn't identify are deliberately left as typed
-- and are NOT added to the directory, so they never show up as suggestions.

-- 1. Re-save every name through the trigger: covers all exact/alias matches
--    (SCSSES and its 14 spellings, Pilot/SCPS, MEMCES, BCAI, SUCCES, ...).
update public.children set school_name = school_name;
update public.classmates set school_name = school_name;

-- 2. Reviewed one-offs the alias list doesn't cover.
update public.children set school_name = 'Surigao City Central Elementary School'
  where public.normalize_school_name(school_name) = 'success';

update public.children set school_name = 'Surigao City Pilot School'
  where public.normalize_school_name(school_name) in ('pilot a', 'pilot elementary school');

update public.children set school_name = 'Surigao City Special Science Elementary School'
  where public.normalize_school_name(school_name) in ('special science', 'special science elem school');

update public.children set school_name = 'C.V. Diez Memorial Central Elementary School'
  where public.normalize_school_name(school_name) = 'clementino v diez elementary school';

update public.children set school_name = 'Tubajon Central Elementary School'
  where public.normalize_school_name(school_name) in ('tobajon central elementary school', 'tubajon central elemschool');

update public.children set school_name = 'San Roque Elementary School'
  where public.normalize_school_name(school_name) = 'san roque elementary scholl';

-- Not in the directory, so this stays unverified text — just the typo fixed.
update public.children set school_name = 'Fun To Learn Christian Faith Academy Inc.'
  where public.normalize_school_name(school_name) in ('fun to learn christian faith academy ink', 'fun to learn');

-- 3. One school name was a slur. Matched by hash so the word isn't written
--    into a public repo; cleared to blank.
update public.children set school_name = ''
  where md5(lower(trim(school_name))) = 'a1907ffe42942f4fdd64cb23dac92467';
