-- Tracking Scrolls: a pricey shop item, one per first-form curio, that lets a
-- player hunt the exact curio they want.
--
-- 1. shop_items: one 'tracking_scroll_<species>' row per non-legendary first
--    form (the 6 starters and the 21 non-legendary wild curios). Legendaries,
--    guild curios and event curios have no scroll, so they can't be tracked.
--    Bought with the existing spend_gold_and_grant_item, which reads the cost
--    from here. 5,000 gold: about a month of play for the most active players.
-- 2. user_battle_state.item_bar: the 4 item slots on the map, an array of 4
--    entries: null, {"item": <inventory key>} or {"trash": <type>, "n": <count>}
--    (trash is carried only in these slots, see lib/itemBar.ts). Written by the
--    player's own client under the existing "update own" policy.
--    user_battle_state.active_tracking: the species whose scroll is active.
-- 3. curio_tracking: each scroll's catch meter. Players read their own rows;
--    only the functions below write them. counted_question_ids stops one
--    question from being counted twice.
-- 4. set_active_tracking / advance_tracking / summon_tracked_curio.
--    A right map-scroll answer (graded by grade_content_question in the last
--    10 minutes) adds 1 to the active scroll's meter, up to 30. At 30 the
--    player summons the curio: the scroll is used up and the curio is saved
--    as the pending wild curio (tracked = true), which the client battles like
--    any wild curio. Level and quality are rolled here, not by the client.
-- 5. wild_encounter_events: two new events, 'tracking_started' and
--    'tracking_summoned'.

-- ── 1. Shop rows ─────────────────────────────────────────────────────────────
insert into public.shop_items (key, name, category, cost)
select 'tracking_scroll_' || s.id, 'Tracking Scroll: ' || s.name, 'scroll', 5000
from (values
  ('shadrak', 'Shadrak'), ('torrenth', 'Torrenth'), ('voltmane', 'Voltmane'),
  ('fernix', 'Fernix'), ('solarch', 'Solarch'), ('pyravex', 'Pyravex'),
  ('embrak', 'Embrak'), ('coralyn', 'Coralyn'), ('mosshorn', 'Mosshorn'),
  ('galestrik', 'Galestrik'), ('duskral', 'Duskral'), ('luminos', 'Luminos'),
  ('emberpaw', 'Emberpaw'), ('magmarox', 'Magmarox'), ('bubbloon', 'Bubbloon'),
  ('coralune', 'Coralune'), ('luminibee', 'Luminibee'), ('solaraffe', 'Solaraffe'),
  ('zapkit', 'Zapkit'), ('thundrake', 'Thundrake'), ('gloombat', 'Gloombat'),
  ('umbraven', 'Umbraven'), ('darkkor', 'Darkkor'), ('sproutle', 'Sproutle'),
  ('platydew', 'Platydew'), ('brambleon', 'Brambleon'), ('kasagbon', 'Kasagbon')
) as s(id, name)
on conflict (key) do nothing;

-- ── 2. Item bar + active scroll ──────────────────────────────────────────────
alter table public.user_battle_state
  add column if not exists item_bar jsonb not null default '[null, null, null, null]'::jsonb;
alter table public.user_battle_state add column if not exists active_tracking text;

-- ── 3. Catch meters ──────────────────────────────────────────────────────────
create table if not exists public.curio_tracking (
  user_id text not null,
  monster_id text not null,
  progress integer not null default 0,
  counted_question_ids uuid[] not null default '{}',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, monster_id)
);

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'curio_tracking_progress_check' and conrelid = 'public.curio_tracking'::regclass
  ) then
    alter table only public.curio_tracking
      add constraint curio_tracking_progress_check check (progress between 0 and 30);
  end if;
end $$;

alter table public.curio_tracking enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'curio_tracking' and policyname = 'curio_tracking: read own'
  ) then
    create policy "curio_tracking: read own" on public.curio_tracking
      for select using (user_id = public.current_app_user_id());
  end if;
end $$;

-- ── 4. Functions ─────────────────────────────────────────────────────────────

