// lib/phaserMap/groundFx.ts
// Little touches on the ground and the water (lib/wildlife.ts GROUND_FX says which a map has):
// - waves rolling in to the shore, breaking into foam on the sand and pulling back (a Phaser
//   animation, one sprite per stretch of shore, so the sets sweep along the coast),
// - deep water: darker the further out it is, in soft curved bands (cut like the cloud
//   shadows, ambience.ts), over one bright water tile everywhere,
// - lava bubbles that swell and pop,
// - ripples on the water next to anyone walking along it,
// - a fish jumping now and then,
// - footprints left in the sand (fading after a while),
// - puffs of ash kicked up by every step,
// - embers rising off the lava, and at night the lava's light, fading out in curved bands.
//
// Drawn with a few pixel rectangles a frame (only what's on screen), in map units inside
// containers that follow the camera like the sky (ambience.ts). Purely visual. With "reduce
// motion" on, none of it moves, so none of it is drawn.
import Phaser from 'phaser';
import type { GroundFxKinds } from '@/lib/wildlife';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import { GLOW_DEPTH, type Transform } from './ambience';

const UNIT = 32;

export interface FxMap {
  width: number;
  height: number;
  liquid: boolean[][];
  sand: boolean[][];
}

interface Ring { x: number; y: number; born: number; life: number; size: number; color: number }
interface Print { x: number; y: number; born: number; dx: number; dy: number }
interface Puff { x: number; y: number; born: number; vx: number; vy: number }
interface Fish { x0: number; y0: number; x1: number; born: number; color: number }
interface Ember { x: number; y: number; born: number; life: number; vx: number }
interface Edge { x: number; y: number; side: 0 | 1 | 2 | 3; sprite: Phaser.GameObjects.Sprite } // side: 0 up, 1 right, 2 down, 3 left

const PRINT_MS = 9000;
// One wave: WAVE_FRAMES frames at WAVE_FPS, then a rest so each spot gets a wave every WAVE_CYCLE ms.
const WAVE_TEX = 'fx:wave';
const WAVE_ANIM = 'fx:wave';
const WAVE_FRAMES = 10;
const WAVE_FPS = 7;
const WAVE_CYCLE = 3400;

