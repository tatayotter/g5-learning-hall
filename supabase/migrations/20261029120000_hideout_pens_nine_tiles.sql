-- Garden pens get a third row of soil (Rowil, 2026-10-29): the fenced pen is 3x3 inside, so each
-- pen now has nine tiles (bed_N_0..bed_N_8) instead of six. The new tiles bed_N_6..bed_N_8 are the
-- front row. Pens already built get their new tiles now; a pen built later gets all nine
-- (build_hideout_plot adds every tile whose part_of is the pen).
-- Re-runnable.

insert into public.hideout_plot_defs (plot_id, kind, cost, available, part_of)
select format('bed_%s_%s', b, t), 'bed', '{}'::jsonb, false, format('bed_%s', b)
from generate_series(1, 4) b, generate_series(6, 8) t
on conflict (plot_id) do update
  set kind = excluded.kind, cost = excluded.cost, available = excluded.available, part_of = excluded.part_of;

insert into public.player_hideout_plots (user_id, plot_id)
select p.user_id, d.plot_id
from public.player_hideout_plots p
join public.hideout_plot_defs d on d.part_of = p.plot_id
on conflict do nothing;
