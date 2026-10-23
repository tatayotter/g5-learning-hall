// lib/mapNature.ts
// The daily nature layer for tile-art maps drawn as ground and paths only (Rowil's plan,
// 2026-10-23): trees, bushes, rocks, flowers and tall grass are placed by code, and a new
// layout grows every day. The day (Manila time) and the region are the seed, so every kid
// sees the same map that day, online or offline, and the server can tell which day a tree
// belongs to from its id.
//
// Rules that keep the map playable:
// - Nothing on a path, and trees and bushes keep a tile away from them (canopies may hang over).
// - The spawn, portals, the Recycler, the wild veggies and any "Keep Clear" rects stay open.
// - Trees grow in clumps (a slow noise field), thicker near the map's edges and in "Forest"
//   rects, and neighbouring trees are mostly the same kind.
// - Tall grass grows in meadows, flowers and pebbles are sprinkled.
// - Afterwards every walkable tile must still be reachable from the spawn; any bush or tree
//   that closes off a pocket is taken away again.
//
// Trees aren't tiles: they're drawn by lib/phaserMap/wildTrees.ts (each one can be chopped,
// garden switch), and only their trunk tile is solid. Bushes go on Objects Base (solid);
// grass, flowers, pebbles and small rocks on Ground Detail (walkable).
import { REGION_TREES, type TreeId } from '@/lib/gardenConfig';

export interface NatureRect { x: number; y: number; width: number; height: number }

export interface NatureTree { id: string; tree: TreeId; x: number; y: number }

export interface NatureInput {
  regionId: string;
  day: string; // YYYY-MM-DD (natureDay)
  width: number;
  height: number;
  tileSize: number;
  ground: number[];
  detail: number[];
  base: number[];
  firstgid: Record<string, number>; // tileset name -> firstgid
  spawn: { x: number; y: number };
  portals: { x: number; y: number }[];
  recycler: { x: number; y: number } | null;
  reserved: { x: number; y: number }[]; // tiles that must stay free (wild veggies)
  keepClear: NatureRect[]; // pixels, from a "Keep Clear" object layer
  forest: NatureRect[]; // pixels, from a "Forest" object layer
  // Tiles where nothing may grow: cliffs, skirts, liquid, "collision" boxes.
  occupied?: boolean[];
  // Tiles nobody can walk on (liquid, "collision" boxes), for the reachability check.
  blocked?: boolean[];
}

export interface NatureOutput {
  trees: NatureTree[];
  detail: number[];
  base: number[];
  // The top row of each two-tall bush: drawn over the players and not solid, so a kid can walk
  // right up behind a bush (only its bottom row, where the leaves are, blocks).
  overhang: number[];
}

/** Today's map day, in the Philippines (the new layout grows at midnight there). */
export function natureDay(now = Date.now()): string {
  return new Date(now + 8 * 3600_000).toISOString().slice(0, 10);
}

export const natureTreeId = (day: string, x: number, y: number) => `${day}:${x}_${y}`;

