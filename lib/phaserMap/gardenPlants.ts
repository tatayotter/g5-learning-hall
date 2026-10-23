// lib/phaserMap/gardenPlants.ts
// Draws the wild veggie plants (lib/gardenConfig.ts) on a tile-art map. Each veggie's art is
// a strip of three frames: ripe, just picked, growing back. Short plants are one tile
// (32x32), corn and beans two tiles tall (32x64), standing on their tile.
//
// Only ripe plants sway, so a kid can spot what's ready from far off. Like the grass
// (swayingGrass.ts), the sway bends rather than rotates: the bottom 30% (soil and stem base)
// stays put and every art-pixel row above slides sideways in proportion to its height, a
// skew. Each plant gets its own speed, strength and start from its spot id, plus a smaller
// second wobble at another speed, so a row of plants never moves in lockstep. Short plants
// lean 2 to 3.5 degrees, tall ones 5 to 7.
//
// The images sit in one Container that follows the camera like a tilemap layer (the scene
// keeps it in its tilemapLayers list), between the ground objects and the players.
import Phaser from 'phaser';
import { addOutline, outlineAlpha } from './outline';

export interface PlantSprite {
  id: string;
  veggie: string;
  x: number;
  y: number;
  stage: 'ripe' | 'picked' | 'growing';
  tall: boolean;
}

const FRAME_W = 32;
const ANCHOR = 0.3;
const FRAME_OF = { ripe: 0, picked: 1, growing: 2 } as const;
const RUSTLE_MS = 500;

interface Drawn {
  key: string;            // veggie + stage: redraw when it changes
  images: Phaser.GameObjects.Image[];
  // The gold outline, when this is the plant the kid is next to.
  outline: Phaser.GameObjects.Image[];
  // Bending rows: image, resting x, and how far it moves at full lean (art px).
  rows: { image: Phaser.GameObjects.Image; x: number; reach: number }[];
  swayMs: number;
  flutterMs: number;
  phase: number;
  phase2: number;
  rustleStart: number;
}

