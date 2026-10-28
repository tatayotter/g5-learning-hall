// lib/mapPath.ts
// Tap-to-walk route finding (Rowil 2026-10-28): A* over the map's tiles, 8 ways, never cutting a
// wall's corner (a diagonal needs both of its side tiles open, like a player's walk and
// lib/wander.ts). hooks/useContinuousMovement.ts follows the tiles it returns.

export interface Tile { x: number; y: number }

// Big enough to cross the largest map end to end; a route that needs more gives up.
const MAX_VISITS = 40000;

/**
 * Tiles from `start` (left out) to the nearest goal tile, or to the open tile closest to the
 * goals when none can be reached. Empty when already there or no step gets any closer.
 */
export function findPath(
  open: (x: number, y: number) => boolean,
  width: number,
  height: number,
  start: Tile,
  goals: Tile[],
): Tile[] {
  if (!goals.length) return [];
  const key = (x: number, y: number) => y * width + x;
  const goalKeys = new Set(goals.map(g => key(g.x, g.y)));
  // Octile distance to the nearest goal: exact on an open map, never too high.
  const h = (x: number, y: number) => {
    let best = Infinity;
    for (const g of goals) {
      const dx = Math.abs(g.x - x), dy = Math.abs(g.y - y);
      best = Math.min(best, Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy));
    }
    return best;
  };
  const startKey = key(start.x, start.y);
  const cost = new Map<number, number>([[startKey, 0]]);
  const from = new Map<number, number>();
  const closed = new Set<number>();
  // A small binary heap of [f, key].
  const heap: [number, number][] = [];
  const push = (f: number, k: number) => {
    heap.push([f, k]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
  const walk = (x: number, y: number) => inside(x, y) && open(x, y);

  push(h(start.x, start.y), startKey);
  let found: number | null = null;
  let closest = startKey, closestH = h(start.x, start.y);
  let visits = 0;
  while (heap.length && visits < MAX_VISITS) {
    const [, k] = pop();
    if (closed.has(k)) continue;
    closed.add(k);
    visits++;
    if (goalKeys.has(k)) { found = k; break; }
    const x = k % width, y = (k - x) / width;
    const hk = h(x, y);
    if (hk < closestH) { closest = k; closestH = hk; }
    const g = cost.get(k)!;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!walk(nx, ny)) continue;
      if (dx && dy && (!walk(nx, y) || !walk(x, ny))) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = g + (dx && dy ? Math.SQRT2 : 1);
      if (ng >= (cost.get(nk) ?? Infinity)) continue;
      cost.set(nk, ng);
      from.set(nk, k);
      push(ng + h(nx, ny), nk);
    }
  }
  let k = found ?? closest;
  const path: Tile[] = [];
  while (k !== startKey) {
    const x = k % width;
    path.push({ x, y: (k - x) / width });
    const p = from.get(k);
    if (p === undefined) return [];
    k = p;
  }
  return path.reverse();
}

/** The open tiles around (x, y) (the 8 beside it), for walking up to something you can't stand on. */
export function tilesAround(x: number, y: number, open: (x: number, y: number) => boolean, w = 1, h = 1): Tile[] {
  const out: Tile[] = [];
  for (let ty = y - 1; ty <= y + h; ty++) for (let tx = x - 1; tx <= x + w; tx++) {
    if (tx >= x && tx < x + w && ty >= y && ty < y + h) continue;
    if (open(tx, ty)) out.push({ x: tx, y: ty });
  }
  return out;
}
