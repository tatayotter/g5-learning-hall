-- Garden: Inkwell Town's trees.
--
-- The town (region `town`, lib/regions.ts) grows the Ledger's Heart's four trees on its lawns
-- in its daily nature layer, so chop_wild_tree has to accept them there (c_region_trees). The
-- function is otherwise unchanged from 20261023210000_garden_all_region_trees.sql. Safe to
-- re-run (create or replace + grants).

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