// ── Seeded randomness ──────────────────────────────────────────────────────
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Smooth value noise in [0, 1): `scale` tiles between lattice points.
function noise(seed: number, scale: number) {
  const at = (ix: number, iy: number) => (hash(`${seed}:${ix}:${iy}`) % 10007) / 10007;
  return (x: number, y: number) => {
    const fx = x / scale, fy = y / scale;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}

// ── Stamps (tileset name, column, row, width, height in tiles) ─────────────
// Cut from the same tilesets the hand-made Ledger's Heart used.
type Stamp = { set: string; col: number; row: number; w: number; h: number };
const BUSHES: Stamp[] = [
  { set: 'Props', col: 22, row: 1, w: 2, h: 2 }, // green
  { set: 'Props', col: 22, row: 5, w: 2, h: 2 }, // orange
  { set: 'Props', col: 22, row: 7, w: 2, h: 2 }, // red
  { set: 'Props', col: 22, row: 9, w: 2, h: 2 }, // teal
];
const SMALL_BUSHES: Stamp[] = [
  { set: 'Props', col: 21, row: 1, w: 1, h: 2 }, // small green
  { set: 'Props', col: 20, row: 6, w: 1, h: 1 }, // small orange
];
const ROCKS: Stamp[] = [
  { set: 'Props', col: 0, row: 7, w: 2, h: 1 }, // sandy rock
  { set: 'Props', col: 2, row: 7, w: 1, h: 1 }, // small sandy rock
  { set: 'Props', col: 0, row: 9, w: 2, h: 1 }, // grey rock
  { set: 'Props', col: 0, row: 10, w: 1, h: 1 }, // grey pebbles
  { set: 'Props', col: 2, row: 10, w: 1, h: 1 }, // grey pebble
  { set: 'Props', col: 0, row: 8, w: 1, h: 1 }, // mushroom
];
const FLOWERS: Stamp[] = [
  { set: 'TileSet', col: 45, row: 1, w: 1, h: 1 },
  { set: 'TileSet', col: 46, row: 2, w: 1, h: 1 },
  { set: 'TileSet', col: 48, row: 2, w: 1, h: 1 },
];
// Tall-grass tufts (they sway: lib/phaserMap/swayingGrass.ts).
const TUFTS: Stamp[] = [18, 19, 20].map(col => ({ set: 'Trees', col, row: 11, w: 1, h: 1 }));
const COLUMNS: Record<string, number> = { TileSet: 64, 'TileSet-fire': 64, 'TileSet-tide': 64, Props: 32, Trees: 32, 'Town Props 2': 32, FireNature: 4, TideNature: 4 };

// What grows in each region. Ledger's Heart uses the pack's own plants; the elemental regions
// have their own trees (REGION_TREES) and plants drawn by Rowil (a small tileset per region,
// built by maps-incoming/fire-tiles/build_fire_nature.py and the like), thinner where the land
// is harsh.
interface Flora { bushes: Stamp[]; smallBushes: Stamp[]; rocks: Stamp[]; flowers: Stamp[]; tufts: Stamp[]; trees: number; meadow: number }
const FIRE_BUSH: Stamp = { set: 'FireNature', col: 0, row: 0, w: 2, h: 1 };
const FLORA: Record<string, Flora> = {
  ledgers_heart: { bushes: BUSHES, smallBushes: SMALL_BUSHES, rocks: ROCKS, flowers: FLOWERS, tufts: TUFTS, trees: 1, meadow: 0.62 },
  cinderreach: {
    bushes: [FIRE_BUSH], smallBushes: [FIRE_BUSH],
    rocks: ROCKS.slice(0, 5), // no mushrooms in the ash
    flowers: [{ set: 'FireNature', col: 3, row: 0, w: 1, h: 1 }],
    tufts: [{ set: 'FireNature', col: 2, row: 0, w: 1, h: 1 }],
    trees: 0.7, meadow: 0.7,
  },
  tidewrit_shallows: {
    bushes: [{ set: 'TideNature', col: 0, row: 0, w: 2, h: 1 }], // reeds
    smallBushes: SMALL_BUSHES,
    rocks: ROCKS.slice(0, 5),
    flowers: [{ set: 'TideNature', col: 3, row: 0, w: 1, h: 1 }],
    tufts: [{ set: 'TideNature', col: 2, row: 0, w: 1, h: 1 }, ...TUFTS],
    trees: 0.85, meadow: 0.66,
  },
};

// How many of each, on a 60 x 40 map (scaled by area).
const TREES_PER_2400 = 56;
const BUSHES_PER_2400 = 16;
const ROCKS_PER_2400 = 14;
const FLOWERS_PER_2400 = 60;

export function growNature(input: NatureInput): NatureOutput {
  const { width: W, height: H, ground, tileSize } = input;
  const idx = (x: number, y: number) => y * W + x;
  const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const detail = input.detail.slice();
  const base = input.base.slice();
  const seed = hash(`${input.regionId}:${input.day}`);
  const rand = rng(seed);
  const clump = noise(seed + 1, 7);
  const kindField = noise(seed + 2, 11);
  const meadow = noise(seed + 3, 6);
  const flora = FLORA[input.regionId] ?? FLORA.ledgers_heart;
  const KINDS = REGION_TREES[input.regionId] ?? REGION_TREES.ledgers_heart;
  // A stamp from a tileset the map doesn't have can't be drawn.
  const usable = (list: Stamp[]) => list.filter(st => input.firstgid[st.set] !== undefined);

  // Plain ground: the map's most common ground tile and its variants (tiles next to it on the
  // tileset sheet, like a 3x3 block of dirt drawn mixed together), with nothing drawn over it.
  const counts = new Map<number, number>();
  for (const g of ground) if (g) counts.set(g, (counts.get(g) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0][0];
  const sheet = (g: number) => {
    const [name, first] = Object.entries(input.firstgid).filter(([, f]) => f <= g).sort((a, b) => b[1] - a[1])[0] ?? ['', 1];
    const cols = COLUMNS[name] ?? 32;
    return { name, col: (g - first) % cols, row: Math.floor((g - first) / cols) };
  };
  const t0 = sheet(top);
  const plain = new Set(ranked.filter(([g, n]) => {
    if (g === top) return true;
    const t = sheet(g);
    return n >= ranked[0][1] * 0.1 && t.name === t0.name && Math.abs(t.col - t0.col) <= 2 && Math.abs(t.row - t0.row) <= 2;
  }).map(([g]) => g));
  const open = (x: number, y: number) => inMap(x, y) && plain.has(ground[idx(x, y)]) && !input.detail[idx(x, y)] && !input.base[idx(x, y)] && !input.occupied?.[idx(x, y)];

  // Distance (in tiles, 8-way) to the nearest path or other non-grass tile.
  const dist = new Array<number>(W * H).fill(Infinity);
  const queue: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!open(x, y)) { dist[idx(x, y)] = 0; queue.push(idx(x, y)); }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q], x = i % W, y = (i - x) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (!inMap(nx, ny) || dist[idx(nx, ny)] <= dist[i] + 1) continue;
      dist[idx(nx, ny)] = dist[i] + 1;
      queue.push(idx(nx, ny));
    }
  }

  // Tiles that stay open: around the spawn, portals, Recycler, veggies, and Keep Clear rects.
  const clear = new Uint8Array(W * H);
  const clearAround = (p: { x: number; y: number }, r: number) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inMap(p.x + dx, p.y + dy)) clear[idx(p.x + dx, p.y + dy)] = 1;
  };
  clearAround(input.spawn, 2);
  input.portals.forEach(p => clearAround(p, 2));
  if (input.recycler) clearAround(input.recycler, 2);
  input.reserved.forEach(p => clearAround(p, 1));
  const inRects = (rects: NatureRect[], x: number, y: number) => {
    const cx = (x + 0.5) * tileSize, cy = (y + 0.5) * tileSize;
    return rects.some(r => cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height);
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inRects(input.keepClear, x, y)) clear[idx(x, y)] = 1;

  const taken = new Uint8Array(W * H); // something placed here already
  const canopy = new Uint8Array(W * H); // under a tree's leaves
  const gid = (s: Stamp, dx: number, dy: number) => input.firstgid[s.set] + (s.row + dy) * COLUMNS[s.set] + s.col + dx;
  const fits = (s: Stamp, x: number, y: number, minDist: number, underLeaves: boolean) => {
    for (let dy = 0; dy < s.h; dy++) for (let dx = 0; dx < s.w; dx++) {
      const i = idx(x + dx, y + dy);
      if (!inMap(x + dx, y + dy) || !open(x + dx, y + dy) || dist[i] < minDist || clear[i] || taken[i] || (!underLeaves && canopy[i])) return false;
    }
    return true;
  };
  const stamp = (layer: number[], s: Stamp, x: number, y: number) => {
    for (let dy = 0; dy < s.h; dy++) for (let dx = 0; dx < s.w; dx++) {
      layer[idx(x + dx, y + dy)] = gid(s, dx, dy);
      taken[idx(x + dx, y + dy)] = 1;
    }
  };
  // Every open tile, in a seeded random order.
  const shuffled = () => {
    const cells: [number, number][] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cells.push([x, y]);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells;
  };
  const area = (W * H) / 2400;

  // ── Trees ──
  const trees: NatureTree[] = [];
  const treeTarget = Math.round(TREES_PER_2400 * area * flora.trees);
  const spaced = (x: number, y: number) => trees.every(t => Math.abs(t.x - x) >= 3 || Math.abs(t.y - y) >= 3);
  const treeChance = (x: number, y: number) => {
    const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
    let p = Math.max(0, clump(x, y) - 0.5) * 2.4;
    if (edge <= 2) p += 0.55;
    else if (edge <= 4) p += 0.2;
    if (inRects(input.forest, x, y)) p += 0.6;
    return p;
  };
  for (const [x, y] of shuffled()) {
    if (trees.length >= treeTarget) break;
    if (y < 1 || !open(x, y) || dist[idx(x, y)] < 2 || clear[idx(x, y)] || taken[idx(x, y)] || !spaced(x, y)) continue;
    if (rand() >= treeChance(x, y)) continue;
    // Neighbouring trees are mostly one kind; one in five is any kind.
    const k = rand() < 0.2 ? Math.floor(rand() * KINDS.length) : Math.min(KINDS.length - 1, Math.floor(kindField(x, y) * KINDS.length * 1.2) % KINDS.length);
    trees.push({ id: natureTreeId(input.day, x, y), tree: KINDS[k], x, y });
    taken[idx(x, y)] = 1;
    for (let dy = -3; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) if (inMap(x + dx, y + dy)) canopy[idx(x + dx, y + dy)] = 1;
  }

  // ── Bushes (bottom row solid, top row hangs over) ──
  const overhang = new Array<number>(W * H).fill(0);
  let bushes = 0;
  const bushTarget = Math.round(BUSHES_PER_2400 * area);
  const placedBushes: { s: Stamp; x: number; y: number }[] = [];
  for (const [x, y] of shuffled()) {
    if (bushes >= bushTarget) break;
    const big = usable(flora.bushes), small = usable(flora.smallBushes);
    if (!big.length || !small.length) break;
    const s = rand() < 0.7 ? big[Math.floor(rand() * big.length)] : small[Math.floor(rand() * small.length)];
    if (!fits(s, x, y, 1, false) || rand() > 0.35 + clump(x, y) * 0.5) continue;
    if (placedBushes.some(b => Math.abs(b.x - x) < 3 && Math.abs(b.y - y) < 3)) continue;
    stamp(base, s, x, y);
    for (let dy = 0; dy < s.h - 1; dy++) for (let dx = 0; dx < s.w; dx++) {
      overhang[idx(x + dx, y + dy)] = base[idx(x + dx, y + dy)];
      base[idx(x + dx, y + dy)] = input.base[idx(x + dx, y + dy)];
    }
    placedBushes.push({ s, x, y });
    bushes++;
  }

  // ── Tall grass meadows, rocks and flowers (walkable) ──
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (!open(x, y) || dist[i] < 1 || clear[i] || taken[i] || canopy[i]) continue;
    const tufts = usable(flora.tufts);
    if (tufts.length && meadow(x, y) > flora.meadow && rand() < 0.75) {
      detail[i] = gid(tufts[Math.floor(rand() * tufts.length)], 0, 0);
      taken[i] = 1;
    }
  }
  const sprinkle = (all: Stamp[], target: number) => {
    const stamps = usable(all);
    if (!stamps.length) return;
    let n = 0;
    for (const [x, y] of shuffled()) {
      if (n >= target) break;
      const s = stamps[Math.floor(rand() * stamps.length)];
      if (!fits(s, x, y, 1, true)) continue;
      stamp(detail, s, x, y);
      n++;
    }
  };
  sprinkle(flora.rocks, Math.round(ROCKS_PER_2400 * area));
  sprinkle(flora.flowers, Math.round(FLOWERS_PER_2400 * area * (flora === FLORA.ledgers_heart ? 1 : 0.5)));

  // ── Everything walkable must stay reachable from the spawn ──
  const solid = (x: number, y: number) => !!input.blocked?.[idx(x, y)] || !!input.base[idx(x, y)] || !!base[idx(x, y)] || trees.some(t => t.x === x && t.y === y);
  const solidOrig = (x: number, y: number) => !!input.blocked?.[idx(x, y)] || !!input.base[idx(x, y)];
  for (let round = 0; round < 50; round++) {
    const seen = new Uint8Array(W * H);
    const q = [idx(input.spawn.x, input.spawn.y)];
    seen[q[0]] = 1;
    for (let k = 0; k < q.length; k++) {
      const i = q[k], x = i % W, y = (i - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!inMap(nx, ny) || seen[idx(nx, ny)] || solid(nx, ny)) continue;
        seen[idx(nx, ny)] = 1;
        q.push(idx(nx, ny));
      }
    }
    // Shut-off tiles: take away the bushes and trees next to them.
    const stuck: [number, number][] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!seen[idx(x, y)] && !solid(x, y)) stuck.push([x, y]);
    if (stuck.length === 0) break;
    let removed = false;
    for (const [sx, sy] of stuck) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = sx + dx, ny = sy + dy;
        if (!inMap(nx, ny) || solidOrig(nx, ny)) continue;
        const t = trees.findIndex(tr => tr.x === nx && tr.y === ny);
        if (t >= 0) { trees.splice(t, 1); removed = true; continue; }
        const b = placedBushes.findIndex(pb => nx >= pb.x && nx < pb.x + pb.s.w && ny >= pb.y && ny < pb.y + pb.s.h);
        if (b >= 0) {
          const pb = placedBushes[b];
          for (let yy = 0; yy < pb.s.h; yy++) for (let xx = 0; xx < pb.s.w; xx++) {
            base[idx(pb.x + xx, pb.y + yy)] = input.base[idx(pb.x + xx, pb.y + yy)];
            overhang[idx(pb.x + xx, pb.y + yy)] = 0;
          }
          placedBushes.splice(b, 1);
          removed = true;
        }
      }
    }
    if (!removed) break; // shut off by the map's own walls: not ours to fix
  }

  // Trees further down the map draw over the ones above them.
  trees.sort((a, b) => a.y - b.y || a.x - b.x);
  return { trees, detail, base, overhang };
}
