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

Names are case-insensitive but otherwise exact. Hidden layers are skipped,
unknown layer names are skipped with a console warning, and per-layer opacity
is honored. There are no collision rectangles: painted on `Objects Base` = solid.
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
  objects in the layer — otherwise the first one is used).
- **Recycler**: an object layer named `Recycler` with one point object marking the
  Recycler NPC's tile. Optional — without it the map falls back to `RECYCLER_TILES`
  in `lib/trashConfig.ts`. Put it on a walkable tile.
- **Portals**: an object layer whose name contains "portal" (e.g. "Portals").
  Each point object in it needs to identify its target region — either by
  **naming the object** itself (simplest: select the point, Properties panel
  → Name field → type the region id) or by adding a custom **string
  property** named `region` (checked first if both are present). Either way
  the value must be one of: `cinderreach`, `tidewrit_shallows`,
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