-- Makes p_monster_id's scroll the active one (null stops tracking). The player
-- must hold that scroll. Its meter keeps its progress when another is active.
create or replace function public.set_active_tracking(p_user_id text, p_monster_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_progress integer;
begin
  if p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  if p_monster_id is null then
    update public.user_battle_state set active_tracking = null, updated_at = now() where user_id = p_user_id;
    return jsonb_build_object('monster_id', null, 'progress', 0);
  end if;

  if not exists (
    select 1 from public.shop_items si
    join public.player_inventory pi on pi.item_key = si.key and pi.app_user_id = p_user_id
    where si.key = 'tracking_scroll_' || p_monster_id and pi.quantity > 0
  ) then
    raise exception 'no tracking scroll for %', p_monster_id;
  end if;

  insert into public.curio_tracking (user_id, monster_id) values (p_user_id, p_monster_id)
  on conflict (user_id, monster_id) do nothing;
  select progress into v_progress from public.curio_tracking where user_id = p_user_id and monster_id = p_monster_id;

  update public.user_battle_state set active_tracking = p_monster_id, updated_at = now() where user_id = p_user_id;
  return jsonb_build_object('monster_id', p_monster_id, 'progress', v_progress);
end;
$$;

-- One right map-scroll answer: +1 on the active scroll's meter (max 30). Only
-- counts a question the server graded right in the last 10 minutes, once.
-- Returns the active scroll and its progress (monster_id null if none).
create or replace function public.advance_tracking(p_user_id text, p_question_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_active text;
  v_row public.curio_tracking%rowtype;
begin
  if p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  select active_tracking into v_active from public.user_battle_state where user_id = p_user_id;
  if v_active is null then
    return jsonb_build_object('monster_id', null, 'progress', 0);
  end if;

  select * into v_row from public.curio_tracking
  where user_id = p_user_id and monster_id = v_active
  for update;
  if not found then
    return jsonb_build_object('monster_id', null, 'progress', 0);
  end if;

  if v_row.progress < 30
     and not (p_question_id = any (v_row.counted_question_ids))
     and exists (
       select 1 from public.player_question_attempts
       where user_id = p_user_id and content_question_id = p_question_id
         and correct and answered_at > now() - interval '10 minutes'
     ) then
    update public.curio_tracking
    set progress = progress + 1,
        counted_question_ids = array_append(counted_question_ids, p_question_id),
        updated_at = now()
    where user_id = p_user_id and monster_id = v_active
    returning * into v_row;
  end if;

  return jsonb_build_object('monster_id', v_active, 'progress', v_row.progress);
end;
$$;

-- Full meter: uses up the scroll and saves the curio as the pending wild
-- curio, next to the player. Fails if another wild curio is still waiting.
create or replace function public.summon_tracked_curio(p_user_id text, p_region text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_active text;
  v_pending jsonb;
  v_slot integer;
  v_base_level integer;
  v_level integer;
  v_roll double precision;
  v_quality text;
  v_key text;
  v_left integer;
  v_curio jsonb;
begin
  if p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  select active_tracking, pending_wild_curio, active_monster_slot
  into v_active, v_pending, v_slot
  from public.user_battle_state where user_id = p_user_id
  for update;

  if v_active is null then
    raise exception 'no active tracking scroll';
  end if;
  if v_pending is not null and v_pending <> 'null'::jsonb then
    raise exception 'a wild curio is already waiting';
  end if;
  if not exists (
    select 1 from public.curio_tracking
    where user_id = p_user_id and monster_id = v_active and progress >= 30
  ) then
    raise exception 'catch meter is not full';
  end if;

  v_key := 'tracking_scroll_' || v_active;
  update public.player_inventory
  set quantity = quantity - 1, updated_at = now()
  where app_user_id = p_user_id and item_key = v_key and quantity > 0
  returning quantity into v_left;
  if not found then
    raise exception 'no tracking scroll for %', v_active;
  end if;

  delete from public.curio_tracking where user_id = p_user_id and monster_id = v_active;

  -- Same as a wild spawn: the active curio's level, give or take 1.
  select monster_level into v_base_level from public.user_monsters
  where user_id = p_user_id and slot = coalesce(v_slot, 1) limit 1;
  v_level := greatest(1, coalesce(v_base_level, 1) + floor(random() * 3)::integer - 1);

  -- Same odds as a wild spawn (lib/curioQuality.ts TUTOR_ROLL_TABLE).
  v_roll := random();
  v_quality := case
    when v_roll < 0.011 then 'perfect'
    when v_roll < 0.061 then 'outstanding'
    when v_roll < 0.311 then 'good'
    else 'normal'
  end;

  v_curio := jsonb_build_object(
    'monster_id', v_active,
    'level', v_level,
    'quality', v_quality,
    'attempts_left', 3,
    'question_id', null,
    'region', p_region,
    'spawned_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'tracked', true
  );

  update public.user_battle_state
  set pending_wild_curio = v_curio,
      active_tracking = null,
      -- A used-up scroll leaves the item bar.
      item_bar = case when v_left > 0 then item_bar else (
        select jsonb_agg(case when e ->> 'item' = v_key then 'null'::jsonb else e end order by i)
        from jsonb_array_elements(item_bar) with ordinality as t(e, i)
      ) end,
      seen_monsters = case when v_active = any (seen_monsters) then seen_monsters else array_append(seen_monsters, v_active) end,
      updated_at = now()
  where user_id = p_user_id;

  return v_curio;
end;
$$;

revoke all on function public.set_active_tracking(text, text) from public, anon;
grant execute on function public.set_active_tracking(text, text) to authenticated, service_role;
revoke all on function public.advance_tracking(text, uuid) from public, anon;
grant execute on function public.advance_tracking(text, uuid) to authenticated, service_role;
revoke all on function public.summon_tracked_curio(text, text) from public, anon;
grant execute on function public.summon_tracked_curio(text, text) to authenticated, service_role;

-- ── 5. New funnel events ─────────────────────────────────────────────────────
-- Dropped and re-added (a superset of the old list, so existing rows pass).
alter table public.wild_encounter_events drop constraint if exists wild_encounter_events_event_check;
alter table only public.wild_encounter_events
  add constraint wild_encounter_events_event_check check (event = any (array[
    'scroll_answered', 'spawned', 'restored', 'approached', 'walked_away',
    'question_answered', 'battle_started', 'battle_won', 'battle_lost', 'fled',
    'caught', 'duplicate_kept', 'duplicate_gold',
    'tracking_started',   -- a Tracking Scroll was made the active one
    'tracking_summoned'   -- a full meter summoned its curio
  ]::text[]));
