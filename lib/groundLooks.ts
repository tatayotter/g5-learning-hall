// lib/groundLooks.ts
// How each region's plain ground (the flat grass, ash or moss with no path on it) is textured,
// all made in code: big soft patches, little marks scattered in clumps, cracks, sand ripples.
// lib/phaserMap/groundTexture.ts paints them, only over the ground's one flat colour, so paths,
// edges, water and anything drawn on the ground stay exactly as they were drawn.
//
// No Phaser here, so it can be painted outside the game too (preview renders).

export type RGB = [number, number, number];

// A little pixel stamp: one string per row, '.' = leave the ground, a letter = that colour.
export interface Marks {
  stamps: string[];
  colors: Record<string, RGB>;
  every: number; // one try per square this many pixels across
  chance: number; // ...that puts a stamp there
  clump?: number; // they gather in clumps this big (px), with bare ground between
  on?: 'ground' | 'extra'; // the flat ground (default), or the region's extra colour
  nearExtra?: number; // only within this many px of the extra colour (sand grains by the beach)
}

export interface GroundLook {
  // Big soft patches: darker where the noise is low, lighter where it's high. Their edges are
  // dithered pixel by pixel, so they never look like tiles or circles.
  patches?: {
    scale: number; // px across a patch
    stretch?: number; // longer along `angle` than across (wind-swept), 1 = round
    angle?: number; // radians, the long way
    darker?: [number, RGB]; // under this noise value (0..1)
    dark?: [number, RGB];
    light?: [number, RGB]; // over this value
    lighter?: [number, RGB];
  };
  marks?: Marks[];
  // Thin wandering cracks, with a lit lower lip and, now and then, a glowing ember in them.
  cracks?: { every: number; chance: number; length: [number, number]; color: RGB; lip: RGB; ember?: RGB };
  // A second flat colour to treat (Tidewrit's beach sand), with wind ripples drawn on it.
  extra?: { color: RGB; ripples?: { period: number; dark: RGB; light: RGB } };
}

const BLADES = {
  stamps: ['d\nd', 'd.d\n.d.', 'l\nd', '.l.\nd.d', 'd'],
  colors: { d: [106, 113, 59], l: [150, 152, 87] } as Record<string, RGB>,
};

// Ledger's Heart and Inkwell Town: a mown meadow. Lighter and darker patches of grass, short
// blades in clumps, a few tiny white and yellow flowers and pebbles.
const MEADOW: GroundLook = {
  patches: { scale: 110, dark: [0.38, [119, 124, 67]], light: [0.63, [138, 141, 79]], lighter: [0.8, [146, 147, 84]] },
  marks: [
    { ...BLADES, every: 6, chance: 0.55, clump: 44 },
    { stamps: ['w', 'y', 'w\ng'], colors: { w: [226, 222, 190], y: [214, 198, 104], g: [104, 112, 58] }, every: 22, chance: 0.22, clump: 70 },
    { stamps: ['hm\nmd', 'hm', 'h\nd'], colors: { h: [166, 162, 130], m: [140, 138, 106], d: [98, 101, 62] }, every: 44, chance: 0.3 },
  ],
};

