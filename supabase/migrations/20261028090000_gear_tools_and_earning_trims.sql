-- Tools that unlock map skills, a bigger bag, and the first earning trims (economy plan,
-- 2026-10-28: https://claude.ai/artifact/Mz9p76EJ478poFWLQDR1Tp).
--
-- Gear (lib/gearConfig.ts mirrors every number here):
-- - gear_tiers: what the Shopkeeper sells. Axe, Pickaxe and Shovel (Stone 150, Bronze 1,000,
--   Silver 3,000, Gold 8,000), Fishing Rod and Watering Can (listed, not for sale until fishing
--   and the Hideout exist), and the Bigger Bag (+6 squares for 500, 1,500, 3,000).
-- - player_gear: the tier each kid owns. Only buy_gear() writes it, one tier at a time.
-- - chop_wild_tree(): needs an axe. Bronze swings twice instead of three times, Silver gives a
--   sapling every tree and 12 trees a day instead of 8, Gold gives double wood 1 time in 4.
-- - gather_wild_plant(): storm crystals need a pickaxe; seashells, ink pearls and golden
--   petals need a shovel. Bronze and up sometimes find a second one, Silver and Gold sometimes
--   dig up a rare Storm Gem (pickaxe) or Old Coin (shovel). No tool = status 'no_tool', nothing
--   graded (an offline pick synced later still leaves the outbox).
-- - Kids who already chopped, mined or dug get the Stone tool for free, so nobody loses
--   something they could do yesterday.
--
-- Earning trims:
-- - sell_garden_items(): crystals, ink pearls and petals sell for 4 gold, Storm Gems and Old
--   Coins for 10; veggies, shells and wood stay 2.
-- - claim_trainer_first_win(): the gold written on each NPC trainer (20 to 150) is paid the
--   first time a kid beats that trainer after this, once per trainer ever.
-- - consume_reward_allowance(): the daily gold cap on player-requested rewards drops from
--   10,000 to 5,000 (the best real day is 4,544).
-- The guild multiplier cap is client-side (lib/guildConfig.ts).

-- ── Event types ───────────────────────────────────────────────────────────────
alter table public.player_events drop constraint if exists player_events_event_type_check;
alter table public.player_events add constraint player_events_event_type_check
  check (event_type in ('guild_session', 'main_quest_offline', 'map_offline', 'trainer_offline', 'garden_gather',
                        'gear_purchase', 'trainer_first_win'));

-- ── Gear catalog ──────────────────────────────────────────────────────────────
create table if not exists public.gear_tiers (
  gear text not null check (gear in ('axe', 'pickaxe', 'shovel', 'rod', 'can', 'bag')),
  tier int not null check (tier between 1 and 4),
  name text not null,
  cost int not null check (cost > 0),
  available boolean not null default true,
  primary key (gear, tier)
);
alter table public.gear_tiers enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gear_tiers' and policyname = 'gear_tiers_read') then
    create policy gear_tiers_read on public.gear_tiers for select to authenticated using (true);
  end if;
end $$;

insert into public.gear_tiers (gear, tier, name, cost, available) values
  ('axe', 1, 'Stone Axe', 150, true),
  ('axe', 2, 'Bronze Axe', 1000, true),
  ('axe', 3, 'Silver Axe', 3000, true),
  ('axe', 4, 'Gold Axe', 8000, true),
  ('pickaxe', 1, 'Stone Pickaxe', 150, true),
  ('pickaxe', 2, 'Bronze Pickaxe', 1000, true),
  ('pickaxe', 3, 'Silver Pickaxe', 3000, true),
  ('pickaxe', 4, 'Gold Pickaxe', 8000, true),
  ('shovel', 1, 'Stone Shovel', 150, true),
  ('shovel', 2, 'Bronze Shovel', 1000, true),
  ('shovel', 3, 'Silver Shovel', 3000, true),
  ('shovel', 4, 'Gold Shovel', 8000, true),
  ('rod', 1, 'Bamboo Rod', 200, false),
  ('rod', 2, 'Bronze Rod', 1200, false),
  ('rod', 3, 'Silver Rod', 3500, false),
  ('rod', 4, 'Gold Rod', 9000, false),
  ('can', 1, 'Tin Watering Can', 100, false),
  ('can', 2, 'Bronze Watering Can', 800, false),
  ('can', 3, 'Silver Watering Can', 2500, false),
  ('can', 4, 'Gold Watering Can', 6000, false),
  ('bag', 1, 'Bigger Bag', 500, true),
  ('bag', 2, 'Big Bag', 1500, true),
  ('bag', 3, 'Huge Bag', 3000, true)
on conflict (gear, tier) do update
  set name = excluded.name, cost = excluded.cost, available = excluded.available;

-- ── What each kid owns ────────────────────────────────────────────────────────
create table if not exists public.player_gear (
  user_id text not null,
  gear text not null check (gear in ('axe', 'pickaxe', 'shovel', 'rod', 'can', 'bag')),
  tier int not null check (tier between 1 and 4),
  updated_at timestamptz not null default now(),
  primary key (user_id, gear)
);
alter table public.player_gear enable row level security;
revoke all on public.player_gear from anon;
revoke insert, update, delete on public.player_gear from authenticated;
grant select on public.player_gear to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_gear' and policyname = 'player_gear_read_own') then
    create policy player_gear_read_own on public.player_gear for select to authenticated
      using (user_id = public.current_app_user_id());
  end if;
end $$;

-- The tier a kid owns (0 = none).
create or replace function public.gear_tier(p_user_id text, p_gear text)
returns int
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select tier from public.player_gear where user_id = p_user_id and gear = p_gear), 0);
$$;
revoke all on function public.gear_tier(text, text) from public, anon, authenticated;
grant execute on function public.gear_tier(text, text) to service_role;

