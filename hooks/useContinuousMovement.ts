// hooks/useContinuousMovement.ts
// Continuous free-pixel movement for the LOCAL player on the training map —
// replaces the old one-tile-per-keypress `move(dx,dy)` in TrainingMap.tsx.
// Owns held-key state and its own requestAnimationFrame loop, integrating an
// authoritative float position in a ref (never React state — TrainingMap.tsx
// is a heavy component, and a 60fps setState there would re-render the whole
// monster list / drawer / etc. every frame for no reason). Game logic that
// only needs to run once per tile crossed (footstep sound, encounter rolls,
// portal/town triggers, the Supabase write, presence) stays exactly where it
// was — this hook just calls back into it via `onTileCrossed` instead of it
// living inside a synchronous "move succeeded" branch.
//
// Multiplayer note: other players are NOT driven by this hook — they stay on
// the existing snap-on-presence-update path (see MapCanvas.tsx/TrainingMapScene.ts).
// This hook only ever represents the local player.
import { useEffect, useRef } from 'react';
import type { MapTile } from '@/lib/regions';

export type Direction = 'up' | 'down' | 'left' | 'right';

const SPEED_TILES_PER_SEC = 4;
// Player's collision footprint, in tiles — deliberately much smaller than
// the sprite's visual size, and offset downward, so collision roughly
// tracks just the character's legs/feet rather than their whole body
// (head/shoulders can visually overlap a wall/fence edge without blocking
// movement). The tracked position is the sprite's vertical CENTER (see
// ContinuousMovementHandle's getFloatPos doc), which sits around torso
// height — FOOTPRINT_OFFSET_Y shifts the collision box down from there
// toward where the feet actually render.
const PLAYER_FOOTPRINT_W = 0.2;
const PLAYER_FOOTPRINT_H = 0.16;
const PLAYER_FOOTPRINT_OFFSET_Y = 0.32;
const HALF_FOOTPRINT_W = PLAYER_FOOTPRINT_W / 2;
const HALF_FOOTPRINT_H = PLAYER_FOOTPRINT_H / 2;

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

interface Tile { x: number; y: number }

export interface ContinuousMovementOptions {
  map: MapTile[][];
  mapWidth: number;
  mapHeight: number;
  // false while a quiz overlay is open, or movement is otherwise locked.
  enabled: boolean;
  initialTile: Tile;
  onTileCrossed: (tile: Tile, prevTile: Tile) => void;
  onBlocked: () => void;
}

export interface ContinuousMovementHandle {
  // Tile-space, center-based float position (e.g. x=5.3 means 30% across
  // tile column 5) — matches the "sprite's visual center" convention used
  // throughout lib/phaserMap/TrainingMapScene.ts and MapCanvas.tsx.
  getFloatPos(): { x: number; y: number };
  isMoving(): boolean;
  // The walk-cycle art faces left as authored — true means the sprite
  // should be mirrored (facing right). Only updates while there's actual
  // horizontal input; holding straight up/down or standing still keeps
  // whatever direction was last faced, rather than snapping back to left.
  isFacingRight(): boolean;
  setDirectionPressed(dir: Direction, pressed: boolean): void;
  resetTo(tile: Tile): void;
}

function isBlocked(map: MapTile[][], mapWidth: number, mapHeight: number, cx: number, cy: number): boolean {
  // Sample all 4 corners of the footprint AABB — centered horizontally on
  // cx, but vertically offset down from cy (the sprite's center) toward
  // the feet.
  const fy = cy + PLAYER_FOOTPRINT_OFFSET_Y;
  const xs = [cx - HALF_FOOTPRINT_W, cx + HALF_FOOTPRINT_W];
  const ys = [fy - HALF_FOOTPRINT_H, fy + HALF_FOOTPRINT_H];
  for (const x of xs) {
    for (const y of ys) {
      const tx = Math.floor(x);
      const ty = Math.floor(y);
      if (tx < 0 || tx >= mapWidth || ty < 0 || ty >= mapHeight) return true;
      if (map[ty]?.[tx]?.type === 'wall') return true;
    }
  }
  return false;
}

