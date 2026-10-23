-- Garden, step 2: wild trees on the Training Map (plan: "Garden and Grove", 2026-10-22).
-- The Ledger's Heart is now drawn as ground and paths only, and its trees, bushes, grass and
-- flowers grow by code, a new layout every day (lib/mapNature.ts, seeded by the region and the
-- day in Manila, so every kid sees the same map). Every tree can be chopped: three right
-- answers, one per swing; a wrong answer just misses. The tree gives 3 wood, and half the time
-- a sapling of its kind (always, on a "clean chop" with no misses), kept for the Hideout grove
-- later. It stays a stump for that kid until the next day's map. A kid can chop 8 trees a day.
-- Wood sells at the Recycler for 2 gold each, like veggies. Behind the same 'garden' rollout
-- switch as the veggies.
--
-- A tree's id names its day and trunk tile ("2026-10-23:12_7"), so no list of trees is kept
-- here: the day in the id has to match the day the swing was played.
--
-- - player_gather_nodes gets the swings landed on the tree so far (hits) and the misses in this
--   chop (chop_misses), so a chop can be finished later.
-- - chop_wild_tree(): one swing, online or synced from the offline outbox (keyed by the
--   device's entry id, so a retry never swings twice).
-- - sell_garden_items(): now buys wood too.
--
-- Additive only: two new columns, a new function, one replaced function.

-- ── Swings so far ────────────────────────────────────────────────────────────

alter table public.player_gather_nodes add column if not exists hits integer not null default 0;
alter table public.player_gather_nodes add column if not exists chop_misses integer not null default 0;

-- ── Chopping ─────────────────────────────────────────────────────────────────
-- Status in the result:
-- - 'hit': right answer; one more swing landed (hits says how many, of 3).
-- - 'felled': right answer on the third swing; 3 wood (and maybe a sapling) are in the bag.
--   clean says it was a clean chop (no misses), which always gives a sapling.
-- - 'wrong': wrong answer; the swing missed. Three wrong in a row and the tree rests a minute.
-- - 'stump': this kid already chopped the tree today. 'tired': 8 trees chopped today.
--   'resting': rest_until says when. Nothing is graded then.
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
    "cinderreach": ["ember", "ashwillow"]
  }'::jsonb;
  c_daily constant int := 8;
  c_rest constant interval := interval '1 minute';
  c_wrong_limit constant int := 3;
  c_swings constant int := 3;
  c_wood constant int := 3;
  c_sapling_chance constant float := 0.5;
  c_max_stack constant int := 999;
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

  if v_node.last_picked_at is not null then
    v_status := 'stump';
  elsif v_felled >= c_daily then
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

    if v_correct and v_node.hits + 1 >= c_swings then
      v_status := 'felled';
      v_hits := c_swings;
      v_clean := v_node.chop_misses = 0;
      v_wood := c_wood;
      v_saplings := case when v_clean or random() < c_sapling_chance then 1 else 0 end;
      insert into public.player_bag_items (user_id, item_key, quantity)
      values (p_user_id, 'wood', v_wood)
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

-- ── Selling ──────────────────────────────────────────────────────────────────
-- Same as step 1, and wood sells now too, at the same 2 gold. Seed packets and saplings still
-- don't sell (they're for planting).
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
    where user_id = p_user_id and (item_key like 'veggie\_%' or item_key = 'wood') and quantity > 0
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
