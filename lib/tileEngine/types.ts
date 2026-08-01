// lib/tileEngine/types.ts
// Core data model for the RPG-Maker-XP-style tile map editor
// (components/admin/MapEditorSection.tsx). Square tiles, tileset-sheet-based
// (as opposed to the old per-region hand-authored MapTile[][] in lib/regions.ts),
// with full corner-based autotiling (see lib/tileEngine/autotile.ts) and 3
// stacked paint layers. Dev-only authoring format — export JSON, no runtime
// DB loading (see MapEditorSection.tsx header comment for the full rationale).
import type { Element } from '../monsterConfig';

// Canonical, unscaled tile size — 1 image pixel = 1 rendered pixel at 100%
// zoom. Editor/playtest zoom controls scale everything (including
// NormalTileset.nativeSize art) proportionally from this baseline, so
// Photoshop-side sizing against a 32px tile reference maps 1:1 here.
export const BASE_TILE_SIZE = 32;

export type TileKind = 'normal' | 'autotile';

export interface NormalTileset {
  id: string;
  kind: 'normal';
  label: string;
  image: string;
  tileSize: number;
  columns: number;
  rows: number;
  // Set only for a single (columns:1, rows:1) whole-image tile whose art is
  // taller/wider than one grid cell — e.g. a tree canopy that should overflow
  // upward rather than being squashed into a tileSize square. When present,
  // the tile renders at its native aspect ratio, width-fit to one cell and
  // anchored to the cell's bottom edge, instead of being grid-sliced.
  nativeSize?: { width: number; height: number };
}

export interface AutotileDef {
  id: string;
  kind: 'autotile';
  label: string;
  image: string;
  // Corner-sheet tile size (the size of one rendered tile once composited;
  // the source sheet's cells are tileSize/2 square — see autotile.ts).
  tileSize: number;
}

export type TilesetDef = NormalTileset | AutotileDef;

export interface TileProperties {
  walkable: boolean;
  encounterChance?: number;
}

// Keyed "col,row" for individual cells of a normal tileset, or just the
// tileset id for an autotile (walkability/encounter is uniform across all of
// an autotile's blob-corner variants — they're all the same terrain type).
export type TilePropertyMap = Record<string, TileProperties>;

export interface TileRef {
  tilesetId: string;
  // Omitted for autotile refs — appearance is computed from neighbors at
  // render time, not stored per-cell.
  col?: number;
  row?: number;
}

export type LayerId = 'decoration' | 'overhang';
export const LAYER_IDS: LayerId[] = ['decoration', 'overhang'];
export const LAYER_LABELS: Record<LayerId, string> = {
  decoration: 'Decoration',
  overhang: 'Overhang',
};

export type TileGrid = (TileRef | null)[][]; // [y][x]

export interface TileMapData {
  schemaVersion: 1;
  id: string;
  name: string;
  lore: string;
  element: Element | 'all';
  unlockLevel: number;
  tileSize: number;
  width: number;
  height: number;
  // Pre-painted ground/terrain/road art (e.g. /maps/whatever.png), stretched
  // to fill the tile grid canvas — same convention as Region.mapImage in
  // lib/regions.ts. Ground is no longer tile-painted; only decoration and
  // overhang remain paintable layers on top of this image.
  backgroundImage: string;
  layers: Record<LayerId, TileGrid>;
  spawn: { x: number; y: number };
  townCenter: { x: number; y: number };
  // Snapshot of tile properties in effect when this map was exported, keyed
  // by tilesetId then by the same col,row/tileset-id key used in
  // TilePropertyMap — lets an exported map round-trip its walkable/encounter
  // data without depending on the editor's in-memory state.
  tileProperties: Record<string, TilePropertyMap>;
}