// Seeded 0..1 values from the spot id, so a plant always sways the same way.
function seeded(id: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export default class GardenPlants {
  readonly container: Phaser.GameObjects.Container;
  private drawn = new Map<string, Drawn>();
  private wanted: PlantSprite[] = [];
  private readonly still: boolean;
  private highlight: string | null = null;

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.Tilemaps.TilemapLayer,
    depth: number,
    // The scene's lazy texture loader (calls back once the image is in).
    private loadTexture: (key: string, url: string, onReady: () => void) => void,
  ) {
    this.container = scene.add.container(layer.x, layer.y);
    this.container.setScale(layer.scaleX);
    this.container.setDepth(depth);
    this.still = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  setPlants(plants: PlantSprite[]) {
    this.wanted = plants;
    const ids = new Set(plants.map(p => p.id));
    for (const [id, d] of this.drawn) {
      if (!ids.has(id)) { d.images.forEach(i => i.destroy()); this.drawn.delete(id); }
    }
    for (const p of plants) {
      const key = `${p.veggie}:${p.stage}`;
      const prev = this.drawn.get(p.id);
      if (prev?.key === key) continue;
      const tex = `garden:${p.veggie}`;
      this.loadTexture(tex, `/garden/veggie_${p.veggie}.png`, () => {
        // Something newer may have been asked for while the image loaded.
        const now = this.wanted.find(w => w.id === p.id);
        if (!now || `${now.veggie}:${now.stage}` !== key || this.drawn.get(p.id)?.key === key) return;
        this.draw(now, tex, key, !!prev);
      });
    }
  }

  /** Outline the plant with this id (the one the kid can pick now), or none. */
  setHighlight(id: string | null) {
    if (id === this.highlight) return;
    const was = this.highlight;
    this.highlight = id;
    for (const pid of [was, id]) {
      const p = pid && this.wanted.find(w => w.id === pid);
      const d = pid ? this.drawn.get(pid) : undefined;
      if (p && d) this.draw(p, `garden:${p.veggie}`, d.key, false);
    }
  }

  private draw(p: PlantSprite, tex: string, key: string, changed: boolean) {
    const old = this.drawn.get(p.id);
    // Just picked: a puff of dust and leaves where it stood.
    if (changed && p.stage === 'picked' && old?.key.endsWith(':ripe')) this.dustPop(p);
    old?.images.forEach(i => i.destroy());
    old?.outline.forEach(i => i.destroy());
    const texture = this.scene.textures.get(tex);
    const h = p.tall ? 64 : 32;
    const fx = FRAME_OF[p.stage] * FRAME_W;
    const left = p.x * 32;
    const top = (p.y + 1) * 32 - h;
    const rand = seeded(p.id);
    const images: Phaser.GameObjects.Image[] = [];
    const rows: Drawn['rows'] = [];
    const add = (name: string, y: number, rowsTall: number) => {
      if (!texture.has(name)) texture.add(name, 0, fx, y, FRAME_W, rowsTall);
      const image = this.scene.add.image(left, top + y, tex, name).setOrigin(0, 0);
      this.container.add(image);
      images.push(image);
      return image;
    };
    // The outlined plant holds still, so its outline fits it exactly.
    const focus = p.id === this.highlight;
    let outline: Phaser.GameObjects.Image[] = [];
    if (focus) {
      const name = `${p.stage}:full`;
      if (!texture.has(name)) texture.add(name, 0, fx, 0, FRAME_W, h);
      outline = addOutline(this.scene, this.container, tex, name, left, top);
    }
    if (p.stage !== 'ripe' || this.still || focus) {
      add(`${p.stage}:full`, 0, h);
    } else {
      const seam = Math.round(h * (1 - ANCHOR));
      add('ripe:base', seam, h - seam);
      const degrees = p.tall ? 5 + rand() * 2 : 2 + rand() * 1.5;
      const slope = Math.tan((degrees * Math.PI) / 180);
      for (let r = 0; r < seam; r++) {
        // Rows with nothing drawn in them still get an image; it's cheaper than reading pixels.
        const image = add(`ripe:row:${r}`, r, 1);
        rows.push({ image, x: left, reach: slope * (seam - r - 0.5) });
      }
    }
    this.drawn.set(p.id, {
      key, images, rows, outline,
      swayMs: 2200 + rand() * 1400,
      flutterMs: 1100 + rand() * 700,
      phase: rand() * Math.PI * 2,
      phase2: rand() * Math.PI * 2,
      // A plant that just changed (picked, or grown back) gives a little shake.
      rustleStart: changed ? this.scene.time.now : -Infinity,
    });
    if (changed && rows.length === 0) {
      for (const image of images) {
        this.scene.tweens.add({ targets: image, x: image.x + 1, duration: 60, yoyo: true, repeat: 3 });
      }
    }
  }

  // Soft dust clouds that swell and fade, plus leaf and soil bits that jump out and fall,
  // all square art pixels so it matches the map.
  private dustPop(p: PlantSprite) {
    if (this.still) return;
    const cx = p.x * 32 + 16;
    const base = (p.y + 1) * 32 - 6;
    const add = (o: Phaser.GameObjects.GameObject) => { this.container.add(o); return o; };
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.random() * 0.6;
      const puff = add(this.scene.add.ellipse(cx + Math.cos(a) * 4, base - 2, 10, 7, 0xe8dcc0, 0.85)) as Phaser.GameObjects.Ellipse;
      this.scene.tweens.add({
        targets: puff,
        x: cx + Math.cos(a) * 16, y: base - 6 - Math.random() * 8,
        scaleX: 2, scaleY: 1.8, alpha: 0,
        duration: 450 + Math.random() * 150, ease: 'Cubic.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
    const colors = [0x5d8a2e, 0x7fae3e, 0x3f6b22, 0x8a5a33, 0x6b4426];
    for (let i = 0; i < 12; i++) {
      const bit = add(this.scene.add.rectangle(cx, base - 8, 2, 2, colors[i % colors.length])) as Phaser.GameObjects.Rectangle;
      const dx = (Math.random() - 0.5) * 40;
      const up = 10 + Math.random() * 16;
      this.scene.tweens.add({ targets: bit, x: cx + dx, duration: 520, ease: 'Linear' });
      this.scene.tweens.add({
        targets: bit, y: base - 8 - up, duration: 220, ease: 'Quad.easeOut',
        onComplete: () => this.scene.tweens.add({
          targets: bit, y: base + 2, alpha: 0, duration: 300, ease: 'Quad.easeIn',
          onComplete: () => bit.destroy(),
        }),
      });
    }
  }

  update(now: number) {
    const glow = outlineAlpha(now);
    for (const d of this.drawn.values()) for (const o of d.outline) o.setAlpha(glow);
    if (this.still) return;
    for (const d of this.drawn.values()) {
      if (d.rows.length === 0) continue;
      let lean = (Math.sin((now / d.swayMs) * Math.PI * 2 + d.phase)
        + 0.4 * Math.sin((now / d.flutterMs) * Math.PI * 2 + d.phase2)) / 1.4;
      const r = (now - d.rustleStart) / RUSTLE_MS;
      if (r < 1) lean += 1.5 * Math.sin(r * Math.PI * 4) * (1 - r);
      for (const row of d.rows) row.image.x = row.x + lean * row.reach;
    }
  }

  // The player stepped onto (x, y): shake the plant there, if any.
  rustle(x: number, y: number, now: number) {
    for (const p of this.wanted) {
      if (p.x === x && p.y === y) {
        const d = this.drawn.get(p.id);
        if (d) d.rustleStart = now;
      }
    }
  }

  destroy() {
    this.container.destroy();
    this.drawn.clear();
  }
}