-- Starter tools for kids who already chopped, mined or dug.
insert into public.player_gear (user_id, gear, tier)
select distinct user_id, 'axe', 1 from (
  select user_id from public.player_bag_items where item_key = 'wood' and quantity > 0
  union
  select user_id from public.player_gather_nodes
  where node_id ~ '^\d{4}-\d{2}-\d{2}:\d{1,3}_\d{1,3}$' and (picks > 0 or hits > 0)
) s
on conflict (user_id, gear) do nothing;

insert into public.player_gear (user_id, gear, tier)
select distinct user_id, 'pickaxe', 1 from (
  select user_id from public.player_bag_items where item_key = 'veggie_crystal' and quantity > 0
  union
  select g.user_id from public.player_gather_nodes g
  join public.wild_plant_nodes w on w.region = g.region and w.node_id = g.node_id
  where w.veggie = 'crystal' and g.picks > 0
) s
on conflict (user_id, gear) do nothing;

insert into public.player_gear (user_id, gear, tier)
select distinct user_id, 'shovel', 1 from (
  select user_id from public.player_bag_items
  where item_key in ('veggie_seashell', 'veggie_inkpearl', 'veggie_petal') and quantity > 0
  union
  select g.user_id from public.player_gather_nodes g
  join public.wild_plant_nodes w on w.region = g.region and w.node_id = g.node_id
  where w.veggie in ('seashell', 'inkpearl', 'petal') and g.picks > 0
) s
on conflict (user_id, gear) do nothing;

