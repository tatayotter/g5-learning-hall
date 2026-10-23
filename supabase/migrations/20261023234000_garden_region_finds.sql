-- Each new region's own find, picked up like Tidewrit's seashells (one right answer, into the
-- bag as veggie_<find>, a new one turns up 20 minutes later, the Recycler buys it for 2 gold,
-- never a seed packet):
-- - Stormrun Reaches: storm crystals in the rubble fields,
-- - the Unread Margins: ink pearls by the ink pools,
-- - the Radiant Archive: golden petals in the meadow.
-- - wild_plant_nodes: the three finds allowed, and their seven spots per region
--   (lib/gardenConfig.ts WILD_PLANTS holds the same list).
-- - gather_wild_plant(): same as before, no seeds for any find.

alter table public.wild_plant_nodes drop constraint if exists wild_plant_nodes_veggie_check;
alter table public.wild_plant_nodes add constraint wild_plant_nodes_veggie_check
  check (veggie in ('tomato', 'eggplant', 'pumpkin', 'carrot', 'cabbage', 'corn', 'beans',
                    'seashell', 'crystal', 'inkpearl', 'petal'));

insert into public.wild_plant_nodes (region, node_id, veggie, tile_x, tile_y) values
  ('stormrun_reaches', 'crystal_1', 'crystal', 44,  3),
  ('stormrun_reaches', 'crystal_2', 'crystal', 15, 21),
  ('stormrun_reaches', 'crystal_3', 'crystal', 46, 25),
  ('stormrun_reaches', 'crystal_4', 'crystal', 33, 27),
  ('stormrun_reaches', 'crystal_5', 'crystal', 56, 32),
  ('stormrun_reaches', 'crystal_6', 'crystal',  2, 36),
  ('stormrun_reaches', 'crystal_7', 'crystal', 21, 37),
  ('unread_margins', 'pearl_1', 'inkpearl', 36,  2),
  ('unread_margins', 'pearl_2', 'inkpearl', 27,  8),
  ('unread_margins', 'pearl_3', 'inkpearl', 54, 17),
  ('unread_margins', 'pearl_4', 'inkpearl', 16, 21),
  ('unread_margins', 'pearl_5', 'inkpearl', 27, 23),
  ('unread_margins', 'pearl_6', 'inkpearl', 47, 23),
  ('unread_margins', 'pearl_7', 'inkpearl', 21, 28),
  ('radiant_archive', 'petal_1', 'petal',  3,  3),
  ('radiant_archive', 'petal_2', 'petal', 54,  3),
  ('radiant_archive', 'petal_3', 'petal', 29, 14),
  ('radiant_archive', 'petal_4', 'petal', 13, 18),
  ('radiant_archive', 'petal_5', 'petal', 57, 34),
  ('radiant_archive', 'petal_6', 'petal',  2, 37),
  ('radiant_archive', 'petal_7', 'petal', 31, 37)
on conflict (region, node_id) do update
  set veggie = excluded.veggie, tile_x = excluded.tile_x, tile_y = excluded.tile_y;

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
      -- Finds (shells, crystals, pearls, petals) aren't grown; only plants give seed packets.
      v_seeds := case when v_veggie not in ('seashell', 'crystal', 'inkpearl', 'petal') and random() < c_seed_chance then 1 else 0 end;
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
