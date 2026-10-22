-- Garden, step 1: wild veggies on the Training Map (plan: "Garden and Grove", 2026-10-22).
-- Veggie plants grow at fixed spots in The Ledger's Heart. A kid walks onto a ripe one and
-- answers one question to pick it: the veggie goes into the bag, sometimes with a seed packet
-- (kept for the Hideout garden later; seeds can't be sold). The plant then regrows for 20
-- minutes, per kid. Extra veggies sell at the Recycler for 2 gold each. Everything sits behind
-- the 'garden' rollout switch, off for everyone until it's turned on.
--
-- - wild_plant_nodes: which veggie grows at each spot (lib/gardenConfig.ts WILD_PLANTS holds
--   the same list for drawing them).
-- - player_bag_items: bag items with a count (veggies, seed packets). Players can read their
--   own rows; only the functions below write them, so a count can't be edited from a device.
-- - player_gather_nodes: per kid and plant, when it was last picked and the wrong-answer rest.
-- - gather_wild_plant(): one pick attempt, online or synced from the offline outbox (keyed by
--   the device's entry id like the other offline syncs, so a retry never picks twice).
-- - sell_garden_items(): veggies for gold.
--
-- Additive only: new tables, one new column, one widened CHECK, new functions.

insert into public.feature_flags (key) values ('garden') on conflict (key) do nothing;

-- ── Plant spots ──────────────────────────────────────────────────────────────

create table if not exists public.wild_plant_nodes (
  region text not null,
  node_id text not null,
  veggie text not null check (veggie in ('tomato', 'eggplant', 'pumpkin', 'carrot', 'cabbage', 'corn', 'beans')),
  tile_x integer not null,
  tile_y integer not null,
  primary key (region, node_id)
);
alter table public.wild_plant_nodes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'wild_plant_nodes' and policyname = 'wild_plant_nodes: read all') then
    create policy "wild_plant_nodes: read all" on public.wild_plant_nodes for select using (true);
  end if;
end $$;

insert into public.wild_plant_nodes (region, node_id, veggie, tile_x, tile_y) values
  ('ledgers_heart', 'tomato_1',   'tomato',   12, 10),
  ('ledgers_heart', 'corn_1',     'corn',     15, 12),
  ('ledgers_heart', 'eggplant_1', 'eggplant', 13, 14),
  ('ledgers_heart', 'pumpkin_1',  'pumpkin',  12, 28),
  ('ledgers_heart', 'carrot_1',   'carrot',   14, 29),
  ('ledgers_heart', 'tomato_2',   'tomato',   40,  6),
  ('ledgers_heart', 'cabbage_1',  'cabbage',  50, 13),
  ('ledgers_heart', 'beans_1',    'beans',    48, 15)
on conflict (region, node_id) do update
  set veggie = excluded.veggie, tile_x = excluded.tile_x, tile_y = excluded.tile_y;

-- ── Bag items ────────────────────────────────────────────────────────────────

create table if not exists public.player_bag_items (
  user_id text not null,
  item_key text not null,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_key)
);
alter table public.player_bag_items enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_bag_items' and policyname = 'player_bag_items: read own') then
    create policy "player_bag_items: read own" on public.player_bag_items for select using (current_app_user_id() = user_id);
  end if;
end $$;
revoke insert, update, delete on public.player_bag_items from anon, authenticated;

-- ── Per-kid plant state ──────────────────────────────────────────────────────

create table if not exists public.player_gather_nodes (
  user_id text not null,
  region text not null,
  node_id text not null,
  last_picked_at timestamptz,
  wrong_streak integer not null default 0,
  rest_until timestamptz,
  picks integer not null default 0,
  primary key (user_id, region, node_id)
);
alter table public.player_gather_nodes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_gather_nodes' and policyname = 'player_gather_nodes: read own') then
    create policy "player_gather_nodes: read own" on public.player_gather_nodes for select using (current_app_user_id() = user_id);
  end if;
