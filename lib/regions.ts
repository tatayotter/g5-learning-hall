// lib/regions.ts
// World Map region config — the 6 elemental regions plus "The Ledger's Heart"
// (the original, unfiltered Training Map). Elemental regions are placeholder
// content: hand-authored layouts + solid/gradient element-tinted backgrounds,
// swappable for real art later by only changing `mapImage` below.
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
  layout: MapTile[][];
  spawn: { x: number; y: number };
  townCenter: { x: number; y: number };
}

function grassGrid(): MapTile[][] {
  return Array.from({ length: MAP_SIZE }, () =>
    Array.from({ length: MAP_SIZE }, () => ({ type: 'grass' as TileType }))
  );
}

function withBorderWalls(map: MapTile[][]): MapTile[][] {
  for (let i = 0; i < MAP_SIZE; i++) {
    map[0][i] = { type: 'wall' };
    map[MAP_SIZE - 1][i] = { type: 'wall' };
    map[i][0] = { type: 'wall' };
    map[i][MAP_SIZE - 1] = { type: 'wall' };
  }
  return map;
}

function withTown(map: MapTile[][], topLeftX: number, topLeftY: number): MapTile[][] {
  for (let y = topLeftY; y < topLeftY + 3; y++) {
    for (let x = topLeftX; x < topLeftX + 3; x++) {
      map[y][x] = { type: 'town' };
    }
  }
  return map;
}

// A short interior wall segment, e.g. [[x,y], [x,y], ...] — kept simple
// (straight/L-shaped runs) since these are placeholder layouts meant to feel
// structurally distinct from each other, not intricate mazes.
function withWallSegment(map: MapTile[][], cells: [number, number][]): MapTile[][] {
  for (const [x, y] of cells) {
    if (x > 0 && x < MAP_SIZE - 1 && y > 0 && y < MAP_SIZE - 1) {
      map[y][x] = { type: 'wall' };
    }
  }
  return map;
}

// The Cinderreach (fire) — a jagged diagonal fissure splitting the region,
// town tucked in the top-right corner.
function buildCinderreachLayout(): MapTile[][] {
  let map = withBorderWalls(grassGrid());
  map = withTown(map, 12, 1);
  const fissure: [number, number][] = [];
  for (let i = 2; i < 13; i++) fissure.push([i, i]);
  return withWallSegment(map, fissure);
}

// The Tidewrit Shallows (water) — a river-like wall band curving across the
// middle, town on the bottom-left shore.
function buildTidewritShallowsLayout(): MapTile[][] {
  let map = withBorderWalls(grassGrid());
  map = withTown(map, 1, 12);
  const river: [number, number][] = [];
  for (let x = 1; x < 15; x++) {
    const y = 6 + Math.round(Math.sin(x / 2.5) * 2);
    river.push([x, y]);
  }
  return withWallSegment(map, river);
}

// The Rootbound Wilds (leaf) — a ring of bramble walls enclosing a central
// grove, town centered at the top.
function buildRootboundWildsLayout(): MapTile[][] {
  let map = withBorderWalls(grassGrid());
  map = withTown(map, 6, 1);
  const ring: [number, number][] = [];
  for (let i = 4; i <= 11; i++) {
    ring.push([i, 4], [i, 11], [4, i], [11, i]);
  }
  return withWallSegment(map, ring);
}

// The Stormrun Reaches (storm) — scattered wall clusters like storm-thrown
// debris, town in the bottom-right.
function buildStormrunReachesLayout(): MapTile[][] {
  let map = withBorderWalls(grassGrid());
  map = withTown(map, 12, 12);
  const debris: [number, number][] = [
    [2, 3], [3, 3], [2, 4],
    [7, 6], [8, 6], [8, 7],
    [4, 9], [4, 10], [5, 10],
    [10, 3], [10, 4], [11, 4],
    [6, 13], [7, 13],
  ];
  return withWallSegment(map, debris);
}

