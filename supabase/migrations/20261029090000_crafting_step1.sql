-- Crafting, step 1 (Rowil, 2026-10-29; design: https://claude.ai/artifact/PucK7VBAUSiiS7TndyeKeA).
-- Re-runnable.
--
-- - Every tree gives its own wood: wood_<tree> (wood_maple, wood_ember, ...). Town woods sell for 2
--   gold, region woods for 3. Wood already in bags becomes Maple Wood.
-- - Hideout buildings cost named woods and gold. Garden pens and tree spots cost more for each one
--   already built (hideout_build_steps); tree spots also take crafted Stone Rings and Garden Soil.
--   Two new buildings: the Workbench and the Compost Bin. The Kitchen can be built now.
-- - Crafting (craft_item): a recipe (craft_recipes) at a built station takes bag items, trash and
--   gold, and one right answer. Outputs go in the bag, or in player_inventory for battle food.
--   player_recipes is the recipe book (what a kid has made, and how often).
-- - Bond hearts: feeding a curio Curio Kibble or Veggie Mash at the Curio Camp (feed_curio) gives
--   it a heart, up to 5, at most 2 feeds a day. One heart fades every 24 hours after the last
--   feed. Each heart is +2% battle damage and +2% mission EXP (worked out on the device).
--   take_curio_snack hands the last snack to a mission when the curio is sent on one.
-- lib/gardenConfig.ts, lib/hideoutConfig.ts and lib/craftingConfig.ts mirror every number here.

-- ── Event types ───────────────────────────────────────────────────────────────
alter table public.player_events drop constraint if exists player_events_event_type_check;
alter table public.player_events add constraint player_events_event_type_check
  check (event_type in ('guild_session', 'main_quest_offline', 'map_offline', 'trainer_offline', 'garden_gather',
                        'gear_purchase', 'trainer_first_win', 'hideout', 'craft', 'curio_feed'));

-- ── Wood per tree ─────────────────────────────────────────────────────────────
-- Wood already in bags becomes Maple Wood.
insert into public.player_bag_items (user_id, item_key, quantity)
select user_id, 'wood_maple', quantity from public.player_bag_items where item_key = 'wood' and quantity > 0
on conflict (user_id, item_key)
do update set quantity = least(player_bag_items.quantity + excluded.quantity, 999), updated_at = now();
delete from public.player_bag_items where item_key = 'wood';

-- What the Recycler pays for one of an item (0 = doesn't buy it). Town woods 2, region woods 3.
create or replace function public.garden_sell_price(p_item_key text)
returns int
language sql
immutable
set search_path to 'public'
as $$
  select case
    when p_item_key in ('veggie_crystal', 'veggie_inkpearl', 'veggie_petal') then 4
    when p_item_key in ('find_gem', 'find_coin') then 10
    when p_item_key in ('wood_maple', 'wood_oak', 'wood_birch', 'wood_pine') then 2
    when p_item_key in ('wood_ember', 'wood_ashwillow', 'wood_palm', 'wood_mangrove', 'wood_elder', 'wood_bamboo',
                        'wood_stormpine', 'wood_silverbirch', 'wood_dusk', 'wood_glowcap', 'wood_paperleaf', 'wood_sunblossom') then 3
    when p_item_key like 'veggie\_%' then 2
    else 0
  end;
$$;
revoke all on function public.garden_sell_price(text) from public, anon;
grant execute on function public.garden_sell_price(text) to authenticated, service_role;

-- Chopping: the same as 20261028090000_gear_tools_and_earning_trims.sql, but the wood is the tree's own.
create or replace function public.chop_wild_tree(
  p_user_id text,
  p_region text,
  p_node_id text,
  p_tree text,
  p_question_id uuid,
  p_selected text,
  p_entry_id uuid,
  p_played_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  -- lib/gardenConfig.ts mirrors these (REGION_TREES): which trees grow in which region.
  c_region_trees constant jsonb := '{
    "ledgers_heart": ["maple", "oak", "birch", "pine"],
    "town": ["maple", "oak", "birch", "pine"],
    "cinderreach": ["ember", "ashwillow"],
    "tidewrit_shallows": ["palm", "mangrove"],
    "rootbound_wilds": ["elder", "bamboo"],
    "stormrun_reaches": ["stormpine", "silverbirch"],
    "unread_margins": ["dusk", "glowcap"],
    "radiant_archive": ["paperleaf", "sunblossom"]
  }'::jsonb;
  c_rest constant interval := interval '1 minute';
  c_wrong_limit constant int := 3;
  c_wood constant int := 3;
  c_sapling_chance constant float := 0.5;
  c_double_wood_chance constant float := 0.25;
  c_max_stack constant int := 999;
  v_axe int;
  v_daily int;
  v_swings int;
  v_idem text := 'garden_chop:' || p_entry_id::text;
  v_prev jsonb;
  v_played timestamptz;
  v_day date;
  v_played_day date;
  v_felled int;
  v_node public.player_gather_nodes%rowtype;
  v_answer text;
  v_correct boolean := null;
  v_status text;
  v_hits int;
  v_clean boolean := false;
  v_wood int := 0;
  v_saplings int := 0;
  v_rest timestamptz := null;
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
  if p_region is null or p_tree is null or not coalesce(c_region_trees -> p_region ? p_tree, false)
    or p_node_id is null or p_node_id !~ '^\d{4}-\d{2}-\d{2}:\d{1,3}_\d{1,3}$' then
    raise exception 'no such tree: % % %', p_region, p_node_id, p_tree;
  end if;
  v_day := substring(p_node_id from 1 for 10)::date;

  -- Same lock as gather_wild_plant and sell_garden_items: they all write the bag.
  perform pg_advisory_xact_lock(hashtext('gather_wild_plant:' || p_user_id));

  select payload into v_prev from public.player_events
  where user_id = p_user_id and idempotency_key = v_idem;
  if found then
    return v_prev || jsonb_build_object('replayed', true, 'bag', public.garden_bag_json(p_user_id));
  end if;

  v_axe := public.gear_tier(p_user_id, 'axe');
  v_swings := case when v_axe >= 2 then 2 else 3 end;
  v_daily := case when v_axe >= 3 then 12 else 8 end;

  -- Same claimed-time rule as gather_wild_plant: an offline swing counts when it happened.
  v_played := case
    when p_played_at is not null
      and p_played_at <= now() + interval '5 minutes'
      and p_played_at >= now() - interval '14 days'
    then least(p_played_at, now())
    else now()
  end;
  -- The tree grew on its day's map: a swing that day, or just after midnight by a kid still on
  -- that map.
  v_played_day := (v_played at time zone 'Asia/Manila')::date;
  if v_played_day not in (v_day, v_day + 1) then
    raise exception 'that tree is not on the map any more: %', p_node_id;
  end if;

  insert into public.player_gather_nodes (user_id, region, node_id) values (p_user_id, p_region, p_node_id)
  on conflict do nothing;
  select * into v_node from public.player_gather_nodes
  where user_id = p_user_id and region = p_region and node_id = p_node_id;
  v_hits := v_node.hits;
  select count(*) into v_felled from public.player_gather_nodes
  where user_id = p_user_id and node_id like v_day::text || ':%' and last_picked_at is not null;

  if v_axe = 0 then
    v_status := 'no_tool';
  elsif v_node.last_picked_at is not null then
    v_status := 'stump';
  elsif v_felled >= v_daily then
    v_status := 'tired';
  elsif v_node.rest_until is not null and v_played < v_node.rest_until then
    v_status := 'resting';
    v_rest := v_node.rest_until;
  else
    select correct_answer into v_answer from public.content_questions where id = p_question_id;
    if not found then
      raise exception 'no such content question: %', p_question_id;
    end if;
    v_correct := p_selected is not null and p_selected = v_answer;

    insert into public.player_question_attempts (user_id, content_question_id, correct)
    values (p_user_id, p_question_id, v_correct)
    on conflict (user_id, content_question_id)
    do update set correct = excluded.correct, answered_at = now();

    if v_correct and v_node.hits + 1 >= v_swings then
      v_status := 'felled';
      v_hits := v_swings;
      v_clean := v_node.chop_misses = 0;
      v_wood := case when v_axe >= 4 and random() < c_double_wood_chance then c_wood * 2 else c_wood end;
      v_saplings := case when v_clean or v_axe >= 3 or random() < c_sapling_chance then 1 else 0 end;
      insert into public.player_bag_items (user_id, item_key, quantity)
      values (p_user_id, 'wood_' || p_tree, v_wood)
      on conflict (user_id, item_key)
      do update set quantity = least(player_bag_items.quantity + v_wood, c_max_stack), updated_at = now();
      if v_saplings > 0 then
        insert into public.player_bag_items (user_id, item_key, quantity)
        values (p_user_id, 'sapling_' || p_tree, 1)
        on conflict (user_id, item_key)
        do update set quantity = least(player_bag_items.quantity + 1, c_max_stack), updated_at = now();
      end if;
      update public.player_gather_nodes
      set last_picked_at = v_played, hits = 0, chop_misses = 0, wrong_streak = 0, rest_until = null, picks = picks + 1
      where user_id = p_user_id and region = p_region and node_id = p_node_id;
    elsif v_correct then
      v_status := 'hit';
      v_hits := v_node.hits + 1;
      update public.player_gather_nodes set hits = v_hits, wrong_streak = 0
      where user_id = p_user_id and region = p_region and node_id = p_node_id;
    else
      v_status := 'wrong';
      if v_node.wrong_streak + 1 >= c_wrong_limit then
        v_rest := v_played + c_rest;
        update public.player_gather_nodes set wrong_streak = 0, rest_until = v_rest, chop_misses = chop_misses + 1
        where user_id = p_user_id and region = p_region and node_id = p_node_id;
      else
        update public.player_gather_nodes set wrong_streak = wrong_streak + 1, chop_misses = chop_misses + 1
        where user_id = p_user_id and region = p_region and node_id = p_node_id;
      end if;
    end if;
  end if;

  v_out := jsonb_build_object(
    'status', v_status,
    'region', p_region,
    'node_id', p_node_id,
    'tree', p_tree,
    'question_id', p_question_id,
    'correct', v_correct,
    'correct_answer', case when v_correct is null then null else v_answer end,
    'hits', v_hits,
    'swings', v_swings,
    'axe', v_axe,
    'clean', v_clean,
    'wood', v_wood,
    'saplings', v_saplings,
    'rest_until', v_rest,
    'played_at', v_played,
    'claimed_at', p_played_at
  );

  insert into public.player_events (user_id, event_type, occurred_at, payload, idempotency_key)
  values (p_user_id, 'garden_gather', v_played, v_out, v_idem);

  return v_out || jsonb_build_object('replayed', false, 'bag', public.garden_bag_json(p_user_id));
end;
$$;
revoke all on function public.chop_wild_tree(text, text, text, text, uuid, text, uuid, timestamptz) from public, anon;
grant execute on function public.chop_wild_tree(text, text, text, text, uuid, text, uuid, timestamptz) to authenticated, service_role;

-- The Recycler buys every kind of wood (garden_sell_price above says how much).
create or replace function public.sell_garden_items(p_user_id text, p_items jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row record;
  v_want int;
  v_price int;
  v_total int := 0;
  v_before int;
  v_after int;
  v_paid int := 0;
  v_sell int;
  v_left int;
  v_plan jsonb := '{}'::jsonb;
  v_sold jsonb := '{}'::jsonb;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if not public.feature_enabled_for(p_user_id, 'garden') then
    raise exception 'garden is not on for this player';
  end if;

  perform pg_advisory_xact_lock(hashtext('gather_wild_plant:' || p_user_id));

  for v_row in
    select item_key, quantity from public.player_bag_items
    where user_id = p_user_id and (item_key like 'veggie\_%' or item_key like 'wood\_%' or item_key in ('find_gem', 'find_coin')) and quantity > 0
    order by item_key
    for update
  loop
    v_want := case
      when p_items is null then v_row.quantity
      when jsonb_typeof(p_items -> v_row.item_key) = 'number' then least(greatest(floor((p_items ->> v_row.item_key)::numeric)::int, 0), v_row.quantity)
      else 0
    end;
    v_price := public.garden_sell_price(v_row.item_key);
    if v_want > 0 then
      v_plan := v_plan || jsonb_build_object(v_row.item_key, v_want);
      v_total := v_total + v_want * v_price;
    end if;
  end loop;

  if v_total > 0 then
    insert into public.player_progress (user_id) values (p_user_id) on conflict (user_id) do nothing;
    select gold into v_before from public.player_progress where user_id = p_user_id;
    perform public.apply_progress_update(p_user_id, p_gold_delta => v_total);
    select gold into v_after from public.player_progress where user_id = p_user_id;
    v_paid := greatest(v_after - v_before, 0);
    -- What the gold paid for, in bag order; the rest stays.
    v_left := v_paid;
    for v_row in select key as item_key, value::int as n from jsonb_each_text(v_plan) order by key loop
      v_price := public.garden_sell_price(v_row.item_key);
      v_sell := least(v_row.n, v_left / v_price);
      continue when v_sell <= 0;
      update public.player_bag_items set quantity = quantity - v_sell, updated_at = now()
      where user_id = p_user_id and item_key = v_row.item_key;
      v_sold := v_sold || jsonb_build_object(v_row.item_key, v_sell);
      v_left := v_left - v_sell * v_price;
    end loop;
  end if;

  return jsonb_build_object(
    'sold', v_sold,
    'gold', v_paid,
    'bag', public.garden_bag_json(p_user_id),
    'progress', (select jsonb_build_object('gold', gold, 'xp', xp, 'level', level) from public.player_progress where user_id = p_user_id)
  );
end;
$$;
revoke all on function public.sell_garden_items(text, jsonb) from public, anon;
grant execute on function public.sell_garden_items(text, jsonb) to authenticated, service_role;

-- A grown tree on the island drops its own kind of wood: the same as
-- 20261029000000_hideout_tiles_and_trees.sql otherwise.
create or replace function public.harvest_hideout_plot(p_user_id text, p_plot text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_veggies constant int := 2;  -- per tile (one seed packet)
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
    values (p_user_id, 'wood_' || v_plot.item, v_wood)
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
    'veggies', v_veggies, 'seeds', v_seeds, 'wood', v_wood, 'wood_key', case when v_wood > 0 then 'wood_' || v_plot.item end, 'double', v_double,
    'ready_at', case when v_status = 'growing' then v_plot.ready_at end,
    'hideout', public.hideout_json(p_user_id), 'bag', public.garden_bag_json(p_user_id)
  );
end;
$$;
revoke all on function public.harvest_hideout_plot(text, text) from public, anon;
grant execute on function public.harvest_hideout_plot(text, text) to authenticated, service_role;

-- ── Hideout buildings ─────────────────────────────────────────────────────────
alter table public.hideout_plot_defs add column if not exists gold int not null default 0;
-- A building that has to stand before this one can be built (null = none).
alter table public.hideout_plot_defs add column if not exists needs text references public.hideout_plot_defs (plot_id);
alter table public.hideout_plot_defs drop constraint if exists hideout_plot_defs_kind_check;
alter table public.hideout_plot_defs add constraint hideout_plot_defs_kind_check
  check (kind in ('bed', 'grove', 'camp', 'kitchen', 'pen', 'workbench', 'compost'));

-- Pens and tree spots: the cost of the 1st, 2nd, ... one built, whichever spot it is.
create table if not exists public.hideout_build_steps (
  kind text not null check (kind in ('pen', 'grove')),
  nth int not null check (nth > 0),
  cost jsonb not null,
  gold int not null default 0,
  primary key (kind, nth)
);
alter table public.hideout_build_steps enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hideout_build_steps' and policyname = 'hideout_build_steps_read') then
    create policy hideout_build_steps_read on public.hideout_build_steps for select to authenticated using (true);
  end if;
end $$;

insert into public.hideout_build_steps (kind, nth, cost, gold) values
  ('pen', 1, '{"wood_maple": 10, "wood_oak": 10}', 50),
  ('pen', 2, '{"wood_pine": 10, "wood_birch": 10, "wood_palm": 10}', 100),
  ('pen', 3, '{"wood_bamboo": 15, "wood_elder": 15, "wood_ashwillow": 15}', 200),
  ('pen', 4, '{"wood_stormpine": 20, "wood_mangrove": 20, "wood_sunblossom": 20}', 400),
  ('grove', 1, '{"wood_oak": 15, "stone_ring": 1, "garden_soil": 1}', 50),
  ('grove', 2, '{"wood_birch": 10, "wood_pine": 10, "stone_ring": 1, "garden_soil": 1}', 75),
  ('grove', 3, '{"wood_palm": 15, "wood_mangrove": 10, "stone_ring": 2, "garden_soil": 2}', 100),
  ('grove', 4, '{"wood_ember": 15, "wood_ashwillow": 15, "stone_ring": 2, "garden_soil": 2}', 150),
  ('grove', 5, '{"wood_elder": 20, "wood_bamboo": 20, "stone_ring": 3, "garden_soil": 3}', 200),
  ('grove', 6, '{"wood_dusk": 20, "wood_paperleaf": 15, "wood_sunblossom": 15, "stone_ring": 3, "garden_soil": 3}', 300)
on conflict (kind, nth) do update set cost = excluded.cost, gold = excluded.gold;

-- Pens and tree spots take their cost from the steps above; the rest from here.
update public.hideout_plot_defs set cost = '{}', gold = 0 where kind in ('pen', 'grove');
insert into public.hideout_plot_defs (plot_id, kind, cost, gold, available, needs) values
  ('workbench', 'workbench', '{"wood_maple": 15, "wood_birch": 10}', 100, true, null),
  ('compost', 'compost', '{"wood_pine": 10, "wood_mangrove": 10}', 50, true, null),
  ('camp', 'camp', '{"wood_oak": 10, "wood_elder": 10, "wood_bamboo": 10}', 100, true, null),
  ('kitchen', 'kitchen', '{"wood_ember": 15, "wood_pine": 15}', 150, true, null)
on conflict (plot_id) do update
  set kind = excluded.kind, cost = excluded.cost, gold = excluded.gold, available = excluded.available, needs = excluded.needs;

-- What building this plot costs this kid now: {cost, gold}.
create or replace function public.hideout_build_cost(p_user_id text, p_plot text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when d.kind in ('pen', 'grove') then (
      select jsonb_build_object('cost', s.cost, 'gold', s.gold)
      from public.hideout_build_steps s
      where s.kind = d.kind and s.nth = 1 + (
        select count(*) from public.player_hideout_plots p
        join public.hideout_plot_defs pd on pd.plot_id = p.plot_id
        where p.user_id = p_user_id and pd.kind = d.kind))
    else jsonb_build_object('cost', d.cost, 'gold', d.gold)
  end
  from public.hideout_plot_defs d where d.plot_id = p_plot;
$$;
revoke all on function public.hideout_build_cost(text, text) from public, anon, authenticated;
grant execute on function public.hideout_build_cost(text, text) to service_role;

-- Refusals: 'no_hideout', 'built' (already), 'not_yet' (not buildable yet), 'needs' (another
-- building first), 'items' (not enough in the bag; 'need' says what it takes), 'gold'.
create or replace function public.build_hideout_plot(p_user_id text, p_plot text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_def public.hideout_plot_defs%rowtype;
  v_price jsonb;
  v_cost jsonb;
  v_gold int;
  v_wallet int;
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
  v_price := public.hideout_build_cost(p_user_id, p_plot);
  if not v_def.available or v_def.part_of is not null or v_price is null then
    return jsonb_build_object('ok', false, 'reason', 'not_yet');
  end if;
  if v_def.needs is not null
    and not exists (select 1 from public.player_hideout_plots where user_id = p_user_id and plot_id = v_def.needs) then
    return jsonb_build_object('ok', false, 'reason', 'needs', 'needs', v_def.needs);
  end if;
  v_cost := v_price -> 'cost';
  v_gold := (v_price ->> 'gold')::int;

  for v_item in select key, value::int as n from jsonb_each_text(v_cost) loop
    select coalesce((select quantity from public.player_bag_items
                     where user_id = p_user_id and item_key = v_item.key), 0) into v_have;
    if v_have < v_item.n then
      return jsonb_build_object('ok', false, 'reason', 'items', 'need', v_cost, 'gold_cost', v_gold, 'bag', public.garden_bag_json(p_user_id));
    end if;
  end loop;
  insert into public.player_progress (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select gold into v_wallet from public.player_progress where user_id = p_user_id for update;
  if v_wallet < v_gold then
    return jsonb_build_object('ok', false, 'reason', 'gold', 'need', v_cost, 'gold_cost', v_gold, 'gold', v_wallet);
  end if;

  for v_item in select key, value::int as n from jsonb_each_text(v_cost) loop
    update public.player_bag_items set quantity = quantity - v_item.n, updated_at = now()
    where user_id = p_user_id and item_key = v_item.key;
  end loop;
  if v_gold > 0 then
    update public.player_progress set gold = gold - v_gold, updated_at = now() where user_id = p_user_id;
  end if;

  insert into public.player_hideout_plots (user_id, plot_id) values (p_user_id, p_plot);
  -- A garden pen comes with its six soil tiles, each planted on its own.
  insert into public.player_hideout_plots (user_id, plot_id)
  select p_user_id, d.plot_id from public.hideout_plot_defs d where d.part_of = p_plot
  on conflict do nothing;
  insert into public.player_events (user_id, event_type, occurred_at, payload)
  values (p_user_id, 'hideout', now(), jsonb_build_object('action', 'build', 'plot', p_plot, 'cost', v_cost, 'gold', v_gold));

  return jsonb_build_object(
    'ok', true, 'plot', p_plot, 'gold_cost', v_gold,
    'hideout', public.hideout_json(p_user_id), 'bag', public.garden_bag_json(p_user_id),
    'progress', (select jsonb_build_object('gold', gold, 'xp', xp, 'level', level) from public.player_progress where user_id = p_user_id)
  );
end;
$$;
revoke all on function public.build_hideout_plot(text, text) from public, anon;
grant execute on function public.build_hideout_plot(text, text) to authenticated, service_role;

-- ── Crafting ──────────────────────────────────────────────────────────────────
-- inputs: bag item keys and counts, plus two wildcards: 'any_veggie' (the 7 garden veggies, the
-- kid's biggest piles first) and 'any_trash' (user_battle_state.bag_trash, biggest piles first).
-- output_to: 'bag' (player_bag_items) or 'inventory' (player_inventory: battle items).
create table if not exists public.craft_recipes (
  recipe_id text primary key,
  station text not null check (station in ('workbench', 'compost', 'kitchen')),
  inputs jsonb not null,
  gold int not null default 0 check (gold >= 0),
  output text not null,
  output_qty int not null default 1 check (output_qty > 0),
  output_to text not null default 'bag' check (output_to in ('bag', 'inventory')),
  sort int not null default 0
);
alter table public.craft_recipes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'craft_recipes' and policyname = 'craft_recipes_read') then
    create policy craft_recipes_read on public.craft_recipes for select to authenticated using (true);
  end if;
end $$;

insert into public.craft_recipes (recipe_id, station, inputs, gold, output, output_qty, output_to, sort) values
  ('stone_ring', 'workbench', '{"veggie_crystal": 3}', 20, 'stone_ring', 1, 'bag', 10),
  ('garden_soil', 'compost', '{"any_trash": 5, "any_veggie": 1}', 10, 'garden_soil', 1, 'bag', 20),
  ('curio_kibble', 'kitchen', '{"veggie_corn": 2, "veggie_beans": 1}', 15, 'food_kibble', 3, 'bag', 30),
  ('veggie_mash', 'kitchen', '{"veggie_pumpkin": 1, "veggie_carrot": 1, "veggie_cabbage": 1}', 15, 'food_mash', 2, 'bag', 31),
  ('veggie_stew', 'kitchen', '{"any_veggie": 3}', 40, 'veggie_stew', 1, 'inventory', 40)
on conflict (recipe_id) do update
  set station = excluded.station, inputs = excluded.inputs, gold = excluded.gold, output = excluded.output,
      output_qty = excluded.output_qty, output_to = excluded.output_to, sort = excluded.sort;

-- The recipe book: what each kid has made.
create table if not exists public.player_recipes (
  user_id text not null,
  recipe_id text not null references public.craft_recipes (recipe_id),
  times int not null default 0,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
alter table public.player_recipes enable row level security;
revoke all on public.player_recipes from anon;
revoke insert, update, delete on public.player_recipes from authenticated;
grant select on public.player_recipes to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_recipes' and policyname = 'player_recipes_read_own') then
    create policy player_recipes_read_own on public.player_recipes for select to authenticated
      using (user_id = public.current_app_user_id());
  end if;
end $$;

-- How many of each garden veggie (or trash kind) a wildcard takes: the biggest piles first.
-- p_have: {key: count}. Returns {key: count} adding up to p_n, or null when there isn't enough.
create or replace function public.craft_take_from(p_have jsonb, p_n int)
returns jsonb
language plpgsql
immutable
set search_path to 'public'
as $$
declare
  v_row record;
  v_left int := p_n;
  v_take int;
  v_out jsonb := '{}'::jsonb;
begin
  for v_row in select key, value::int as n from jsonb_each_text(p_have) where value::int > 0 order by value::int desc, key loop
    exit when v_left <= 0;
    v_take := least(v_row.n, v_left);
    v_out := v_out || jsonb_build_object(v_row.key, v_take);
    v_left := v_left - v_take;
  end loop;
  return case when v_left > 0 then null else v_out end;
end;
$$;
revoke all on function public.craft_take_from(jsonb, int) from public, anon, authenticated;
grant execute on function public.craft_take_from(jsonb, int) to service_role;

-- The kid's trash as {paper: n, ...} (lib/itemBar.ts keeps it on user_battle_state.bag_trash).
create or replace function public.craft_trash_json(p_user_id text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((
    select jsonb_object_agg(key, value::int)
    from jsonb_each_text(coalesce((select bag_trash from public.user_battle_state where user_id = p_user_id), '{}'::jsonb))
    where key in ('paper', 'bottle', 'wrapper', 'pencil', 'chipbag') and value ~ '^\d+$' and value::int > 0
  ), '{}'::jsonb);
$$;
revoke all on function public.craft_trash_json(text) from public, anon, authenticated;
grant execute on function public.craft_trash_json(text) to service_role;

-- Status: 'crafted' (first: the first time this kid made it), 'wrong' (nothing used, try another
-- question), or a refusal: 'no_station' (not built), 'items' (not enough), 'gold'. A refusal grades
-- nothing. Each entry id counts once.
create or replace function public.craft_item(
  p_user_id text, p_recipe text, p_question_id uuid, p_selected text, p_entry_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_max_stack constant int := 999;
  c_veggies constant text[] := array['tomato', 'eggplant', 'pumpkin', 'carrot', 'cabbage', 'corn', 'beans'];
  v_idem text := 'craft:' || p_entry_id::text;
  v_prev jsonb;
  v_rec public.craft_recipes%rowtype;
  v_take jsonb := '{}'::jsonb;      -- bag items to use
  v_trash_take jsonb := '{}'::jsonb;
  v_trash jsonb;
  v_part jsonb;
  v_item record;
  v_p record;
  v_have int;
  v_wallet int;
  v_status text;
  v_grade jsonb;
  v_first boolean := false;
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
  select * into v_rec from public.craft_recipes where recipe_id = p_recipe;
  if not found then
    raise exception 'no such recipe: %', p_recipe;
  end if;

  perform pg_advisory_xact_lock(hashtext('gather_wild_plant:' || p_user_id));

  select payload into v_prev from public.player_events where user_id = p_user_id and idempotency_key = v_idem;
  if found then
    return v_prev || jsonb_build_object('replayed', true, 'bag', public.garden_bag_json(p_user_id),
      'trash', public.craft_trash_json(p_user_id));
  end if;

  if not exists (select 1 from public.player_hideout_plots where user_id = p_user_id and plot_id = v_rec.station) then
    v_status := 'no_station';
  else
    -- What the recipe takes from the bag and the trash.
    for v_item in select key, value::int as n from jsonb_each_text(v_rec.inputs) loop
      if v_item.key = 'any_trash' then
        v_trash_take := public.craft_take_from(public.craft_trash_json(p_user_id), v_item.n);
        if v_trash_take is null then v_status := 'items'; exit; end if;
      elsif v_item.key = 'any_veggie' then
        -- Named veggies in the same recipe come first.
        select public.craft_take_from(coalesce(jsonb_object_agg(b.item_key,
                 b.quantity - coalesce((v_rec.inputs ->> b.item_key)::int, 0)), '{}'::jsonb), v_item.n)
        into v_part
        from public.player_bag_items b
        where b.user_id = p_user_id and b.item_key = any (select 'veggie_' || unnest(c_veggies));
        if v_part is null then v_status := 'items'; exit; end if;
        for v_p in select key, value::int as n from jsonb_each_text(v_part) loop
          v_take := v_take || jsonb_build_object(v_p.key, coalesce((v_take ->> v_p.key)::int, 0) + v_p.n);
        end loop;
      else
        v_take := v_take || jsonb_build_object(v_item.key, coalesce((v_take ->> v_item.key)::int, 0) + v_item.n);
      end if;
    end loop;
    if v_status is null then
      for v_item in select key, value::int as n from jsonb_each_text(v_take) loop
        select coalesce((select quantity from public.player_bag_items where user_id = p_user_id and item_key = v_item.key), 0) into v_have;
        if v_have < v_item.n then v_status := 'items'; exit; end if;
      end loop;
    end if;
    if v_status is null then
      insert into public.player_progress (user_id) values (p_user_id) on conflict (user_id) do nothing;
      select gold into v_wallet from public.player_progress where user_id = p_user_id for update;
      if v_wallet < v_rec.gold then v_status := 'gold'; end if;
    end if;
  end if;
  if v_status is not null then
    return jsonb_build_object('status', v_status, 'recipe', p_recipe, 'replayed', false,
      'bag', public.garden_bag_json(p_user_id), 'trash', public.craft_trash_json(p_user_id));
  end if;

  v_grade := public.hideout_grade(p_user_id, p_question_id, p_selected);
  if (v_grade ->> 'correct')::boolean then
    v_status := 'crafted';
    for v_item in select key, value::int as n from jsonb_each_text(v_take) loop
      update public.player_bag_items set quantity = quantity - v_item.n, updated_at = now()
      where user_id = p_user_id and item_key = v_item.key;
    end loop;
    if v_trash_take <> '{}'::jsonb then
      v_trash := public.craft_trash_json(p_user_id);
      for v_item in select key, value::int as n from jsonb_each_text(v_trash_take) loop
        v_trash := jsonb_set(v_trash, array[v_item.key], to_jsonb((v_trash ->> v_item.key)::int - v_item.n));
      end loop;
      update public.user_battle_state set bag_trash = v_trash where user_id = p_user_id;
    end if;
    if v_rec.gold > 0 then
      update public.player_progress set gold = gold - v_rec.gold, updated_at = now() where user_id = p_user_id;
    end if;
    if v_rec.output_to = 'inventory' then
      perform public.upsert_inventory(p_user_id, v_rec.output, v_rec.output_qty);
    else
      insert into public.player_bag_items (user_id, item_key, quantity)
      values (p_user_id, v_rec.output, v_rec.output_qty)
      on conflict (user_id, item_key)
      do update set quantity = least(player_bag_items.quantity + v_rec.output_qty, c_max_stack), updated_at = now();
    end if;
    insert into public.player_recipes (user_id, recipe_id, times) values (p_user_id, p_recipe, 1)
    on conflict (user_id, recipe_id) do update set times = player_recipes.times + 1, last_at = now()
    returning (times = 1) into v_first;
  else
    v_status := 'wrong';
  end if;

  v_out := jsonb_build_object(
    'status', v_status, 'recipe', p_recipe, 'question_id', p_question_id,
    'correct', (v_grade ->> 'correct')::boolean, 'correct_answer', v_grade ->> 'correct_answer',
    'first', v_first, 'output', v_rec.output, 'output_qty', case when v_status = 'crafted' then v_rec.output_qty else 0 end,
    'used', v_take, 'trash_used', v_trash_take, 'gold_cost', case when v_status = 'crafted' then v_rec.gold else 0 end
  );
  insert into public.player_events (user_id, event_type, occurred_at, payload, idempotency_key)
  values (p_user_id, 'craft', now(), v_out, v_idem);
  return v_out || jsonb_build_object(
    'replayed', false, 'bag', public.garden_bag_json(p_user_id), 'trash', public.craft_trash_json(p_user_id),
    'progress', (select jsonb_build_object('gold', gold, 'xp', xp, 'level', level) from public.player_progress where user_id = p_user_id)
  );
end;
$$;
revoke all on function public.craft_item(text, text, uuid, text, uuid) from public, anon;
grant execute on function public.craft_item(text, text, uuid, text, uuid) to authenticated, service_role;

-- ── Bond hearts ───────────────────────────────────────────────────────────────
alter table public.user_monsters add column if not exists bond_hearts int not null default 0;
-- When bond_hearts was last set: one heart fades for each full 24 hours since.
alter table public.user_monsters add column if not exists bond_at timestamptz;
-- Feeds today (Manila): at most 2 count.
alter table public.user_monsters add column if not exists fed_day date;
alter table public.user_monsters add column if not exists fed_count int not null default 0;
-- The last snack, waiting for the curio's next mission (take_curio_snack).
alter table public.user_monsters add column if not exists snack text;
alter table public.user_monsters add column if not exists snack_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_monsters_bond_hearts_check' and conrelid = 'public.user_monsters'::regclass) then
    alter table public.user_monsters add constraint user_monsters_bond_hearts_check check (bond_hearts between 0 and 5);
  end if;
end $$;

-- Only the bond RPCs change these: a player's own update of user_monsters (slots, nicknames)
-- keeps them as they were.
create or replace function public.keep_curio_bond()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.bond_hearts := old.bond_hearts;
    new.bond_at := old.bond_at;
    new.fed_day := old.fed_day;
    new.fed_count := old.fed_count;
    new.snack := old.snack;
    new.snack_at := old.snack_at;
  end if;
  return new;
end;
$$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_keep_curio_bond' and tgrelid = 'public.user_monsters'::regclass) then
    create trigger trg_keep_curio_bond before update on public.user_monsters
      for each row execute function public.keep_curio_bond();
  end if;
end $$;

-- Hearts now, after fading (lib/craftingConfig.ts bondHeartsNow).
create or replace function public.bond_hearts_now(p_hearts int, p_at timestamptz)
returns int
language sql
stable
set search_path to 'public'
as $$
  select case when p_at is null then 0
    else greatest(0, p_hearts - floor(extract(epoch from (now() - p_at)) / 86400)::int) end;
$$;
grant execute on function public.bond_hearts_now(int, timestamptz) to authenticated, service_role;

-- Feeds one curio on the team or bench. Foods: food_kibble, food_mash (1 heart each). Status:
-- 'fed', or a refusal: 'no_camp', 'no_food', 'full' (2 feeds today already), 'no_curio'.
create or replace function public.feed_curio(p_user_id text, p_curio_id uuid, p_food text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_max constant int := 5;
  c_feeds_a_day constant int := 2;
  c_gain constant jsonb := '{"food_kibble": 1, "food_mash": 1}'::jsonb;
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_mon public.user_monsters%rowtype;
  v_have int;
  v_status text;
  v_hearts int;
  v_count int;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if not public.feature_enabled_for(p_user_id, 'garden') then
    raise exception 'garden is not on for this player';
  end if;
  if not (c_gain ? coalesce(p_food, '')) then
    raise exception 'not a curio food: %', p_food;
  end if;

  perform pg_advisory_xact_lock(hashtext('gather_wild_plant:' || p_user_id));

  select * into v_mon from public.user_monsters where id = p_curio_id and user_id = p_user_id for update;
  v_count := case when v_mon.fed_day = v_today then v_mon.fed_count else 0 end;
  select coalesce((select quantity from public.player_bag_items where user_id = p_user_id and item_key = p_food), 0) into v_have;
  if v_mon.id is null then
    v_status := 'no_curio';
  elsif not exists (select 1 from public.player_hideout_plots where user_id = p_user_id and plot_id = 'camp') then
    v_status := 'no_camp';
  elsif v_have < 1 then
    v_status := 'no_food';
  elsif v_count >= c_feeds_a_day then
    v_status := 'full';
  end if;
  if v_status is null then
    v_status := 'fed';
    v_hearts := least(c_max, public.bond_hearts_now(v_mon.bond_hearts, v_mon.bond_at) + (c_gain ->> p_food)::int);
    update public.player_bag_items set quantity = quantity - 1, updated_at = now()
    where user_id = p_user_id and item_key = p_food;
    update public.user_monsters
    set bond_hearts = v_hearts, bond_at = now(), fed_day = v_today, fed_count = v_count + 1, snack = p_food, snack_at = now()
    where id = p_curio_id;
    insert into public.player_events (user_id, event_type, occurred_at, payload)
    values (p_user_id, 'curio_feed', now(), jsonb_build_object('curio', p_curio_id, 'food', p_food, 'hearts', v_hearts));
  end if;

  return jsonb_build_object(
    'status', v_status, 'curio', p_curio_id, 'food', p_food,
    'curio_row', (select jsonb_build_object('id', id, 'bond_hearts', bond_hearts, 'bond_at', bond_at, 'fed_day', fed_day,
                    'fed_count', fed_count, 'snack', snack, 'snack_at', snack_at)
                  from public.user_monsters where id = p_curio_id and user_id = p_user_id),
    'bag', public.garden_bag_json(p_user_id)
  );
end;
$$;
revoke all on function public.feed_curio(text, uuid, text) from public, anon;
grant execute on function public.feed_curio(text, uuid, text) to authenticated, service_role;

-- A curio going on a mission takes its snack along (eaten in the last 24 hours): returns the food
-- key, or null, and clears it so it counts once.
create or replace function public.take_curio_snack(p_user_id text, p_curio_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_snack text;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  select case when snack_at > now() - interval '24 hours' then snack end into v_snack
  from public.user_monsters where id = p_curio_id and user_id = p_user_id for update;
  update public.user_monsters set snack = null, snack_at = null where id = p_curio_id and user_id = p_user_id;
  return v_snack;
end;
$$;
revoke all on function public.take_curio_snack(text, uuid) from public, anon;
grant execute on function public.take_curio_snack(text, uuid) to authenticated, service_role;
