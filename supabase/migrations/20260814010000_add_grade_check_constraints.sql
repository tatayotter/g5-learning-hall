-- Add CHECK constraints for grade columns on classmates, sq_* guild tables, and event_quests.
-- Idempotent: guards each ADD CONSTRAINT with an existence check so this is safe to run
-- even where the constraint was already applied out-of-band (as it was in production).

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'classmates_grade_check'
  ) then
    alter table public.classmates
      add constraint classmates_grade_check
      check (grade = any (array['Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6']));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'event_quests_grade_level_check'
  ) then
    alter table public.event_quests
      add constraint event_quests_grade_level_check
      check (grade_level >= 2 and grade_level <= 6);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sq_lexicon_arena_grade_level_check'
  ) then
    alter table public.sq_lexicon_arena
      add constraint sq_lexicon_arena_grade_level_check
      check (grade_level >= 2 and grade_level <= 6);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sq_logic_labyrinth_grade_level_check'
  ) then
    alter table public.sq_logic_labyrinth
      add constraint sq_logic_labyrinth_grade_level_check
      check (grade_level >= 2 and grade_level <= 6);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sq_lorekeeper_grade_level_check'
  ) then
    alter table public.sq_lorekeeper
      add constraint sq_lorekeeper_grade_level_check
      check (grade_level >= 2 and grade_level <= 6);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sq_number_realm_grade_level_check'
  ) then
    alter table public.sq_number_realm
      add constraint sq_number_realm_grade_level_check
      check (grade_level >= 2 and grade_level <= 6);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sq_spellcaster_grade_level_check'
  ) then
    alter table public.sq_spellcaster
      add constraint sq_spellcaster_grade_level_check
      check (grade_level >= 2 and grade_level <= 6);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sq_wild_encounter_grade_level_check'
  ) then
    alter table public.sq_wild_encounter
      add constraint sq_wild_encounter_grade_level_check
      check (grade_level >= 2 and grade_level <= 6);
  end if;
end $$;
