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
import { useEffect, useRef, useState } from 'react';
import type { MapTile } from '@/lib/regions';
import { findPath } from '@/lib/mapPath';
import { MAP_WALK_TARGET_EVENT } from '@/lib/mapTap';

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
  // Walked into something solid; `tile` is the tile the player pushed against.
  onBlocked: (tile: Tile) => void;
  /** Additional tiles treated as walls (e.g. NPC positions). */
  extraBlockedTiles?: Tile[];
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
  // The touch joystick's push (components/monster/map/FloatingJoystick.tsx): any angle, length up
  // to 1; null when let go. Wins over held keys while set.
  setStick(v: { x: number; y: number } | null): void;
  // Tap-to-walk (Rowil 2026-10-28): walk around walls to the nearest of `goals` (or as close
  // as the kid can get), then call onArrive if a goal was reached. Any key or joystick push,
  // a new walk, or movement switching off cancels it (onArrive is then dropped).
  walkTo(goals: Tile[], onArrive?: () => void): void;
  cancelWalk(): void;
  resetTo(tile: Tile): void;
}

// Under this much sideways push the joystick keeps the sprite's facing (nearly straight up/down).
const FACE_TURN_MIN = 0.2;
// Following a route and not moving for this long (something stepped in the way): give up.
const STUCK_SEC = 0.3;

