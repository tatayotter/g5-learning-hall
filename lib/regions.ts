// lib/regions.ts
// World Map region config — the 6 elemental regions plus "The Ledger's Heart"
// (the original, unfiltered Training Map). Elemental regions are placeholder
// content: hand-authored layouts + solid/gradient element-tinted backgrounds,
// swappable for real art later by only changing `mapImage` below.
//
// Walkability layouts are authored in Tiled (see public/maps-tiled/*.json,
// parsed by lib/tiledMap.ts) rather than hand-coded here — `tiledMapPath`
// below points TrainingMap.tsx at each region's map file.
import type { Element } from './monsterConfig';

// Historical default — every region used a fixed 16x16 grid until Ledger's
// Heart moved to a real-tile-art map with its own dimensions (see
// Region.mapWidth/mapHeight below, and lib/tiledArtMap.ts). Kept as the
// fallback for regions that don't override it.
export const MAP_SIZE = 16;

// 'path' is walkable like 'grass' but never rolls a wild-encounter question —
// see the "no encounter layer" convention in public/maps-tiled-art/README.md.
export type TileType = 'grass' | 'town' | 'wall' | 'path';

export interface MapTile {
  type: TileType;
}

export interface Region {
  id: string;
  name: string;
  lore: string;
  element: Element | 'all';
  unlockLevel: number;
  mapImage: string;
  tiledMapPath: string;
  spawn: { x: number; y: number };
  townCenter: { x: number; y: number };
  mapWidth: number;
  mapHeight: number;
  // Present only for regions rendered as real tile art (lib/tiledArtMap.ts)
  // instead of a single painted background image + logic-only Tiled layer.
  tileArtPath?: string;
  // The tile-art map is ground and paths only; trees, bushes, grass and flowers grow on it
  // fresh every day (lib/mapNature.ts).
  dailyNature?: boolean;
}

