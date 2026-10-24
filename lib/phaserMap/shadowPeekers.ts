// lib/phaserMap/shadowPeekers.ts
// Little black shadow creatures with glowing purple eyes that peek out from behind the trees of
// the Unread Margins, and rise from behind its bushes. One at a time they slip out from behind a
// trunk (or up over a bush), blink, and slip back. When the kid walks up they rattle in fright and
// dart back into hiding, then wait a while before peeking again somewhere else. Now and then one
// scurries out in the open from its hiding spot to the next one along. Only for looks,
// nothing is saved.
//
// They are drawn just under the trees' trunks (wildTrees.ts), so behind a trunk they are hidden.
// Bushes are part of the map below them, so over a bush only the part above its leaves is drawn.
// Their eyes are drawn over the night's darkness (the map is always dark here), so they glow.
import Phaser from 'phaser';

// A hiding spot: a standing tree's trunk tile (edges: how far its trunk reaches left and right
// of the tile's middle, art pixels), or a bush's tile (bush: the pixel row of the top of its
// leaves in the tile).
export interface PeekTree { id: string; x: number; y: number; bush?: number; edges?: [number, number] }

// Bush tiles they hide behind, by tileset name and tile id: the pixel row of the top of the
// leaves inside the 32 px tile.
export const PEEK_BUSHES: Record<string, number> = { 'ShadowNature:0': 8 };
// How far they rise over a bush (art pixels): the spikes and eyes show, the rest stays hidden.
const RISE_PX = 10;

// Pixel art, 14 x 16: '#' body, '+' its dim purple rim, 'o' the eyes (a texture of their own).
const BODY = [
  '....+..+..+...',
  '...++.+#+.++..',
  '..+########+..',
  '.+##########+.',
  '.+##########+.',
  '+############+',
  '+############+',
  '+############+',
  '+############+',
  '+############+',
  '.+##########+.',
  '+############+',
  '+############+',
  '.+#+#+##+#+#+.',
  '.+..+..+..+.+.',
  '..............',
];
const EYE_ROW = 5;
const EYE_COLS = [4, 5, 8, 9];
const W = BODY[0].length;
const H = BODY.length;
const BODY_KEY = 'critter:shadow-body';
const EYES_KEY = 'critter:shadow-eyes';
const EYE_GLOW = 0xb050ff;

// How many may be out at once, how close the kid gets before they hide (tiles), how far from
// the kid a new peek must be, and how far past the trunk's edge they lean (art pixels; most of
// the 14 px body shows).
const COUNT = 3;
const SCARE = 3.5;
const SAFE = 5;
// ...and how far they may be at most, so they stay round the kid.
const RANGE = 16;
const OUT_PX = 4;
// Scurrying to the next spot: how often (instead of hiding), how far it may go (tiles) and how
// fast it runs (art pixels a second).
const SCURRY_CHANCE = 0.35;
const SCURRY_MIN = 1.5;
const SCURRY_MAX = 6;
const SCURRY_SPEED = 110;

type State = 'hidden' | 'out' | 'scared' | 'run';

interface Peeker {
  body: Phaser.GameObjects.Image;
  eyes: Phaser.GameObjects.Image;
  state: State;
  tree: PeekTree | null;
  side: number;
  // How far out it is now (0 behind the trunk, 1 fully out) and where it's heading.
  out: number;
  goal: number;
  next: number;
  blinkAt: number;
  scaredAt: number;
  // Over a bush: where along it, in art pixels from the tile's middle.
  dx: number;
  // A scurry: where it set off from (art pixels), when, and how long it takes.
  run: { x: number; y: number; at: number; ms: number } | null;
}

function texture(scene: Phaser.Scene, key: string, paint: (ch: string) => string | null) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, W, H);
  const ctx = tex?.getContext();
  if (!tex || !ctx) return;
  BODY.forEach((row, y) => [...row].forEach((ch, x) => {
    const isEye = y >= EYE_ROW && y <= EYE_ROW + 1 && EYE_COLS.includes(x);
    const color = paint(isEye ? 'o' : ch);
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  }));
  tex.refresh();
}