// The wave's frames, drawn for a shore tile with the land at the top (the sprite turns for the
// other sides). The water's edge runs through the middle of a shore tile (the sand's soft edge
// covers the land half). A light swell rolls in from the bottom, crests, breaks into a white
// band with spray, washes a sheet of foam up the sand, then slips back leaving lace and a
// darker band of wet sand that dries. Every pixel row is wobbly, so it never looks like a ruler.
function makeWaveTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(WAVE_TEX)) return;
  const tex = scene.textures.createCanvas(WAVE_TEX, UNIT * WAVE_FRAMES, UNIT);
  if (!tex) return;
  const ctx = tex.getContext();
  const hash = (a: number, b: number) => {
    let h = Math.imul(a * 374761393 + b * 668265263, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const wob = (x: number, f: number) => Math.round(Math.sin(x * 0.45 + f * 0.7) * 1.2);
  const px = (f: number, x: number, y: number, rgb: string, a: number) => {
    if (y < 0 || y >= UNIT || a <= 0) return;
    ctx.fillStyle = `rgba(${rgb},${a})`;
    ctx.fillRect(f * UNIT + x, y, 1, 1);
  };
  const FOAM = '244,255,255', CREST = '200,245,248', DARK = '40,120,140', WET = '110,80,45';
  // [frame]: swell row (or -1), crest strength, foam sheet top..bottom, foam alpha, wet alpha
  const plan: [number, number, number, number, number, number][] = [
    [29, 0.4, -1, -1, 0, 0],
    [25, 0.6, -1, -1, 0, 0],
    [21, 0.8, -1, -1, 0, 0],
    [17, 1, -1, -1, 0, 0],
    [-1, 0, 13, 17, 1, 0],
    [-1, 0, 9, 15, 0.95, 0.12],
    [-1, 0, 8, 12, 0.8, 0.24],
    [-1, 0, 10, 13, 0.6, 0.22],
    [-1, 0, 13, 15, 0.4, 0.14],
    [-1, 0, 15, 16, 0.2, 0.06],
  ];
  plan.forEach(([swell, crest, top, bottom, foam, wet], f) => {
    for (let x = 0; x < UNIT; x++) {
      const w = wob(x, f);
      if (swell >= 0) {
        // The swell: a bright crest line with the dark face of the wave under it.
        if (hash(x, f) > 0.12) px(f, x, swell + w, CREST, crest);
        if (crest > 0.6) px(f, x, swell + w - 1, FOAM, (crest - 0.5) * hash(x, f + 9));
        px(f, x, swell + w + 1, DARK, crest * 0.35);
      }
      if (wet > 0) for (let y = 6; y < 12; y++) px(f, x, y + w, WET, wet * (y < 8 ? 0.5 : 1));
      if (top >= 0) {
        for (let y = top; y <= bottom; y++) {
          // A sheet near the leading edge, lace (with holes) behind it.
          const lead = y - top < 2;
          const keep = lead ? hash(x, y * 31 + f) > 0.08 : hash(x, y * 17 + f) > 0.55;
          if (keep) px(f, x, y + w, FOAM, foam * (lead ? 1 : 0.7));
        }
      }
      // Spray thrown up when it breaks.
      if (f === 4 || f === 5) if (hash(x, f * 77) > 0.86) px(f, x, top - 2 - Math.floor(hash(x, f) * 3), FOAM, 0.8);
    }
  });
  for (let f = 0; f < WAVE_FRAMES; f++) tex.add(f, 0, f * UNIT, 0, UNIT, UNIT);
  tex.refresh();
  if (!scene.anims.exists(WAVE_ANIM)) {
    scene.anims.create({
      key: WAVE_ANIM,
      frames: Array.from({ length: WAVE_FRAMES }, (_, i) => ({ key: WAVE_TEX, frame: i })),
      frameRate: WAVE_FPS,
    });
  }
}
const PUFF_MS = 650;

// Deep water shading and the lava's night glow are each one picture over the whole map, in
// cells of SHADE_CELL art px, cut into a few flat bands like the cloud shadows (ambience.ts).
const SHADE_CELL = 4;
// Deep water: bands by px from the nearest land tile.
const DEEP_BANDS: [number, number][] = [[34, 0.1], [62, 0.2], [96, 0.3], [140, 0.38]];
const DEEP_COLOR = '24,62,92';
// Lava glow: bands by px from the open lava (lava all around), so it lights the lava and spills
// a little warm light onto the rocks at its edge, fading out in curves.
const GLOW_BANDS: [number, number][] = [[0, 1], [10, 0.7], [22, 0.45], [36, 0.25], [52, 0.1]];
const GLOW_COLOR = '255,112,32';
let shadeTextures = 0;

// How far each cell is from the nearest source tile, in px (a two-pass chamfer).
function cellDistance(isSource: (x: number, y: number) => boolean, W: number, H: number) {
  const cw = (W * UNIT) / SHADE_CELL, ch = (H * UNIT) / SHADE_CELL, per = UNIT / SHADE_CELL;
  const BIG = 1e9;
  const d = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) d[y * cw + x] = isSource(Math.floor(x / per), Math.floor(y / per)) ? 0 : BIG;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= cw || y >= ch ? BIG : d[y * cw + x]);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = y * cw + x;
    if (d[i]) d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
  }
  for (let y = ch - 1; y >= 0; y--) for (let x = cw - 1; x >= 0; x--) {
    const i = y * cw + x;
    if (d[i]) d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
  }
  for (let i = 0; i < d.length; i++) d[i] *= SHADE_CELL;
  return { d, cw, ch };
}

