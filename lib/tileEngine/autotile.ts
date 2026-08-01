// lib/tileEngine/autotile.ts
// Corner-based "blob" autotiling — a standard, well-established technique
// (not tied to any proprietary format). Each rendered tile is composited
// from 4 quadrant corners (TL/TR/BL/BR), each looked up independently from a
// small source sheet based on which neighboring cells share the same
// autotile.
//
// Source sheet contract: a grid of (tileSize/2)-square cells, 5 columns
// (states 0-4 below) x 4 rows (corner roles, in the order TL, TR, BL, BR).
// E.g. at tileSize=32 the sheet is 80x64px (16px cells).
//
//   state(matchA, matchB, matchDiagonal):
//     0 — neither orthogonal neighbor matches      (isolated corner)
//     1 — only the "vertical" neighbor matches      (open horizontally)
//     2 — only the "horizontal" neighbor matches     (open vertically)
//     3 — both orthogonal neighbors match AND diagonal matches (filled interior)
//     4 — both orthogonal neighbors match but diagonal does NOT (concave notch)
//
// Out-of-bounds neighbors count as "not matching" — map edges render as
// natural blob edges.
import type { TileGrid } from './types';

export const AUTOTILE_STATE_COUNT = 5;
export const AUTOTILE_CORNER_ROLES = ['TL', 'TR', 'BL', 'BR'] as const;
export type CornerRole = (typeof AUTOTILE_CORNER_ROLES)[number];

export interface CornerCoord {
  col: number; // 0-4 (state)
  row: number; // 0-3 (corner role index)
}

function isSameAutotile(grid: TileGrid, x: number, y: number, autotileId: string): boolean {
  const row = grid[y];
  if (!row) return false;
  const cell = row[x];
  return cell?.tilesetId === autotileId && cell.col === undefined;
}

function cornerState(matchA: boolean, matchB: boolean, matchDiagonal: boolean): number {
  if (!matchA && !matchB) return 0;
  if (matchA && !matchB) return 1;
  if (!matchA && matchB) return 2;
  return matchDiagonal ? 3 : 4;
}

// Returns the 4 sheet coordinates (TL, TR, BL, BR, in that order) to
// composite for the tile at (x,y) painted with autotileId, given the full
// grid it belongs to (used to sample neighbors).
export function resolveAutotileCorners(grid: TileGrid, x: number, y: number, autotileId: string): [CornerCoord, CornerCoord, CornerCoord, CornerCoord] {
  const same = (dx: number, dy: number) => isSameAutotile(grid, x + dx, y + dy, autotileId);

  const north = same(0, -1), south = same(0, 1), east = same(1, 0), west = same(-1, 0);
  const nw = same(-1, -1), ne = same(1, -1), sw = same(-1, 1), se = same(1, 1);

  const tl: CornerCoord = { col: cornerState(north, west, nw), row: 0 };
  const tr: CornerCoord = { col: cornerState(north, east, ne), row: 1 };
  const bl: CornerCoord = { col: cornerState(south, west, sw), row: 2 };
  const br: CornerCoord = { col: cornerState(south, east, se), row: 3 };

  return [tl, tr, bl, br];
}
