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

export const MAP_SIZE = 16;

export type TileType = 'grass' | 'town' | 'wall';

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
    spawn: { x: 1, y: 1 },
    townCenter: { x: 1, y: 1 },
  },
  cinderreach: {
    id: 'cinderreach',
    name: 'The Cinderreach',
    lore: 'A scorched stretch where the Ledger keeps its memory of courage — every fissure still warm to the touch.',
    element: 'fire',
    unlockLevel: 10,
    mapImage: '/maps/fire_new.webp',
    tiledMapPath: '/maps-tiled/cinderreach.json',
    spawn: { x: 1, y: 4 },
    townCenter: { x: 13, y: 2 },
  },
  tidewrit_shallows: {
    id: 'tidewrit_shallows',
    name: 'The Tidewrit Shallows',
    lore: 'Shallow water that never sits still — the Ledger\'s memory of change and feeling, rewritten with every tide.',
    element: 'water',
    unlockLevel: 10,
    mapImage: '/maps/water_new.webp',
    tiledMapPath: '/maps-tiled/tidewrit_shallows.json',
    spawn: { x: 1, y: 4 },
    townCenter: { x: 2, y: 13 },
  },
  rootbound_wilds: {
    id: 'rootbound_wilds',
    name: 'The Rootbound Wilds',
    lore: 'A slow, patient grove — the Ledger\'s memory of growth, kept safe behind rings of old bramble.',
    element: 'leaf',
    unlockLevel: 10,
    mapImage: '/maps/leaf_new.webp',
    tiledMapPath: '/maps-tiled/rootbound_wilds.json',
    spawn: { x: 4, y: 1 },
    townCenter: { x: 7, y: 2 },
  },
  stormrun_reaches: {
    id: 'stormrun_reaches',
    name: 'The Stormrun Reaches',
    lore: 'Open ground scattered with storm-thrown debris — the Ledger\'s memory of momentum and consequence.',
    element: 'storm',
    unlockLevel: 10,
    mapImage: '/maps/storm_new.webp',
    tiledMapPath: '/maps-tiled/stormrun_reaches.json',
    spawn: { x: 1, y: 4 },
    townCenter: { x: 13, y: 13 },
  },
  unread_margins: {
    id: 'unread_margins',
    name: 'The Unread Margins',
    lore: 'Narrow, half-lit corridors — the Ledger\'s memory of everything hidden or overlooked, waiting to be read.',
    element: 'shadow',
    unlockLevel: 10,
    mapImage: '/maps/shadow_new.webp',
    tiledMapPath: '/maps-tiled/unread_margins.json',
    spawn: { x: 1, y: 4 },
    townCenter: { x: 2, y: 13 },
  },
  radiant_archive: {
    id: 'radiant_archive',
    name: 'The Radiant Archive',
    lore: 'Bright shelving rows radiating from a single source — the Ledger\'s memory of everything proven true.',
    element: 'light',
    unlockLevel: 10,
    mapImage: '/maps/light_new.webp',
    tiledMapPath: '/maps-tiled/radiant_archive.json',
    spawn: { x: 4, y: 1 },
    townCenter: { x: 2, y: 2 },
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
