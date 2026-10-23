// lib/phaserMap/ambience.ts
// Draws a map's sky (lib/ambience.ts): cloud shadows, things drifting in the air, and the
// sunset tint.
//
// - Cloud shadows lie over everything on the map (ground, bushes, treetops, players), so a
//   cloud darkens what's under it the same way a real one does, instead of sliding under the
//   trees. Each is a lumpy shape at a quarter of the art's resolution, so its edge steps in
//   chunky pixels, fading in three steps. They drift with the wind; where they are comes from
//   the clock and the day, so every kid sees the same sky.
// - Drifting bits (leaves, embers, petals) float through the part of the map on screen, above
//   the cloud shadows (they're in the air).
// - Near sunset, a warm color is multiplied over the whole view; at night a deep blue darkens it
//   and fireflies blink over the grass (they glow over the dark).
// - Some hours it drizzles (lib/ambience.ts isRaining): thin streaks and a grey cast, and over
//   the Stormrun lightning flashes now and then.
// - A gloomy place (the Unread Margins) stays half-dark all day, fireflies out.
//
// The containers work in map units (32 per tile) and follow the map's camera transform each
// frame, so they fit tile-art and painted maps alike. With "reduce motion" on, the clouds
// stand still and nothing drifts.
import Phaser from 'phaser';
import { sunsetStrength, nightStrength, isRaining, type Ambience } from '@/lib/ambience';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

const UNIT = 32;
const CELL = 4; // art pixels per cloud pixel
const CLOUD_DEPTH = 40;
const DRIFT_DEPTH = 41;
const SUNSET_DEPTH = 42;
const NIGHT_DEPTH = 42.5;
export const GLOW_DEPTH = 43; // lights that shine through the night (fireflies, lava, wisps)
const NIGHT_COLOR = 0x28366e;
const RAIN_COLOR = 0x8a94a0;
// Wind direction: to the right and a little down, like the grass leans.
const WIND = { x: 0.97, y: 0.24 };