// The distance is pushed in and out by a couple of slow waves, so the bands curve and bulge
// instead of following the tile steps. alphaAt picks a band's strength for a distance (0 = none).
function makeShadeTexture(scene: Phaser.Scene, cells: { d: Float32Array; cw: number; ch: number }, color: string, alphaAt: (px: number) => number, only?: (x: number, y: number) => boolean) {
  const { d, cw, ch } = cells;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext('2d')!;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const px = x * SHADE_CELL, py = y * SHADE_CELL;
    if (only && !only(Math.floor(px / UNIT), Math.floor(py / UNIT))) continue;
    const wobble = 9 * Math.sin(px * 0.021 + py * 0.008) + 7 * Math.sin(py * 0.027 - px * 0.011 + 1.7) + 4 * Math.sin((px + py) * 0.05);
    const a = alphaAt(d[y * cw + x] + wobble);
    if (!a) continue;
    g.fillStyle = `rgba(${color},${a})`;
    g.fillRect(x, y, 1, 1);
  }
  const key = `fx:shade:${++shadeTextures}`;
  scene.textures.addCanvas(key, canvas);
  return key;
}

// Deep water: the band for how far out it is.
const deepAt = (px: number) => {
  let a = 0;
  for (const [from, alpha] of DEEP_BANDS) if (px >= from) a = alpha;
  return a;
};

export default class GroundFx {
  private water: Phaser.GameObjects.Graphics; // on the water, under the land's edge
  private ground: Phaser.GameObjects.Graphics; // on the ground, under players
  private deep?: Phaser.GameObjects.Image; // the deep water shading, just over the water tiles
  private deepKey = '';
  private lavaGlow?: Phaser.GameObjects.Image; // the lava's light at night
  private lavaGlowKey = '';
  private waves?: Phaser.GameObjects.Container; // the wave sprites, on the ground too
  private glow: Phaser.GameObjects.Graphics; // lights: they add light, and shine through the night
  private embers: Ember[] = [];
  private nextEmber = 0;
  private edges: Edge[] = [];
  private rings: Ring[] = [];
  private prints: Print[] = [];
  private puffs: Puff[] = [];
  private fish: Fish[] = [];
  private bubbles: Ring[] = [];
  private nextFish = 0;
  private nextBubble = 0;
  private lastTile = new Map<string, { x: number; y: number }>();
  private lastNow = 0;

  static build(scene: Phaser.Scene, kinds: GroundFxKinds | undefined, map: FxMap): GroundFx | null {
    if (!kinds) return null;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
    return new GroundFx(scene, kinds, map);
  }

  private constructor(private scene: Phaser.Scene, private kinds: GroundFxKinds, private map: FxMap) {
    this.water = scene.add.graphics();
    this.ground = scene.add.graphics();
    this.glow = scene.add.graphics().setDepth(GLOW_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
    const liquid = (x: number, y: number) => !!map.liquid[y]?.[x];
    if (kinds.deep) {
      const cells = cellDistance((x, y) => !liquid(x, y), map.width, map.height);
      this.deepKey = makeShadeTexture(scene, cells, DEEP_COLOR, deepAt, liquid);
      // Nearest-neighbour scaling keeps the band edges crisp pixel steps, like the clouds.
      this.deep = scene.add.image(0, 0, this.deepKey).setOrigin(0, 0);
      this.deep.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    if (kinds.embers) {
      // Open lava: lava on every side, so the glow starts inside the pool, not at its rim.
      const open = (x: number, y: number) => [-1, 0, 1].every(dy => [-1, 0, 1].every(dx => liquid(x + dx, y + dy) || x + dx < 0 || y + dy < 0 || x + dx >= map.width || y + dy >= map.height));
      const cells = cellDistance(open, map.width, map.height);
      const glowAt = (px: number) => {
        let a = 0;
        for (const [from, alpha] of GLOW_BANDS) if (px <= from + 6) { a = alpha; break; }
        return a;
      };
      this.lavaGlowKey = makeShadeTexture(scene, cells, GLOW_COLOR, glowAt);
      this.lavaGlow = scene.add.image(0, 0, this.lavaGlowKey).setOrigin(0, 0).setDepth(GLOW_DEPTH).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      this.lavaGlow.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    if (kinds.foam) {
      const { width: W, height: H, liquid } = map;
      const dirs: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!liquid[y][x]) continue;
        dirs.forEach(([dx, dy], side) => {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || liquid[ny][nx]) return;
          this.edges.push({ x, y, side: side as Edge['side'], sprite: null as unknown as Phaser.GameObjects.Sprite });
        });
      }
      makeWaveTexture(scene);
      this.waves = scene.add.container(0, 0);
      const cycleMs = WAVE_CYCLE;
      const playMs = (WAVE_FRAMES / WAVE_FPS) * 1000;
      for (const e of this.edges) {
        const sprite = scene.add.sprite((e.x + 0.5) * UNIT, (e.y + 0.5) * UNIT, WAVE_TEX, WAVE_FRAMES - 1)
          .setAngle([0, 90, 180, -90][e.side]);
        // Sets of waves sweep along the coast: each spot a little behind its neighbour, with a
        // touch of chance so it isn't a perfect line.
        const lag = ((e.x * 0.9 + e.y * 0.6) * 140 + Math.random() * 260) % cycleMs;
        sprite.play({ key: WAVE_ANIM, repeat: -1, repeatDelay: cycleMs - playMs, delay: lag });
        if (Math.random() < 0.5 && (e.side === 0 || e.side === 2)) sprite.setFlipX(true);
        if (Math.random() < 0.5 && (e.side === 1 || e.side === 3)) sprite.setFlipY(true);
        e.sprite = sprite;
        this.waves.add(sprite);
      }
    }
  }