export const REGIONS: Record<string, Region> = {
  ledgers_heart: {
    id: 'ledgers_heart',
    name: "The Ledger's Heart",
    lore: 'Where every kind of memory still mixes freely — the world as it was before the watch-posts had to specialize.',
    element: 'all',
    unlockLevel: 1,
    mapImage: '/maps/ledgers_heart.webp',
    tiledMapPath: '/maps-tiled/ledgers_heart.json',
    spawn: { x: 30, y: 3 },
    townCenter: { x: 30, y: 3 },
    mapWidth: 60,
    mapHeight: 40,
    tileArtPath: '/maps-tiled-art/ledgers_heart/ledgers_heart.tmx',
    dailyNature: true,
  },
  // Rowil's town (2026-10-23): buildings, market stalls and a fountain square, through the gate at
  // the top of the Ledger's Heart's north road. A safe place: no wild curios here.
  town: {
    id: 'town',
    name: 'Inkwell Town',
    lore: 'The busy little town at the top of the Ledger\'s Heart, where tamers meet, trade and rest.',
    element: 'all',
    unlockLevel: 1,
    mapImage: '/maps/ledgers_heart.webp',
    tiledMapPath: '/maps-tiled/ledgers_heart.json',
    // Walking up the Ledger's Heart's north road, the kid arrives just inside the town's gate.
    spawn: { x: 29, y: 38 },
    townCenter: { x: 29, y: 38 },
    mapWidth: 60,
    mapHeight: 40,
    tileArtPath: '/maps-tiled-art/town/town.tmx',
    dailyNature: true,
  },
  // A kid's own island (lib/hideoutConfig.ts), bought at the signpost in Inkwell Town. Only its
  // owner goes there: no wild curios, no other players. Its bridge leads back to town.
  hideout: {
    id: 'hideout',
    name: 'My Hideout',
    lore: 'Your own little island, where your veggies grow and your curios rest.',
    element: 'all',
    unlockLevel: 1,
    mapImage: '/maps/ledgers_heart.webp',
    tiledMapPath: '/maps-tiled/ledgers_heart.json',
    spawn: { x: 32, y: 15 },
    townCenter: { x: 32, y: 15 },
    mapWidth: 40,
    mapHeight: 30,
    tileArtPath: '/maps-tiled-art/hideout/hideout.tmx',
    dailyNature: true,
  },
  cinderreach: {
    id: 'cinderreach',
    name: 'The Cinderreach',
    lore: 'A scorched stretch where the Ledger keeps its memory of courage — every fissure still warm to the touch.',
    element: 'fire',
    unlockLevel: 10,
    mapImage: '/maps/fire_new.webp',
    tiledMapPath: '/maps-tiled/cinderreach.json',
    // Rowil's flat map (2026-10-23): entered from the Ledger's Heart's west road, so the kid
    // arrives at the east entrance, the same height as that road.
    spawn: { x: 57, y: 11 },
    townCenter: { x: 57, y: 11 },
    mapWidth: 60,
    mapHeight: 40,
    tileArtPath: '/maps-tiled-art/cinderreach/cinderreach.tmx',
    dailyNature: true,
  },
  tidewrit_shallows: {
    id: 'tidewrit_shallows',
    name: 'The Tidewrit Shallows',
    lore: 'Shallow water that never sits still — the Ledger\'s memory of change and feeling, rewritten with every tide.',
    element: 'water',
    unlockLevel: 10,
    mapImage: '/maps/water_new.webp',
    tiledMapPath: '/maps-tiled/tidewrit_shallows.json',
    // Flat map (2026-10-23): a river, a bridge and a sandy coast. Entered from the Ledger's
    // Heart's lower west road, so the kid arrives at the east entrance on the same rows.
    spawn: { x: 57, y: 29 },
    townCenter: { x: 57, y: 29 },
    mapWidth: 60,
    mapHeight: 40,
    tileArtPath: '/maps-tiled-art/tidewrit/tidewrit.tmx',
    dailyNature: true,
  },
  rootbound_wilds: {
    id: 'rootbound_wilds',
    name: 'The Rootbound Wilds',
    lore: 'A slow, patient grove — the Ledger\'s memory of growth, kept safe behind rings of old bramble.',
    element: 'leaf',
    unlockLevel: 10,
    mapImage: '/maps/leaf_new.webp',
    tiledMapPath: '/maps-tiled/rootbound_wilds.json',
    // Flat map (2026-10-23): a high wood and a low wood split by a rocky ridge, a river that
    // drops over it in a waterfall. Entered from the Ledger's Heart's south road, so the kid
    // arrives at the top entrance on the same columns.
    spawn: { x: 22, y: 1 },
    townCenter: { x: 22, y: 1 },
    mapWidth: 60,
    mapHeight: 40,
    tileArtPath: '/maps-tiled-art/rootbound/rootbound.tmx',
    dailyNature: true,
  },
  stormrun_reaches: {
    id: 'stormrun_reaches',
    name: 'The Stormrun Reaches',
    lore: 'Open ground scattered with storm-thrown debris — the Ledger\'s memory of momentum and consequence.',
    element: 'storm',
    unlockLevel: 10,
    mapImage: '/maps/storm_new.webp',
    tiledMapPath: '/maps-tiled/stormrun_reaches.json',
    // Flat map (2026-10-23): a windswept heath with a rocky plateau, two tarns, stony debris
    // fields and a stone plaza. Entered from Ledger's Heart's south-east road, at the top.
    spawn: { x: 38, y: 1 },
    townCenter: { x: 38, y: 1 },
    mapWidth: 60,
    mapHeight: 40,
    tileArtPath: '/maps-tiled-art/stormrun/stormrun.tmx',
    dailyNature: true,
  },
  unread_margins: {
    id: 'unread_margins',
    name: 'The Unread Margins',
    lore: 'Narrow, half-lit corridors — the Ledger\'s memory of everything hidden or overlooked, waiting to be read.',
    element: 'shadow',
    unlockLevel: 10,
    mapImage: '/maps/shadow_new.webp',
    tiledMapPath: '/maps-tiled/unread_margins.json',
    // Flat map (2026-10-23): dim violet woods cut by narrow winding paths, hidden nooks and ink
    // pools. Entered from Ledger's Heart's east road (rows 32-34), on the west edge.
    spawn: { x: 1, y: 33 },
    townCenter: { x: 1, y: 33 },
    mapWidth: 60,
    mapHeight: 40,
    tileArtPath: '/maps-tiled-art/margins/margins.tmx',
    dailyNature: true,
  },
  radiant_archive: {
    id: 'radiant_archive',
    name: 'The Radiant Archive',
    lore: 'Bright shelving rows radiating from a single source — the Ledger\'s memory of everything proven true.',
    element: 'light',
    unlockLevel: 10,
    mapImage: '/maps/light_new.webp',
    tiledMapPath: '/maps-tiled/radiant_archive.json',
    // Flat map (2026-10-23): a golden meadow round a clear pool, paths radiating like sunbeams and
    // curved hedge rows like shelves. Entered from Ledger's Heart's north-east road (rows 6-8).
    mapWidth: 60,
    mapHeight: 40,
    spawn: { x: 1, y: 7 },
    townCenter: { x: 1, y: 7 },
    tileArtPath: '/maps-tiled-art/archive/archive.tmx',
    dailyNature: true,
  },
};

export const ELEMENT_COLOR: Record<Element, { from: string; to: string; text: string }> = {
  fire:   { from: '#7a2e12', to: '#c2410c', text: '#fdba74' },
  water:  { from: '#0c3a5c', to: '#0369a1', text: '#7dd3fc' },
  leaf:   { from: '#1c3d20', to: '#15803d', text: '#86efac' },
  storm:  { from: '#3b2e6b', to: '#7c3aed', text: '#c4b5fd' },
  shadow: { from: '#1a1425', to: '#3b0764', text: '#c084fc' },
  light:  { from: '#5c4a0c', to: '#ca8a04', text: '#fde047' },
};

// The 6 elemental regions, arranged for a radial world-map layout (ring
// positions around a centered "Ledger's Heart"), keyed by element for
// convenient lookup from WorldMap.
export const REGION_BY_ELEMENT: Record<Element, string> = {
  fire: 'cinderreach',
  water: 'tidewrit_shallows',
  leaf: 'rootbound_wilds',
  storm: 'stormrun_reaches',
  shadow: 'unread_margins',
  light: 'radiant_archive',
};
