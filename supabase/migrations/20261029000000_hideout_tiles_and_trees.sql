-- The Hideout, round two (Rowil, 2026-10-29):
-- - Six tree spots instead of two (grove_3..grove_6), for a livelier island.
-- - A garden pen is planted one tile at a time: building a pen (bed_1..bed_4, now kind 'pen')
--   gives it six soil tiles (bed_N_0..bed_N_5, kind 'bed'), each taking one seed packet. A ripe
--   tile gives 2 veggies and a seed packet back (30% chance of a second). One watering waters
--   every tile in the pen. Tiles can't be built on their own (available = false; part_of says
--   which pen they belong to).
-- Re-runnable.

alter table public.hideout_plot_defs add column if not exists part_of text references public.hideout_plot_defs (plot_id);
alter table public.hideout_plot_defs drop constraint if exists hideout_plot_defs_kind_check;
alter table public.hideout_plot_defs add constraint hideout_plot_defs_kind_check
  check (kind in ('bed', 'grove', 'camp', 'kitchen', 'pen'));

insert into public.hideout_plot_defs (plot_id, kind, cost, available, part_of) values
  ('bed_1', 'pen', '{"wood": 6}', true, null),
  ('bed_2', 'pen', '{"wood": 6}', true, null),
  ('bed_3', 'pen', '{"wood": 6}', true, null),
  ('bed_4', 'pen', '{"wood": 6}', true, null),
  ('grove_3', 'grove', '{"wood": 12}', true, null),
  ('grove_4', 'grove', '{"wood": 12}', true, null),
  ('grove_5', 'grove', '{"wood": 12}', true, null),
  ('grove_6', 'grove', '{"wood": 12}', true, null)
on conflict (plot_id) do update
  set kind = excluded.kind, cost = excluded.cost, available = excluded.available, part_of = excluded.part_of;
insert into public.hideout_plot_defs (plot_id, kind, cost, available, part_of) values
  ('bed_1_0', 'bed', '{}', false, 'bed_1'),
  ('bed_1_1', 'bed', '{}', false, 'bed_1'),
  ('bed_1_2', 'bed', '{}', false, 'bed_1'),
  ('bed_1_3', 'bed', '{}', false, 'bed_1'),
  ('bed_1_4', 'bed', '{}', false, 'bed_1'),
  ('bed_1_5', 'bed', '{}', false, 'bed_1'),
  ('bed_2_0', 'bed', '{}', false, 'bed_2'),
  ('bed_2_1', 'bed', '{}', false, 'bed_2'),
  ('bed_2_2', 'bed', '{}', false, 'bed_2'),
  ('bed_2_3', 'bed', '{}', false, 'bed_2'),
  ('bed_2_4', 'bed', '{}', false, 'bed_2'),
  ('bed_2_5', 'bed', '{}', false, 'bed_2'),
  ('bed_3_0', 'bed', '{}', false, 'bed_3'),
  ('bed_3_1', 'bed', '{}', false, 'bed_3'),
  ('bed_3_2', 'bed', '{}', false, 'bed_3'),
  ('bed_3_3', 'bed', '{}', false, 'bed_3'),
  ('bed_3_4', 'bed', '{}', false, 'bed_3'),
  ('bed_3_5', 'bed', '{}', false, 'bed_3'),
  ('bed_4_0', 'bed', '{}', false, 'bed_4'),
  ('bed_4_1', 'bed', '{}', false, 'bed_4'),
  ('bed_4_2', 'bed', '{}', false, 'bed_4'),
  ('bed_4_3', 'bed', '{}', false, 'bed_4'),
  ('bed_4_4', 'bed', '{}', false, 'bed_4'),
  ('bed_4_5', 'bed', '{}', false, 'bed_4')
on conflict (plot_id) do update
  set kind = excluded.kind, cost = excluded.cost, available = excluded.available, part_of = excluded.part_of;

-- Pens built before this: give them their tiles, and move anything growing on the pen itself
-- onto its first tile.
insert into public.player_hideout_plots (user_id, plot_id)
select p.user_id, d.plot_id
from public.player_hideout_plots p
join public.hideout_plot_defs d on d.part_of = p.plot_id
on conflict do nothing;
update public.player_hideout_plots t
set item = p.item, planted_at = p.planted_at, ready_at = p.ready_at, watered_at = p.watered_at
from public.player_hideout_plots p
where p.plot_id in ('bed_1', 'bed_2', 'bed_3', 'bed_4') and p.item is not null
  and t.user_id = p.user_id and t.plot_id = p.plot_id || '_0' and t.item is null;
update public.player_hideout_plots set item = null, planted_at = null, ready_at = null, watered_at = null
where plot_id in ('bed_1', 'bed_2', 'bed_3', 'bed_4');

-- ── Building: a pen comes with its tiles ──────────────────────────────────────
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
  -- A garden pen comes with its six soil tiles, each planted on its own.
  insert into public.player_hideout_plots (user_id, plot_id)
  select p_user_id, d.plot_id from public.hideout_plot_defs d where d.part_of = p_plot
  on conflict do nothing;
  insert into public.player_events (user_id, event_type, occurred_at, payload)
  values (p_user_id, 'hideout', now(), jsonb_build_object('action', 'build', 'plot', p_plot, 'cost', v_def.cost));

  return jsonb_build_object('ok', true, 'plot', p_plot, 'hideout', public.hideout_json(p_user_id), 'bag', public.garden_bag_json(p_user_id));
end;
$$;
revoke all on function public.build_hideout_plot(text, text) from public, anon;
grant execute on function public.build_hideout_plot(text, text) to authenticated, service_role;

-- ── Watering: the whole pen at once ───────────────────────────────────────────
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
        and (plot_id = p_plot or v_can >= 3
             -- one watering covers every tile in the pen
             or plot_id in (select d.plot_id from public.hideout_plot_defs d
                            where d.part_of = (select part_of from public.hideout_plot_defs where plot_id = p_plot)))
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

-- ── Harvesting: 2 veggies a tile ──────────────────────────────────────────────
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