export const GROUND_LOOKS: Record<string, GroundLook> = {
  ledgers_heart: MEADOW,
  town: MEADOW,

  // A kid's Hideout island: the meadow grass, with Tidewrit's beach (sand blown onto the grass,
  // ripples and shell bits on the sand).
  hideout: {
    ...MEADOW,
    marks: [
      ...MEADOW.marks!,
      { stamps: ['s', 's.s', 's\n.s'], colors: { s: [196, 180, 124] }, every: 5, chance: 0.6, nearExtra: 26 },
      { stamps: ['p', 'w', 'wp'], colors: { p: [238, 206, 196], w: [250, 244, 228] }, every: 24, chance: 0.25, on: 'extra' },
    ],
    extra: { color: [226, 202, 152], ripples: { period: 9, dark: [211, 186, 137], light: [235, 215, 168] } },
  },

  // Cinderreach: scorched, cracked ash. Burnt patches, cracks with an ember glowing in a few,
  // grey ash specks and little stones.
  cinderreach: {
    patches: { scale: 70, darker: [0.22, [88, 61, 50]], dark: [0.38, [98, 68, 56]], light: [0.68, [116, 84, 69]], lighter: [0.86, [124, 96, 84]] },
    cracks: { every: 30, chance: 0.5, length: [12, 34], color: [64, 43, 39], lip: [124, 90, 74], ember: [228, 108, 38] },
    marks: [
      { stamps: ['a', 'a.a', 'a\n.a'], colors: { a: [146, 134, 126] }, every: 6, chance: 0.2, clump: 40 },
      { stamps: ['hm\nmd', 'hm'], colors: { h: [142, 114, 98], m: [116, 86, 72], d: [68, 47, 42] }, every: 30, chance: 0.3 },
    ],
  },

  // Tidewrit: dune grass combed flat by the sea breeze (long patches and streaks running along
  // the wind), sand blown onto the grass near the beach, and ripples and shell bits on the sand.
  tidewrit_shallows: {
    patches: { scale: 60, stretch: 4, angle: 0.12, dark: [0.38, [116, 122, 66]], light: [0.64, [141, 142, 80]] },
    marks: [
      { stamps: ['llll', 'lll', 'lllll', 'dddd'], colors: { l: [150, 150, 90], d: [110, 116, 62] }, every: 9, chance: 0.45, clump: 50 },
      { stamps: ['s', 's.s', 's\n.s'], colors: { s: [196, 180, 124] }, every: 5, chance: 0.6, nearExtra: 26 },
      { stamps: ['p', 'w', 'wp'], colors: { p: [238, 206, 196], w: [250, 244, 228] }, every: 24, chance: 0.25, on: 'extra' },
    ],
    extra: { color: [226, 202, 152], ripples: { period: 9, dark: [211, 186, 137], light: [235, 215, 168] } },
  },

  // Rootbound: thick jungle moss with deep shady hollows and fallen leaves in piles.
  rootbound_wilds: {
    patches: { scale: 60, darker: [0.2, [71, 119, 53]], dark: [0.38, [79, 129, 59]], light: [0.7, [96, 146, 69]] },
    marks: [
      { stamps: ['gG', 'G.\n.g', 'yY', 'bB', '.y\nY.', 'g\nG'], colors: { g: [118, 158, 66], G: [96, 136, 52], y: [152, 150, 62], Y: [126, 124, 50], b: [134, 102, 58], B: [108, 82, 48] }, every: 7, chance: 0.5, clump: 30 },
      { stamps: ['d', 'dd'], colors: { d: [64, 108, 47] }, every: 5, chance: 0.2, clump: 22 },
    ],
  },

  // Stormrun: grass flattened by the storm wind, all leaning one way, in long diagonal streaks,
  // with grey stones.
  stormrun_reaches: {
    patches: { scale: 80, stretch: 3, angle: -0.4, dark: [0.38, [78, 118, 96]], light: [0.64, [99, 141, 117]] },
    marks: [
      { stamps: ['..l\n.l.\nd..', '.l\nd.', '...l\n.ll.\nd...'], colors: { l: [113, 153, 127], d: [70, 106, 88] }, every: 6, chance: 0.45, clump: 36 },
      { stamps: ['hm\nmd', 'm', 'hm'], colors: { h: [152, 148, 142], m: [124, 120, 114], d: [66, 90, 80] }, every: 30, chance: 0.35 },
    ],
  },

  // The Unread Margins: shadowy ground with ink pooled in blots, faint scribbles and a few
  // glowing motes.
  unread_margins: {
    patches: { scale: 64, darker: [0.16, [54, 51, 86]], dark: [0.32, [61, 59, 95]], light: [0.74, [76, 74, 111]] },
    marks: [
      { stamps: ['l.l\n.l.\nl..', 'll\n.l\nll', 'l.\nll\n.l', 'lll\n..l'], colors: { l: [87, 83, 127] }, every: 11, chance: 0.35, clump: 46 },
      { stamps: ['d', '.d.\ndDd\n.d.'], colors: { d: [52, 49, 84], D: [40, 37, 70] }, every: 16, chance: 0.3 },
      { stamps: ['g'], colors: { g: [150, 140, 206] }, every: 30, chance: 0.2 },
    ],
  },

  // The Radiant Archive: sunlit grass with bright dapples of light, gold flecks and sparkles.
  radiant_archive: {
    patches: { scale: 80, dark: [0.36, [173, 187, 76]], light: [0.62, [193, 203, 93]], lighter: [0.8, [202, 210, 104]] },
    marks: [
      { stamps: ['d\nd', 'd.d\n.d.', 'd'], colors: { d: [160, 176, 66] }, every: 7, chance: 0.35, clump: 40 },
      { stamps: ['y', 'y.y'], colors: { y: [236, 216, 110] }, every: 9, chance: 0.3, clump: 60 },
      { stamps: ['.w.\nwWw\n.w.'], colors: { w: [226, 224, 150], W: [252, 246, 200] }, every: 34, chance: 0.25 },
    ],
  },
};

