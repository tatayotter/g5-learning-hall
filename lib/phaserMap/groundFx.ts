// lib/phaserMap/groundFx.ts
// Little touches on the ground and the water (lib/wildlife.ts GROUND_FX says which a map has):
// - foam washing in and out where water meets land (drawn over the sand's soft edge),
// - lava bubbles that swell and pop,
// - ripples on the water next to anyone walking along it,
// - a fish jumping now and then,
// - footprints left in the sand (fading after a while),
// - puffs of ash kicked up by every step,
// - embers rising off the lava, and the lava glowing brighter at night.
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
interface Edge { x: number; y: number; side: 0 | 1 | 2 | 3; phase: number } // side: 0 up, 1 right, 2 down, 3 left

const PRINT_MS = 9000;
const PUFF_MS = 650;

export default class GroundFx {
  private water: Phaser.GameObjects.Graphics; // on the water, under the land's edge
  private ground: Phaser.GameObjects.Graphics; // on the ground, under players
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

  private constructor(scene: Phaser.Scene, private kinds: GroundFxKinds, private map: FxMap) {
    this.water = scene.add.graphics();
    this.ground = scene.add.graphics();
    this.glow = scene.add.graphics().setDepth(GLOW_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
    if (kinds.foam) {
      const { width: W, height: H, liquid } = map;
      const dirs: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!liquid[y][x]) continue;
        dirs.forEach(([dx, dy], side) => {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || liquid[ny][nx]) return;
          // Waves roll along the coast: neighbours are a little behind each other.
          this.edges.push({ x, y, side: side as Edge['side'], phase: (x * 0.9 + y * 0.6) % (Math.PI * 2) });
        });
      }
    }
  }

  // Water bits go just over the liquid layer (under the land's soft edge), ground bits just
  // under the players' shadows. The scene says where those are once its map has loaded.
  setDepths(water: number, ground: number) {
    if (this.water.depth !== water) this.water.setDepth(water);
    if (this.ground.depth !== ground) this.ground.setDepth(ground);
  }

  private wet(x: number, y: number) { return !!this.map.liquid[y]?.[x]; }

  update(t: Transform, time: number, walkers: { id: string; x: number; y: number }[], night = 0) {
    const scale = t.tileW / UNIT;
    for (const g of [this.water, this.ground, this.glow]) g.setPosition(t.offsetX, t.offsetY).setScale(scale).clear();
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

    // Foam: short white dashes along the shore, washing in and out.
    if (this.kinds.foam) {
      for (const e of this.edges) {
        const cx = (e.x + 0.5) * UNIT, cy = (e.y + 0.5) * UNIT;
        if (!onScreen(cx, cy)) continue;
        const wave = Math.sin(time / 900 + e.phase); // -1 out .. 1 in
        // The water's edge runs through the middle of a shore tile (the sand's soft edge covers
        // the land half), so the foam starts there and washes up to 4 px onto the sand and back.
        const reach = Math.round(14 + wave * 4); // px from the land side of the tile
        const a = 0.35 + 0.35 * Math.max(0, wave);
        for (let i = 0; i < 4; i++) {
          // Dashes spread along the edge, each a slightly different length.
          const along = 2 + i * 8 + ((e.x * 7 + e.y * 3 + i * 5) % 4);
          const len = 3 + ((e.x + e.y * 5 + i) % 4);
          const back = reach + (i % 2) * 2;
          let x = 0, y = 0, w = len, h = 1;
          if (e.side === 0) { x = e.x * UNIT + along; y = e.y * UNIT + back; }
          else if (e.side === 2) { x = e.x * UNIT + along; y = (e.y + 1) * UNIT - 1 - back; }
          else if (e.side === 3) { x = e.x * UNIT + back; y = e.y * UNIT + along; w = 1; h = len; }
          else { x = (e.x + 1) * UNIT - 1 - back; y = e.y * UNIT + along; w = 1; h = len; }
          this.ground.fillStyle(0xf4ffff, a).fillRect(x, y, w, h);
        }
      }
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
      if (night > 0.05) {
        this.glow.fillStyle(0xff7020, 0.28 * night);
        for (let y = Math.max(0, Math.floor(view.y0 / UNIT)); y < Math.min(this.map.height, Math.ceil(view.y1 / UNIT)); y++) {
          for (let x = Math.max(0, Math.floor(view.x0 / UNIT)); x < Math.min(this.map.width, Math.ceil(view.x1 / UNIT)); x++) {
            if (this.wet(x, y)) this.glow.fillRect(x * UNIT, y * UNIT, UNIT, UNIT);
          }
        }
      }
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
    this.water.destroy();
    this.ground.destroy();
    this.glow.destroy();
  }
}