function seededRand(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Cloud { image: Phaser.GameObjects.Image; x: number; y: number; w: number; h: number }
interface Fly { glow: Phaser.GameObjects.Arc; dot: Phaser.GameObjects.Rectangle; x: number; y: number; vx: number; vy: number; phase: number }
interface Drop { shape: Phaser.GameObjects.Rectangle; x: number; y: number; speed: number }
interface Bit {
  shape: Phaser.GameObjects.Rectangle;
  x: number; y: number; vx: number; vy: number;
  phase: number; born: number; life: number;
}

export interface Transform { tileW: number; tileH: number; offsetX: number; offsetY: number }

export default class AmbienceLayer {
  private clouds: Cloud[] = [];
  private cloudBox: Phaser.GameObjects.Container;
  private driftBox: Phaser.GameObjects.Container;
  private sunset: Phaser.GameObjects.Rectangle;
  private night: Phaser.GameObjects.Rectangle;
  private rainCast: Phaser.GameObjects.Rectangle;
  private flash: Phaser.GameObjects.Rectangle;
  private nextFlash = 0;
  private flashAt = -Infinity;
  private glowBox: Phaser.GameObjects.Container;
  private flies: Fly[] = [];
  private drops: Drop[] = [];
  private raining = false;
  private darkness = 0;
  private bits: Bit[] = [];
  private readonly still: boolean;
  private lastNow = 0;
  private sunsetCheckedAt = -Infinity;

  constructor(
    private scene: Phaser.Scene,
    private sky: Ambience,
    private key: string, // region + day: the day's clouds
    private mapW: number, // tiles
    private mapH: number,
  ) {
    this.still = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.cloudBox = scene.add.container(0, 0).setDepth(CLOUD_DEPTH);
    this.driftBox = scene.add.container(0, 0).setDepth(DRIFT_DEPTH);
    this.sunset = scene.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, sky.sunset).setOrigin(0, 0)
      .setDepth(SUNSET_DEPTH).setScrollFactor(0).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0);
    this.night = scene.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, NIGHT_COLOR).setOrigin(0, 0)
      .setDepth(NIGHT_DEPTH).setScrollFactor(0).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0);
    this.rainCast = scene.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, RAIN_COLOR).setOrigin(0, 0)
      .setDepth(SUNSET_DEPTH).setScrollFactor(0).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0);
    // Lightning: a white flash over everything, brightest for a blink, then a second flicker.
    this.flash = scene.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0xe8f0ff).setOrigin(0, 0)
      .setDepth(GLOW_DEPTH + 1).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.glowBox = scene.add.container(0, 0).setDepth(GLOW_DEPTH);
    this.makeClouds(key);
  }

  // Enough clouds to shade about `cover` of the map, each a seeded shape and starting spot.
  private makeClouds(key: string) {
    const rand = seededRand(`clouds:${key}`);
    const { cover, darkness, color } = this.sky.clouds;
    const mapArea = this.mapW * this.mapH;
    let shaded = 0;
    for (let i = 0; shaded < cover * mapArea && i < 24; i++) {
      const wTiles = 9 + rand() * 8;
      const hTiles = wTiles * (0.5 + rand() * 0.2);
      const tex = `ambience:cloud:${key}:${i}`;
      if (!this.scene.textures.exists(tex)) this.paintCloud(tex, wTiles, hTiles, rand, darkness, color);
      const image = this.scene.add.image(0, 0, tex).setOrigin(0, 0).setScale(CELL);
      this.cloudBox.add(image);
      this.clouds.push({ image, x: rand() * this.mapW * UNIT, y: rand() * this.mapH * UNIT, w: wTiles * UNIT, h: hTiles * UNIT });
      shaded += wTiles * hTiles * 0.6;
    }
  }

  // A lumpy cloud shadow: a few overlapping soft blobs, cut into four levels of shade.
  private paintCloud(tex: string, wTiles: number, hTiles: number, rand: () => number, darkness: number, color: number) {
    const w = Math.round((wTiles * UNIT) / CELL);
    const h = Math.round((hTiles * UNIT) / CELL);
    // Blobs kept inside the picture, and the shade fading out before its border, so a cloud's
    // edge is always its own lumpy outline, never the straight edge of the picture.
    const blobs = Array.from({ length: 5 + Math.floor(rand() * 4) }, () => {
      const r = Math.min(w, h) * (0.16 + rand() * 0.14);
      return { x: r * 1.4 + rand() * (w - r * 2.8), y: r * 1.2 + rand() * (h - r * 2.4), r };
    });
    const margin = Math.min(w, h) * 0.18;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d')!;
    const r = (color >> 16) & 255, gr = (color >> 8) & 255, b = color & 255;
    const steps = [0.3, 0.6, 0.85, 1];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let f = 0;
      for (const bl of blobs) {
        const d2 = ((x - bl.x) ** 2 + ((y - bl.y) * 1.3) ** 2) / (bl.r * bl.r);
        f += Math.exp(-d2);
      }
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y) / margin;
      if (edge < 1) f *= Math.max(0, edge) ** 1.5;
      const level = f > 1.3 ? 3 : f > 0.95 ? 2 : f > 0.7 ? 1 : f > 0.5 ? 0 : -1;
      if (level < 0) continue;
      g.fillStyle = `rgba(${r},${gr},${b},${(darkness * steps[level]).toFixed(3)})`;
      g.fillRect(x, y, 1, 1);
    }
    this.scene.textures.addCanvas(tex, canvas);
  }

  /** How dark the night is right now (0..1), for other layers' lights. */
  get nightLevel() { return this.darkness; }

  update(t: Transform, time: number) {
    const scale = t.tileW / UNIT;
    for (const box of [this.cloudBox, this.driftBox, this.glowBox]) box.setPosition(t.offsetX, t.offsetY).setScale(scale);

    // Clouds: where the wind has carried them by now, wrapped around the map with a margin.
    const secs = this.still ? 0 : (Date.now() % 86_400_000) / 1000;
    const travel = secs * this.sky.clouds.speed;
    const spanX = this.mapW * UNIT, spanY = this.mapH * UNIT;
    for (const c of this.clouds) {
      const wrapX = spanX + c.w, wrapY = spanY + c.h;
      const x = ((c.x + travel * WIND.x) % wrapX + wrapX) % wrapX - c.w;
      const y = ((c.y + travel * WIND.y) % wrapY + wrapY) % wrapY - c.h;
      // Whole art pixels, so the chunky edge never shimmers.
      c.image.setPosition(Math.round(x), Math.round(y));
    }

    // Sunset: checked every few seconds; the clock moves slowly.
    if (time - this.sunsetCheckedAt > 5000) {
      this.sunsetCheckedAt = time;
      this.sunset.setAlpha(0.5 * sunsetStrength());
      this.darkness = Math.max(nightStrength(), this.sky.gloom ?? 0);
      this.night.setAlpha(0.5 * this.darkness);
      this.raining = isRaining(this.sky, this.key);
    }
    // The grey of a rainy sky comes and goes gently.
    const cast = this.raining ? 0.22 : 0;
    this.rainCast.setAlpha(this.rainCast.alpha + (cast - this.rainCast.alpha) * 0.02);

    if (!this.still) {
      this.updateLightning(time);
      this.updateDrift(t, scale, time);
      this.updateFireflies(t, scale, time);
      this.updateRain(t, scale);
    }
  }

  // Every 6 to 16 seconds of rain: a bright blink, a dimmer second one just after, fading out.
  // Off with reduced motion (flashing light).
  private updateLightning(time: number) {
    if (!this.sky.lightning || !this.raining) { this.flash.setAlpha(0); return; }
    if (time > this.nextFlash) {
      if (this.nextFlash) this.flashAt = time;
      this.nextFlash = time + 6000 + Math.random() * 10000;
    }
    const t = time - this.flashAt;
    const a = t < 0 ? 0 : t < 80 ? 0.55 : t < 160 ? 0.1 : t < 240 ? 0.35 : t < 700 ? 0.35 * (1 - (t - 240) / 460) : 0;
    this.flash.setAlpha(a);
  }

  private view(t: Transform, scale: number) {
    return { x: -t.offsetX / scale, y: -t.offsetY / scale, w: CANVAS_WIDTH / scale, h: CANVAS_HEIGHT / scale };
  }

  // Fireflies: tiny yellow-green lights drifting low over the map at night, each blinking slowly.
  private updateFireflies(t: Transform, scale: number, time: number) {
    const view = this.view(t, scale);
    const want = this.darkness > 0.3 && this.sky.fireflies ? Math.round(this.sky.fireflies * Math.min(3, (view.w * view.h) / (12 * 20 * UNIT * UNIT))) : 0;
    while (this.flies.length < want) {
      const glow = this.scene.add.circle(0, 0, 5, 0xc8ff60, 0.25).setBlendMode(Phaser.BlendModes.ADD);
      const dot = this.scene.add.rectangle(0, 0, 2, 2, 0xf0ffb0);
      this.glowBox.add([glow, dot]);
      this.flies.push({ glow, dot, x: view.x + Math.random() * view.w, y: view.y + Math.random() * view.h, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 });
    }
    while (this.flies.length > want) { const f = this.flies.pop()!; f.glow.destroy(); f.dot.destroy(); }
    for (const f of this.flies) {
      f.vx += (Math.random() - 0.5) * 2; f.vy += (Math.random() - 0.5) * 2;
      f.vx = Math.max(-8, Math.min(8, f.vx)); f.vy = Math.max(-6, Math.min(6, f.vy));
      f.x += f.vx / 60; f.y += f.vy / 60;
      // Wrap around the view so they stay where the kid is looking.
      if (f.x < view.x - 10) f.x += view.w + 20; else if (f.x > view.x + view.w + 10) f.x -= view.w + 20;
      if (f.y < view.y - 10) f.y += view.h + 20; else if (f.y > view.y + view.h + 10) f.y -= view.h + 20;
      const blink = Math.max(0, Math.sin(time / 700 + f.phase)) ** 2 * this.darkness;
      f.glow.setPosition(Math.round(f.x), Math.round(f.y)).setAlpha(0.35 * blink);
      f.dot.setPosition(Math.round(f.x), Math.round(f.y)).setAlpha(0.2 + 0.8 * blink);
    }
  }

  // Drizzle: thin streaks slanting down with the wind.
  private updateRain(t: Transform, scale: number) {
    const view = this.view(t, scale);
    const want = this.raining ? Math.round(45 * Math.min(3, (view.w * view.h) / (12 * 20 * UNIT * UNIT))) : 0;
    while (this.drops.length < want) {
      const shape = this.scene.add.rectangle(0, 0, 1, 6, 0xcfe4f4, 0.45).setAngle(-12);
      this.driftBox.add(shape);
      this.drops.push({ shape, x: view.x + Math.random() * view.w, y: view.y + Math.random() * view.h, speed: 200 + Math.random() * 80 });
    }
    while (this.drops.length > want) this.drops.pop()!.shape.destroy();
    for (const d of this.drops) {
      d.y += d.speed / 60; d.x += d.speed * 0.2 / 60;
      if (d.y > view.y + view.h + 8 || d.x > view.x + view.w + 8) { d.y = view.y - 8 - Math.random() * 40; d.x = view.x - 20 + Math.random() * (view.w + 20); }
      d.shape.setPosition(Math.round(d.x), Math.round(d.y));
    }
  }

  private updateDrift(t: Transform, scale: number, time: number) {
    const dt = Math.min(0.1, this.lastNow ? (time - this.lastNow) / 1000 : 0);
    this.lastNow = time;
    const { kind, colors, count, glow, wind } = this.sky.drift;
    // The part of the map on screen, in map units.
    const view = {
      x: -t.offsetX / scale, y: -t.offsetY / scale,
      w: CANVAS_WIDTH / scale, h: CANVAS_HEIGHT / scale,
    };
    // Scale the count with how much map is showing (desktop shows more than a phone).
    const want = Math.round(count * Math.min(3, (view.w * view.h) / (12 * 20 * UNIT * UNIT)));
    while (this.bits.length < want) {
      const fresh = this.bits.length === 0;
      // Leaves are a little wider than tall; embers, spores and petals are squares.
      const size = Math.random() < 0.35 ? 4 : 3;
      const shape = this.scene.add.rectangle(0, 0, size, kind === 'fall' ? size - 1 : size, colors[Math.floor(Math.random() * colors.length)]);
      if (glow) shape.setBlendMode(Phaser.BlendModes.ADD);
      this.driftBox.add(shape);
      const bit: Bit = { shape, x: 0, y: 0, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2, born: time, life: 6000 + Math.random() * 5000 };
      this.spawn(bit, view, kind, wind, fresh);
      this.bits.push(bit);
    }
    for (const bit of this.bits) {
      const age = time - bit.born;
      if (age > bit.life || bit.x < view.x - 40 || bit.x > view.x + view.w + 40 || bit.y < view.y - 60 || bit.y > view.y + view.h + 60) {
        bit.born = time;
        this.spawn(bit, view, kind, wind, false);
        continue;
      }
      const sway = Math.sin(time / 600 + bit.phase);
      bit.x += (bit.vx + sway * 6) * dt;
      bit.y += bit.vy * dt;
      // Fade in and out at the ends of its life; leaves tumble (flip), embers flicker.
      const edge = Math.min(1, age / 600, (bit.life - age) / 900);
      const flicker = glow ? 0.6 + 0.4 * Math.sin(time / 120 + bit.phase * 3) : 1;
      bit.shape.setPosition(Math.round(bit.x), Math.round(bit.y)).setAlpha(Math.max(0, edge) * flicker);
      if (kind === 'fall') bit.shape.setScale(Math.abs(Math.sin(time / 300 + bit.phase)) < 0.3 ? 0.5 : 1, 1);
    }
  }

  // A new bit: anywhere on screen at first, then coming in from the edge it would drift in from.
  private spawn(bit: Bit, view: { x: number; y: number; w: number; h: number }, kind: Ambience['drift']['kind'], wind: number, anywhere: boolean) {
    const r = Math.random;
    bit.vx = wind * (0.6 + r() * 0.8);
    bit.vy = kind === 'fall' ? 10 + r() * 10 : kind === 'rise' ? -(8 + r() * 10) : (r() - 0.5) * 6;
    bit.phase = r() * Math.PI * 2;
    bit.life = 6000 + r() * 5000;
    if (anywhere || r() < 0.5) {
      bit.x = view.x + r() * view.w;
      bit.y = view.y + r() * view.h;
    } else if (r() < 0.5) {
      bit.x = view.x - 10;
      bit.y = view.y + r() * view.h;
    } else {
      bit.x = view.x + r() * view.w;
      bit.y = kind === 'rise' ? view.y + view.h + 10 : view.y - 10;
    }
    bit.shape.setPosition(Math.round(bit.x), Math.round(bit.y)).setAlpha(0);
  }

  destroy() {
    this.cloudBox.destroy();
    this.driftBox.destroy();
    this.sunset.destroy();
    this.night.destroy();
    this.rainCast.destroy();
    this.flash.destroy();
    this.glowBox.destroy();
    this.flies = [];
    this.drops = [];
    this.bits = [];
    this.clouds = [];
  }
}
