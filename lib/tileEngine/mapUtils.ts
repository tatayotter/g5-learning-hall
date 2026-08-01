// lib/tileEngine/mapUtils.ts
// Pure helpers for blank/resize/validate map data — shared by the editor's
// New/Resize/Import flows.
import { LAYER_IDS, type LayerId, type TileGrid, type TileMapData, type TileRef, type TileProperties, type TilePropertyMap } from './types';

// Keyed "col,row" for individual normal-tileset cells, or just the tileset
// id for an autotile (uniform across all of its blob-corner variants).
export function tilePropKey(ref: TileRef): string {
  return ref.col !== undefined ? `${ref.col},${ref.row}` : ref.tilesetId;
}

export function getTileProperties(
  tileProperties: Record<string, TilePropertyMap>, ref: TileRef | null,
): TileProperties | null {
  if (!ref) return null;
  return tileProperties[ref.tilesetId]?.[tilePropKey(ref)] ?? null;
}

export function blankLayers(width: number, height: number): Record<LayerId, TileGrid> {
  const make = (): TileGrid => Array.from({ length: height }, () => Array.from({ length: width }, () => null));
  return Object.fromEntries(LAYER_IDS.map(id => [id, make()])) as Record<LayerId, TileGrid>;
}

// Pads/crops each layer to the new dimensions, preserving overlapping
// content instead of wiping the grid outright.
export function resizeLayers(layers: Record<LayerId, TileGrid>, newWidth: number, newHeight: number): Record<LayerId, TileGrid> {
  const resized: Record<LayerId, TileGrid> = blankLayers(newWidth, newHeight);
  for (const layerId of LAYER_IDS) {
    const oldGrid = layers[layerId];
    for (let y = 0; y < Math.min(newHeight, oldGrid.length); y++) {
      for (let x = 0; x < Math.min(newWidth, oldGrid[y].length); x++) {
        resized[layerId][y][x] = oldGrid[y][x];
      }
    }
  }
  return resized;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function isValidTileMap(data: unknown): data is TileMapData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.width !== 'number' || typeof d.height !== 'number') return false;
  if (typeof d.backgroundImage !== 'string') return false;
  if (!d.layers || typeof d.layers !== 'object') return false;
  const layersObj = d.layers as Record<string, unknown>;
  for (const layerId of LAYER_IDS) {
    const grid = layersObj[layerId];
    if (!Array.isArray(grid) || grid.length !== d.height) return false;
    if (!grid.every((row: unknown) => Array.isArray(row) && row.length === d.width)) return false;
  }
  const spawn = d.spawn as Record<string, unknown> | undefined;
  const townCenter = d.townCenter as Record<string, unknown> | undefined;
  if (!spawn || typeof spawn.x !== 'number' || typeof spawn.y !== 'number') return false;
  if (!townCenter || typeof townCenter.x !== 'number' || typeof townCenter.y !== 'number') return false;
  return true;
}