export function useContinuousMovement(opts: ContinuousMovementOptions): ContinuousMovementHandle {
  const { onTileCrossed, onBlocked } = opts;

  // Latest-value refs so the rAF loop (started once) always reads current
  // data without needing to restart on every parent re-render.
  const mapRef = useRef(opts.map);
  const mapWidthRef = useRef(opts.mapWidth);
  const mapHeightRef = useRef(opts.mapHeight);
  const enabledRef = useRef(opts.enabled);
  const onTileCrossedRef = useRef(onTileCrossed);
  const onBlockedRef = useRef(onBlocked);
  useEffect(() => { mapRef.current = opts.map; }, [opts.map]);
  useEffect(() => { mapWidthRef.current = opts.mapWidth; }, [opts.mapWidth]);
  useEffect(() => { mapHeightRef.current = opts.mapHeight; }, [opts.mapHeight]);
  useEffect(() => { onTileCrossedRef.current = onTileCrossed; }, [onTileCrossed]);
  useEffect(() => { onBlockedRef.current = onBlocked; }, [onBlocked]);

  const posRef = useRef({ x: opts.initialTile.x + 0.5, y: opts.initialTile.y + 0.5 });
  const prevTileRef = useRef<Tile>({ x: opts.initialTile.x, y: opts.initialTile.y });
  const heldRef = useRef<Record<Direction, boolean>>({ up: false, down: false, left: false, right: false });
  const isMovingRef = useRef(false);
  const facingRightRef = useRef(false);
  const wasBlockedRef = useRef(false);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    enabledRef.current = opts.enabled;
    if (!opts.enabled) {
      // Zero held-key/velocity state immediately — otherwise a key held down
      // at the exact moment movement gets disabled (e.g. a quiz opening)
      // would resume movement instantly on re-enable, before any new
      // keypress, since the browser never fired a keyup for it.
      heldRef.current = { up: false, down: false, left: false, right: false };
      isMovingRef.current = false;
    }
  }, [opts.enabled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_TO_DIR[e.key];
      if (dir) heldRef.current[dir] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const dir = KEY_TO_DIR[e.key];
      if (dir) heldRef.current[dir] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const tick = (ts: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (lastTsRef.current === null) { lastTsRef.current = ts; return; }
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05); // clamp huge gaps (tab backgrounded)
      lastTsRef.current = ts;

      if (!enabledRef.current) return;

      const held = heldRef.current;
      let dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      let dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      const hasInput = dx !== 0 || dy !== 0;
      // Only horizontal input changes facing — holding straight up/down (or
      // standing still) keeps whatever direction was last faced.
      if (dx > 0) facingRightRef.current = true;
      else if (dx < 0) facingRightRef.current = false;
      if (dx !== 0 && dy !== 0) {
        const inv = Math.SQRT1_2;
        dx *= inv; dy *= inv;
      }

      const map = mapRef.current;
      const mapWidth = mapWidthRef.current;
      const mapHeight = mapHeightRef.current;
      const pos = posRef.current;
      const step = SPEED_TILES_PER_SEC * dt;

      let moved = false;
      if (dx !== 0) {
        const candidateX = pos.x + dx * step;
        if (!isBlocked(map, mapWidth, mapHeight, candidateX, pos.y)) {
          pos.x = candidateX;
          moved = true;
        }
      }
      if (dy !== 0) {
        const candidateY = pos.y + dy * step;
        if (!isBlocked(map, mapWidth, mapHeight, pos.x, candidateY)) {
          pos.y = candidateY;
          moved = true;
        }
      }

      isMovingRef.current = moved;

      const blockedNow = hasInput && !moved;
      if (blockedNow && !wasBlockedRef.current) onBlockedRef.current();
      wasBlockedRef.current = blockedNow;

      const tileX = Math.floor(pos.x);
      const tileY = Math.floor(pos.y);
      const prev = prevTileRef.current;
      if (tileX !== prev.x || tileY !== prev.y) {
        const newTile = { x: tileX, y: tileY };
        prevTileRef.current = newTile;
        onTileCrossedRef.current(newTile, prev);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
    // Started once — reads everything else via refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRef = useRef<ContinuousMovementHandle>({
    getFloatPos: () => ({ x: posRef.current.x, y: posRef.current.y }),
    isMoving: () => isMovingRef.current,
    isFacingRight: () => facingRightRef.current,
    setDirectionPressed: (dir, pressed) => { heldRef.current[dir] = pressed; },
    resetTo: (tile: Tile) => {
      posRef.current = { x: tile.x + 0.5, y: tile.y + 0.5 };
      prevTileRef.current = { x: tile.x, y: tile.y };
      isMovingRef.current = false;
      wasBlockedRef.current = false;
    },
  });

  return handleRef.current;
}