  // Water bits go just over the liquid layer (under the land's soft edge), ground bits just
  // under the players' shadows. The scene says where those are once its map has loaded.
  setDepths(water: number, ground: number) {
    if (this.water.depth !== water) this.water.setDepth(water);
    if (this.deep && this.deep.depth !== water - 0.2) this.deep.setDepth(water - 0.2);
    if (this.ground.depth !== ground) this.ground.setDepth(ground);
    if (this.waves && this.waves.depth !== ground) this.waves.setDepth(ground);
  }

  private wet(x: number, y: number) { return !!this.map.liquid[y]?.[x]; }

  update(t: Transform, time: number, walkers: { id: string; x: number; y: number }[], night = 0) {
    const scale = t.tileW / UNIT;
    for (const g of [this.water, this.ground, this.glow]) g.setPosition(t.offsetX, t.offsetY).setScale(scale).clear();
    for (const img of [this.deep, this.lavaGlow]) img?.setPosition(t.offsetX, t.offsetY).setScale(scale * SHADE_CELL);
    this.waves?.setPosition(t.offsetX, t.offsetY).setScale(scale);
    const dt = Math.min(0.1, this.lastNow ? (time - this.lastNow) / 1000 : 0);
    this.lastNow = time;
    const view = { x0: -t.offsetX / scale - UNIT, y0: -t.offsetY / scale - UNIT, x1: (CANVAS_WIDTH - t.offsetX) / scale + UNIT, y1: (CANVAS_HEIGHT - t.offsetY) / scale + UNIT };
    const onScreen = (x: number, y: number) => x > view.x0 && x < view.x1 && y > view.y0 && y < view.y1;

    // Steps: what each walker left behind when they moved to a new tile.
    for (const w of walkers) {
      const tx = Math.floor(w.x / UNIT), ty = Math.floor((w.y - 2) / UNIT);
      const prev = this.lastTile.get(w.id);
      this.lastTile.set(w.id, { x: tx, y: ty });
      if (!prev || (prev.x === tx && prev.y === ty)) continue;
      const dx = Math.sign(tx - prev.x), dy = Math.sign(ty - prev.y);
      if (this.kinds.prints && this.map.sand[prev.y]?.[prev.x]) {
        this.prints.push({ x: (prev.x + 0.5) * UNIT, y: (prev.y + 0.5) * UNIT, born: time, dx, dy });
        if (this.prints.length > 80) this.prints.shift();
      }
      if (this.kinds.puffs) {
        for (let i = 0; i < 4; i++) this.puffs.push({ x: w.x + (Math.random() - 0.5) * 8, y: w.y - 2, born: time, vx: (Math.random() - 0.5) * 14 - dx * 8, vy: -6 - Math.random() * 8 });
        if (this.puffs.length > 60) this.puffs.splice(0, this.puffs.length - 60);
      }
      if (this.kinds.ripples) {
        for (const [ax, ay] of [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]]) {
          if (!this.wet(ax, ay)) continue;
          // On the water, just off the bank by the walker.
          const rx = (ax + 0.5) * UNIT + (tx - ax) * 10, ry = (ay + 0.5) * UNIT + (ty - ay) * 10;
          this.rings.push({ x: rx, y: ry, born: time, life: 1300, size: 10, color: 0xe8fbff });
        }
        if (this.rings.length > 40) this.rings.splice(0, this.rings.length - 40);
      }
    }

