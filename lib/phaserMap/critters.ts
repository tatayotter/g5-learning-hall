// lib/phaserMap/critters.ts
// The map's little animals (lib/wildlife.ts): fire wisps over the Cinderreach lava (violet and
// cyan spirit wisps in the Unread Margins), dragonfly
// swarms and beach crabs in Tidewrit, birds and butterflies in the Ledger's Heart. They wander on their own and
// get away from anyone who walks up to them (the kid, bots, other players):
// - a wisp darts off and settles somewhere new,
// - a dragonfly swarm breaks apart, then gathers again a little way off,
// - a flock of birds takes off together and lands further away,
// - a crab scuttles sideways, digs into the sand, and pops up somewhere else later,
// - a butterfly flutters from flower to flower, resting on each one, and flits off up high
//   (to a flower further away) when someone comes close. They sleep at night.
//
// Pixel art drawn in code (a few pixels each, like the pack's props), in map units (32 per tile)
// inside containers that follow the map camera, like the sky (ambience.ts). Purely visual:
// nothing is saved and each kid sees their own. With "reduce motion" on there are none.
import Phaser from 'phaser';
import type { CritterGroup, CritterKind, WispColor } from '@/lib/wildlife';
import { GLOW_DEPTH, type Transform } from './ambience';

const UNIT = 32;
const GROUND_DEPTH = 9.6; // under players (10), over the ground
const LOW_AIR_DEPTH = 10.6; // over players, under treetops (11+)
const HIGH_AIR_DEPTH = 39; // over everything, under cloud shadows (40)

export interface Habitat {
  width: number;
  height: number;
  open: boolean[][]; // walkable
  liquid: boolean[][]; // water or lava
  sand?: boolean[][]; // beach sand (crabs keep to it)
  flowers?: { x: number; y: number }[]; // the day's flowers (butterflies visit them)
}

// ---------- pixel art ----------
const PAL: Record<string, string> = {
  b: '#2f8fb8', B: '#1d5f82', H: '#16384c', w: '#d8f4ff', // dragonfly
  h: '#6b4a32', s: '#a07850', k: '#f0b040', l: '#4a3226', f: '#7d5a3c', // bird
  r: '#d8502a', R: '#f07a40', c: '#b03a1c', e: '#1a1010', g: '#902c16', // crab
};
// Butterflies come in a few colors: A = wing, a = wing tip, n = body.
const BUTTERFLY_COLORS: [string, string][] = [
  ['#f08a24', '#5a2a10'], // orange
  ['#f4f0e0', '#9a9a8a'], // white
  ['#5ab0f0', '#1e4a80'], // blue
  ['#f6d23c', '#8a6a10'], // yellow
  ['#e86aa8', '#7a2a50'], // pink
];
const BUTTERFLY_ART: string[][] = [
  ['AA.AA', 'aAnAa', '.AnA.', '.a.a.'], // wings open
  ['.A.A.', '.AnA.', '.AnA.', '..n..'], // half closed
  ['..A..', '..A..', '..n..', '.....'], // folded up
];
// Wisps: W = white-hot core, Y = bright, y = mid, o = outer flame; one set of colors each, with
// the glow around them (inner and outer gradient stops).
const WISP_ART: string[][] = [
  ['..y..', '.yYy.', '.yYy.', 'oyWyo', 'oYWYo', '.oYo.', '..o..'],
  ['.y...', '.yy..', '.yYy.', 'oyWYo', 'oYWYo', '.oYo.', '..o..'],
  ['...y.', '..yy.', '.yYy.', 'oYWyo', 'oYWYo', '.oYo.', '..o..'],
];
const WISP_COLORS: Record<WispColor, { W: string; Y: string; y: string; o: string; glow: [string, string, string] }> = {
  fire: { W: '#fff6d0', Y: '#ffd24a', y: '#ffa030', o: '#e0501e', glow: ['rgba(255,170,60,0.55)', 'rgba(255,110,30,0.2)', 'rgba(255,80,20,0)'] },
  violet: { W: '#f6eaff', Y: '#d2a6ff', y: '#a46cf4', o: '#6a36c8', glow: ['rgba(190,130,255,0.55)', 'rgba(140,80,240,0.2)', 'rgba(110,50,220,0)'] },
  cyan: { W: '#eafffe', Y: '#9ef4ff', y: '#4cd4ec', o: '#1e8eb8', glow: ['rgba(120,240,255,0.55)', 'rgba(50,190,230,0.2)', 'rgba(30,150,210,0)'] },
};
const ART: Record<string, string[]> = {
  'dragonfly0': ['.ww.ww.', '..w.w..', 'BbbbbHH', '..w.w..', '.ww.ww.'],
  'dragonfly1': ['.......', '.wwww..', 'BbbbbHH', '.wwww..', '.......'],
  'bird0': ['...hh..', '..hhhhk', 'sssshh.', '.ssss..', '..l.l..'],
  'bird1': ['.......', '...hh..', '..hhhhk', 'sssshh.', '.l.l...'],
  'birdfly0': ['ff...ff', '.fsssf.', '..ssshk', '.......'],
  'birdfly1': ['.......', '..ssshk', '.fsssf.', 'ff...ff'],
  'crab0': ['c.e.e.c', 'crRRRrc', '.rrrrr.', 'g.g.g.g'],
  'crab1': ['c.e.e.c', 'crRRRrc', '.rrrrr.', '.g.g.g.'],
};