// The Unread Margins (shadow) — narrow corridor walls like the margins of a
// closed book, town hidden in the bottom-left.
function buildUnreadMarginsLayout(): MapTile[][] {
  let map = withBorderWalls(grassGrid());
  map = withTown(map, 1, 12);
  const margins: [number, number][] = [];
  for (let y = 2; y < 14; y += 3) {
    for (let x = 3; x < 13; x++) margins.push([x, y]);
  }
  return withWallSegment(map, margins);
}

// The Radiant Archive (light) — a symmetric cross of shelving walls radiating
// from the center, town at the top-left.
function buildRadiantArchiveLayout(): MapTile[][] {
  let map = withBorderWalls(grassGrid());
  map = withTown(map, 1, 1);
  const shelves: [number, number][] = [];
  for (let i = 3; i < 13; i++) shelves.push([i, 8], [8, i]);
  return withWallSegment(map, shelves);
}

export const REGIONS: Record<string, Region> = {
  ledgers_heart: {
    id: 'ledgers_heart',
    name: "The Ledger's Heart",
    lore: 'Where every kind of memory still mixes freely — the world as it was before the watch-posts had to specialize.',
    element: 'all',
    unlockLevel: 1,
    mapImage: '/maps/map-1.webp',
    layout: [], // unused — TrainingMap always uses the original buildMap() for this region
    spawn: { x: 1, y: 1 },
    townCenter: { x: 1, y: 1 },
  },
  cinderreach: {
    id: 'cinderreach',
    name: 'The Cinderreach',
    lore: 'A scorched stretch where the Ledger keeps its memory of courage — every fissure still warm to the touch.',
    element: 'fire',
    unlockLevel: 10,
    mapImage: '/regions/cinderreach.webp',
    layout: buildCinderreachLayout(),
    spawn: { x: 1, y: 4 },
    townCenter: { x: 13, y: 2 },
  },
  tidewrit_shallows: {
    id: 'tidewrit_shallows',
    name: 'The Tidewrit Shallows',
    lore: 'Shallow water that never sits still — the Ledger\'s memory of change and feeling, rewritten with every tide.',
    element: 'water',
    unlockLevel: 10,
    mapImage: '/regions/tidewrit_shallows.webp',
    layout: buildTidewritShallowsLayout(),
    spawn: { x: 1, y: 4 },
    townCenter: { x: 2, y: 13 },
  },
  rootbound_wilds: {
    id: 'rootbound_wilds',
    name: 'The Rootbound Wilds',
    lore: 'A slow, patient grove — the Ledger\'s memory of growth, kept safe behind rings of old bramble.',
    element: 'leaf',
    unlockLevel: 10,
    mapImage: '/regions/rootbound_wilds.webp',
    layout: buildRootboundWildsLayout(),
    spawn: { x: 4, y: 1 },
    townCenter: { x: 7, y: 2 },
  },
  stormrun_reaches: {
    id: 'stormrun_reaches',
    name: 'The Stormrun Reaches',
    lore: 'Open ground scattered with storm-thrown debris — the Ledger\'s memory of momentum and consequence.',
    element: 'storm',
    unlockLevel: 10,
    mapImage: '/regions/stormrun_reaches.webp',
    layout: buildStormrunReachesLayout(),
    spawn: { x: 1, y: 4 },
    townCenter: { x: 13, y: 13 },
  },
  unread_margins: {
    id: 'unread_margins',
    name: 'The Unread Margins',
    lore: 'Narrow, half-lit corridors — the Ledger\'s memory of everything hidden or overlooked, waiting to be read.',
    element: 'shadow',
    unlockLevel: 10,
    mapImage: '/regions/unread_margins.webp',
    layout: buildUnreadMarginsLayout(),
    spawn: { x: 1, y: 4 },
    townCenter: { x: 2, y: 13 },
  },
  radiant_archive: {
    id: 'radiant_archive',
    name: 'The Radiant Archive',
    lore: 'Bright shelving rows radiating from a single source — the Ledger\'s memory of everything proven true.',
    element: 'light',
    unlockLevel: 10,
    mapImage: '/regions/radiant_archive.webp',
    layout: buildRadiantArchiveLayout(),
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
