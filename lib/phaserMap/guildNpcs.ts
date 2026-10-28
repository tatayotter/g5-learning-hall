// lib/phaserMap/guildNpcs.ts
// The guild masters in Inkwell Town (lib/townNpcs.ts): each strolls a few steps around their
// hall door, stops for a while (turning to face a kid who walks up), then wanders on. Drawn like
// the players (screen space, feet on the tile), so the scene sorts them against roofs and gives
// them a silhouette behind one. Their name tags are DOM, like the players' (MapCanvas.tsx).
// A kid who walks up stops them; the one in reach gets the gold outline trees get, and a guild
// still on today's to-do list shows a glowing "?" over the name. With "reduce motion" on they
// stand still at their door and the "?" doesn't bob.
// A squad (TownNpc.patrol) marches its route instead: the leader in front, the rest two abreast
// behind, all in step; at each stop they all stand to attention (front pose), then march on.
import Phaser from 'phaser';
import { NPC_WALK_FRAMES, PATROL_ROUTES, type PatrolRoute, type TownNpc } from '@/lib/townNpcs';
import type { Transform } from './ambience';
import { OUTLINE_COLOR, outlineAlpha } from './outline';

const SPEED = 1.3; // tiles per second
const FPS = 14;
const BODY_PX = 112; // character height in the sheet (build_npcs.py BODY)
const BODY_TILES = 1.05; // shown about as tall as a player
const STOP_NEAR = 1.6; // tiles: a kid this close stops them
const GREET_NEAR = 2.6; // tiles: a standing NPC turns to a kid this close and waits
// The name tag (MapCanvas.tsx) sits on a box 0.15 tile above the tile; the "?" goes over it.
const TAG_LIFT = 0.15;
const TAG_PX = 16;
const MARK_DEPTH = 41; // over the cloud shadows (40)
const MARCH = 1.0; // tiles per second
const LEAD_GAP = 1.3; // tiles from the leader to the first rank
const RANK_GAP = 1.0; // tiles between ranks
const FILE_HALF = 0.35; // tiles from the route to each file

export interface NpcSprite {
  image: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
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
  /** Frame of the idle pose (right after the walk frames). */
  idle: number;
  outline: Phaser.GameObjects.Sprite[];
  mark: Phaser.GameObjects.Container;
}

interface Patrol {
  route: PatrolRoute;
  members: Npc[];
  cum: number[]; // arc length at each point
  total: number;
  stops: { at: number; ms: number }[];
  s: number; // the leader's distance along the loop (grows forever)
  nextStop: number;
  haltUntil: number;
  halted: boolean;
}

/** What floats over an NPC: a gold "!" (today's quest, Baylan), a gold "?" (a guild's side quest
 *  waiting) or a small grey "?" (a side quest that wakes up once today's quest is done). */
export type NpcMark = 'bang' | 'quest' | 'quiet';
const MARK_TEXTURE: Record<NpcMark, string> = { bang: 'npc-bang-mark', quest: 'npc-quest-mark', quiet: 'npc-quiet-mark' };

function makeMarkTexture(scene: Phaser.Scene, key: string, char: string, colors: [string, string, string], stroke: string) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, 40, 52);
  if (!tex) return;
  const g = tex.getContext();
  g.font = 'bold 44px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 7;
  g.strokeStyle = stroke;
  g.strokeText(char, 20, 27);
  const grad = g.createLinearGradient(0, 6, 0, 46);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.5, colors[1]);
  grad.addColorStop(1, colors[2]);
  g.fillStyle = grad;
  g.fillText(char, 20, 27);
  tex.refresh();
}