function makeTextures(scene: Phaser.Scene) {
  for (const [name, rows] of Object.entries(ART)) {
    const key = `critter:${name}`;
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, rows[0].length, rows.length);
    if (!tex) continue;
    const ctx = tex.getContext();
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = PAL[ch];
      ctx.fillRect(x, y, 1, 1);
    }));
    tex.refresh();
  }
  BUTTERFLY_COLORS.forEach(([wing, tip], v) => BUTTERFLY_ART.forEach((rows, f) => {
    const key = `critter:butterfly${v}_${f}`;
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, rows[0].length, rows.length);
    if (!tex) return;
    const ctx = tex.getContext();
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === 'A' ? wing : ch === 'a' ? tip : '#2a1e18';
      ctx.fillRect(x, y, 1, 1);
    }));
    tex.refresh();
  }));
  for (const [name, pal] of Object.entries(WISP_COLORS)) {
    WISP_ART.forEach((rows, f) => {
      const key = `critter:wisp_${name}${f}`;
      if (scene.textures.exists(key)) return;
      const tex = scene.textures.createCanvas(key, rows[0].length, rows.length);
      if (!tex) return;
      const ctx = tex.getContext();
      rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return;
        ctx.fillStyle = pal[ch as 'W' | 'Y' | 'y' | 'o'];
        ctx.fillRect(x, y, 1, 1);
      }));
      tex.refresh();
    });
    const key = `critter:glow_${name}`;
    if (scene.textures.exists(key)) continue;
    const n = 24;
    const tex = scene.textures.createCanvas(key, n, n);
    if (!tex) continue;
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    grad.addColorStop(0, pal.glow[0]);
    grad.addColorStop(0.5, pal.glow[1]);
    grad.addColorStop(1, pal.glow[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, n, n);
    tex.refresh();
  }
}

// ---------- the animals ----------
interface Critter {
  kind: CritterKind;
  group: Group;
  img: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
  x: number; y: number; vx: number; vy: number;
  homeX: number; homeY: number;
  phase: number;
  state: 'idle' | 'flee' | 'fly' | 'land' | 'dig' | 'hidden' | 'emerge';
  until: number; // when the current state (or hop/pause) ends
  tx: number; ty: number; // where it's heading
  ox: number; oy: number; // dragonfly: its spot in the swarm
  lift: number; // drawn this far above its spot (a wisp bobbing)
  color: number; // butterfly: which colors
  wisp: WispColor; // wisp: which colors
}
interface Group {
  kind: CritterKind;
  members: Critter[];
  cx: number; cy: number; tx: number; ty: number; // swarm center and where it's drifting
  scaredAt: number; awayX: number; awayY: number;
}

const FLEE_R = { wisp: 3, dragonfly: 2.5, bird: 2.6, crab: 2.2, butterfly: 1.8 }; // tiles

export default class CritterLayer {
  private ground: Phaser.GameObjects.Container;
  private lowAir: Phaser.GameObjects.Container;
  private highAir: Phaser.GameObjects.Container;
  private glowBox: Phaser.GameObjects.Container; // wisps' glow, shining through the night
  private critters: Critter[] = [];
  private groups: Group[] = [];
  private homes: Record<CritterGroup['home'], [number, number][]>;
  private lastNow = 0;

