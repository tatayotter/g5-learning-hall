# Authoring training-map layouts in Tiled

These `.json` files are the walkability grids for the World Map regions —
parsed by [lib/tiledMap.ts](../../lib/tiledMap.ts) into the `MapTile[][]`
grid `TrainingMap.tsx` walks on. They do **not** control what the map looks
like — each region's actual art is still the painted background image set on
`mapImage` in [lib/regions.ts](../../lib/regions.ts). Tiled here is purely the
authoring tool for *where walls/town/grass are*, laid on top of that art.

## Format conventions (required — the parser expects these exact names)

- **Map size**: 16×16 tiles (`MAP_SIZE` in `lib/regions.ts`) — don't resize.
- **One tile layer named exactly `Logic`.** This is the only layer
  `lib/tiledMap.ts` reads.
- **One tileset** with 3 tiles, each carrying a custom **string property**
  named `type` set to `"grass"`, `"town"`, or `"wall"`. `logic-tileset.png`
  in this folder is that tileset — it's a plain 3-color strip purely for
  telling the 3 tile types apart while painting; it is never rendered
  in-game, so its actual colors don't matter.
- **4 map-level custom properties** (int): `spawnX`, `spawnY`,
  `townCenterX`, `townCenterY`. Elemental regions use these as their fixed
  spawn point (never persisted to the DB — see `TrainingMap.tsx`'s
  `localPos` comment); Ledger's Heart's spawn instead comes from the
  player's saved `user_battle_state.map_x/map_y`, so its `spawnX/Y` values
  aren't actually used, but Tiled still wants map properties defined.

## Workflow for editing an existing region

1. Install [Tiled](https://www.mapeditor.org/) (free) if you haven't.
2. Open `public/maps-tiled/<region_id>.json` directly in Tiled.
3. Paint the `Logic` layer with the 3 tiles from the tileset panel (grass,
   town, wall — hover each to see its `type` property in the Properties
   panel to confirm which is which).
4. If you move the town, also update that region's `townCenterX/Y` map
   properties (Map → Map Properties) so the in-game town marker follows it.
5. **File → Save** (overwrites the JSON in place — Tiled preserves the
   custom properties and layer name as long as you don't recreate the map
   from scratch).
6. Refresh the dev server tab on that region — `lib/tiledMap.ts` fetches and
   caches the JSON client-side, so a hard refresh picks up the change.

## Workflow for a brand-new region

1. Duplicate an existing file in this folder as a starting point (keeps the
   tileset reference and layer/property names correct) and rename it.
2. Edit its `Logic` layer + map properties in Tiled as above.
3. Add a new entry to `REGIONS` in `lib/regions.ts`: `id`, `name`, `lore`,
   `element`, `unlockLevel`, a `mapImage` (the painted background art),
   `tiledMapPath: '/maps-tiled/<your-file>.json'`, and `spawn`/`townCenter`
   matching what you set inside the Tiled file's map properties.
4. If it's one of the 6 elemental regions, also add it to `REGION_BY_ELEMENT`
   so the World Map hub places a hotspot for it.
