// lib/phaserMap/islandCurios.ts
// A kid's curios at their Hideout, once the Curio Camp is built: every curio they own strolls
// around near the Camp, stops to rest, and turns to face a kid who walks up (who can then feed it,
// TrainingMap.tsx). A curio with bond hearts (lib/craftingConfig.ts) has them floating over its
// head, one to five.
//
// Sizes and floating follow the battle stage (lib/curioBody.ts): the art is trimmed of its
// transparent padding like the battle scene does, then shown at its size class's battle height
// times MAP_SCALE, so a huge curio towers over a tiny one here too, and a floater hovers over its
// shadow and bobs instead of hopping. The curio art is big painted art (public/monsters/*.webp,
// ~700 px); each is drawn once, trimmed, into a small canvas so it stays smooth at map size. Everything sits in one Container that follows the
// camera like a tilemap layer (the scene keeps it in its tilemapLayers list), in map units (32 per
// tile), over the plants and under the players. With "reduce motion" on they stand still.
import Phaser from 'phaser';
import { CURIO_MAX_WIDTH_PX, CURIO_SIZE_HEIGHT_PX, FLOAT_BOB_PX, FLOAT_LIFT_PX, type CurioSize } from '@/lib/curioBody';

export interface IslandCurio {
  id: string;
  sprite: string; // public/monsters/<sprite>.webp
  hearts: number;
  size: CurioSize;
  floats: boolean;
}

export interface IslandCurioState {
  curios: IslandCurio[];
  // Where they gather (the Curio Camp's tile) and how far they wander from it, in tiles.
  home: { x: number; y: number };
  range: number;
  // Tiles they can't stand on (plots, the signpost) on top of the map's own walls and water.
  blocked: { x: number; y: number }[];
  // The one the kid is feeding: it stays put.
  hold?: string | null;
}

export interface Grounds {
  width: number;
  height: number;
  open: boolean[][];
  liquid: boolean[][];
}

const UNIT = 32;
const ART_PX = 96; // the small copy's height
// Battle-stage pixels to map pixels: a medium curio (125 on the stage) stands 30 tall here, a
// little under a player (~34).
const MAP_SCALE = 0.24;
const SPEED = 0.9; // tiles per second
const STOP_NEAR = 1.7; // tiles: a kid this close stops it and it looks at them
const HEART_W = 7, HEART_H = 6, HEART_GAP = 1;

interface Walker {
  def: IslandCurio;
  // Its shadow, body and hearts, at its feet (the main container sorts these by y).
  box: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image | null;
  shadow: Phaser.GameObjects.Ellipse;
  hearts: Phaser.GameObjects.Image[];
  x: number; // tile, feet (middle of the tile = +0.5)
  y: number;
  to: { x: number; y: number } | null;
  restUntil: number;
  facingRight: boolean;
  phase: number;
  aspect: number;
}

