// lib/phaserMap/guildNpcs.ts
// The guild masters in Inkwell Town (lib/townNpcs.ts): each strolls a few steps around their
// hall door, stops for a while (turning to face a kid who walks up), then wanders on. Drawn like
// the players (screen space, feet on the tile), so the scene sorts them against roofs and gives
// them a silhouette behind one. Purely visual: every kid sees their own. With "reduce motion" on
// they stand still at their door.
import Phaser from 'phaser';
import { NPC_WALK_FRAMES, type TownNpc } from '@/lib/townNpcs';
import type { Transform } from './ambience';

const SPEED = 1.3; // tiles per second
const FPS = 14;
const BODY_PX = 112; // character height in the sheet (build_npcs.py BODY)
const BODY_TILES = 1.05; // shown about as tall as a player

export interface NpcSprite {
  image: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  tag: Phaser.GameObjects.Text;
  x: number; // tile, feet
  y: number;
  baseScaleY: number;
  srcKey: string;
}

interface Npc extends NpcSprite {
  def: TownNpc;
  zone: Set<number>;
  path: { x: number; y: number }[];
  restUntil: number;
  walking: boolean;
  ready: boolean;
}

export default class GuildNpcLayer {
  readonly npcs: Npc[] = [];
  private still: boolean;

  private constructor(private scene: Phaser.Scene, private width: number, private height: number, private open: boolean[][]) {
    this.still = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  static build(
    scene: Phaser.Scene, defs: TownNpc[], habitat: { width: number; height: number; open: boolean[][] },
    load: (key: string, url: string, fw: number, fh: number, onReady: () => void) => void,
    shadowDepth: number,
  ): GuildNpcLayer | null {
    if (!defs.length) return null;
    const layer = new GuildNpcLayer(scene, habitat.width, habitat.height, habitat.open);
    for (const def of defs) {
      const home = layer.nearestOpen(def.home.x, def.home.y);
      if (!home) continue;
      const key = `npc-walk:${def.id}`;
      const image = scene.add.sprite(-999, -999, '__DEFAULT').setOrigin(0.5, 1).setDepth(9.5).setVisible(false);
      const shadow = scene.add.ellipse(-999, -999, 10, 4, 0x000000, 0.28).setDepth(shadowDepth).setVisible(false);
      const tag = scene.add.text(-999, -999, def.name, {
        fontFamily: 'Arial, sans-serif', fontStyle: 'bold', fontSize: '12px', color: def.color,
        stroke: '#1a1424', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(41).setResolution(2).setVisible(false);
      const npc: Npc = {
        def, image, shadow, tag, x: home.x, y: home.y, baseScaleY: 1, srcKey: key,
        zone: layer.zoneAround(home.x, home.y, def.range), path: [],
        restUntil: 0, walking: false, ready: false,
      };
      layer.npcs.push(npc);
      load(key, def.sheet, def.frameW, def.frameH, () => {
        if (!image.active) return;
        scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
        const anim = `${key}:walk`;
        if (!scene.anims.exists(anim)) {
          scene.anims.create({ key: anim, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: NPC_WALK_FRAMES - 1 }), frameRate: FPS, repeat: -1 });
        }
        image.setTexture(key, NPC_WALK_FRAMES);
        npc.ready = true;
      });
    }
    return layer;
  }

  update(t: Transform, time: number, dt: number, self: { x: number; y: number } | null) {
    for (const n of this.npcs) {
      if (!n.ready) continue;
      if (!this.still) this.step(n, time, dt, self);
      const h = t.tileH;
      const px = t.offsetX + (n.x + 0.5) * t.tileW;
      const feet = t.offsetY + (n.y + 0.5) * t.tileH + h * 0.47;
      const s = (BODY_TILES * h) / BODY_PX;
      // A slow breath while standing.
      const breathe = n.walking || this.still ? 1 : 1 + 0.012 * Math.sin(time / 520 + n.def.home.x);
      n.baseScaleY = s;
      n.image.setPosition(px, feet).setScale(s, s * breathe).setVisible(true);
      if (n.shadow.width !== h * 0.5) n.shadow.setSize(h * 0.5, h * 0.12);
      n.shadow.setPosition(px, feet - h * 0.03).setVisible(true);
      const font = `${Math.max(10, Math.round(h * 0.2))}px`;
      if (n.tag.style.fontSize !== font) n.tag.setFontSize(font);
      n.tag.setPosition(px, feet - n.def.frameH * s - h * 0.02).setVisible(true);
    }
  }

  private step(n: Npc, time: number, dt: number, self: { x: number; y: number } | null) {
    if (!n.walking) {
      if (self && Math.hypot(self.x - n.x, self.y - n.y) < 2.6 && Math.abs(self.x - n.x) > 0.2) {
        n.image.setFlipX(self.x < n.x);
        n.restUntil = Math.max(n.restUntil, time + 1500); // stays to say hello
      }
      if (time < n.restUntil) return;
      const path = this.pathToSomewhere(n);
      if (!path.length) { n.restUntil = time + 3000; return; }
      n.path = path;
      n.walking = true;
      n.image.play(`${n.srcKey}:walk`, true);
    }
    let left = (SPEED * dt) / 1000;
    while (left > 0 && n.path.length) {
      const next = n.path[0];
      const dx = next.x - n.x, dy = next.y - n.y;
      const d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.05) n.image.setFlipX(dx < 0);
      if (d <= left) { n.x = next.x; n.y = next.y; n.path.shift(); left -= d; }
      else { n.x += (dx / d) * left; n.y += (dy / d) * left; left = 0; }
    }
    if (!n.path.length) {
      n.walking = false;
      n.image.stop();
      n.image.setFrame(NPC_WALK_FRAMES);
      n.restUntil = time + 2500 + Math.random() * 4500;
    }
  }

