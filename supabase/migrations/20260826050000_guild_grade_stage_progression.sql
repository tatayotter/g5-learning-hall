-- Side-quest guild questions no longer filter by the player's real grade.
-- The 5 sq_* subclass guilds (Lorekeeper, SpellCaster, NumberRealm,
-- LogicLabyrinth, LexiconArena) now progress every player through the same
-- grade-2..6 content ladder regardless of their own grade — see
-- fetchQuestionPool in lib/guildEngine.ts.
--
-- The old *_tier columns on user_subclass_profiles (previously 1-3, a
-- difficulty tier scoped to the player's own grade) are reused, unrenamed,
-- to store this grade stage instead (2-6). Existing players are reset to
-- stage 2 rather than mapped from their old tier, since content only exists
-- for grades 2 and 5 today and a tier->grade mapping wouldn't mean much yet.

alter table public.user_subclass_profiles
  drop constraint if exists user_subclass_profiles_lorekeeper_tier_check,
  drop constraint if exists user_subclass_profiles_spellcaster_tier_check,
  drop constraint if exists user_subclass_profiles_number_realm_tier_check,
  drop constraint if exists user_subclass_profiles_logic_labyrinth_tier_check,
  drop constraint if exists user_subclass_profiles_lexicon_arena_tier_check;

-- Reset existing rows to stage 2 *before* adding the 2-6 check constraints
-- below — rows still holding the old 1-3 tier values would otherwise
-- violate the new constraint the instant it's added.
update public.user_subclass_profiles
set
  lorekeeper_tier = 2,
  spellcaster_tier = 2,
  number_realm_tier = 2,
  logic_labyrinth_tier = 2,
  lexicon_arena_tier = 2;

alter table public.user_subclass_profiles
  add constraint user_subclass_profiles_lorekeeper_tier_check check (lorekeeper_tier between 2 and 6),
  add constraint user_subclass_profiles_spellcaster_tier_check check (spellcaster_tier between 2 and 6),
  add constraint user_subclass_profiles_number_realm_tier_check check (number_realm_tier between 2 and 6),
  add constraint user_subclass_profiles_logic_labyrinth_tier_check check (logic_labyrinth_tier between 2 and 6),
  add constraint user_subclass_profiles_lexicon_arena_tier_check check (lexicon_arena_tier between 2 and 6);

alter table public.user_subclass_profiles
  alter column lorekeeper_tier set default 2,
  alter column spellcaster_tier set default 2,
  alter column number_realm_tier set default 2,
  alter column logic_labyrinth_tier set default 2,
  alter column lexicon_arena_tier set default 2;