export default class ShadowPeekers {
  private peekers: Peeker[] = [];
  private last = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, glow: Phaser.GameObjects.Container) {
    texture(scene, BODY_KEY, ch => (ch === '#' || ch === 'o' ? '#07040c' : ch === '+' ? '#24123a' : null));
    texture(scene, EYES_KEY, ch => (ch === 'o' ? '#d9a0ff' : null));
    for (let i = 0; i < COUNT; i++) {
      const body = scene.add.image(0, 0, BODY_KEY).setOrigin(0.5, 1).setVisible(false);
      const eyes = scene.add.image(0, 0, EYES_KEY).setOrigin(0.5, (EYE_ROW + 1) / H)
        .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      eyes.enableFilters().filters?.internal.addGlow(EYE_GLOW, 4, 0, 1, false, 10, 6);
      layer.add(body);
      glow.add(eyes);
      // Staggered so they don't all pop out together.
      this.peekers.push({ body, eyes, state: 'hidden', tree: null, side: 1, out: 0, goal: 0, next: 1500 + i * 2500, blinkAt: 0, scaredAt: 0, dx: 0, run: null });
    }
  }

  /** trees: the spots they may hide behind; kid: where the kid is (float tiles). */
  update(now: number, trees: PeekTree[], kid?: { x: number; y: number } | null) {
    // Frames since the last update (at 60 a second), so they move as fast on a slow phone.
    const frames = this.last ? Math.min(6, (now - this.last) / (1000 / 60)) : 1;
    this.last = now;
    // Spots in a ring round the kid: not too close, not too far.
    const far = (t: PeekTree) => {
      if (!kid) return false;
      const d = Math.hypot(kid.x - t.x, kid.y - t.y);
      return d >= SAFE && d <= RANGE;
    };
    for (const p of this.peekers) {
      // Its tree was chopped: gone.
      if (p.tree && !trees.some(t => t.id === p.tree!.id)) { this.hide(p, now, 0); p.out = 0; }
      const near = !!(kid && p.tree && Math.hypot(kid.x - p.tree.x, kid.y - p.tree.y) < SCARE);

      if (p.state === 'hidden' && p.out < 0.02 && now >= p.next) {
        const busy = new Set(this.peekers.filter(o => o !== p && o.tree).map(o => o.tree!.id));
        const choices = trees.filter(t => far(t) && !busy.has(t.id));
        if (choices.length) {
          p.tree = choices[Math.floor(Math.random() * choices.length)];
          p.side = Math.random() < 0.5 ? -1 : 1;
          p.dx = Math.round((Math.random() - 0.5) * 10);
          p.state = 'out';
          p.goal = 1;
          p.next = now + 3000 + Math.random() * 4000;
          p.blinkAt = now + 600 + Math.random() * 1500;
        } else {
          p.next = now + 1500;
        }
      } else if (p.state === 'out' && near) {
        p.state = 'scared';
        p.scaredAt = now;
      } else if (p.state === 'out' && now >= p.next) {
        const to = Math.random() < SCURRY_CHANCE ? this.nextSpot(p, trees, far) : null;
        if (to && p.tree) {
          // Off it goes, in the open, to the next spot along.
          const from = { x: p.body.x, y: p.body.y };
          const end = this.restAt(to, Math.random() < 0.5 ? -1 : 1);
          p.tree = to;
          p.side = end.side;
          p.dx = 0;
          p.state = 'run';
          p.run = { ...from, at: now, ms: (Math.hypot(end.x - from.x, end.y - from.y) / SCURRY_SPEED) * 1000 };
        } else {
          this.hide(p, now, 2000 + Math.random() * 4000);
        }
      } else if (p.state === 'run' && p.run && now - p.run.at >= p.run.ms) {
        // Arrived: peeking from the new spot (over a bush it ducks down a little first).
        p.run = null;
        p.state = 'out';
        p.out = p.tree?.bush !== undefined ? 0.4 : 1;
        p.goal = 1;
        p.next = now + 2500 + Math.random() * 3000;
      } else if (p.state === 'scared' && now - p.scaredAt > 380) {
        // Done rattling: dart back behind the trunk, and stay hidden a good while.
        this.hide(p, now, 5000 + Math.random() * 4000);
      }

      // Slide toward the goal: out slowly and shyly, back in fast.
      const speed = p.goal > p.out ? 0.05 : p.state === 'hidden' && now - p.scaredAt < 10000 ? 0.35 : 0.12;
      p.out += (p.goal - p.out) * (1 - Math.pow(1 - speed, frames));
      this.draw(p, now);
    }
  }

  // A free spot a short run away from p's, and not near the kid.
  private nextSpot(p: Peeker, spots: PeekTree[], far: (t: PeekTree) => boolean) {
    const at = p.tree;
    if (!at) return null;
    const busy = new Set(this.peekers.filter(o => o !== p && o.tree).map(o => o.tree!.id));
    const near = spots.filter(t => {
      const d = Math.hypot(t.x - at.x, t.y - at.y);
      return t.id !== at.id && !busy.has(t.id) && far(t) && d >= SCURRY_MIN && d <= SCURRY_MAX;
    });
    return near.length ? near[Math.floor(Math.random() * near.length)] : null;
  }

  // Where a creature stands peeking from a spot (its feet, art pixels): beside a trunk, or
  // on top of a bush's leaves.
  private restAt(t: PeekTree, side: number) {
    if (t.bush !== undefined) return { x: t.x * 32 + 16, y: t.y * 32 + t.bush + H - RISE_PX, side };
    return { x: t.x * 32 + 16 + side * this.reach(t, side), y: t.y * 32 + 26, side };
  }

  // How far from the trunk's middle a creature stands when fully out on that side.
  private reach(t: PeekTree, side: number) {
    const edge = t.edges ? (side < 0 ? t.edges[0] : t.edges[1]) : 6;
    return edge + OUT_PX;
  }

  private hide(p: Peeker, now: number, wait: number) {
    p.run = null;
    p.state = 'hidden';
    p.goal = 0;
    p.next = now + wait;
  }

  private draw(p: Peeker, now: number) {
    const show = !!p.tree && (p.out > 0.02 || p.state === 'run');
    p.body.setVisible(show);
    p.eyes.setVisible(show);
    if (!show || !p.tree) return;
    const rattle = p.state === 'scared' ? (Math.floor(now / 35) % 2 ? 1 : -1) : 0;
    const alpha = Math.min(1, p.out * 1.5);
    if (p.state === 'run' && p.run) {
      // Scurrying: little hops, leaning the way it runs.
      const end = this.restAt(p.tree, p.side);
      const k = Math.min(1, (now - p.run.at) / Math.max(1, p.run.ms));
      const hop = Math.abs(Math.sin(k * p.run.ms / 90)) * 2;
      const rx = p.run.x + (end.x - p.run.x) * k;
      const ry = p.run.y + (end.y - p.run.y) * k - hop;
      const lean = Math.sign(end.x - p.run.x) * 12;
      p.body.setCrop().setPosition(rx, ry).setAngle(lean).setAlpha(1).setVisible(true);
      const rad = Phaser.Math.DegToRad(lean);
      const up = H - (EYE_ROW + 1);
      p.eyes.setCrop().setPosition(rx + Math.sin(rad) * up, ry - Math.cos(rad) * up).setAngle(lean).setAlpha(1).setScale(1).setVisible(true);
      return;
    }
    if (p.tree.bush !== undefined) {
      // Rising over the leaves: only the rows above the bush's top are drawn.
      const top = p.tree.y * 32 + p.tree.bush;
      const rise = Math.max(1, Math.round(RISE_PX * p.out));
      const bx = p.tree.x * 32 + 16 + p.dx + rattle;
      p.body.setPosition(bx, top + H - rise).setAngle(0).setAlpha(alpha).setCrop(0, 0, W, rise);
      p.eyes.setPosition(bx, top - rise + EYE_ROW + 1).setAngle(0).setAlpha(alpha).setCrop(0, 0, W, rise);
      this.blink(p, now);
      return;
    }
    p.body.setCrop();
    p.eyes.setCrop();
    const x = p.tree.x * 32 + 16 + p.side * this.reach(p.tree, p.side) * p.out + rattle;
    const y = p.tree.y * 32 + 26 + (p.state === 'scared' ? Math.floor(now / 50) % 2 : 0);
    const lean = p.side * 8 * p.out;
    p.body.setPosition(x, y).setAngle(lean).setAlpha(alpha);
    // The eyes sit on the body (rotated with it); they shut for a moment now and then and go
    // wide when scared.
    const rad = Phaser.Math.DegToRad(lean);
    const up = H - (EYE_ROW + 1);
    // The eyes are drawn over the trunk (they shine through the night), so they only show once
    // the creature is far enough out.
    p.eyes.setPosition(x + Math.sin(rad) * up, y - Math.cos(rad) * up).setAngle(lean).setAlpha(Phaser.Math.Clamp((p.out - 0.4) / 0.4, 0, 1));
    this.blink(p, now);
  }

  private blink(p: Peeker, now: number) {
    if (p.state === 'out' && now >= p.blinkAt) p.blinkAt = now + 1500 + Math.random() * 3000;
    const shut = p.state === 'out' && this.isBlinking(p, now);
    p.eyes.setScale(p.state === 'scared' ? 1.25 : 1, shut ? 0.15 : p.state === 'scared' ? 1.25 : 1);
  }

  // A blink lasts the 120 ms before the next blink time is reached.
  private isBlinking(p: Peeker, now: number) {
    return p.blinkAt - now < 120;
  }

  destroy() {
    for (const p of this.peekers) { p.body.destroy(); p.eyes.destroy(); }
    this.peekers = [];
  }
}
