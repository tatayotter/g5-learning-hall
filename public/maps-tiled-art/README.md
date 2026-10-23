# Real-tile-art maps (Tiled `.tmx`)

Parsed by `lib/tiledArtMap.ts` — as opposed to `public/maps-tiled/*.json`
(painted-background regions), these maps are rendered as real multi-layer
Tiled tile art. Save straight from Tiled as `.tmx` (its native format) —
no manual "Export As JSON" step needed, the loader reads the XML directly.

## Conventions

### Tile layers (fixed names, this order)

| Layer | Contents | Draws | Collision |
|---|---|---|---|
| `Ground` | grass, dirt, water (required) | behind everything | none |
| `Ground Detail` | flowers, path edges, puddles | behind everything | none |
| `Shadows` | ground shadows (set layer opacity in Tiled) | behind everything | none |
| `Objects Base` | trunks, fence bottoms, rocks, walls | behind the player | **every painted tile blocks** |
| `Objects Top` | foliage, roof overhangs | in front of the player | none |
| `Liquid` | water or lava under the ground's clear edges (optional, drawn first) | behind everything | tiles marked solid block |
| `skirt`, `excess skirt` | cliff skirts | like Ground Detail | none (use collision boxes) |

Tiles a tileset marks with a bool property `solid` (the water and lava sheets mark every
mostly-liquid tile) block wherever they're painted. Tiles with a Tiled animation (the 6-frame
water and lava sheets, frames left to right) animate in the game too.

Names are case-insensitive but otherwise exact. Hidden layers are skipped,
unknown layer names are skipped with a console warning, and per-layer opacity
is honored. Painted on `Objects Base` = solid. Rectangles in an object layer whose
name contains "collision" are solid too (a tile is blocked when its centre is inside one).
Non-blocking decoration belongs on `Ground Detail`.

### Object layers

- **No-encounter zones**: any object layer whose name contains "encounter"
  (e.g. "no encounter layer") marks tiles as walkable but exempt from the
  wild-encounter quiz roll — draw rectangles over dirt paths/plazas with this
  layer so walking there never interrupts with a question. Every other
  walkable tile rolls for a wild encounter as normal — there's no separate
  "town/heal" tile type on these maps.
- **Spawn point**: an object layer whose name contains "spawn" (e.g.
  "spawns"), containing one point object (named "spawn" if there are several
  objects in the layer — otherwise the first one is used). A region map with no spawn
  point starts one step inside its portal back to the Ledger's Heart.
- **Recycler**: an object layer named `Recycler` with one point object marking the
  Recycler NPC's tile. Optional — without it the map falls back to `RECYCLER_TILES`
  in `lib/trashConfig.ts`. Put it on a walkable tile.
- **Portals**: an object layer whose name contains "portal" (e.g. "Portals").
  Each point object in it needs to identify its target region — either by
  **naming the object** itself (simplest: select the point, Properties panel
  → Name field → type the region id) or by adding a custom **string
  property** named `region` (checked first if both are present). Either way
  the value must be a region id (spelling is forgiving: `ledgersheart` works for
  `ledgers_heart`). Region maps link home with a `ledgers_heart` portal placed exactly where
  that region's road leaves the Ledger's Heart, so the walk carries on across the two maps.
  Ids:  `ledgers_heart`, `cinderreach`, `tidewrit_shallows`,
  `rootbound_wilds`, `stormrun_reaches`, `unread_margins`, `radiant_archive`
  (see `lib/regions.ts` for the full list — unrecognized or missing ids are
  skipped with a console warning). Walking onto a portal tile transitions to
  that region if the player's level meets the region's `unlockLevel`;
  otherwise it shows a locked message and the player stays put.

## Tileset images

External `.tsx` tileset files are fetched and parsed too, but their own
recorded `<image source>` path (wherever they lived on your machine when
you added them in Tiled) is ignored — the loader resolves each tileset's
image by **name** against `KNOWN_TILESET_IMAGES` in `lib/tiledArtMap.ts`,
which points at `public/tilesets/forgotten-memories/`. Adding a new tileset
pack means adding an entry there.

## Region maps (flat)

Each elemental region is a flat ground-and-paths map like the Ledger's Heart (trees and plants
grow daily, lib/mapNature.ts, from the region's own trees and a small plants tileset such as
`FireNature`). A region can use recolored copies of the pack's sheets (same layout, its own
tileset name, e.g. `TileSet-fire`, `LavaTiles-6frames`), listed in `KNOWN_TILESET_IMAGES`.
Cinderreach is built from Rowil's Tiled file by
`/mnt/project-files/maps-incoming/build_cinderreach.py` (lava, scorched tiles, local tilesets).
Tidewrit is generated from a terrain plan by `/mnt/project-files/maps-incoming/tidewrit/build_tidewrit.py`
(grass, path, sand and water on the tile corners; each tile takes the pack tile whose corners
match, read off the sheet, so the soft edges line up): a river with a wooden bridge
(`TideBridge`, on the `skirt` layer, walkable deck with no water under it) and a sandy coast
(`TileSet-tide`: the light-dirt blobs recolored to sand; `TideWater-6frames`: the water sheet
with bright shallows). Its entrance sits on rows 28-30 of the east edge, where the Ledger's
Heart's lower west road leaves.

The little animals (`lib/wildlife.ts`, drawn by `lib/phaserMap/critters.ts`) and the ground
touches (foam, ripples, footprints, lava bubbles: `lib/phaserMap/groundFx.ts`) read the map's
`Liquid` layer and, for footprints and crabs, the sand tiles of `TileSet-tide`.
