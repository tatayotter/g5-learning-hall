-- Cooking takes a short wait (Rowil, 2026-10-29). A right answer at the Kitchen puts the food in
-- the pot (player_cooking, one pot per station) instead of the bag; the island shows fire under
-- the pot, steam and a bar, and the kid collects it once it's done (collect_cooking). The
-- Workbench and Compost Bin stay instant (cook_seconds 0). craft_item answers 'cooking' (with
-- ready_at) or 'busy' (the pot is full) for Kitchen recipes.
-- Re-runnable.

alter table public.craft_recipes add column if not exists cook_seconds int not null default 0;
update public.craft_recipes set cook_seconds = case recipe_id
  when 'curio_kibble' then 45 when 'veggie_mash' then 45 when 'veggie_stew' then 90 else cook_seconds end
where station = 'kitchen';

create table if not exists public.player_cooking (
  user_id text not null,
  station text not null,
  recipe_id text not null references public.craft_recipes (recipe_id),
  started_at timestamptz not null default now(),
  ready_at timestamptz not null,
  primary key (user_id, station)
);
alter table public.player_cooking enable row level security;
revoke all on public.player_cooking from anon;
revoke insert, update, delete on public.player_cooking from authenticated;
grant select on public.player_cooking to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_cooking' and policyname = 'player_cooking_read_own') then
    create policy player_cooking_read_own on public.player_cooking for select to authenticated
      using (user_id = public.current_app_user_id());
  end if;
end $$;

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
  v_ready timestamptz;
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
  elsif v_rec.cook_seconds > 0 and exists (select 1 from public.player_cooking where user_id = p_user_id and station = v_rec.station) then
    -- One pot at a time: collect what's cooking first.
    v_status := 'busy';
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
    if v_rec.cook_seconds > 0 then
      -- It goes in the pot; collect_cooking hands it over once it's done.
      v_status := 'cooking';
      v_ready := now() + make_interval(secs => v_rec.cook_seconds);
      insert into public.player_cooking (user_id, station, recipe_id, started_at, ready_at)
      values (p_user_id, v_rec.station, p_recipe, now(), v_ready);
    elsif v_rec.output_to = 'inventory' then
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
    'first', v_first, 'output', v_rec.output, 'output_qty', case when v_status in ('crafted', 'cooking') then v_rec.output_qty else 0 end,
    'ready_at', v_ready,
    'used', v_take, 'trash_used', v_trash_take, 'gold_cost', case when v_status in ('crafted', 'cooking') then v_rec.gold else 0 end
  );
  insert into public.player_events (user_id, event_type, occurred_at, payload, idempotency_key)
  values (p_user_id, 'craft', now(), v_out, v_idem);
  return v_out || jsonb_build_object(
    'replayed', false, 'bag', public.garden_bag_json(p_user_id), 'trash', public.craft_trash_json(p_user_id),
    'progress', (select jsonb_build_object('gold', gold, 'xp', xp, 'level', level) from public.player_progress where user_id = p_user_id)
  );
end;
$$;

-- Takes what's done in a station's pot: into the bag, or the battle items for Veggie Stew.
-- 'collected' (with the output), 'not_ready' (with ready_at) or 'empty'.
create or replace function public.collect_cooking(p_user_id text, p_station text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_max_stack constant int := 999;
  v_pot public.player_cooking%rowtype;
  v_rec public.craft_recipes%rowtype;
begin
  if p_user_id is distinct from current_app_user_id() then
    raise exception 'not authorized';
  end if;
  perform pg_advisory_xact_lock(hashtext('gather_wild_plant:' || p_user_id));
  select * into v_pot from public.player_cooking where user_id = p_user_id and station = p_station for update;
  if not found then
    return jsonb_build_object('status', 'empty', 'bag', public.garden_bag_json(p_user_id));
  end if;
  if v_pot.ready_at > now() then
    return jsonb_build_object('status', 'not_ready', 'ready_at', v_pot.ready_at, 'recipe', v_pot.recipe_id);
  end if;
  select * into v_rec from public.craft_recipes where recipe_id = v_pot.recipe_id;
  if v_rec.output_to = 'inventory' then
    perform public.upsert_inventory(p_user_id, v_rec.output, v_rec.output_qty);
  else
    insert into public.player_bag_items (user_id, item_key, quantity)
    values (p_user_id, v_rec.output, v_rec.output_qty)
    on conflict (user_id, item_key)
    do update set quantity = least(player_bag_items.quantity + v_rec.output_qty, c_max_stack), updated_at = now();
  end if;
  delete from public.player_cooking where user_id = p_user_id and station = p_station;
  insert into public.player_events (user_id, event_type, occurred_at, payload)
  values (p_user_id, 'craft', now(), jsonb_build_object('status', 'collected', 'recipe', v_rec.recipe_id, 'output', v_rec.output, 'output_qty', v_rec.output_qty));
  return jsonb_build_object('status', 'collected', 'recipe', v_rec.recipe_id, 'output', v_rec.output,
    'output_qty', v_rec.output_qty, 'output_to', v_rec.output_to, 'bag', public.garden_bag_json(p_user_id));
end;
$$;

revoke all on function public.craft_item(text, text, uuid, text, uuid) from public, anon;
grant execute on function public.craft_item(text, text, uuid, text, uuid) to authenticated, service_role;
revoke all on function public.collect_cooking(text, text) from public, anon;
grant execute on function public.collect_cooking(text, text) to authenticated, service_role;
