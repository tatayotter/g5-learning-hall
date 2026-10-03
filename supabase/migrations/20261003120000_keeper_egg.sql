-- Keeper's Egg (components/intro/KeeperEggSequence.tsx): after a player's
-- first win, the Lorekeeper gives them an egg that hatches a random starter
-- curio after 3 check-in days. It's the "come back tomorrow" hook for day-2
-- retention (docs/intro/sequence-roadmap.md).
--
-- Rides the existing egg system (curio_eggs + sync_egg_progress + the hatch
-- ceremony) with two additions:
--   kind       'graduation' (laid by a graduated curio, the original eggs) or
--              'keeper' (this gift). One keeper egg per player, ever.
--   hatch_days check-in days to hatch: 5 for graduation eggs (unchanged), 3
--              for the keeper egg.
-- Missed days: graduation eggs still stall and reset (unchanged). A keeper
-- egg just waits: no progress while away, picks up where it left off on the
-- next visit, never stalls.

alter table public.curio_eggs add column if not exists kind text not null default 'graduation';
alter table public.curio_eggs add column if not exists hatch_days integer not null default 5;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'curio_eggs_kind_check' and conrelid = 'public.curio_eggs'::regclass
  ) then
    alter table only public.curio_eggs
      add constraint curio_eggs_kind_check check (kind = any (array['graduation'::text, 'keeper'::text]));
  end if;
end $$;

create unique index if not exists curio_eggs_one_keeper_egg_per_user
  on public.curio_eggs (user_id) where kind = 'keeper';

-- Grants this player's Keeper's Egg (idempotent: a second call returns the
-- existing egg). The species is a random starter picked here, never by the
-- client (preferring one they don't own); keep this list in sync with
-- MONSTERS in lib/monsterConfig.ts.
-- Day 1 counts on the day it's given, so it hatches on the third check-in day.
create or replace function public.grant_keeper_egg()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_user_id text := public.current_app_user_id();
  v_today date := (timezone('utc', now()))::date;
  v_starters text[] := array['shadrak', 'torrenth', 'voltmane', 'fernix', 'solarch', 'pyravex'];
  v_elements text[] := array['shadow', 'water', 'storm', 'leaf', 'light', 'fire'];
  v_choices integer[];
  v_pick integer;
  v_egg public.curio_eggs%rowtype;
  v_granted boolean := false;
begin
  if v_user_id is null then
    raise exception 'not authorized';
  end if;

  select * into v_egg from public.curio_eggs where user_id = v_user_id and kind = 'keeper';

  if not found then
    -- Prefer a starter the player doesn't own yet (not the one they picked);
    -- any starter if they own them all.
    select array_agg(i) into v_choices
    from generate_subscripts(v_starters, 1) as i
    where not exists (
      select 1 from public.user_monsters m
      where m.user_id = v_user_id and m.monster_id = v_starters[i]
    );
    if v_choices is null then
      select array_agg(i) into v_choices from generate_subscripts(v_starters, 1) as i;
    end if;
    v_pick := v_choices[1 + floor(random() * array_length(v_choices, 1))::integer];
    insert into public.curio_eggs
      (user_id, egg_species_id, element, status, streak_progress, last_progress_date, kind, hatch_days)
    values
      (v_user_id, v_starters[v_pick], v_elements[v_pick], 'incubating', 1, v_today, 'keeper', 3)
    on conflict (user_id) where kind = 'keeper' do nothing
    returning * into v_egg;

    if v_egg.id is null then
      -- Lost a race with a concurrent grant: return the winner's egg.
      select * into v_egg from public.curio_eggs where user_id = v_user_id and kind = 'keeper';
    else
      v_granted := true;
    end if;
  end if;

  return jsonb_build_object(
    'granted', v_granted,
    'egg_id', v_egg.id,
    'element', v_egg.element,
    'status', v_egg.status,
    'streak_progress', v_egg.streak_progress,
    'hatch_days', v_egg.hatch_days
  );
end;
$function$;

revoke execute on function public.grant_keeper_egg() from public, anon;
grant execute on function public.grant_keeper_egg() to authenticated, service_role;

-- Same as the live definition (baseline), except: the hatch threshold is the
-- egg's own hatch_days instead of a hard-coded 5, and a keeper egg that
-- missed days continues instead of stalling. Signature unchanged.
create or replace function public.sync_egg_progress(p_user_id text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_today date := (timezone('utc', now()))::date;
  r record;
  v_new_streak integer;
  v_roll numeric;
  v_quality text;
  v_new_monster_id uuid;
  v_hatched jsonb := '[]'::jsonb;
begin
  if p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  if p_user_id like 'demo\_%' escape '\' then
    return jsonb_build_object('success', true, 'hatched', v_hatched);
  end if;

  for r in
    select * from public.curio_eggs
    where user_id = p_user_id and status = 'incubating'
    for update
  loop
    if r.last_progress_date = v_today then
      continue; -- already counted today, no-op
    elsif r.last_progress_date = v_today - 1 or r.kind = 'keeper' then
      -- Consecutive day, or a keeper egg coming back after a gap (it waits
      -- rather than resetting).
      v_new_streak := r.streak_progress + 1;

      if v_new_streak >= r.hatch_days then
        v_roll := random();
        v_quality := case
          when v_roll < 0.011 then 'perfect'
          when v_roll < 0.061 then 'outstanding'
          when v_roll < 0.311 then 'good'
          else 'normal'
        end;

        insert into public.user_monsters
          (user_id, monster_id, monster_exp, monster_level, slot, rest_used, graduation_tier, acquired_via, quality)
        values
          (p_user_id, r.egg_species_id, 0, 1, null, 0, 0, 'egg', v_quality)
        returning id into v_new_monster_id;

        update public.curio_eggs
        set status = 'hatched', streak_progress = v_new_streak, last_progress_date = v_today,
            hatched_at = now(), hatched_user_monster_id = v_new_monster_id
        where id = r.id;

        v_hatched := v_hatched || jsonb_build_object(
          'egg_id', r.id, 'user_monster_id', v_new_monster_id,
          'species_id', r.egg_species_id, 'quality', v_quality, 'kind', r.kind
        );
      else
        update public.curio_eggs
        set streak_progress = v_new_streak, last_progress_date = v_today
        where id = r.id;
      end if;
    else
      -- gap of 2+ days: streak broken, pause and wait for the player to
      -- press Incubate in the Hatchery.
      update public.curio_eggs
      set status = 'stalled', streak_progress = 0
      where id = r.id;
    end if;
  end loop;

  return jsonb_build_object('success', true, 'hatched', v_hatched);
end;
$function$;
