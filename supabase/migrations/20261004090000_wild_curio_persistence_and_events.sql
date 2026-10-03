-- Wild curio encounters: keep a found curio until it's resolved, and record
-- the whole encounter funnel.
--
-- 1. user_battle_state.pending_wild_curio
--    The curio a correct scroll answer spawned (species, level, quality, tries
--    left, current question id, region it spawned in). Previously it lived
--    only in the browser: switching maps, leaving the Curio Arena tab or
--    reloading lost it, after the guaranteed-spawn counter had already reset.
--    Now it stays (and follows the player between maps) until it's caught or
--    runs out of tries. Null when there's no curio. Written by the player's
--    own client under the existing "user_battle_state: update own" policy.
--
-- 2. wild_encounter_events
--    One row per step: every map scroll answer (with whether it was right),
--    spawns, restores, walk-ups, encounter questions, battles, catches,
--    runaways, duplicates. Map scroll answers used to be recorded only under
--    quest_type 'monster_arena', mixed with arena battle questions, so spawns
--    per scroll answer couldn't be measured. Players insert their own rows
--    only and can't read any (analytics reads them with the service role).

alter table public.user_battle_state add column if not exists pending_wild_curio jsonb;

create table if not exists public.wild_encounter_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event text not null,
  region text,
  monster_id text,
  quality text,
  level integer,
  attempts_left integer,
  correct boolean,
  pity boolean,
  created_at timestamptz not null default now()
);

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'wild_encounter_events_event_check' and conrelid = 'public.wild_encounter_events'::regclass
  ) then
    alter table only public.wild_encounter_events
      add constraint wild_encounter_events_event_check check (event = any (array[
        'scroll_answered',   -- a map scroll question was answered (correct = right/wrong)
        'spawned',           -- a curio appeared (pity = forced by the guaranteed-spawn counter)
        'restored',          -- a saved curio came back after a reload / tab switch
        'approached',        -- walked onto the curio (the Battle / Run Away prompt)
        'walked_away',       -- chose Run Away at that prompt (curio stays)
        'question_answered', -- an encounter question (correct = right/wrong)
        'battle_started',
        'battle_won',
        'battle_lost',
        'fled',              -- out of tries, the curio left
        'caught',            -- a new species went to the Catch Inbox
        'duplicate_kept',
        'duplicate_gold'
      ]::text[]));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'wild_encounter_events_quality_check' and conrelid = 'public.wild_encounter_events'::regclass
  ) then
    alter table only public.wild_encounter_events
      add constraint wild_encounter_events_quality_check
      check (quality is null or quality = any (array['normal', 'good', 'outstanding', 'perfect']::text[]));
  end if;
end $$;

create index if not exists wild_encounter_events_event_created_idx
  on public.wild_encounter_events (event, created_at);
create index if not exists wild_encounter_events_user_created_idx
  on public.wild_encounter_events (user_id, created_at);

alter table public.wild_encounter_events enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wild_encounter_events'
      and policyname = 'wild_encounter_events: insert own'
  ) then
    create policy "wild_encounter_events: insert own" on public.wild_encounter_events
      for insert with check (user_id = public.current_app_user_id());
  end if;
end $$;
