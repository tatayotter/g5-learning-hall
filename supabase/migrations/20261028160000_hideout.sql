-- The Hideout (economy plan part 2, 2026-10-28: https://claude.ai/artifact/Mz9p76EJ478poFWLQDR1Tp,
-- design https://claude.ai/artifact/AU9a1agsi2DJQ9AWQ4XmgC): a kid's own island, bought for
-- 2,000 gold at the signpost in Inkwell Town. Its plots stand at fixed spots on the Hideout map
-- (public/maps-tiled-art/hideout/hideout.tmx, "Hideout Plots" layer) and each one is built with
-- wood from chopping. lib/hideoutConfig.ts mirrors every number here.
--
-- - hideout_plot_defs: the plots and what each costs to build. Four garden beds (6 wood each),
--   two grove spots (12 wood each), the Curio Camp (15 wood, where the curio missions now live)
--   and the kitchen (cooking comes later, not buildable yet).
-- - player_hideouts: one row per kid who bought one.
-- - player_hideout_plots: one row per built plot: what grows there and when it's ready, by the
--   server's clock.
-- - buy_hideout(): 2,000 gold, with a free Tin Watering Can.
-- - build_hideout_plot(): takes the wood out of the bag.
-- - plant_hideout_plot(): one question. A seed packet in a bed grows that veggie (1 to 12
--   hours), a sapling in a grove spot grows a tree (24 hours).
-- - water_hideout_plot(): one question, needs a watering can. A Tin can takes 40% off the time
--   left, Bronze and up 60%; Silver and up waters everything that's growing at once.
-- - harvest_hideout_plot(): no question. A ripe bed gives 3 veggies and 1 seed packet (30%: 2),
--   a Gold can sometimes doubles the veggies. A grown tree drops 2 wood once a day.
-- - buy_gear(): Bronze, Silver and Gold watering cans are for sale once a kid has the Tin one.

-- ── Event types ───────────────────────────────────────────────────────────────
alter table public.player_events drop constraint if exists player_events_event_type_check;
alter table public.player_events add constraint player_events_event_type_check
  check (event_type in ('guild_session', 'main_quest_offline', 'map_offline', 'trainer_offline', 'garden_gather',
                        'gear_purchase', 'trainer_first_win', 'hideout'));

-- ── Plots ─────────────────────────────────────────────────────────────────────
create table if not exists public.hideout_plot_defs (
  plot_id text primary key,
  kind text not null check (kind in ('bed', 'grove', 'camp', 'kitchen')),
  -- Bag items it takes to build, e.g. {"wood": 6}.
  cost jsonb not null default '{}'::jsonb,
  -- False: shown on the island, not buildable yet.
  available boolean not null default true
);
alter table public.hideout_plot_defs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hideout_plot_defs' and policyname = 'hideout_plot_defs_read') then
    create policy hideout_plot_defs_read on public.hideout_plot_defs for select to authenticated using (true);
  end if;
end $$;

insert into public.hideout_plot_defs (plot_id, kind, cost, available) values
  ('bed_1', 'bed', '{"wood": 6}', true),
  ('bed_2', 'bed', '{"wood": 6}', true),
  ('bed_3', 'bed', '{"wood": 6}', true),
  ('bed_4', 'bed', '{"wood": 6}', true),
  ('grove_1', 'grove', '{"wood": 12}', true),
  ('grove_2', 'grove', '{"wood": 12}', true),
  ('camp', 'camp', '{"wood": 15}', true),
  ('kitchen', 'kitchen', '{"wood": 20}', false)
on conflict (plot_id) do update
  set kind = excluded.kind, cost = excluded.cost, available = excluded.available;

create table if not exists public.player_hideouts (
  user_id text primary key,
  bought_at timestamptz not null default now(),
  cost int not null,
  trees_planted int not null default 0,
  crops_harvested int not null default 0
);
alter table public.player_hideouts enable row level security;
revoke all on public.player_hideouts from anon;
revoke insert, update, delete on public.player_hideouts from authenticated;
grant select on public.player_hideouts to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_hideouts' and policyname = 'player_hideouts_read_own') then
    create policy player_hideouts_read_own on public.player_hideouts for select to authenticated
      using (user_id = public.current_app_user_id());
  end if;
end $$;

create table if not exists public.player_hideout_plots (
  user_id text not null references public.player_hideouts (user_id) on delete cascade,
  plot_id text not null references public.hideout_plot_defs (plot_id),
  built_at timestamptz not null default now(),
  -- What grows there: a veggie id in a bed, a tree id in a grove spot. Null = empty.
  item text,
  planted_at timestamptz,
  ready_at timestamptz,
  watered_at timestamptz,
  -- A grown tree's wood: the last day (Manila) it was collected.
  collected_on date,
  primary key (user_id, plot_id)
);
alter table public.player_hideout_plots enable row level security;
revoke all on public.player_hideout_plots from anon;
revoke insert, update, delete on public.player_hideout_plots from authenticated;
grant select on public.player_hideout_plots to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_hideout_plots' and policyname = 'player_hideout_plots_read_own') then
    create policy player_hideout_plots_read_own on public.player_hideout_plots for select to authenticated
      using (user_id = public.current_app_user_id());
  end if;
end $$;

-- ── Watering cans ─────────────────────────────────────────────────────────────
-- The Tin can comes with the Hideout (never sold); the better ones are sold from then on.
update public.gear_tiers set available = (tier > 1) where gear = 'can';

-- ── Helpers ───────────────────────────────────────────────────────────────────
-- How long each thing takes to grow (lib/hideoutConfig.ts GROW_MINUTES), null if it can't be
-- planted.
create or replace function public.hideout_grow_minutes(p_kind text, p_item text)
returns int
language sql
immutable
set search_path to 'public'
as $$
  select case
    when p_kind = 'bed' then ('{"cabbage": 60, "carrot": 120, "beans": 180, "tomato": 240, "eggplant": 360, "corn": 480, "pumpkin": 720}'::jsonb ->> p_item)::int
    when p_kind = 'grove' and p_item in ('maple', 'oak', 'birch', 'pine', 'ember', 'ashwillow', 'palm', 'mangrove', 'elder', 'bamboo',
                                         'stormpine', 'silverbirch', 'dusk', 'glowcap', 'paperleaf', 'sunblossom') then 1440
    else null
  end;
$$;
revoke all on function public.hideout_grow_minutes(text, text) from public, anon, authenticated;
grant execute on function public.hideout_grow_minutes(text, text) to service_role;

-- Grades one answer like gather_wild_plant does and records the attempt.
create or replace function public.hideout_grade(p_user_id text, p_question_id uuid, p_selected text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_answer text;
  v_correct boolean;
begin
  select correct_answer into v_answer from public.content_questions where id = p_question_id;
  if not found then
    raise exception 'no such content question: %', p_question_id;
  end if;
  v_correct := p_selected is not null and p_selected = v_answer;
  insert into public.player_question_attempts (user_id, content_question_id, correct)
  values (p_user_id, p_question_id, v_correct)
  on conflict (user_id, content_question_id)
  do update set correct = excluded.correct, answered_at = now();
  return jsonb_build_object('correct', v_correct, 'correct_answer', v_answer);
end;
$$;
revoke all on function public.hideout_grade(text, uuid, text) from public, anon, authenticated;
grant execute on function public.hideout_grade(text, uuid, text) to service_role;

-- The kid's Hideout as the screen shows it: {owned, trees_planted, crops_harvested, plots: [...]}.
create or replace function public.hideout_json(p_user_id text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'owned', h.user_id is not null,
    'trees_planted', coalesce(h.trees_planted, 0),
    'crops_harvested', coalesce(h.crops_harvested, 0),
    'plots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'plot_id', p.plot_id, 'item', p.item, 'planted_at', p.planted_at, 'ready_at', p.ready_at,
        'watered_at', p.watered_at, 'collected_on', p.collected_on
      ) order by p.plot_id)
      from public.player_hideout_plots p where p.user_id = p_user_id
    ), '[]'::jsonb)
  )
  from (select p_user_id as uid) u
  left join public.player_hideouts h on h.user_id = u.uid;
