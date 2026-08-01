// lib/tileEngine/tilesets.ts
// Registry of available tilesets. Two placeholder entries let the editor be
// fully exercised before real art exists — swap `image` (and, for the
// autotile, `label`/id if you want a second terrain) to real art later; the
// slicing/compositing logic is entirely data-driven off tileSize and the
// documented sheet contract in autotile.ts, no code changes needed.
import type { TilesetDef, TilePropertyMap } from './types';

export const TILESETS: Record<string, TilesetDef> = {
  grass_placeholder: {
    id: 'grass_placeholder',
    kind: 'autotile',
    label: 'Grass (placeholder)',
    image: '/tiles/autotile_grass_placeholder.svg',
    tileSize: 32,
  },
  props_placeholder: {
    id: 'props_placeholder',
    kind: 'normal',
    label: 'Props (placeholder)',
    image: '/tiles/normal_placeholder.svg',
    tileSize: 32,
    columns: 4,
    rows: 2,
  },
  rocks: {
    id: 'rocks',
    kind: 'normal',
    label: 'Rocks',
    image: '/tiles/rock1.png',
    tileSize: 32,
    columns: 1,
    rows: 1,
  },
  // Separate source files (not one sheet), so each gets its own single-tile
  // tileset entry — same pattern as `rocks`.
  flower1: {
    id: 'flower1', kind: 'normal', label: 'Flower 1',
    image: '/tiles/flower1.png', tileSize: 32, columns: 1, rows: 1,
  },
  flower2: {
    id: 'flower2', kind: 'normal', label: 'Flower 2',
    image: '/tiles/flower2.png', tileSize: 32, columns: 1, rows: 1,
  },
  flower3: {
    id: 'flower3', kind: 'normal', label: 'Flower 3',
    image: '/tiles/flower3.png', tileSize: 32, columns: 1, rows: 1,
  },
  tree1: {
    id: 'tree1', kind: 'normal', label: 'Tree 1',
    image: '/tiles/tree1.png', tileSize: 32, columns: 1, rows: 1,
    // Native art is 52x60 — taller/wider than one tile, so it renders at its
    // own aspect ratio anchored to the cell's bottom edge (canopy overflows
    // upward) instead of being squashed into a 32x32 square. See
    // NormalTileset.nativeSize in lib/tileEngine/types.ts.
    nativeSize: { width: 52, height: 60 },
  },
};

export const TILESET_LIST = Object.values(TILESETS);

// Seed defaults so the placeholder set is immediately usable — walls/water
// blocked, path/flowers walkable. Editable at runtime in the editor.
export const DEFAULT_TILE_PROPERTIES: Record<string, TilePropertyMap> = {
  grass_placeholder: {
    grass_placeholder: { walkable: true, encounterChance: 0.4 },
  },
  props_placeholder: {
    '0,0': { walkable: false },              // wall
    '1,0': { walkable: false },              // water
    '2,0': { walkable: true },               // path
    '3,0': { walkable: true, encounterChance: 0.55 }, // flowers
    '0,1': { walkable: false },
    '1,1': { walkable: false },
    '2,1': { walkable: true },
    '3,1': { walkable: true, encounterChance: 0.55 },
  },
  rocks: {
    '0,0': { walkable: false },
  },
  flower1: { '0,0': { walkable: true, encounterChance: 0.55 } },
  flower2: { '0,0': { walkable: true, encounterChance: 0.55 } },
  flower3: { '0,0': { walkable: true, encounterChance: 0.55 } },
  tree1: { '0,0': { walkable: false } },
};