  // A walk (tile by tile) to a random spot of the zone at least 2 steps away.
  private pathToSomewhere(n: Npc): { x: number; y: number }[] {
    const W = this.width;
    const start = Math.round(n.y) * W + Math.round(n.x);
    const prev = new Map<number, number>([[start, -1]]);
    const dist = new Map<number, number>([[start, 0]]);
    const queue = [start];
    while (queue.length) {
      const c = queue.shift()!;
      const cx = c % W, cy = Math.floor(c / W);
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = (cy + ay) * W + cx + ax;
        if (!n.zone.has(k) || prev.has(k)) continue;
        prev.set(k, c); dist.set(k, dist.get(c)! + 1); queue.push(k);
      }
    }
    const far = [...dist].filter(([, d]) => d >= 2).map(([k]) => k);
    if (!far.length) return [];
    let k = far[Math.floor(Math.random() * far.length)];
    const out: { x: number; y: number }[] = [];
    while (k !== start && k !== -1) { out.unshift({ x: k % W, y: Math.floor(k / W) }); k = prev.get(k)!; }
    return out;
  }

  private isOpen(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height && !!this.open[y]?.[x];
  }

  private nearestOpen(x: number, y: number) {
    for (let r = 0; r < 4; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.isOpen(x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
    return null;
  }

  // The open tiles within `range` steps of home.
  private zoneAround(x: number, y: number, range: number) {
    const W = this.width;
    const zone = new Set([y * W + x]);
    let ring = [[x, y]];
    for (let d = 0; d < range; d++) {
      const next: number[][] = [];
      for (const [cx, cy] of ring) for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + ax, ny = cy + ay;
        if (!this.isOpen(nx, ny) || zone.has(ny * W + nx)) continue;
        zone.add(ny * W + nx); next.push([nx, ny]);
      }
      ring = next;
    }
    return zone;
  }

  destroy() {
    for (const n of this.npcs) { n.image.destroy(); n.shadow.destroy(); n.tag.destroy(); }
    this.npcs.length = 0;
  }
}