    // Waves: only the ones on screen are drawn (they keep their timing either way).
    if (this.waves) {
      for (const e of this.edges) e.sprite.setVisible(onScreen((e.x + 0.5) * UNIT, (e.y + 0.5) * UNIT));
    }

    // A fish jumps somewhere in open water on screen now and then.
    if (this.kinds.fish && time > this.nextFish) {
      this.nextFish = time + 4000 + Math.random() * 8000;
      for (let i = 0; i < 30; i++) {
        const x = Math.floor(view.x0 / UNIT + Math.random() * (view.x1 - view.x0) / UNIT);
        const y = Math.floor(view.y0 / UNIT + Math.random() * (view.y1 - view.y0) / UNIT);
        if (![-1, 0, 1].every(dy => [-1, 0, 1].every(dx => this.wet(x + dx, y + dy)))) continue;
        const x0 = (x + 0.5) * UNIT, y0 = (y + 0.6) * UNIT, dir = Math.random() < 0.5 ? -1 : 1;
        this.fish.push({ x0, y0, x1: x0 + dir * 20, born: time, color: Math.random() < 0.3 ? 0xf0a040 : 0xd8e8f0 });
        this.rings.push({ x: x0, y: y0, born: time, life: 900, size: 7, color: 0xe8fbff });
        break;
      }
    }
    this.fish = this.fish.filter(f => {
      const k = (time - f.born) / 700;
      if (k >= 1) {
        this.rings.push({ x: f.x1, y: f.y0, born: time, life: 900, size: 8, color: 0xe8fbff });
        return false;
      }
      const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 - Math.sin(k * Math.PI) * 14;
      const dir = Math.sign(f.x1 - f.x0);
      this.water.fillStyle(f.color, 1).fillRect(Math.round(x) - 2, Math.round(y), 5, 2);
      this.water.fillStyle(0x284858, 1).fillRect(Math.round(x) + (dir > 0 ? 2 : -2), Math.round(y), 1, 1); // eye
      this.water.fillStyle(f.color, 1).fillRect(Math.round(x) - dir * 3, Math.round(y) + (k < 0.5 ? 1 : -1), 1, 2); // tail
      return true;
    });

    // Lava bubbles: swell, then pop with a bright ring.
    if (this.kinds.bubbles && time > this.nextBubble) {
      this.nextBubble = time + 250 + Math.random() * 700;
      for (let i = 0; i < 12; i++) {
        const x = Math.floor(view.x0 / UNIT + Math.random() * (view.x1 - view.x0) / UNIT);
        const y = Math.floor(view.y0 / UNIT + Math.random() * (view.y1 - view.y0) / UNIT);
        if (!this.wet(x, y) || !this.wet(x, y - 1)) continue;
        this.bubbles.push({ x: (x + Math.random()) * UNIT, y: (y + 0.3 + Math.random() * 0.6) * UNIT, born: time, life: 900 + Math.random() * 600, size: 2 + Math.floor(Math.random() * 3), color: 0xffd060 });
        break;
      }
    }
    this.bubbles = this.bubbles.filter(b => {
      const k = (time - b.born) / b.life;
      if (k >= 1) { this.rings.push({ x: b.x, y: b.y, born: time, life: 500, size: b.size + 4, color: 0xffe080 }); return false; }
      const r = Math.max(1, Math.round(b.size * Math.min(1, k * 1.4)));
      this.water.fillStyle(0x8a2410, 0.9).fillRect(Math.round(b.x) - r, Math.round(b.y) - r + 1, r * 2, r * 2 - 1);
      this.water.fillStyle(b.color, 0.9).fillRect(Math.round(b.x) - r + 1, Math.round(b.y) - r, Math.max(1, r - 1), 1);
      return true;
    });

