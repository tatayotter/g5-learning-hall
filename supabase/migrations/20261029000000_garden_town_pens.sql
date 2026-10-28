-- Crops in Inkwell Town's two fenced dirt pens (garden). Every tile inside a pen is a wild
-- plant like the ones in the Ledger's Heart: one right answer picks it, it grows back in 20
-- minutes, it sometimes gives a seed packet, and it sells at the Recycler for 2 gold. Nothing
-- new in gather_wild_plant or sell_garden_items; this only adds the spots.
-- - Small pen (tiles 3-7, 23-27): 25 tomatoes. Big pen (tiles 10-17, 23-27): 40 pumpkins.
--   lib/gardenConfig.ts WILD_PLANTS.town builds the same list (node id = veggie_x_y).

insert into public.wild_plant_nodes (region, node_id, veggie, tile_x, tile_y)
select 'town', p.veggie || '_' || x || '_' || y, p.veggie, x, y
from (values ('tomato', 3, 7), ('pumpkin', 10, 17)) as p(veggie, x0, x1)
cross join lateral generate_series(p.x0, p.x1) as x
cross join generate_series(23, 27) as y
on conflict (region, node_id) do update
  set veggie = excluded.veggie, tile_x = excluded.tile_x, tile_y = excluded.tile_y;
