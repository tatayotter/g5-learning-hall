# Real-tile-art maps (Tiled `.tmx`)

Parsed by `lib/tiledArtMap.ts` — as opposed to `public/maps-tiled/*.json`
(painted-background regions), these maps are rendered as real multi-layer
Tiled tile art. Save straight from Tiled as `.tmx` (its native format) —
no manual "Export As JSON" step needed, the loader reads the XML directly.

## Conventions

- **Tile layers** render back-to-front in the order they appear in Tiled's
  Layers panel (bottom of the panel = drawn first/behind). Everything from
  the first layer literally named `Above Player` onward renders in front of
  the player sprite; everything before it renders behind. A map with no such
  layer renders entirely behind the player.
- **Collision**: any object layer whose name contains "collision"
  (case-insensitive — e.g. "Fence Collision", "Tree collision") contributes
  blocking rectangles. A tile is blocked if its center point falls inside any
  rect from one of those layers.
- **No-encounter zones**: any object layer whose name contains "encounter"
  (e.g. "no encounter layer") marks tiles as walkable but exempt from the
  wild-encounter quiz roll — draw rectangles over dirt paths/plazas with this
  layer so walking there never interrupts with a question. Every other
  walkable tile rolls for a wild encounter as normal — there's no separate
  "town/heal" tile type on these maps.
- **Spawn point**: an object layer whose name contains "spawn" (e.g.
  "spawns"), containing one point object (named "spawn" if there are several
  objects in the layer — otherwise the first one is used).
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