$$;
revoke all on function public.hideout_json(text) from public, anon, authenticated;
grant execute on function public.hideout_json(text) to service_role;

-- ── Buying ────────────────────────────────────────────────────────────────────
-- Refusals come back as {ok: false, reason}: 'owned' (already has one), 'gold' (not enough).
create or replace function public.buy_hideout(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_cost constant int := 2000;
  v_gold int;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if not public.feature_enabled_for(p_user_id, 'garden') then
    raise exception 'garden is not on for this player';
  end if;

  insert into public.player_progress (user_id) values (p_user_id) on conflict (user_id) do nothing;
  -- Locks the wallet too, so two taps can't both pay.
  select gold into v_gold from public.player_progress where user_id = p_user_id for update;
  if exists (select 1 from public.player_hideouts where user_id = p_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'owned', 'gold', v_gold);
  end if;
  if v_gold < c_cost then
    return jsonb_build_object('ok', false, 'reason', 'gold', 'gold', v_gold);
  end if;

  update public.player_progress set gold = gold - c_cost, updated_at = now()
  where user_id = p_user_id;
  insert into public.player_hideouts (user_id, cost) values (p_user_id, c_cost);
  -- The Tin Watering Can comes with it.
  insert into public.player_gear (user_id, gear, tier) values (p_user_id, 'can', 1)
  on conflict (user_id, gear) do nothing;

  insert into public.player_events (user_id, event_type, occurred_at, payload)
  values (p_user_id, 'hideout', now(), jsonb_build_object('action', 'buy', 'cost', c_cost));

  return jsonb_build_object(
    'ok', true, 'cost', c_cost,
    'hideout', public.hideout_json(p_user_id),
    'can', public.gear_tier(p_user_id, 'can'),
    'progress', (select jsonb_build_object('gold', gold, 'xp', xp, 'level', level) from public.player_progress where user_id = p_user_id)
  );
end;
$$;
revoke all on function public.buy_hideout(text) from public, anon;
grant execute on function public.buy_hideout(text) to authenticated, service_role;

-- ── Building ──────────────────────────────────────────────────────────────────
-- Refusals: 'no_hideout', 'built' (already), 'not_yet' (not buildable yet), 'items' (not
-- enough in the bag; 'need' says what it takes).
create or replace function public.build_hideout_plot(p_user_id text, p_plot text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_def public.hideout_plot_defs%rowtype;
  v_item record;
  v_have int;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if not public.feature_enabled_for(p_user_id, 'garden') then
    raise exception 'garden is not on for this player';
  end if;
  select * into v_def from public.hideout_plot_defs where plot_id = p_plot;
  if not found then
    raise exception 'no such plot: %', p_plot;
  end if;

  -- Same lock as everything else that writes the bag.
  perform pg_advisory_xact_lock(hashtext('gather_wild_plant:' || p_user_id));

  if not exists (select 1 from public.player_hideouts where user_id = p_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'no_hideout');
  end if;
  if exists (select 1 from public.player_hideout_plots where user_id = p_user_id and plot_id = p_plot) then
    return jsonb_build_object('ok', false, 'reason', 'built', 'hideout', public.hideout_json(p_user_id));
  end if;
  if not v_def.available then
    return jsonb_build_object('ok', false, 'reason', 'not_yet');
  end if;

  for v_item in select key, value::int as n from jsonb_each_text(v_def.cost) loop
    select coalesce((select quantity from public.player_bag_items
                     where user_id = p_user_id and item_key = v_item.key), 0) into v_have;
    if v_have < v_item.n then
      return jsonb_build_object('ok', false, 'reason', 'items', 'need', v_def.cost, 'bag', public.garden_bag_json(p_user_id));
    end if;
  end loop;
  for v_item in select key, value::int as n from jsonb_each_text(v_def.cost) loop
    update public.player_bag_items set quantity = quantity - v_item.n, updated_at = now()
    where user_id = p_user_id and item_key = v_item.key;
  end loop;

  insert into public.player_hideout_plots (user_id, plot_id) values (p_user_id, p_plot);
  insert into public.player_events (user_id, event_type, occurred_at, payload)
  values (p_user_id, 'hideout', now(), jsonb_build_object('action', 'build', 'plot', p_plot, 'cost', v_def.cost));

  return jsonb_build_object('ok', true, 'plot', p_plot, 'hideout', public.hideout_json(p_user_id), 'bag', public.garden_bag_json(p_user_id));
end;
$$;
revoke all on function public.build_hideout_plot(text, text) from public, anon;
grant execute on function public.build_hideout_plot(text, text) to authenticated, service_role;

-- ── Planting ──────────────────────────────────────────────────────────────────
-- p_item: a veggie id for a bed (uses one of its seed packets), a tree id for a grove spot
-- (uses one of its saplings). Status: 'planted', 'wrong' (nothing used, try another question),
-- or a refusal: 'not_built', 'busy' (something grows there), 'cant_plant' (wrong kind of thing
-- for the plot, or the kitchen/camp), 'no_item' (none in the bag). Each entry id counts once.
create or replace function public.plant_hideout_plot(
  p_user_id text, p_plot text, p_item text, p_question_id uuid, p_selected text, p_entry_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_idem text := 'hideout:' || p_entry_id::text;
  v_prev jsonb;
  v_kind text;
  v_plot public.player_hideout_plots%rowtype;
  v_minutes int;
  v_key text;
  v_have int;
  v_grade jsonb;
  v_status text;
  v_out jsonb;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if p_entry_id is null then
    raise exception 'entry id required';
  end if;
  if not public.feature_enabled_for(p_user_id, 'garden') then
    raise exception 'garden is not on for this player';
  end if;
  select kind into v_kind from public.hideout_plot_defs where plot_id = p_plot;
  if not found then
    raise exception 'no such plot: %', p_plot;
  end if;

  perform pg_advisory_xact_lock(hashtext('gather_wild_plant:' || p_user_id));

  select payload into v_prev from public.player_events where user_id = p_user_id and idempotency_key = v_idem;
  if found then
    return v_prev || jsonb_build_object('replayed', true, 'hideout', public.hideout_json(p_user_id), 'bag', public.garden_bag_json(p_user_id));
  end if;

  v_minutes := public.hideout_grow_minutes(v_kind, p_item);
  v_key := case v_kind when 'bed' then 'seeds_' || p_item when 'grove' then 'sapling_' || p_item end;
  select * into v_plot from public.player_hideout_plots where user_id = p_user_id and plot_id = p_plot for update;

  if not found then
    v_status := 'not_built';
  elsif v_minutes is null then
    v_status := 'cant_plant';
  elsif v_plot.item is not null then
    v_status := 'busy';
  else
    select coalesce((select quantity from public.player_bag_items where user_id = p_user_id and item_key = v_key), 0) into v_have;
    if v_have < 1 then
      v_status := 'no_item';
    end if;
  end if;

  -- A refusal grades nothing and isn't kept: asking again after fixing it is a new try.
  if v_status is not null then
    return jsonb_build_object('status', v_status, 'plot', p_plot, 'replayed', false,
                              'hideout', public.hideout_json(p_user_id), 'bag', public.garden_bag_json(p_user_id));
  end if;

  v_grade := public.hideout_grade(p_user_id, p_question_id, p_selected);
  if (v_grade ->> 'correct')::boolean then
    v_status := 'planted';
    update public.player_bag_items set quantity = quantity - 1, updated_at = now()
    where user_id = p_user_id and item_key = v_key;
    update public.player_hideout_plots
    set item = p_item, planted_at = now(), ready_at = now() + make_interval(mins => v_minutes), watered_at = null, collected_on = null
    where user_id = p_user_id and plot_id = p_plot;
    if v_kind = 'grove' then
      update public.player_hideouts set trees_planted = trees_planted + 1 where user_id = p_user_id;
    end if;
  else
    v_status := 'wrong';
  end if;

  v_out := jsonb_build_object(
    'status', v_status, 'action', 'plant', 'plot', p_plot, 'item', p_item, 'question_id', p_question_id,
    'correct', (v_grade ->> 'correct')::boolean, 'correct_answer', v_grade ->> 'correct_answer'
  );
  insert into public.player_events (user_id, event_type, occurred_at, payload, idempotency_key)
  values (p_user_id, 'hideout', now(), v_out, v_idem);
  return v_out || jsonb_build_object('replayed', false, 'hideout', public.hideout_json(p_user_id), 'bag', public.garden_bag_json(p_user_id));
end;
$$;
revoke all on function public.plant_hideout_plot(text, text, text, uuid, text, uuid) from public, anon;
grant execute on function public.plant_hideout_plot(text, text, text, uuid, text, uuid) to authenticated, service_role;

-- ── Watering ──────────────────────────────────────────────────────────────────
-- Status: 'watered' ('plots' lists every plot that got water), 'wrong', or a refusal:
-- 'no_tool' (no watering can), 'nothing' (nothing growing there), 'ripe' (ready already),
-- 'watered_already'.
create or replace function public.water_hideout_plot(
  p_user_id text, p_plot text, p_question_id uuid, p_selected text, p_entry_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_idem text := 'hideout:' || p_entry_id::text;
  v_prev jsonb;
  v_can int;
  v_factor numeric;
  v_plot public.player_hideout_plots%rowtype;
  v_grade jsonb;
  v_status text;
  v_plots jsonb := '[]'::jsonb;
  v_out jsonb;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if p_entry_id is null then
    raise exception 'entry id required';
  end if;
  if not public.feature_enabled_for(p_user_id, 'garden') then
    raise exception 'garden is not on for this player';
  end if;

  perform pg_advisory_xact_lock(hashtext('gather_wild_plant:' || p_user_id));

  select payload into v_prev from public.player_events where user_id = p_user_id and idempotency_key = v_idem;
  if found then
    return v_prev || jsonb_build_object('replayed', true, 'hideout', public.hideout_json(p_user_id), 'bag', public.garden_bag_json(p_user_id));
  end if;

  v_can := public.gear_tier(p_user_id, 'can');
  -- lib/hideoutConfig.ts waterFactorFor: the share of the time left that stays.
  v_factor := case when v_can >= 2 then 0.4 else 0.6 end;
  select * into v_plot from public.player_hideout_plots where user_id = p_user_id and plot_id = p_plot for update;

  if v_can = 0 then
    v_status := 'no_tool';
  elsif not found or v_plot.item is null then
    v_status := 'nothing';
  elsif v_plot.ready_at <= now() then
    v_status := 'ripe';
  elsif v_plot.watered_at is not null then
    v_status := 'watered_already';
  end if;
  if v_status is not null then
    return jsonb_build_object('status', v_status, 'plot', p_plot, 'replayed', false,
                              'hideout', public.hideout_json(p_user_id), 'bag', public.garden_bag_json(p_user_id));
  end if;

  v_grade := public.hideout_grade(p_user_id, p_question_id, p_selected);
  if (v_grade ->> 'correct')::boolean then
    v_status := 'watered';
    -- Silver and up: everything growing gets water at once.
    with w as (
      update public.player_hideout_plots
      set watered_at = now(), ready_at = now() + (ready_at - now()) * v_factor
      where user_id = p_user_id and item is not null and watered_at is null and ready_at > now()
        and (plot_id = p_plot or v_can >= 3)
      returning plot_id
    )
    select coalesce(jsonb_agg(plot_id order by plot_id), '[]'::jsonb) into v_plots from w;
  else
    v_status := 'wrong';
  end if;

  v_out := jsonb_build_object(
    'status', v_status, 'action', 'water', 'plot', p_plot, 'plots', v_plots, 'question_id', p_question_id,
    'correct', (v_grade ->> 'correct')::boolean, 'correct_answer', v_grade ->> 'correct_answer'
  );
  insert into public.player_events (user_id, event_type, occurred_at, payload, idempotency_key)
  values (p_user_id, 'hideout', now(), v_out, v_idem);
  return v_out || jsonb_build_object('replayed', false, 'hideout', public.hideout_json(p_user_id), 'bag', public.garden_bag_json(p_user_id));
end;
$$;
revoke all on function public.water_hideout_plot(text, text, uuid, text, uuid) from public, anon;
grant execute on function public.water_hideout_plot(text, text, uuid, text, uuid) to authenticated, service_role;

-- ── Harvesting ────────────────────────────────────────────────────────────────
-- A ripe bed: 'harvested' with 'veggies' and 'seeds' (the bed is empty again). A grown tree:
-- 'collected' with 'wood' (once a day, Manila). Refusals: 'nothing', 'growing' (ready_at says
-- when), 'collected_today'.
create or replace function public.harvest_hideout_plot(p_user_id text, p_plot text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_veggies constant int := 3;
  c_second_seed constant float := 0.3;
  c_double constant float := 0.25;
  c_tree_wood constant int := 2;
  c_max_stack constant int := 999;
  v_kind text;
  v_plot public.player_hideout_plots%rowtype;
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_status text;
  v_veggies int := 0;
  v_seeds int := 0;
  v_wood int := 0;
  v_double boolean := false;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if not public.feature_enabled_for(p_user_id, 'garden') then
    raise exception 'garden is not on for this player';
  end if;
  select kind into v_kind from public.hideout_plot_defs where plot_id = p_plot;
  if not found then
    raise exception 'no such plot: %', p_plot;
  end if;

  perform pg_advisory_xact_lock(hashtext('gather_wild_plant:' || p_user_id));

  select * into v_plot from public.player_hideout_plots where user_id = p_user_id and plot_id = p_plot for update;
  if not found or v_plot.item is null or v_kind not in ('bed', 'grove') then
    v_status := 'nothing';
  elsif v_plot.ready_at > now() then
    v_status := 'growing';
  elsif v_kind = 'grove' and v_plot.collected_on = v_today then
    v_status := 'collected_today';
  elsif v_kind = 'bed' then
    v_status := 'harvested';
    v_double := public.gear_tier(p_user_id, 'can') >= 4 and random() < c_double;
    v_veggies := c_veggies * case when v_double then 2 else 1 end;
    v_seeds := 1 + case when random() < c_second_seed then 1 else 0 end;
    insert into public.player_bag_items (user_id, item_key, quantity)
    values (p_user_id, 'veggie_' || v_plot.item, v_veggies)
    on conflict (user_id, item_key)
    do update set quantity = least(player_bag_items.quantity + v_veggies, c_max_stack), updated_at = now();
    insert into public.player_bag_items (user_id, item_key, quantity)
    values (p_user_id, 'seeds_' || v_plot.item, v_seeds)
    on conflict (user_id, item_key)
    do update set quantity = least(player_bag_items.quantity + v_seeds, c_max_stack), updated_at = now();
    update public.player_hideout_plots
    set item = null, planted_at = null, ready_at = null, watered_at = null
    where user_id = p_user_id and plot_id = p_plot;
    update public.player_hideouts set crops_harvested = crops_harvested + 1 where user_id = p_user_id;
  else
    v_status := 'collected';
    v_wood := c_tree_wood;
    insert into public.player_bag_items (user_id, item_key, quantity)
    values (p_user_id, 'wood', v_wood)
    on conflict (user_id, item_key)
    do update set quantity = least(player_bag_items.quantity + v_wood, c_max_stack), updated_at = now();
    update public.player_hideout_plots set collected_on = v_today where user_id = p_user_id and plot_id = p_plot;
  end if;

  if v_status in ('harvested', 'collected') then
    insert into public.player_events (user_id, event_type, occurred_at, payload)
    values (p_user_id, 'hideout', now(), jsonb_build_object(
      'action', 'harvest', 'plot', p_plot, 'item', v_plot.item, 'veggies', v_veggies, 'seeds', v_seeds, 'wood', v_wood));
  end if;

  return jsonb_build_object(
    'status', v_status, 'plot', p_plot, 'item', v_plot.item,
    'veggies', v_veggies, 'seeds', v_seeds, 'wood', v_wood, 'double', v_double,
    'ready_at', case when v_status = 'growing' then v_plot.ready_at end,
    'hideout', public.hideout_json(p_user_id), 'bag', public.garden_bag_json(p_user_id)
  );
end;
$$;
revoke all on function public.harvest_hideout_plot(text, text) from public, anon;
grant execute on function public.harvest_hideout_plot(text, text) to authenticated, service_role;

-- ── Buying a better watering can ──────────────────────────────────────────────
-- buy_gear() already sells any tier marked available; the Tin can is never sold (it comes with
-- the Hideout), so Bronze is only for kids who have the Tin one. Nothing else changes.