function isBlocked(
  map: MapTile[][], mapWidth: number, mapHeight: number,
  cx: number, cy: number,
  extraBlockedTiles?: Tile[],
): boolean {
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
      if (extraBlockedTiles?.some(t => t.x === tx && t.y === ty)) return true;
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
  const extraBlockedRef = useRef(opts.extraBlockedTiles);
  useEffect(() => { mapRef.current = opts.map; }, [opts.map]);
  useEffect(() => { mapWidthRef.current = opts.mapWidth; }, [opts.mapWidth]);
  useEffect(() => { mapHeightRef.current = opts.mapHeight; }, [opts.mapHeight]);
  useEffect(() => { onTileCrossedRef.current = onTileCrossed; }, [onTileCrossed]);
  useEffect(() => { onBlockedRef.current = onBlocked; }, [onBlocked]);
  useEffect(() => { extraBlockedRef.current = opts.extraBlockedTiles; }, [opts.extraBlockedTiles]);

  const posRef = useRef({ x: opts.initialTile.x + 0.5, y: opts.initialTile.y + 0.5 });
  const prevTileRef = useRef<Tile>({ x: opts.initialTile.x, y: opts.initialTile.y });
  const heldRef = useRef<Record<Direction, boolean>>({ up: false, down: false, left: false, right: false });
  const isMovingRef = useRef(false);
  const facingRightRef = useRef(false);
  const wasBlockedRef = useRef(false);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const stickRef = useRef<{ x: number; y: number } | null>(null);
  // The route being walked: tile-center points (smoothed), and what to do on arrival.
  const routeRef = useRef<{ points: { x: number; y: number }[]; reaches: boolean; onArrive?: () => void; stuck: number } | null>(null);
  const endRoute = (arrived: boolean) => {
    const route = routeRef.current;
    if (!route) return;
    routeRef.current = null;
    window.dispatchEvent(new CustomEvent(MAP_WALK_TARGET_EVENT, { detail: null }));
    if (arrived && route.reaches) route.onArrive?.();
  };
  const endRouteRef = useRef(endRoute);

  useEffect(() => {
    enabledRef.current = opts.enabled;
    if (!opts.enabled) {
      // Zero held-key/velocity state immediately — otherwise a key held down
      // at the exact moment movement gets disabled (e.g. a quiz opening)
      // would resume movement instantly on re-enable, before any new
      // keypress, since the browser never fired a keyup for it.
      heldRef.current = { up: false, down: false, left: false, right: false };
      stickRef.current = null;
      isMovingRef.current = false;
      endRouteRef.current(false);
    }
  }, [opts.enabled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_TO_DIR[e.key];
      if (dir) { heldRef.current[dir] = true; endRouteRef.current(false); }
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
      if (dx !== 0 && dy !== 0) {
        const inv = Math.SQRT1_2;
        dx *= inv; dy *= inv;
      }
      const stick = stickRef.current;
      if (stick) { dx = stick.x; dy = stick.y; }

      const map = mapRef.current;
      const mapWidth = mapWidthRef.current;
      const mapHeight = mapHeightRef.current;
      const pos = posRef.current;
      let step = SPEED_TILES_PER_SEC * dt;

      // No key or stick: follow the tap-to-walk route, if any, toward its next point.
      const route = dx === 0 && dy === 0 ? routeRef.current : null;
      if (route) {
        while (route.points.length && Math.hypot(route.points[0].x - pos.x, route.points[0].y - pos.y) < 0.02) route.points.shift();
        const next = route.points[0];
        if (next) {
          const ddx = next.x - pos.x, ddy = next.y - pos.y;
          const dist = Math.hypot(ddx, ddy);
          dx = ddx / dist; dy = ddy / dist;
          step = Math.min(step, dist);
        }
      }
      const hasInput = dx !== 0 || dy !== 0;
      // Only sideways input changes facing — going (nearly) straight up/down, or standing
      // still, keeps whatever direction was last faced.
      if (dx > FACE_TURN_MIN) facingRightRef.current = true;
      else if (dx < -FACE_TURN_MIN) facingRightRef.current = false;

      let moved = false;
      let pushedAgainst: Tile | null = null;
      if (dx !== 0) {
        const candidateX = pos.x + dx * step;
        if (!isBlocked(map, mapWidth, mapHeight, candidateX, pos.y, extraBlockedRef.current)) {
          pos.x = candidateX;
          moved = true;
        } else {
          pushedAgainst = { x: Math.floor(pos.x) + Math.sign(dx), y: Math.floor(pos.y) };
        }
      }
      if (dy !== 0) {
        const candidateY = pos.y + dy * step;
        if (!isBlocked(map, mapWidth, mapHeight, pos.x, candidateY, extraBlockedRef.current)) {
          pos.y = candidateY;
          moved = true;
        } else {
          pushedAgainst = { x: Math.floor(pos.x), y: Math.floor(pos.y) + Math.sign(dy) };
        }
      }

      isMovingRef.current = moved;

      // A route that runs into something (a bot or a closing gap) just stops, without the bump.
      const blockedNow = hasInput && !moved && !route;
      if (blockedNow && !wasBlockedRef.current && pushedAgainst) onBlockedRef.current(pushedAgainst);
      wasBlockedRef.current = blockedNow;

      const tileX = Math.floor(pos.x);
      const tileY = Math.floor(pos.y);
      const prev = prevTileRef.current;
      if (tileX !== prev.x || tileY !== prev.y) {
        const newTile = { x: tileX, y: tileY };
        prevTileRef.current = newTile;
        onTileCrossedRef.current(newTile, prev);
      }

      if (route && routeRef.current === route) {
        route.stuck = moved ? 0 : route.stuck + dt;
        if (!route.points.length) endRouteRef.current(true);
        else if (route.stuck > STUCK_SEC) endRouteRef.current(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
    // Started once — reads everything else via refs above.
  }, []);

  // Created once; its methods read the refs when called, never during render.
  const [handle] = useState<ContinuousMovementHandle>(() => ({
    getFloatPos: () => ({ x: posRef.current.x, y: posRef.current.y }),
    isMoving: () => isMovingRef.current,
    isFacingRight: () => facingRightRef.current,
    setDirectionPressed: (dir, pressed) => {
      heldRef.current[dir] = pressed;
      if (pressed) endRouteRef.current(false);
    },
    setStick: (v) => {
      stickRef.current = v;
      if (v) endRouteRef.current(false);
    },
    walkTo: (goals, onArrive) => {
      endRouteRef.current(false);
      if (!enabledRef.current || !goals.length) return;
      const map = mapRef.current, w = mapWidthRef.current, h = mapHeightRef.current;
      const extra = extraBlockedRef.current;
      const open = (x: number, y: number) =>
        x >= 0 && y >= 0 && x < w && y < h && map[y]?.[x]?.type !== 'wall' && !extra?.some(t => t.x === x && t.y === y);
      const pos = posRef.current;
      // Where the feet are is the tile the kid stands on.
      const start = { x: Math.floor(pos.x), y: Math.floor(pos.y + PLAYER_FOOTPRINT_OFFSET_Y) };
      const tiles = findPath(open, w, h, start, goals);
      const last = tiles[tiles.length - 1] ?? start;
      const reaches = goals.some(g => g.x === last.x && g.y === last.y);
      if (!tiles.length) {
        if (reaches) onArrive?.();
        return;
      }
      // Cut corners where the way is clear, so the walk is straight lines, not tile steps.
      const points = tiles.map(t => ({ x: t.x + 0.5, y: t.y + 0.5 }));
      const clear = (a: { x: number; y: number }, b: { x: number; y: number }) => {
        const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.05);
        for (let i = 1; i <= n; i++) {
          if (isBlocked(map, w, h, a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n, extra)) return false;
        }
        return true;
      };
      const smooth: { x: number; y: number }[] = [];
      let from = { x: pos.x, y: pos.y };
      for (let i = 0; i < points.length;) {
        let j = Math.min(points.length - 1, i + 16);
        while (j > i && !clear(from, points[j])) j--;
        smooth.push(points[j]);
        from = points[j];
        i = j + 1;
      }
      routeRef.current = { points: smooth, reaches, onArrive, stuck: 0 };
      window.dispatchEvent(new CustomEvent(MAP_WALK_TARGET_EVENT, { detail: last }));
    },
    cancelWalk: () => endRouteRef.current(false),
    resetTo: (tile: Tile) => {
      endRouteRef.current(false);
      posRef.current = { x: tile.x + 0.5, y: tile.y + 0.5 };
      prevTileRef.current = { x: tile.x, y: tile.y };
      isMovingRef.current = false;
      wasBlockedRef.current = false;
    },
  }));

  return handle;
}