end $$;
revoke insert, update, delete on public.player_gather_nodes from anon, authenticated;

alter table public.player_progress add column if not exists wild_plants_picked_total integer not null default 0;

alter table public.player_events drop constraint if exists player_events_event_type_check;
alter table public.player_events add constraint player_events_event_type_check
  check (event_type in ('guild_session', 'main_quest_offline', 'map_offline', 'trainer_offline', 'garden_gather'));

-- The player's bag items as {item_key: quantity}.
create or replace function public.garden_bag_json(p_user_id text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_object_agg(item_key, quantity), '{}'::jsonb)
  from public.player_bag_items where user_id = p_user_id and quantity > 0;
$$;
revoke all on function public.garden_bag_json(text) from public, anon, authenticated;
grant execute on function public.garden_bag_json(text) to service_role;

-- ── Picking ──────────────────────────────────────────────────────────────────
-- Status in the result:
-- - 'picked': right answer; the veggie (and maybe a seed packet) is in the bag.
-- - 'wrong': wrong answer; the plant stays ripe. Three wrong in a row and it rests a minute.
-- - 'growing' / 'resting': the plant can't be picked yet (ready_at / rest_until say when).
--   Nothing is graded then.
create or replace function public.gather_wild_plant(
  p_user_id text,
  p_region text,
  p_node_id text,
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
  -- lib/gardenConfig.ts mirrors these.
  c_regrow constant interval := interval '20 minutes';
  c_rest constant interval := interval '1 minute';
  c_wrong_limit constant int := 3;
  c_seed_chance constant float := 0.25;
  c_max_stack constant int := 999;
  v_idem text := 'garden_gather:' || p_entry_id::text;
  v_prev jsonb;
  v_played timestamptz;
  v_veggie text;
  v_node public.player_gather_nodes%rowtype;
  v_answer text;
  v_correct boolean := null;
  v_status text;
  v_seeds int := 0;
  v_ready timestamptz := null;
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

  perform pg_advisory_xact_lock(hashtext('gather_wild_plant:' || p_user_id));

  select payload into v_prev from public.player_events
  where user_id = p_user_id and idempotency_key = v_idem;
  if found then
    return v_prev || jsonb_build_object('replayed', true, 'bag', public.garden_bag_json(p_user_id));
  end if;

  select veggie into v_veggie from public.wild_plant_nodes where region = p_region and node_id = p_node_id;
  if not found then
    raise exception 'no such plant: % %', p_region, p_node_id;
  end if;

  -- Same claimed-time rule as sync_offline_map: an offline pick counts when it happened.
  v_played := case
    when p_played_at is not null
      and p_played_at <= now() + interval '5 minutes'
      and p_played_at >= now() - interval '14 days'
    then least(p_played_at, now())
    else now()
  end;

  insert into public.player_gather_nodes (user_id, region, node_id) values (p_user_id, p_region, p_node_id)
  on conflict do nothing;
  select * into v_node from public.player_gather_nodes
  where user_id = p_user_id and region = p_region and node_id = p_node_id;

  if v_node.last_picked_at is not null and v_played < v_node.last_picked_at + c_regrow then
    v_status := 'growing';
    v_ready := v_node.last_picked_at + c_regrow;
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

    if v_correct then
      v_status := 'picked';
      v_seeds := case when random() < c_seed_chance then 1 else 0 end;
      insert into public.player_bag_items (user_id, item_key, quantity)
      values (p_user_id, 'veggie_' || v_veggie, 1)
      on conflict (user_id, item_key)
      do update set quantity = least(player_bag_items.quantity + 1, c_max_stack), updated_at = now();
      if v_seeds > 0 then
        insert into public.player_bag_items (user_id, item_key, quantity)
        values (p_user_id, 'seeds_' || v_veggie, 1)
        on conflict (user_id, item_key)
        do update set quantity = least(player_bag_items.quantity + 1, c_max_stack), updated_at = now();
      end if;
      update public.player_gather_nodes
      set last_picked_at = v_played, wrong_streak = 0, rest_until = null, picks = picks + 1
      where user_id = p_user_id and region = p_region and node_id = p_node_id;
      v_ready := v_played + c_regrow;

      insert into public.player_progress (user_id) values (p_user_id) on conflict (user_id) do nothing;
      update public.player_progress
      set wild_plants_picked_total = wild_plants_picked_total + 1, updated_at = now()
      where user_id = p_user_id;
    else
      v_status := 'wrong';
      if v_node.wrong_streak + 1 >= c_wrong_limit then
        v_rest := v_played + c_rest;
        update public.player_gather_nodes set wrong_streak = 0, rest_until = v_rest
        where user_id = p_user_id and region = p_region and node_id = p_node_id;
      else
        update public.player_gather_nodes set wrong_streak = wrong_streak + 1
        where user_id = p_user_id and region = p_region and node_id = p_node_id;
      end if;
    end if;
  end if;

  v_out := jsonb_build_object(
    'status', v_status,
    'region', p_region,
    'node_id', p_node_id,
    'veggie', v_veggie,
    'question_id', p_question_id,
    'correct', v_correct,
    'correct_answer', case when v_correct is null then null else v_answer end,
    'seeds', v_seeds,
    'ready_at', v_ready,
    'rest_until', v_rest,
    'played_at', v_played,
    'claimed_at', p_played_at
  );

  insert into public.player_events (user_id, event_type, occurred_at, payload, idempotency_key)
  values (p_user_id, 'garden_gather', v_played, v_out, v_idem);

  return v_out || jsonb_build_object('replayed', false, 'bag', public.garden_bag_json(p_user_id));
end;
$$;

revoke all on function public.gather_wild_plant(text, text, text, uuid, text, uuid, timestamptz) from public, anon;
grant execute on function public.gather_wild_plant(text, text, text, uuid, text, uuid, timestamptz) to authenticated, service_role;

-- ── Selling ──────────────────────────────────────────────────────────────────
-- p_items: {"veggie_tomato": 3, ...}; null sells every veggie. Only veggies sell (seed packets
-- and anything else are skipped), never more than the bag holds. 2 gold each, paid through
-- apply_progress_update so the daily gold cap applies; past the cap, the veggies it couldn't
-- pay for stay in the bag.
create or replace function public.sell_garden_items(p_user_id text, p_items jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_price constant int := 2;
  v_row record;
  v_want int;
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
    where user_id = p_user_id and item_key like 'veggie\_%' and quantity > 0
    order by item_key
    for update
  loop
    v_want := case
      when p_items is null then v_row.quantity
      when jsonb_typeof(p_items -> v_row.item_key) = 'number' then least(greatest(floor((p_items ->> v_row.item_key)::numeric)::int, 0), v_row.quantity)
      else 0
    end;
    if v_want > 0 then
      v_plan := v_plan || jsonb_build_object(v_row.item_key, v_want);
      v_total := v_total + v_want;
    end if;
  end loop;

  if v_total > 0 then
    insert into public.player_progress (user_id) values (p_user_id) on conflict (user_id) do nothing;
    select gold into v_before from public.player_progress where user_id = p_user_id;
    perform public.apply_progress_update(p_user_id, p_gold_delta => v_total * c_price);
    select gold into v_after from public.player_progress where user_id = p_user_id;
    v_paid := greatest(v_after - v_before, 0);
    -- What the gold paid for, in bag order; the rest stays.
    v_left := v_paid / c_price;
    for v_row in select key as item_key, value::int as n from jsonb_each_text(v_plan) order by key loop
      v_sell := least(v_row.n, v_left);
      exit when v_sell <= 0;
      update public.player_bag_items set quantity = quantity - v_sell, updated_at = now()
      where user_id = p_user_id and item_key = v_row.item_key;
      v_sold := v_sold || jsonb_build_object(v_row.item_key, v_sell);
      v_left := v_left - v_sell;
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