    // Lava: embers drift up off it, and at night it glows through the dark.
    if (this.kinds.embers) {
      if (time > this.nextEmber) {
        this.nextEmber = time + 120 + Math.random() * 260;
        for (let i = 0; i < 10; i++) {
          const x = Math.floor(view.x0 / UNIT + Math.random() * (view.x1 - view.x0) / UNIT);
          const y = Math.floor(view.y0 / UNIT + Math.random() * (view.y1 - view.y0) / UNIT);
          if (!this.wet(x, y)) continue;
          this.embers.push({ x: (x + Math.random()) * UNIT, y: (y + Math.random()) * UNIT, born: time, life: 1400 + Math.random() * 1400, vx: (Math.random() - 0.3) * 8 });
          break;
        }
        if (this.embers.length > 50) this.embers.shift();
      }
      this.embers = this.embers.filter(e => {
        const age = time - e.born;
        if (age > e.life) return false;
        const k = age / e.life;
        const x = Math.round(e.x + e.vx * age / 1000 + Math.sin(age / 300 + e.x) * 2), y = Math.round(e.y - age * 0.018);
        const a = (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8) * (0.7 + 0.3 * Math.sin(age / 90));
        this.glow.fillStyle(k < 0.5 ? 0xffd070 : 0xff7a30, a).fillRect(x, y, 1, 1);
        this.glow.fillStyle(0xff6a20, a * 0.35).fillRect(x - 1, y - 1, 3, 3);
        return true;
      });
      if (this.lavaGlow) this.lavaGlow.setVisible(night > 0.05).setAlpha(0.3 * night);
    }

    // Rings (ripples, splashes, pops): a pixel ellipse that grows and fades.
    this.rings = this.rings.filter(r => {
      const k = (time - r.born) / r.life;
      if (k >= 1) return false;
      const rx = Math.round(2 + r.size * k), ry = Math.max(1, Math.round(rx * 0.45));
      const a = 0.7 * (1 - k);
      this.water.fillStyle(r.color, a);
      for (let s = 0; s < 16; s++) {
        const ang = (s / 16) * Math.PI * 2;
        this.water.fillRect(Math.round(r.x + Math.cos(ang) * rx), Math.round(r.y + Math.sin(ang) * ry), 1, 1);
      }
      return true;
    });

    // Footprints: two little dents side by side across the way they walked, fading out.
    this.prints = this.prints.filter(p => {
      const k = (time - p.born) / PRINT_MS;
      if (k >= 1) return false;
      if (!onScreen(p.x, p.y)) return true;
      const a = 0.6 * (1 - k * k);
      const sx = p.dy !== 0 ? 3 : 0, sy = p.dx !== 0 ? 3 : 0; // feet apart, across the step
      const w = p.dx !== 0 ? 3 : 2, h = p.dx !== 0 ? 2 : 3; // a foot is longer the way you walk
      this.ground.fillStyle(0x9c7c4c, a);
      for (const step of [-8, 0, 8]) {
        const side = step === 0 ? 1 : -1; // left, right, left
        this.ground.fillRect(Math.round(p.x + side * sx + p.dx * step), Math.round(p.y + side * sy + 2 + p.dy * step), w, h);
      }
      return true;
    });

    // Ash puffs: grey bits that drift up and fade.
    this.puffs = this.puffs.filter(p => {
      const age = time - p.born;
      if (age > PUFF_MS) return false;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = age / PUFF_MS;
      this.ground.fillStyle(k < 0.4 ? 0x8a7c74 : 0x6a5e58, 0.6 * (1 - k));
      const s = k < 0.5 ? 2 : 3;
      this.ground.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      return true;
    });
  }

  destroy() {
    for (const img of [this.deep, this.lavaGlow]) img?.destroy();
    for (const key of [this.deepKey, this.lavaGlowKey]) if (key && this.scene.textures.exists(key)) this.scene.textures.remove(key);
    this.waves?.destroy(true);
    this.water.destroy();
    this.ground.destroy();
    this.glow.destroy();
  }
}