export default class IslandCurios {
  readonly container: Phaser.GameObjects.Container;
  private walkers = new Map<string, Walker>();
  private state: IslandCurioState | null = null;
  private ok = new Set<number>();
  private zone: { x: number; y: number }[] = [];
  private still = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  private lastT = 0;

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.Tilemaps.TilemapLayer,
    depth: number,
    private grounds: Grounds | null,
    private loadTexture: (key: string, url: string, onReady: () => void) => void,
  ) {
    this.container = scene.add.container(layer.x, layer.y);
    this.container.setScale(layer.scaleX);
    this.container.setDepth(depth);
  }

  setGrounds(g: Grounds | null) {
    if (g === this.grounds) return;
    this.grounds = g;
    this.rebuildZone();
  }

  setState(s: IslandCurioState | null) {
    const zoneChanged = !this.state || !s || this.state.home.x !== s.home.x || this.state.home.y !== s.home.y
      || this.state.range !== s.range || this.state.blocked.length !== s.blocked.length;
    this.state = s;
    if (zoneChanged) this.rebuildZone();
    const want = new Map((s?.curios ?? []).map(c => [c.id, c]));
    for (const [id, w] of this.walkers) if (!want.has(id)) { this.drop(w); this.walkers.delete(id); }
    for (const c of want.values()) {
      const w = this.walkers.get(c.id);
      if (w) {
        const heartsChanged = w.def.hearts !== c.hearts;
        w.def = c;
        if (heartsChanged) this.drawHearts(w);
      } else this.add(c);
    }
  }

  /** Where each curio stands (tile, feet), for "walk up and feed". */
  spots(): { id: string; x: number; y: number }[] {
    return [...this.walkers.values()].filter(w => w.body).map(w => ({ id: w.def.id, x: w.x, y: w.y }));
  }

  private key = (x: number, y: number) => y * 10000 + x;

  private rebuildZone() {
    this.ok.clear();
    this.zone = [];
    const s = this.state, g = this.grounds;
    if (!s || !g) return;
    const blocked = new Set(s.blocked.map(t => this.key(t.x, t.y)));
    for (let y = Math.max(0, s.home.y - s.range); y <= Math.min(g.height - 1, s.home.y + s.range); y++) {
      for (let x = Math.max(0, s.home.x - s.range); x <= Math.min(g.width - 1, s.home.x + s.range); x++) {
        if (!g.open[y]?.[x] || g.liquid[y]?.[x] || blocked.has(this.key(x, y))) continue;
        if (Math.hypot(x - s.home.x, y - s.home.y) > s.range) continue;
        this.ok.add(this.key(x, y));
        this.zone.push({ x, y });
      }
    }
    // Anyone now standing somewhere they can't: back into the zone.
    for (const w of this.walkers.values()) {
      if (!this.ok.has(this.key(Math.floor(w.x), Math.floor(w.y)))) this.placeRandom(w);
    }
  }

  private placeRandom(w: Walker) {
    const t = this.zone.length ? this.zone[Math.floor(Math.random() * this.zone.length)] : this.state?.home ?? { x: 0, y: 0 };
    w.x = t.x + 0.5; w.y = t.y + 0.5; w.to = null;
  }

  private add(c: IslandCurio) {
    const box = this.scene.add.container(0, 0);
    const shadow = this.scene.add.ellipse(0, 0, 18, 6, 0x1b120c, 0.3);
    box.add(shadow);
    this.container.add(box);
    const w: Walker = {
      def: c, box, body: null, shadow, hearts: [], x: 0, y: 0, to: null,
      restUntil: 0, facingRight: Math.random() < 0.5, phase: Math.random() * Math.PI * 2, aspect: 1,
    };
    this.placeRandom(w);
    this.walkers.set(c.id, w);
    const big = `monster:${c.sprite}`, small = `monster-small:${c.sprite}`;
    const ready = () => {
      if (this.walkers.get(c.id) !== w || w.body) return;
      if (!this.scene.textures.exists(small)) {
        const src = this.scene.textures.get(big).getSourceImage() as HTMLImageElement;
        // Find the art's own box (no transparent padding), on a quick small copy.
        const probe = document.createElement('canvas');
        const pk = Math.min(1, 256 / Math.max(src.width, src.height));
        probe.width = Math.max(1, Math.round(src.width * pk)); probe.height = Math.max(1, Math.round(src.height * pk));
        const pc = probe.getContext('2d', { willReadFrequently: true });
        let box = { x: 0, y: 0, w: src.width, h: src.height };
        if (pc) {
          pc.drawImage(src, 0, 0, probe.width, probe.height);
          const a = pc.getImageData(0, 0, probe.width, probe.height).data;
          let x0 = probe.width, y0 = probe.height, x1 = -1, y1 = -1;
          for (let y = 0; y < probe.height; y++) for (let x = 0; x < probe.width; x++) {
            if (a[(y * probe.width + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          }
          if (x1 >= x0) box = { x: x0 / pk, y: y0 / pk, w: (x1 - x0 + 1) / pk, h: (y1 - y0 + 1) / pk };
        }
        const tex = this.scene.textures.createCanvas(small, Math.max(1, Math.round(ART_PX * box.w / box.h)), ART_PX);
        if (!tex) return;
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(src, box.x, box.y, box.w, box.h, 0, 0, tex.width, tex.height);
        tex.refresh();
      }
      const t = this.scene.textures.get(small).getSourceImage() as HTMLCanvasElement;
      w.aspect = t.width / t.height;
      w.body = this.scene.add.image(0, 0, small).setOrigin(0.5, 1);
      w.box.add(w.body);
      this.drawHearts(w);
    };
    if (this.scene.textures.exists(small)) ready();
    else this.loadTexture(big, `/monsters/${c.sprite}.webp`, ready);
  }

  private drawHearts(w: Walker) {
    for (const h of w.hearts) h.destroy();
    w.hearts = [];
    const n = Math.max(0, Math.min(5, Math.floor(w.def.hearts)));
    if (!n) return;
    const make = () => {
      if (!this.walkers.has(w.def.id) || w.hearts.length) return;
      for (let i = 0; i < n; i++) {
        const img = this.scene.add.image(0, 0, 'bond-heart').setDisplaySize(HEART_W, HEART_H).setOrigin(0.5, 1);
        w.box.add(img);
        w.hearts.push(img);
      }
    };
    this.loadTexture('bond-heart', '/craft/heart_full.png', () => {
      this.scene.textures.get('bond-heart').setFilter(Phaser.Textures.FilterMode.NEAREST);
      make();
    });
  }

  private drop(w: Walker) {
    w.box.destroy();
  }

  // Straight line from here to there over tiles they may stand on.
  private clear(x0: number, y0: number, x1: number, y1: number) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3);
    for (let i = 1; i <= steps; i++) {
      const x = x0 + (x1 - x0) * (i / steps), y = y0 + (y1 - y0) * (i / steps);
      if (!this.ok.has(this.key(Math.floor(x), Math.floor(y)))) return false;
    }
    return true;
  }

  /** time: scene time (ms). kid: the kid's feet in map units (32 per tile), if on the map. */
  update(time: number, kid: { x: number; y: number } | null) {
    const dt = this.lastT ? Math.min(0.1, (time - this.lastT) / 1000) : 0;
    this.lastT = time;
    const kx = kid ? kid.x / UNIT : null, ky = kid ? kid.y / UNIT : null;
    for (const w of this.walkers.values()) {
      const near = kx !== null && ky !== null && Math.hypot(kx - w.x, ky - w.y) < STOP_NEAR;
      const held = near || this.state?.hold === w.def.id;
      if (held && kx !== null) { w.facingRight = kx > w.x; w.restUntil = Math.max(w.restUntil, time + 1500); }
      let walking = false;
      if (!this.still && !held) {
        if (w.to) {
          const dx = w.to.x - w.x, dy = w.to.y - w.y, d = Math.hypot(dx, dy), step = SPEED * dt;
          if (d <= step) { w.x = w.to.x; w.y = w.to.y; w.to = null; w.restUntil = time + 2000 + Math.random() * 5000; }
          else { w.x += (dx / d) * step; w.y += (dy / d) * step; walking = true; if (Math.abs(dx) > 0.05) w.facingRight = dx > 0; }
        } else if (time >= w.restUntil && this.zone.length) {
          // A spot a few tiles away it can walk straight to.
          for (let tries = 0; tries < 8; tries++) {
            const t = this.zone[Math.floor(Math.random() * this.zone.length)];
            const tx = t.x + 0.5, ty = t.y + 0.5;
            if (Math.hypot(tx - w.x, ty - w.y) > 4 || !this.clear(w.x, w.y, tx, ty)) continue;
            w.to = { x: tx, y: ty };
            break;
          }
          if (!w.to) w.restUntil = time + 1000;
        }
      }
      const px = w.x * UNIT, py = w.y * UNIT + 6;
      // Its battle height, capped in width like the battle stage.
      const bodyH = Math.min(CURIO_SIZE_HEIGHT_PX[w.def.size] ?? CURIO_SIZE_HEIGHT_PX.medium, CURIO_MAX_WIDTH_PX / w.aspect) * MAP_SCALE;
      // A walker hops along and breathes at rest; a floater hovers over its shadow and bobs.
      const lift = w.def.floats
        ? (FLOAT_LIFT_PX + (this.still ? 0 : Math.sin(time / 700 + w.phase) * FLOAT_BOB_PX / 2)) * MAP_SCALE
        : walking ? Math.abs(Math.sin(time / 110 + w.phase)) * 2.5 : 0;
      const breathe = this.still || w.def.floats ? 1 : 1 + Math.sin(time / 600 + w.phase) * 0.025;
      w.box.setPosition(px, py);
      const shadowW = Math.max(10, Math.min(30, bodyH * w.aspect * 0.7));
      w.shadow.setSize(shadowW, shadowW / 3).setScale(w.def.floats ? 0.8 : 1 - lift * 0.06).setAlpha(w.def.floats ? 0.2 : 0.3);
      if (w.body) {
        const s = bodyH / ART_PX;
        w.body.setPosition(0, -lift).setScale(w.facingRight ? s : -s, s * breathe);
      }
      // Hearts float over the head, bobbing gently.
      const n = w.hearts.length;
      const rowW = n * HEART_W + (n - 1) * HEART_GAP;
      const top = -lift - bodyH * breathe - 3 + (this.still ? 0 : Math.sin(time / 450 + w.phase) * 1.2);
      w.hearts.forEach((h, i) => h.setPosition(-rowW / 2 + HEART_W / 2 + i * (HEART_W + HEART_GAP), top));
    }
    // Farther down the island draws in front.
    this.container.sort('y');
  }

  destroy() {
    for (const w of this.walkers.values()) this.drop(w);
    this.walkers.clear();
    this.container.destroy();
  }
}