-- ── Buying ────────────────────────────────────────────────────────────────────
-- Buys the next tier of one piece of gear. Tools need the garden switch (they're for the
-- garden's trees and finds); the bag works for everyone. Refusals come back as
-- {ok: false, reason}: 'max' (already the top tier), 'not_for_sale', 'gold' (not enough).
create or replace function public.buy_gear(p_user_id text, p_gear text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_have int;
  v_next public.gear_tiers%rowtype;
  v_gold int;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  if p_gear is null or p_gear not in ('axe', 'pickaxe', 'shovel', 'rod', 'can', 'bag') then
    raise exception 'no such gear: %', p_gear;
  end if;
  if p_gear <> 'bag' and not public.feature_enabled_for(p_user_id, 'garden') then
    raise exception 'garden is not on for this player';
  end if;

  insert into public.player_progress (user_id) values (p_user_id) on conflict (user_id) do nothing;
  -- Locks the wallet too, so two taps can't both pay for one tier.
  select gold into v_gold from public.player_progress where user_id = p_user_id for update;
  v_have := public.gear_tier(p_user_id, p_gear);

  select * into v_next from public.gear_tiers where gear = p_gear and tier = v_have + 1;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'max', 'gear', p_gear, 'tier', v_have, 'gold', v_gold);
  end if;
  if not v_next.available then
    return jsonb_build_object('ok', false, 'reason', 'not_for_sale', 'gear', p_gear, 'tier', v_have, 'gold', v_gold);
  end if;
  if v_gold < v_next.cost then
    return jsonb_build_object('ok', false, 'reason', 'gold', 'gear', p_gear, 'tier', v_have, 'gold', v_gold);
  end if;

  update public.player_progress set gold = gold - v_next.cost, updated_at = now()
  where user_id = p_user_id
  returning gold into v_gold;

  insert into public.player_gear (user_id, gear, tier) values (p_user_id, p_gear, v_next.tier)
  on conflict (user_id, gear) do update set tier = excluded.tier, updated_at = now();

  -- A record, not a guard: the wallet lock above already makes each tier sell once.
  insert into public.player_events (user_id, event_type, occurred_at, payload)
  values (p_user_id, 'gear_purchase', now(),
          jsonb_build_object('gear', p_gear, 'tier', v_next.tier, 'cost', v_next.cost));

  return jsonb_build_object(
    'ok', true, 'gear', p_gear, 'tier', v_next.tier, 'cost', v_next.cost,
    'progress', (select jsonb_build_object('gold', gold, 'xp', xp, 'level', level) from public.player_progress where user_id = p_user_id)
  );
end;
$$;
revoke all on function public.buy_gear(text, text) from public, anon;
grant execute on function public.buy_gear(text, text) to authenticated, service_role;

-- ── Chopping ──────────────────────────────────────────────────────────────────
-- Same as 20261024004000_garden_town_trees.sql, plus the axe:
-- - no axe: status 'no_tool', nothing graded;
-- - swings to fell a tree: 3 (Stone), 2 (Bronze and up);
-- - trees a day: 8, or 12 with Silver and up;
-- - sapling: always on a clean chop, otherwise 50%, or always with Silver and up;
-- - wood: 3, or 6 one time in 4 with Gold.
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

-- ── Picking, mining, digging ──────────────────────────────────────────────────
-- Same as 20261023234000_garden_region_finds.sql, plus the tools:
-- - crystals need a pickaxe; shells, pearls and petals need a shovel; veggies need nothing;
-- - Bronze and Silver find a second one 1 time in 4, Gold 1 time in 2;
-- - Silver finds a rare item 1 time in 10, Gold 15 in 100 (Storm Gem with a pickaxe, Old Coin
--   with a shovel).
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
  -- lib/gardenConfig.ts and lib/gearConfig.ts mirror these.
  c_regrow constant interval := interval '20 minutes';
  c_rest constant interval := interval '1 minute';
  c_wrong_limit constant int := 3;
  c_seed_chance constant float := 0.25;
  c_max_stack constant int := 999;
  v_idem text := 'garden_gather:' || p_entry_id::text;
  v_prev jsonb;
  v_played timestamptz;
  v_veggie text;
  v_tool text;
  v_tier int := 0;
  v_rare_key text;
  v_node public.player_gather_nodes%rowtype;
  v_answer text;
  v_correct boolean := null;
  v_status text;
  v_seeds int := 0;
  v_count int := 0;
  v_rare int := 0;
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
  v_tool := case
    when v_veggie = 'crystal' then 'pickaxe'
    when v_veggie in ('seashell', 'inkpearl', 'petal') then 'shovel'
    else null
  end;
  if v_tool is not null then
    v_tier := public.gear_tier(p_user_id, v_tool);
    v_rare_key := case v_tool when 'pickaxe' then 'find_gem' else 'find_coin' end;
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

  if v_tool is not null and v_tier = 0 then
    v_status := 'no_tool';
  elsif v_node.last_picked_at is not null and v_played < v_node.last_picked_at + c_regrow then
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
      -- Finds (shells, crystals, pearls, petals) aren't grown; only plants give seed packets.
      v_seeds := case when v_veggie not in ('seashell', 'crystal', 'inkpearl', 'petal') and random() < c_seed_chance then 1 else 0 end;
      v_count := 1 + case
        when v_tier >= 4 and random() < 0.5 then 1
        when v_tier in (2, 3) and random() < 0.25 then 1
        else 0
      end;
      v_rare := case
        when v_tier >= 4 and random() < 0.15 then 1
        when v_tier = 3 and random() < 0.10 then 1
        else 0
      end;
      insert into public.player_bag_items (user_id, item_key, quantity)
      values (p_user_id, 'veggie_' || v_veggie, v_count)
      on conflict (user_id, item_key)
      do update set quantity = least(player_bag_items.quantity + v_count, c_max_stack), updated_at = now();
      if v_seeds > 0 then
        insert into public.player_bag_items (user_id, item_key, quantity)
        values (p_user_id, 'seeds_' || v_veggie, 1)
        on conflict (user_id, item_key)
        do update set quantity = least(player_bag_items.quantity + 1, c_max_stack), updated_at = now();
      end if;
      if v_rare > 0 then
        insert into public.player_bag_items (user_id, item_key, quantity)
        values (p_user_id, v_rare_key, 1)
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
    'tool', v_tool,
    'question_id', p_question_id,
    'correct', v_correct,
    'correct_answer', case when v_correct is null then null else v_answer end,
    'count', v_count,
    'seeds', v_seeds,
    'rare', case when v_rare > 0 then v_rare_key else null end,
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

-- ── Selling ───────────────────────────────────────────────────────────────────
-- Same as 20261023120000_garden_wild_trees.sql with a price per item
-- (lib/gardenConfig.ts gardenSellPrice): veggies, shells and wood 2; crystals, ink pearls and
-- petals 4; Storm Gems and Old Coins 10. When the daily cap pays less than the whole sale,
-- items are sold in bag order for what was paid and the rest stays.
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
    where user_id = p_user_id and (item_key like 'veggie\_%' or item_key in ('wood', 'find_gem', 'find_coin')) and quantity > 0
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

-- What the Recycler pays for one of an item (0 = doesn't buy it).
create or replace function public.garden_sell_price(p_item_key text)
returns int
language sql
immutable
set search_path to 'public'
as $$
  select case
    when p_item_key in ('veggie_crystal', 'veggie_inkpearl', 'veggie_petal') then 4
    when p_item_key in ('find_gem', 'find_coin') then 10
    when p_item_key = 'wood' or p_item_key like 'veggie\_%' then 2
    else 0
  end;
$$;
revoke all on function public.garden_sell_price(text) from public, anon;
grant execute on function public.garden_sell_price(text) to authenticated, service_role;

revoke all on function public.sell_garden_items(text, jsonb) from public, anon;
grant execute on function public.sell_garden_items(text, jsonb) to authenticated, service_role;

-- ── Trainer gold, first win ───────────────────────────────────────────────────
-- lib/monsterConfig.ts NPC_TRAINERS reward.gold mirrors these. Called by the game right after
-- a win against a trainer (online, or once an offline battle has synced). Pays once per trainer
-- ever, and only when that win is on record in monster_battle_log.
create or replace function public.claim_trainer_first_win(p_user_id text, p_trainer_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_gold constant jsonb := '{
    "forest_scout": 20, "tide_watcher": 30, "ember_acolyte": 40, "storm_caller": 50,
    "shadow_stalker": 60, "light_bearer": 70, "elemental_knight": 100, "grand_master": 150
  }'::jsonb;
  v_idem text := 'trainer_first_win:' || coalesce(p_trainer_id, '');
  v_gold int;
  v_before int;
  v_after int;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  v_gold := coalesce((c_gold ->> p_trainer_id)::int, 0);
  if v_gold <= 0 then
    return jsonb_build_object('gold', 0, 'reason', 'no_reward');
  end if;

  perform pg_advisory_xact_lock(hashtext('claim_trainer_first_win:' || p_user_id));

  if exists (select 1 from public.player_events where user_id = p_user_id and idempotency_key = v_idem) then
    return jsonb_build_object('gold', 0, 'reason', 'already_paid');
  end if;
  if not exists (
    select 1 from public.monster_battle_log
    where user_id = p_user_id and opponent = p_trainer_id and result = 'win'
      and created_at > now() - interval '15 days'
  ) then
    return jsonb_build_object('gold', 0, 'reason', 'no_win');
  end if;

  insert into public.player_progress (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select gold into v_before from public.player_progress where user_id = p_user_id;
  perform public.apply_progress_update(p_user_id, p_gold_delta => v_gold);
  select gold into v_after from public.player_progress where user_id = p_user_id;

  insert into public.player_events (user_id, event_type, occurred_at, payload, idempotency_key)
  values (p_user_id, 'trainer_first_win', now(),
          jsonb_build_object('trainer_id', p_trainer_id, 'gold', v_after - v_before), v_idem);

  return jsonb_build_object(
    'gold', v_after - v_before,
    'progress', (select jsonb_build_object('gold', gold, 'xp', xp, 'level', level) from public.player_progress where user_id = p_user_id)
  );
end;
$$;
revoke all on function public.claim_trainer_first_win(text, text) from public, anon;
grant execute on function public.claim_trainer_first_win(text, text) to authenticated, service_role;

-- ── Daily gold cap ────────────────────────────────────────────────────────────
-- Same as 20261004180000_daily_reward_caps.sql with 5,000 gold a day instead of 10,000.
create or replace function public.consume_reward_allowance(
  p_user_id text, p_xp integer, p_gold integer, p_items integer
) returns table (xp integer, gold integer, items integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_day date := (now() at time zone 'Asia/Manila')::date;
  v_row public.reward_daily_ledger%rowtype;
  v_xp integer := greatest(coalesce(p_xp, 0), 0);
  v_gold integer := greatest(coalesce(p_gold, 0), 0);
  v_items integer := greatest(coalesce(p_items, 0), 0);
  a_xp integer;
  a_gold integer;
  a_items integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and p_user_id is distinct from public.current_app_user_id() then
    raise exception 'not authorized';
  end if;

  insert into public.reward_daily_ledger (user_id, day) values (p_user_id, v_day)
  on conflict (user_id, day) do nothing;

  select * into v_row from public.reward_daily_ledger
  where user_id = p_user_id and day = v_day
  for update;

  a_xp := least(v_xp, greatest(20000 - v_row.xp_granted, 0));
  a_gold := least(v_gold, greatest(5000 - v_row.gold_granted, 0));
  a_items := least(v_items, greatest(30 - v_row.items_granted, 0));

  update public.reward_daily_ledger set
    xp_granted = xp_granted + a_xp,
    gold_granted = gold_granted + a_gold,
    items_granted = items_granted + a_items,
    xp_clamped = xp_clamped + (v_xp - a_xp),
    gold_clamped = gold_clamped + (v_gold - a_gold),
    items_clamped = items_clamped + (v_items - a_items),
    updated_at = now()
  where user_id = p_user_id and day = v_day;

  return query select a_xp, a_gold, a_items;
end;
$function$;

revoke execute on function public.consume_reward_allowance(text, integer, integer, integer) from public, anon;
grant execute on function public.consume_reward_allowance(text, integer, integer, integer) to authenticated, service_role;