function makeMarkTextures(scene: Phaser.Scene) {
  makeMarkTexture(scene, MARK_TEXTURE.quest, '?', ['#fff6c0', '#ffd23f', '#f0a020'], '#3a2208');
  makeMarkTexture(scene, MARK_TEXTURE.bang, '!', ['#fff6c0', '#ffd23f', '#f0a020'], '#3a2208');
  makeMarkTexture(scene, MARK_TEXTURE.quiet, '?', ['#f2f0ea', '#c9c4b8', '#a39d90'], '#3a3630');
  if (!scene.textures.exists('npc-quest-glow')) {
    const n = 64;
    const tex = scene.textures.createCanvas('npc-quest-glow', n, n);
    if (tex) {
      const g = tex.getContext();
      const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      grad.addColorStop(0, 'rgba(255,220,110,0.9)');
      grad.addColorStop(0.45, 'rgba(255,190,60,0.35)');
      grad.addColorStop(1, 'rgba(255,170,40,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, n, n);
      tex.refresh();
    }
  }
}

export default class GuildNpcLayer {
  readonly npcs: Npc[] = [];
  private still: boolean;
  private marks: Record<string, NpcMark> = {};
  private patrols: Patrol[] = [];
  private highlight: string | null = null;

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
    makeMarkTextures(scene);
    for (const def of defs) {
      const home = def.patrol ? def.home : layer.nearestOpen(def.home.x, def.home.y);
      if (!home) continue;
      const key = `npc-walk:${def.id}`;
      const image = scene.add.sprite(-999, -999, '__DEFAULT').setOrigin(0.5, 1).setDepth(9.5).setVisible(false);
      const shadow = scene.add.ellipse(-999, -999, 10, 4, 0x000000, 0.28).setDepth(shadowDepth).setVisible(false);
      const outline = [0, 1, 2, 3].map(() => scene.add.sprite(-999, -999, '__DEFAULT').setOrigin(0.5, 1)
        .setTint(OUTLINE_COLOR).setTintMode(Phaser.TintModes.FILL).setVisible(false));
      const mark = scene.add.container(-999, -999, [
        scene.add.image(0, 0, 'npc-quest-glow').setBlendMode(Phaser.BlendModes.ADD),
        scene.add.image(0, 0, 'npc-quest-mark'),
      ]).setDepth(MARK_DEPTH).setVisible(false);
      const npc: Npc = {
        def, image, shadow, x: home.x, y: home.y, baseScaleY: 1, srcKey: key,
        zone: def.patrol ? new Set() : layer.zoneAround(home.x, home.y, def.range), path: [],
        restUntil: 0, walking: false, ready: false, outline, mark,
        idle: def.walkFrames ?? NPC_WALK_FRAMES,
      };
      layer.npcs.push(npc);
      load(key, def.sheet, def.frameW, def.frameH, () => {
        if (!image.active) return;
        scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
        const anim = `${key}:walk`;
        if (!scene.anims.exists(anim)) {
          scene.anims.create({ key: anim, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: npc.idle - 1 }), frameRate: FPS, repeat: -1 });
        }
        image.setTexture(key, npc.idle);
        for (const o of outline) o.setTexture(key, npc.idle);
        npc.ready = true;
      });
    }
    layer.buildPatrols();
    return layer;
  }

  /** The mark over each NPC (by id); none when missing. */
  setMarks(marks: Record<string, NpcMark>) { this.marks = marks; }

  /** The NPC in reach (gold outline), or null. */
  setHighlight(id: string | null) { this.highlight = id; }

  private buildPatrols() {
    const groups = new Map<string, Npc[]>();
    for (const n of this.npcs) {
      if (!n.def.patrol || !PATROL_ROUTES[n.def.patrol.route]) continue;
      groups.set(n.def.patrol.route, [...(groups.get(n.def.patrol.route) ?? []), n]);
    }
    groups.forEach((members, key) => {
      const route = PATROL_ROUTES[key];
      const pts = route.points;
      const cum = [0];
      for (let i = 1; i <= pts.length; i++) {
        const a = pts[i - 1], b = pts[i % pts.length];
        cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
      }
      const stops = Object.entries(route.stops).map(([i, ms]) => ({ at: cum[Number(i)], ms })).sort((a, b) => a.at - b.at);
      // Start with the whole squad on the route, just past its first point.
      const s = LEAD_GAP + RANK_GAP + 0.5;
      const p: Patrol = { route, members: members.sort((a, b) => a.def.patrol!.slot - b.def.patrol!.slot), cum, total: cum[pts.length], stops, s, nextStop: 0, haltUntil: 0, halted: false };
      p.nextStop = this.stopAfter(p, s);
      this.patrols.push(p);
    });
  }

  // The next stop's distance (on the same ever-growing scale as Patrol.s) after `s`.
  private stopAfter(p: Patrol, s: number) {
    if (!p.stops.length) return Infinity;
    const lap = Math.floor(s / p.total) * p.total;
    for (const st of p.stops) if (lap + st.at > s + 1e-6) return lap + st.at;
    return lap + p.total + p.stops[0].at;
  }

  private pointAt(p: Patrol, s: number) {
    const pts = p.route.points;
    const d = ((s % p.total) + p.total) % p.total;
    let i = 0;
    while (i < pts.length - 1 && p.cum[i + 1] < d) i++;
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const seg = p.cum[i + 1] - p.cum[i] || 1;
    const f = (d - p.cum[i]) / seg;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  private marchPatrol(p: Patrol, time: number, dt: number) {
    const ready = p.members.every(n => n.ready);
    if (!ready) return;
    const still = this.still;
    if (p.halted && !still && time >= p.haltUntil) {
      p.halted = false;
      p.nextStop = this.stopAfter(p, p.s);
      // Everyone steps off together, so they march in step.
      for (const n of p.members) { n.walking = true; n.image.play(`${n.srcKey}:walk`, true); }
    } else if (!p.halted && !still) {
      if (!p.members[0].walking) for (const n of p.members) { n.walking = true; n.image.play(`${n.srcKey}:walk`, true); }
      p.s += (MARCH * dt) / 1000;
      if (p.s >= p.nextStop) {
        p.s = p.nextStop;
        p.halted = true;
        p.haltUntil = time + (p.stops.find(st => Math.abs((p.s % p.total) - st.at) < 1e-3)?.ms ?? 4000);
      }
    }
    // Where each one stands: the leader on the route, the rest two abreast behind.
    for (const n of p.members) {
      const slot = n.def.patrol!.slot;
      const rank = Math.ceil(slot / 2);
      const along = slot === 0 ? p.s : p.s - LEAD_GAP - (rank - 1) * RANK_GAP;
      const at = this.pointAt(p, along);
      const ahead = this.pointAt(p, along + 0.6), behind = this.pointAt(p, along - 0.6);
      let hx = ahead.x - behind.x, hy = ahead.y - behind.y;
      const len = Math.hypot(hx, hy) || 1;
      hx /= len; hy /= len;
      const side = slot === 0 ? 0 : slot % 2 ? -1 : 1;
      n.x = at.x - hy * side * FILE_HALF;
      n.y = at.y + hx * side * FILE_HALF;
      if (p.halted || still) {
        if (n.walking || still) {
          n.walking = false;
          n.image.stop();
          // Everyone stands to attention in their front pose (a walk frame would freeze mid-step).
          n.image.setFrame(n.idle).setFlipX(false);
        }
      } else if (Math.abs(hx) > 0.05) n.image.setFlipX(hx < 0);
    }
  }

  update(t: Transform, time: number, dt: number, self: { x: number; y: number } | null) {
    for (const p of this.patrols) this.marchPatrol(p, time, dt);
    for (const n of this.npcs) {
      if (!n.ready) continue;
      if (!this.still && !n.def.patrol) this.step(n, time, dt, self);
      const h = t.tileH;
      const px = t.offsetX + (n.x + 0.5) * t.tileW;
      const feet = t.offsetY + (n.y + 0.5) * t.tileH + h * 0.47;
      const s = (BODY_TILES * h) / BODY_PX;
      // A slow breath while standing.
      const breathe = n.walking || this.still ? 1 : 1 + 0.012 * Math.sin(time / 520 + n.def.home.x);
      n.baseScaleY = s;
      n.image.setPosition(px, feet).setScale(s, s * breathe).setVisible(true);
      if (n.shadow.width !== h * 0.5) n.shadow.setSize(h * 0.5, h * 0.12);
      n.shadow.setPosition(px, feet - h * 0.05).setVisible(true);
      const kind = this.marks[n.def.id];
      n.mark.setVisible(!!kind);
      if (kind) {
        const bob = this.still ? 0 : Math.sin(time / 380 + n.def.home.x) * h * 0.04;
        const size = h * (kind === 'quiet' ? 0.3 : kind === 'bang' ? 0.5 : 0.42);
        const markBottom = t.offsetY + (n.y - TAG_LIFT) * t.tileH - TAG_PX;
        const pulse = this.still ? 1 : 1 + 0.12 * Math.sin(time / 300);
        const [glow, q] = n.mark.list as Phaser.GameObjects.Image[];
        if (q.texture.key !== MARK_TEXTURE[kind]) q.setTexture(MARK_TEXTURE[kind]);
        q.setScale(size / 52);
        glow.setVisible(kind !== 'quiet').setScale((size * 1.9 * pulse) / 64).setAlpha(this.still ? 0.7 : 0.55 + 0.3 * Math.sin(time / 300));
        n.mark.setPosition(px, markBottom - size / 2 + bob);
      }
    }
  }

  // After the scene has set each NPC's depth (against roofs): the gold outline follows the
  // sprite just under it.
  syncOutlines(time: number) {
    for (const n of this.npcs) {
      const on = n.ready && n.def.id === this.highlight && n.image.visible;
      const step = Math.max(1, n.image.displayHeight / 70);
      n.outline.forEach((o, i) => {
        o.setVisible(on);
        if (!on) return;
        const [dx, dy] = [[-step, 0], [step, 0], [0, -step], [0, step]][i];
        if (o.frame.name !== n.image.frame.name) o.setFrame(n.image.frame.name);
        o.setPosition(n.image.x + dx, n.image.y + dy).setScale(n.image.scaleX, n.image.scaleY)
          .setFlipX(n.image.flipX).setDepth(n.image.depth - 0.001).setAlpha(outlineAlpha(time));
      });
    }
  }

  private step(n: Npc, time: number, dt: number, self: { x: number; y: number } | null) {
    // A kid walking up stops them where they are (so they can be talked to).
    if (n.walking && self && Math.hypot(self.x - n.x, self.y - n.y) < STOP_NEAR) {
      n.walking = false;
      n.path = [];
      this.standIdle(n);
    }
    if (!n.walking) {
      if (self && Math.hypot(self.x - n.x, self.y - n.y) < GREET_NEAR) {
        // Turns to the kid (the idle pose is drawn turned to the left) and stays to say hello,
        // whichever side the kid comes from, above and below too.
        if (Math.abs(self.x - n.x) > 0.2) n.image.setFlipX(self.x > n.x);
        n.restUntil = Math.max(n.restUntil, time + 1500);
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
      this.standIdle(n);
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

  // Stops walking and stands in the idle pose, still facing the way they walked. Walk frames face
  // right and the idle pose is turned to the left, so the flip swaps.
  private standIdle(n: Npc) {
    n.image.stop();
    n.image.setFrame(n.idle).setFlipX(!n.image.flipX);
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
    for (const n of this.npcs) { n.image.destroy(); n.shadow.destroy(); n.mark.destroy(); for (const o of n.outline) o.destroy(); }
    this.npcs.length = 0;
    this.patrols.length = 0;
  }
}