  static build(scene: Phaser.Scene, kinds: CritterGroup[] | undefined, habitat: Habitat): CritterLayer | null {
    if (!kinds?.length) return null;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
    return new CritterLayer(scene, kinds, habitat);
  }

  private constructor(private scene: Phaser.Scene, kinds: CritterGroup[], private hab: Habitat) {
    makeTextures(scene);
    this.ground = scene.add.container(0, 0).setDepth(GROUND_DEPTH);
    this.lowAir = scene.add.container(0, 0).setDepth(LOW_AIR_DEPTH);
    this.highAir = scene.add.container(0, 0).setDepth(HIGH_AIR_DEPTH);
    this.glowBox = scene.add.container(0, 0).setDepth(GLOW_DEPTH);
    const { width: W, height: H, open, liquid } = hab;
    const nearLiquid = (x: number, y: number, r: number) => {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (liquid[y + dy]?.[x + dx]) return true;
      return false;
    };
    const near: [number, number][] = [], shore: [number, number][] = [], anyOpen: [number, number][] = [];
    const flowers: [number, number][] = (hab.flowers ?? []).map(f => [f.x, f.y]);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (open[y][x]) anyOpen.push([x, y]);
      if (open[y][x] && !liquid[y][x] && nearLiquid(x, y, 1) && (!hab.sand || hab.sand[y][x])) shore.push([x, y]);
      if ((open[y][x] || liquid[y][x]) && nearLiquid(x, y, 3)) near.push([x, y]);
    }
    this.homes = { 'near-liquid': near, shore, open: anyOpen, flowers };
    const scale = (W * H) / 2400;
    for (const k of kinds) {
      const spots = this.homes[k.home];
      if (!spots.length) continue;
      for (let i = 0; i < Math.max(1, Math.round(k.groups * scale)); i++) {
        const [hx, hy] = spots[Math.floor(Math.random() * spots.length)];
        const cx = (hx + 0.5) * UNIT, cy = (hy + 0.5) * UNIT;
        const g: Group = { kind: k.kind, members: [], cx, cy, tx: cx, ty: cy, scaredAt: -Infinity, awayX: 0, awayY: 0 };
        const n = k.size[0] + Math.floor(Math.random() * (k.size[1] - k.size[0] + 1));
        for (let j = 0; j < n; j++) g.members.push(this.make(k.kind, g, cx + (Math.random() - 0.5) * 20, cy + (Math.random() - 0.5) * 14, k.colors));
        this.groups.push(g);
      }
    }
  }

  private make(kind: CritterKind, group: Group, x: number, y: number, colors?: WispColor[]): Critter {
    const box = kind === 'crab' || kind === 'bird' ? this.ground : this.lowAir;
    const wisp = colors?.length ? colors[Math.floor(Math.random() * colors.length)] : 'fire';
    const img = this.scene.add.image(x, y, kind === 'wisp' ? `critter:wisp_${wisp}0` : `critter:${kind}0`).setOrigin(0.5, 1);
    let glow: Phaser.GameObjects.Image | undefined;
    if (kind === 'wisp') {
      glow = this.scene.add.image(x, y, `critter:glow_${wisp}`).setBlendMode(Phaser.BlendModes.ADD);
      this.glowBox.add(glow);
    }
    box.add(img);
    const c: Critter = {
      kind, group, img, glow, x, y, vx: 0, vy: 0, homeX: x, homeY: y, phase: Math.random() * Math.PI * 2,
      state: 'idle', until: 0, tx: x, ty: y, ox: 0, oy: 0, lift: 0, color: Math.floor(Math.random() * BUTTERFLY_COLORS.length), wisp,
    };
    if (kind === 'butterfly') {
      // Each one starts resting on a flower of its own, near the group's spot.
      const to = this.spot('flowers', { x, y, awayX: 0, awayY: 0 }, 0, 3) ?? this.nearestFlower(x, y, 0, { x, y });
      c.state = 'land'; c.until = Math.random() * 3000;
      if (to) { c.x = c.homeX = c.tx = to[0]; c.y = c.homeY = c.ty = to[1] + 6; }
    }
    this.critters.push(c);
    return c;
  }

  private spot(home: CritterGroup['home'], from?: { x: number; y: number; awayX: number; awayY: number }, minTiles = 0, maxTiles = 99): [number, number] | null {
    const spots = this.homes[home];
    for (let i = 0; i < 40; i++) {
      const [x, y] = spots[Math.floor(Math.random() * spots.length)];
      const px = (x + 0.5) * UNIT, py = (y + 0.5) * UNIT;
      if (from) {
        const d = Math.hypot(px - from.x, py - from.y) / UNIT;
        if (d < minTiles || d > maxTiles) continue;
        // Somewhere away from whoever scared it, not back past them.
        if ((px - from.x) * from.awayX + (py - from.y) * from.awayY < 0) continue;
      }
      return [px, py];
    }
    return null;
  }

  // walkers: everyone walking the map, in map units. night: how dark it is (0..1).
  update(t: Transform, time: number, walkers: { x: number; y: number }[], night = 0) {
    const scale = t.tileW / UNIT;
    for (const box of [this.ground, this.lowAir, this.highAir, this.glowBox]) box.setPosition(t.offsetX, t.offsetY).setScale(scale);
    const dt = Math.min(0.1, this.lastNow ? (time - this.lastNow) / 1000 : 0);
    this.lastNow = time;
    const nearest = (x: number, y: number) => {
      let best = Infinity, bx = 0, by = 0;
      for (const w of walkers) {
        const d = Math.hypot(w.x - x, w.y - y);
        if (d < best) { best = d; bx = w.x; by = w.y; }
      }
      return { d: best, x: bx, y: by };
    };
    for (const g of this.groups) {
      if (g.kind === 'dragonfly') this.swarm(g, time, dt, nearest);
      else for (const c of g.members) {
        if (c.kind === 'wisp') this.wisp(c, time, dt, nearest);
        else if (c.kind === 'bird') this.bird(c, time, dt, nearest);
        else if (c.kind === 'butterfly') this.butterfly(c, time, dt, nearest, night);
        else this.crab(c, time, dt, nearest);
      }
    }
    for (const c of this.critters) {
      c.img.setPosition(Math.round(c.x), Math.round(c.y - c.lift));
      c.glow?.setPosition(Math.round(c.x), Math.round(c.y - c.lift - 4));
    }
  }

  private away(c: { x: number; y: number }, from: { x: number; y: number }) {
    const dx = c.x - from.x, dy = c.y - from.y, len = Math.hypot(dx, dy) || 1;
    return { ux: dx / len, uy: dy / len };
  }

  private wisp(c: Critter, time: number, dt: number, nearest: (x: number, y: number) => { d: number; x: number; y: number }) {
    const n = nearest(c.x, c.y);
    if (c.state === 'idle' && n.d < FLEE_R.wisp * UNIT) {
      const { ux, uy } = this.away(c, n);
      c.state = 'flee'; c.until = time + 900;
      c.vx = ux * 170 + (Math.random() - 0.5) * 60; c.vy = uy * 170 + (Math.random() - 0.5) * 60;
    }
    if (c.state === 'flee') {
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.vx *= 1 - 1.5 * dt; c.vy *= 1 - 1.5 * dt;
      if (time > c.until) { c.state = 'idle'; c.homeX = c.x; c.homeY = c.y; }
    } else {
      // Hover around its spot in slow loops.
      const tx = c.homeX + Math.sin(time / 1700 + c.phase) * 22, ty = c.homeY + Math.cos(time / 2300 + c.phase) * 14;
      c.x += (tx - c.x) * Math.min(1, 1.5 * dt); c.y += (ty - c.y) * Math.min(1, 1.5 * dt);
    }
    this.keepIn(c);
    const fast = c.state === 'flee';
    c.img.setTexture(`critter:wisp_${c.wisp}${Math.floor(time / (fast ? 70 : 140) + c.phase * 3) % 3}`);
    c.lift = 6 + Math.round(Math.sin(time / 380 + c.phase) * 2);
    c.glow?.setAlpha(0.7 + 0.3 * Math.sin(time / 110 + c.phase * 5)).setScale(fast ? 1.25 : 1);
  }

  private swarm(g: Group, time: number, dt: number, nearest: (x: number, y: number) => { d: number; x: number; y: number }) {
    const n = nearest(g.cx, g.cy);
    const scattered = time - g.scaredAt < 1600;
    let close = n.d < FLEE_R.dragonfly * UNIT;
    for (const m of g.members) if (!close && nearest(m.x, m.y).d < FLEE_R.dragonfly * UNIT * 0.8) close = true;
    if (close && !scattered) {
      g.scaredAt = time;
      const { ux, uy } = this.away({ x: g.cx, y: g.cy }, n);
      g.awayX = ux; g.awayY = uy;
      for (const m of g.members) {
        const spread = (Math.random() - 0.5) * 1.6;
        const sp = 150 + Math.random() * 80;
        m.vx = (ux * Math.cos(spread) - uy * Math.sin(spread)) * sp;
        m.vy = (uy * Math.cos(spread) + ux * Math.sin(spread)) * sp;
      }
      const to = this.spot('near-liquid', { x: g.cx, y: g.cy, awayX: ux, awayY: uy }, 4, 10);
      if (to) { g.tx = to[0]; g.ty = to[1]; }
    } else if (!scattered && Math.hypot(g.tx - g.cx, g.ty - g.cy) < 6) {
      const to = this.spot('near-liquid', { x: g.cx, y: g.cy, awayX: 0, awayY: 0 }, 1, 5);
      if (to) { g.tx = to[0]; g.ty = to[1]; }
    }
    // The swarm's center drifts to its next spot (faster when it's moving off after a scare).
    const speed = time - g.scaredAt < 5000 ? 55 : 18;
    const d = Math.hypot(g.tx - g.cx, g.ty - g.cy);
    if (d > 1) { g.cx += (g.tx - g.cx) / d * Math.min(d, speed * dt); g.cy += (g.ty - g.cy) / d * Math.min(d, speed * dt); }
    g.members.forEach((m, i) => {
      if (time - g.scaredAt < 1100) {
        // Broken apart: each one zips off on its own.
        m.x += m.vx * dt; m.y += m.vy * dt;
        m.vx *= 1 - 1.2 * dt; m.vy *= 1 - 1.2 * dt;
      } else {
        // In the swarm: circling the center, darting to a new spot every so often.
        if (time > m.until) {
          m.until = time + 250 + Math.random() * 600;
          m.ox = (Math.random() - 0.5) * 34; m.oy = (Math.random() - 0.5) * 22;
        }
        const tx = g.cx + m.ox + Math.cos(time / 420 + i * 1.7) * 8, ty = g.cy + m.oy + Math.sin(time / 350 + i * 1.3) * 5;
        const k = Math.min(1, (time - g.scaredAt < 3000 ? 2.5 : 5) * dt);
        m.vx = (tx - m.x) / Math.max(dt, 0.001) * k; m.vy = (ty - m.y) / Math.max(dt, 0.001) * k;
        m.x += (tx - m.x) * k; m.y += (ty - m.y) * k;
      }
      this.keepIn(m);
      if (Math.abs(m.vx) > 4) m.img.setFlipX(m.vx < 0);
      m.img.setTexture(`critter:dragonfly${Math.floor(time / 45 + i) % 2}`);
    });
  }

  private bird(c: Critter, time: number, dt: number, nearest: (x: number, y: number) => { d: number; x: number; y: number }) {
    const g = c.group;
    if (c.state === 'idle') {
      const n = nearest(c.x, c.y);
      const flockScared = time - g.scaredAt < 500;
      if (n.d < FLEE_R.bird * UNIT || flockScared) {
        if (!flockScared) {
          const { ux, uy } = this.away(c, n);
          g.scaredAt = time; g.awayX = ux; g.awayY = uy;
          const to = this.spot('open', { x: c.x, y: c.y, awayX: ux, awayY: uy }, 7, 16);
          g.tx = to ? to[0] : c.x + ux * 10 * UNIT; g.ty = to ? to[1] : c.y + uy * 10 * UNIT;
        }
        c.state = 'fly';
        c.until = time + 700 + Math.random() * 400; // climbing away before turning to land
        c.vx = g.awayX * 150 + (Math.random() - 0.5) * 40; c.vy = g.awayY * 150 - 70;
        c.tx = g.tx + (Math.random() - 0.5) * 30; c.ty = g.ty + (Math.random() - 0.5) * 20;
        this.ground.remove(c.img); this.highAir.add(c.img);
      } else if (time > c.until) {
        // A little hop now and then, or pecking on the spot.
        c.until = time + 700 + Math.random() * 2200;
        const hx = c.x + (Math.random() - 0.5) * 16, hy = c.y + (Math.random() - 0.5) * 8;
        if (this.isOpen(hx, hy)) { c.img.setFlipX(hx < c.x); c.x = hx; c.y = hy; }
      }
      c.img.setTexture(time < c.until - 500 || Math.sin(time / 160 + c.phase) > 0.7 ? 'critter:bird1' : 'critter:bird0');
      return;
    }
    // Flying: away first, then curving down to where the flock lands.
    if (time > c.until) {
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      if (d < 4) {
        c.state = 'idle'; c.until = time + 800; c.vx = c.vy = 0;
        this.highAir.remove(c.img); this.ground.add(c.img);
        return;
      }
      const sp = 120;
      c.vx += (dx / d * sp - c.vx) * Math.min(1, 2 * dt); c.vy += (dy / d * sp - c.vy) * Math.min(1, 2 * dt);
    }
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (Math.abs(c.vx) > 5) c.img.setFlipX(c.vx < 0);
    c.img.setTexture(`critter:birdfly${Math.floor(time / 90 + c.phase) % 2}`);
  }

  private butterfly(c: Critter, time: number, dt: number, nearest: (x: number, y: number) => { d: number; x: number; y: number }, night: number) {
    // Asleep at night: they fade away as it gets dark and come back in the morning.
    c.img.setAlpha(Math.max(0, Math.min(1, (0.45 - night) / 0.2)));
    const n = nearest(c.x, c.y);
    const resting = c.state === 'land' || c.state === 'idle';
    if (resting && n.d < FLEE_R.butterfly * UNIT) {
      // Startled: flits up and off to a flower further away.
      const { ux, uy } = this.away(c, n);
      const to = this.spot('flowers', { x: c.x, y: c.y, awayX: ux, awayY: uy }, 3, 9) ?? this.nearestFlower(c.x + ux * 4 * UNIT, c.y + uy * 4 * UNIT, 3, c);
      c.state = 'flee';
      c.tx = to ? to[0] : c.x; c.ty = to ? to[1] + 6 : c.y;
      c.vx = ux * 90; c.vy = uy * 90 - 40;
      this.lowAir.remove(c.img); this.highAir.add(c.img);
    } else if (resting && time > c.until) {
      // Done resting: off to a flower nearby.
      const to = this.spot('flowers', { x: c.x, y: c.y, awayX: 0, awayY: 0 }, 1, 5) ?? this.nearestFlower(c.x, c.y, 1, c);
      c.state = 'fly';
      c.tx = to ? to[0] : c.x; c.ty = to ? to[1] + 6 : c.y;
    }
    if (c.state === 'fly' || c.state === 'flee') {
      const fast = c.state === 'flee';
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      // Fluttery flight: it heads for the flower but wobbles along the way.
      const sp = fast ? 75 : 34;
      const wob = Math.sin(time / 170 + c.phase) * 0.9;
      const wx = dx / (d || 1), wy = dy / (d || 1);
      c.vx += ((wx - wy * wob) * sp - c.vx) * Math.min(1, 3 * dt);
      c.vy += ((wy + wx * wob) * sp - c.vy) * Math.min(1, 3 * dt);
      c.x += c.vx * dt; c.y += c.vy * dt;
      // Flies a little above the ground (higher when startled), and comes down to land.
      const cruise = fast ? 22 : 12;
      const want = d < 14 ? d * (cruise / 14) : cruise + Math.sin(time / 240 + c.phase) * 3;
      c.lift += (want - c.lift) * Math.min(1, 4 * dt);
      if (Math.abs(c.vx) > 3) c.img.setFlipX(c.vx < 0);
      c.img.setTexture(`critter:butterfly${c.color}_${[0, 1, 2, 1][Math.floor(time / (fast ? 45 : 70) + c.phase * 4) % 4]}`);
      if (d < 3) {
        c.state = 'land'; c.x = c.tx; c.y = c.ty; c.homeX = c.x; c.homeY = c.y; c.lift = 0; c.vx = c.vy = 0;
        c.until = time + 2000 + Math.random() * 5000;
        if (fast) { this.highAir.remove(c.img); this.lowAir.add(c.img); }
      }
    } else {
      // Resting on the flower, slowly opening and closing its wings.
      c.lift = 0;
      const k = Math.sin(time / 600 + c.phase);
      c.img.setTexture(`critter:butterfly${c.color}_${k > 0.3 ? 0 : k > -0.3 ? 1 : 2}`);
    }
    this.keepIn(c);
  }

  private crab(c: Critter, time: number, dt: number, nearest: (x: number, y: number) => { d: number; x: number; y: number }) {
    const n = nearest(c.x, c.y);
    switch (c.state) {
      case 'idle': {
        if (n.d < FLEE_R.crab * UNIT) {
          c.state = 'flee'; c.until = time + 550;
          c.vx = (c.x >= n.x ? 1 : -1) * 115;
          break;
        }
        // Sideways scuttles along the beach, with rests in between.
        if (time > c.until) {
          c.until = time + 1200 + Math.random() * 2500;
          const tx = c.x + (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 24);
          if (this.isHome(tx, c.y, 'shore')) c.tx = tx;
        }
        const d = c.tx - c.x;
        if (Math.abs(d) > 1) c.x += Math.sign(d) * Math.min(Math.abs(d), 30 * dt);
        c.img.setTexture(Math.abs(d) > 1 && Math.floor(time / 110) % 2 ? 'critter:crab1' : 'critter:crab0');
        break;
      }
      case 'flee': {
        const nx = c.x + c.vx * dt;
        if (this.isOpen(nx, c.y)) c.x = nx;
        c.img.setTexture(Math.floor(time / 60) % 2 ? 'critter:crab1' : 'critter:crab0');
        if (time > c.until) { c.state = 'dig'; c.until = time + 450; }
        break;
      }
      case 'dig': {
        // Sinks into the sand.
        const k = Math.max(0, (c.until - time) / 450);
        c.img.setScale(1, k).setAlpha(0.4 + 0.6 * k);
        if (time > c.until) { c.state = 'hidden'; c.img.setVisible(false); c.until = time + 6000 + Math.random() * 7000; }
        break;
      }
      case 'hidden': {
        if (time > c.until) {
          const to = this.spot('shore');
          if (to && nearest(to[0], to[1]).d > 6 * UNIT) {
            c.x = to[0] + (Math.random() - 0.5) * 16; c.y = to[1]; c.tx = c.x;
            c.state = 'emerge'; c.until = time + 400;
            c.img.setVisible(true);
          } else c.until = time + 1500;
        }
        break;
      }
      case 'emerge': {
        const k = 1 - Math.max(0, (c.until - time) / 400);
        c.img.setScale(1, k).setAlpha(0.4 + 0.6 * k);
        if (time > c.until) { c.state = 'idle'; c.img.setScale(1).setAlpha(1); c.until = time + 1500; }
        break;
      }
    }
  }

  // The flower nearest (x, y) that is at least minTiles from `from`, as a spot (tile middle).
  private nearestFlower(x: number, y: number, minTiles: number, from: { x: number; y: number }): [number, number] | null {
    let best: [number, number] | null = null, bestD = Infinity;
    for (const [fx, fy] of this.homes.flowers) {
      const px = (fx + 0.5) * UNIT, py = (fy + 0.5) * UNIT, d = Math.hypot(px - x, py - y);
      if (Math.hypot(px - from.x, py - from.y) >= minTiles * UNIT && d < bestD) { bestD = d; best = [px, py]; }
    }
    return best;
  }

  private isOpen(x: number, y: number) {
    return !!this.hab.open[Math.floor(y / UNIT)]?.[Math.floor(x / UNIT)];
  }
  private isHome(x: number, y: number, home: 'shore') {
    const tx = Math.floor(x / UNIT), ty = Math.floor(y / UNIT);
    return home === 'shore' && this.isOpen(x, y) && !this.hab.liquid[ty]?.[tx] && (!this.hab.sand || !!this.hab.sand[ty]?.[tx]);
  }
  private keepIn(c: Critter) {
    c.x = Math.max(8, Math.min(this.hab.width * UNIT - 8, c.x));
    c.y = Math.max(12, Math.min(this.hab.height * UNIT - 4, c.y));
  }

  destroy() {
    this.ground.destroy();
    this.lowAir.destroy();
    this.highAir.destroy();
    this.glowBox.destroy();
    this.critters = [];
    this.groups = [];
  }
}