// ── Painting ─────────────────────────────────────────────────────────────────────────────────

function hash(x: number, y: number, seed: number) {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 2246822519, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// Three octaves, spread back out to roughly 0..1.
function fbm(x: number, y: number, seed: number) {
  const v = valueNoise(x, y, seed) * 0.57 + valueNoise(x * 2.1, y * 2.1, seed + 1) * 0.29 + valueNoise(x * 4.3, y * 4.3, seed + 2) * 0.14;
  return Math.min(1, Math.max(0, (v - 0.5) * 1.7 + 0.5));
}

// Noise read off a coarse grid (one sample every `step` px, blended between, coarser for bigger
// shapes): cheap enough to cover a whole map on a phone.
function noiseField(W: number, H: number, scale: number, seed: number, stretch = 1, angle = 0) {
  const GRID = scale < 40 ? 4 : scale < 90 ? 8 : 16;
  const gw = Math.ceil(W / GRID) + 2, gh = Math.ceil(H / GRID) + 2;
  const g = new Float32Array(gw * gh);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = i * GRID, y = j * GRID;
    const u = (x * cos + y * sin) / (scale * stretch), v = (y * cos - x * sin) / scale;
    g[j * gw + i] = fbm(u, v, seed);
  }
  const at = (x: number, y: number) => {
    const fx = x / GRID, fy = y / GRID;
    const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
    const k = j * gw + i;
    const a = g[k], b = g[k + 1], c = g[k + gw], d = g[k + gw + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
  return Object.assign(at, { grid: g, gw, step: GRID });
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const DITHER = 0.05; // the noise range over which one patch dithers into the next

// A colour as the 32-bit pixel it is in RGBA canvas data (little-endian: A B G R from the top).
function pack(c: RGB) {
  return ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
}

function seedOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 100000;
}

// The colour most of the ground is (sampled), as 0xRRGGBB, and how much of it there is (0..1).
export function flatColor(px: Uint8ClampedArray) {
  const counts = new Map<number, number>();
  let n = 0;
  for (let i = 0; i < px.length; i += 4 * 7) {
    if (px[i + 3] !== 255) continue;
    const c = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
    counts.set(c, (counts.get(c) ?? 0) + 1);
    n++;
  }
  let best = -1, most = 0;
  for (const [c, k] of counts) if (k > most) { best = c; most = k; }
  return { color: best, share: n ? most / n : 0 };
}

// Takes the map's ground drawn flat (RGBA, W x H) and overwrites it with the texture to lay over
// it: see-through everywhere except the textured pixels of the plain ground. False (and the
// pixels left as they were) when there's nothing to texture.
export function paintGround(px: Uint8ClampedArray, W: number, H: number, look: GroundLook, seedName: string): boolean {
  const steps = paintGroundSteps(px, W, H, look, seedName);
  for (;;) {
    const r = steps.next();
    if (r.done) return r.value;
  }
}

// The same, a strip at a time: it pauses (yields) every few milliseconds' worth of work, so the
// game can spread it over several frames instead of stalling one.
export function* paintGroundSteps(px: Uint8ClampedArray, W: number, H: number, look: GroundLook, seedName: string): Generator<void, boolean> {
  const { color, share } = flatColor(px);
  if (color < 0 || share < 0.15) return false;
  const seed = seedOf(seedName);
  const extra = look.extra ? (look.extra.color[0] << 16) | (look.extra.color[1] << 8) | look.extra.color[2] : -1;
  // 1 = the plain ground, 2 = the extra colour (sand), 0 = anything else.
  const px32 = new Uint32Array(px.buffer, px.byteOffset, W * H);
  const flat = pack([color >> 16, (color >> 8) & 255, color & 255]), sand = extra < 0 ? -1 : pack([extra >> 16, (extra >> 8) & 255, extra & 255]);
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < mask.length; i++) {
    const c = px32[i];
    mask[i] = c === flat ? 1 : c === sand ? 2 : 0;
  }
  px.fill(0);
  const set = (i: number, c: RGB) => { px32[i] = pack(c); };

  // Patches, dithered into each other. Worked out a grid square (GRID px) at a time: where the
  // whole square is clearly inside one band it's filled straight away, and only the squares a
  // band's edge runs through are worked out pixel by pixel.
  const pt = look.patches;
  if (pt) {
    const field = noiseField(W, H, pt.scale, seed, pt.stretch, pt.angle);
    // Darkest first, then lightest first; a band wins once the noise is past its threshold (by
    // the dither's share, so the edge breaks up pixel by pixel).
    const bands = ([[pt.darker, -1], [pt.dark, -1], [pt.lighter, 1], [pt.light, 1]] as const)
      .filter(([b]) => b)
      .map(([b, sign]) => ({ t: b![0], c: pack(b![1]), sign }));
    const nb = bands.length;
    const bandAt = (v: number, off: number) => {
      for (let k = 0; k < nb; k++) if ((v - bands[k].t) * bands[k].sign > off) return k;
      return -1;
    };
    const { grid, gw, step: GRID } = field;
    const half = DITHER / 2;
    for (let j = 0; j * GRID < H; j++, yield) for (let i = 0; i * GRID < W; i++) {
      const k = j * gw + i;
      const a = grid[k], b = grid[k + 1], c = grid[k + gw], d = grid[k + gw + 1];
      const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
      const band = bandAt(lo, -half);
      const same = band === bandAt(lo, half) && band === bandAt(hi, -half) && band === bandAt(hi, half);
      const x0 = i * GRID, y0 = j * GRID, x1 = Math.min(W, x0 + GRID), y1 = Math.min(H, y0 + GRID);
      if (same && band < 0) continue;
      for (let y = y0; y < y1; y++) {
        const row = (y & 3) * 4;
        for (let x = x0; x < x1; x++) {
          const p = y * W + x;
          if (mask[p] !== 1) continue;
          const kk = same ? band : bandAt(field(x, y), (BAYER[row + (x & 3)] - 0.5) * DITHER);
          if (kk >= 0) px32[p] = bands[kk].c;
        }
      }
    }
  }

  // Sand ripples: wavy lines across the sand, broken up so they come and go.
  const rp = look.extra?.ripples;
  if (rp) {
    const wave = noiseField(W, H, 40, seed + 7);
    const gaps = noiseField(W, H, 30, seed + 8);
    for (let y = 0; y < H; y++) {
      if ((y & 15) === 0) yield;
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (mask[i] !== 2 || gaps(x, y) < 0.5) continue;
        const n = wave(x, y);
        const v = y + 2.5 * Math.sin(x * 0.11 + n * 5) + n * 9;
        const m = ((v % rp.period) + rp.period) % rp.period;
        if (m < 1) set(i, rp.dark);
        else if (m < 2) set(i, rp.light);
      }
    }
  }

  // Cracks: short wandering lines that fork now and then, stopping where the plain ground ends.
  const ck = look.cracks;
  if (ck) {
    let s = seed + 50;
    const rnd = () => hash(s++, 3, seed);
    const walk = (x: number, y: number, dir: number, len: number, depth: number) => {
      for (let k = 0; k < len; k++) {
        dir += (rnd() - 0.5) * 0.9;
        x += Math.cos(dir);
        y += Math.sin(dir) * 0.8;
        const ix = Math.round(x), iy = Math.round(y);
        if (ix < 0 || iy < 0 || ix >= W || iy >= H - 1 || mask[iy * W + ix] !== 1) return;
        const i = iy * W + ix;
        set(i, ck.ember && rnd() < 0.035 ? ck.ember : ck.color);
        if (mask[i + W] === 1 && px32[i + W] === 0) set(i + W, ck.lip);
        if (depth < 2 && rnd() < 0.06) walk(x, y, dir + (rnd() < 0.5 ? 1 : -1) * (0.7 + rnd() * 0.6), Math.round(len * 0.45), depth + 1);
      }
    };
    for (let gy = 0; gy * ck.every < H; gy++, yield) for (let gx = 0; gx * ck.every < W; gx++) {
      if (hash(gx, gy, seed + 51) > ck.chance) continue;
      const x = (gx + hash(gx, gy, seed + 52)) * ck.every, y = (gy + hash(gx, gy, seed + 53)) * ck.every;
      if (mask[Math.floor(y) * W + Math.floor(x)] !== 1) continue;
      const len = ck.length[0] + hash(gx, gy, seed + 54) * (ck.length[1] - ck.length[0]);
      const dir = hash(gx, gy, seed + 55) * Math.PI * 2;
      // Both ways from the start, so it's a line with two loose ends rather than a star.
      walk(x, y, dir, len / 2, 0);
      walk(x, y, dir + Math.PI, len / 2, 0);
    }
  }

  // Marks: little stamps, each one wholly on its ground and never on top of another.
  const taken = new Uint8Array(W * H);
  const marks = look.marks ?? [];
  for (let n = 0; n < marks.length; n++) {
    const mk = marks[n];
    const want = mk.on === 'extra' ? 2 : 1;
    const stamps = mk.stamps.map(st => st.split('\n'));
    const clump = mk.clump ? noiseField(W, H, mk.clump, seed + 100 + n) : null;
    const nearSand = (x: number, y: number, r: number) => {
      for (let a = 0; a < 8; a++) for (const d of [r / 3, (2 * r) / 3, r]) {
        const sx = Math.round(x + Math.cos(a * 0.785) * d), sy = Math.round(y + Math.sin(a * 0.785) * d);
        if (sx >= 0 && sy >= 0 && sx < W && sy < H && mask[sy * W + sx] === 2) return d;
      }
      return -1;
    };
    yield;
    for (let gy = 0; gy * mk.every < H; gy++) {
      if (gy % 8 === 0) yield;
      for (let gx = 0; gx * mk.every < W; gx++) {
        let chance = mk.chance;
        const x = Math.floor((gx + hash(gx, gy, seed + 200 + n)) * mk.every), y = Math.floor((gy + hash(gx, gy, seed + 300 + n)) * mk.every);
        if (x >= W || y >= H || mask[y * W + x] !== want) continue;
        // In clumps: a lot where the clump noise is high, none where it's low.
        if (clump) chance *= Math.max(0, Math.min(1.8, (clump(x, y) - 0.3) * 3));
        if (mk.nearExtra) {
          const d = nearSand(x, y, mk.nearExtra);
          if (d < 0) continue;
          chance *= 1 - d / (mk.nearExtra * 1.2);
        }
        if (hash(gx, gy, seed + 400 + n) >= chance) continue;
        const rows = stamps[Math.floor(hash(gx, gy, seed + 500 + n) * stamps.length)];
        let fits = true;
        for (let r = 0; r < rows.length && fits; r++) for (let c = 0; c < rows[r].length; c++) {
          if (rows[r][c] === '.') continue;
          const xx = x + c, yy = y + r;
          if (xx >= W || yy >= H || mask[yy * W + xx] !== want || taken[yy * W + xx]) { fits = false; break; }
        }
        if (!fits) continue;
        for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
          const col = mk.colors[rows[r][c]];
          if (!col) continue;
          const i = (y + r) * W + x + c;
          set(i, col);
          taken[i] = 1;
        }
      }
    }
  }
  return true;
}
