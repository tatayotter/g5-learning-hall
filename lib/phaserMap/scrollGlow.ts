// lib/phaserMap/scrollGlow.ts
// The question scrolls on the map, with their magic: a warm pool of light on the ground, a
// pulsing halo, three little gold wisps (the same pixel wisps as the Cinderreach and Unread
// Margins, critters.ts) circling the scroll, and sparkles drifting up off it. The scroll the kid is
// close enough to read gets the gold outline, like a ripe plant or a standing tree. A new scroll
// pops in with a burst. When it's answered: right, its wisps fly up into the sky; wrong, they turn
// grey and the scroll crumbles into dust. A scroll that just goes away bursts and its wisps fly off.
//
// Map units (32 per tile) inside containers that follow the map camera, like the critters. The
// glow sits on GLOW_DEPTH so a scroll still shines at night. With "reduce motion" on the scroll
// stays still with a steady glow (no wisps or sparkles).
import Phaser from 'phaser';
import { GLOW_DEPTH, type Transform } from './ambience';
import { makeTextures } from './critters';
import { TILE_ART_ZOOM } from './constants';
import { addOutline, outlineAlpha } from './outline';

const UNIT = 32;
const GROUND_DEPTH = 9.4; // on the ground, under players (10) and critters (9.6)
// The scroll art is drawn at its own pixel size at the usual zoom (48 px art = about 27 map units).
const ART_SCALE = 1 / TILE_ART_ZOOM;
const WISPS = 3;
const MOTES = 6;
const POP_MS = 450;
// How long each ending plays.
const END_MS = { gone: 550, right: 1500, wrong: 1100 };
export type ScrollFate = 'right' | 'wrong';

interface Mote { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; start: number; life: number }
interface Scroll {
  id: number;
  x: number; y: number; // tile centre, map units
  phase: number;
  born: number;
  dying: number | null;
  fate: ScrollFate | 'gone';
  dusted: boolean; // wrong: the scroll has crumbled
  shadow: Phaser.GameObjects.Ellipse;
  pool: Phaser.GameObjects.Image;
  halo: Phaser.GameObjects.Image;
  img: Phaser.GameObjects.Image | null;
  outline: Phaser.GameObjects.Image[]; // left, right, up, down copies (outline.ts)
  wisps: { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }[];
  motes: Mote[];
}

function makeScrollTextures(scene: Phaser.Scene) {
  makeTextures(scene);
  if (!scene.textures.exists('scroll:pool')) {
    // An oval of light pooled on the ground under the scroll.
    const w = 48, h = 20;
    const tex = scene.textures.createCanvas('scroll:pool', w, h);
    if (tex) {
      const ctx = tex.getContext();
      ctx.save();
      ctx.scale(1, h / w);
      const grad = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      grad.addColorStop(0, 'rgba(255,214,110,0.75)');
      grad.addColorStop(0.45, 'rgba(255,170,50,0.32)');
      grad.addColorStop(1, 'rgba(255,140,30,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, w);
      ctx.restore();
      tex.refresh();
    }
  }
  if (!scene.textures.exists('scroll:mote')) {
    // A tiny twinkle: a white-hot centre with four gold points.
    const rows = ['.y.', 'yWy', '.y.'];
    const tex = scene.textures.createCanvas('scroll:mote', 3, 3);
    if (tex) {
      const ctx = tex.getContext();
      rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return;
        ctx.fillStyle = ch === 'W' ? '#fffbe8' : '#ffd24a';
        ctx.fillRect(x, y, 1, 1);
      }));
      tex.refresh();
    }
  }
}

export default class ScrollGlow {
  private ground: Phaser.GameObjects.Container;
  private glowBox: Phaser.GameObjects.Container;
  private scrolls = new Map<number, Scroll>();
  private artKey: string | null = null;
  private still: boolean;
  private first = true;
  private highlight: number | null = null;

  // loadArt: loads the scroll picture and hands back its texture key.
  constructor(private scene: Phaser.Scene, loadArt: (onReady: (key: string) => void) => void) {
    this.still = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    makeScrollTextures(scene);
    this.ground = scene.add.container(0, 0).setDepth(GROUND_DEPTH);
    this.glowBox = scene.add.container(0, 0).setDepth(GLOW_DEPTH);
    loadArt(key => {
      this.artKey = key;
      for (const s of this.scrolls.values()) this.addArt(s);
    });
  }

  // fates: how each answered scroll ended, so its ending can play as it leaves.
  setScrolls(list: { id: number; x: number; y: number }[], fates: Record<number, ScrollFate> = {}) {
    const now = this.scene.time.now;
    const seen = new Set<number>();
    for (const sc of list) {
      seen.add(sc.id);
      const s = this.scrolls.get(sc.id);
      const x = (sc.x + 0.5) * UNIT, y = (sc.y + 0.5) * UNIT;
      if (s && s.dying === null && s.x === x && s.y === y) continue;
      if (s) this.remove(s);
      // Scrolls already there when the map opens just appear; new ones pop in.
      this.scrolls.set(sc.id, this.make(sc.id, x, y, this.first ? -Infinity : now));
    }
    for (const s of this.scrolls.values()) {
      if (seen.has(s.id) || s.dying !== null) continue;
      s.dying = now;
      s.fate = this.still ? 'gone' : fates[s.id] ?? 'gone';
      if (s.fate === 'wrong') for (const w of s.wisps) w.img.setTexture('critter:wisp_ash0');
    }
    this.first = false;
  }

  private make(id: number, x: number, y: number, born: number): Scroll {
    const add = this.scene.add;
    const shadow = add.ellipse(x, y + 7, 18, 5, 0x000000, 0.28);
    const pool = add.image(x, y + 5, 'scroll:pool').setBlendMode(Phaser.BlendModes.ADD);
    this.ground.add([pool, shadow]);
    const halo = add.image(x, y - 4, 'critter:glow_gold').setBlendMode(Phaser.BlendModes.ADD);
    this.glowBox.add(halo);
    const wisps: Scroll['wisps'] = [];
    const motes: Mote[] = [];
    if (!this.still) {
      for (let i = 0; i < WISPS; i++) {
        const glow = add.image(x, y, 'critter:glow_gold').setBlendMode(Phaser.BlendModes.ADD).setScale(0.55);
        const img = add.image(x, y, 'critter:wisp_gold0').setOrigin(0.5, 1);
        this.glowBox.add([glow, img]);
        wisps.push({ img, glow });
      }
      for (let i = 0; i < MOTES; i++) {
        const img = add.image(x, y, 'scroll:mote').setAlpha(0);
        this.glowBox.add(img);
        // Staggered so they don't all rise at once.
        motes.push({ img, x, y, vx: 0, vy: 0, start: this.scene.time.now + i * 260, life: 0 });
      }
    }
    const s: Scroll = { id, x, y, phase: Math.random() * Math.PI * 2, born, dying: null, fate: 'gone', dusted: false, shadow, pool, halo, img: null, outline: [], wisps, motes };
    this.addArt(s);
    if (born > -Infinity) for (const m of motes) this.resetMote(m, s, born, true);
    return s;
  }

  private addArt(s: Scroll) {
    if (!this.artKey || s.img) return;
    const img = this.scene.add.image(s.x, s.y - 4, this.artKey);
    img.setScale(ART_SCALE);
    this.ground.add(img);
    s.img = img;
  }

  setHighlight(id: number | null) {
    this.highlight = id;
  }

  // The gold outline on the highlighted scroll, drawn under the scroll's own picture.
  private syncOutline(s: Scroll) {
    const want = s.id === this.highlight && s.dying === null && !!s.img && !!this.artKey;
    if (!want) {
      s.outline.forEach(o => o.destroy());
      s.outline = [];
    } else if (!s.outline.length) {
      s.outline = addOutline(this.scene, this.ground, this.artKey!, '__BASE', s.x, s.y);
      for (const o of s.outline) {
        o.setOrigin(0.5);
        this.ground.moveBelow(o, s.img!);
      }
    }
  }

  private remove(s: Scroll) {
    for (const o of [s.shadow, s.pool, s.halo, s.img, ...s.outline, ...s.wisps.flatMap(w => [w.img, w.glow]), ...s.motes.map(m => m.img)]) o?.destroy();
    this.scrolls.delete(s.id);
  }

  // Wrong answer: the scroll crumbles into a puff of dust and falling bits of paper.
  private poof(s: Scroll, cy: number) {
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { this.ground.add(o); return o; };
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
      const puff = add(this.scene.add.ellipse(s.x + Math.cos(a) * 5, cy + Math.sin(a) * 3, 11, 8, i % 2 ? 0xb8ae9c : 0x9a9184, 0.9));
      this.scene.tweens.add({
        targets: puff,
        x: s.x + Math.cos(a) * 18, y: cy + Math.sin(a) * 8 - 6 - Math.random() * 6,
        scaleX: 2.2, scaleY: 2, alpha: 0,
        duration: 650 + Math.random() * 200, ease: 'Cubic.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
    const colors = [0xf3e3b5, 0xd9c08a, 0xa0703c, 0x7a5a3a];
    for (let i = 0; i < 14; i++) {
      const bit = add(this.scene.add.rectangle(s.x + (Math.random() - 0.5) * 20, cy, 2, 2, colors[i % colors.length]));
      const dx = (Math.random() - 0.5) * 36;
      const up = 6 + Math.random() * 12;
      this.scene.tweens.add({ targets: bit, x: bit.x + dx, duration: 700, ease: 'Linear' });
      this.scene.tweens.add({
        targets: bit, y: cy - up, duration: 240, ease: 'Quad.easeOut',
        onComplete: () => this.scene.tweens.add({
          targets: bit, y: s.y + 8, alpha: 0, duration: 460, ease: 'Quad.easeIn',
          onComplete: () => bit.destroy(),
        }),
      });
    }
  }

  private resetMote(m: Mote, s: Scroll, time: number, burst: boolean) {
    if (burst && s.fate === 'right') {
      // Shooting up after the wisps.
      m.x = s.x + (Math.random() - 0.5) * 16; m.y = s.y - 6;
      m.vx = (Math.random() - 0.5) * 20; m.vy = -(70 + Math.random() * 60);
      m.start = time + Math.random() * 300; m.life = 700 + Math.random() * 400;
    } else if (burst) {
      // Thrown outward from the scroll.
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 40;
      m.x = s.x; m.y = s.y - 6; m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp - 15;
      m.start = time; m.life = 500 + Math.random() * 300;
    } else {
      // Drifting up off the scroll.
      m.x = s.x + (Math.random() - 0.5) * 22; m.y = s.y - 2 - Math.random() * 6;
      m.vx = (Math.random() - 0.5) * 4; m.vy = -(9 + Math.random() * 9);
      m.start = time + Math.random() * 500; m.life = 1100 + Math.random() * 800;
    }
  }

  update(t: Transform, time: number) {
    const scale = t.tileW / UNIT;
    for (const box of [this.ground, this.glowBox]) box.setPosition(t.offsetX, t.offsetY).setScale(scale);
    for (const s of [...this.scrolls.values()]) {
      // k: how far through its ending (0..1); fade: 1 while it's on the map.
      const k = s.dying === null ? 0 : (time - s.dying) / END_MS[s.fate];
      if (k >= 1) { this.remove(s); continue; }
      const fade = 1 - k;
      const p = Math.min(1, (time - s.born) / POP_MS);
      // Back-out ease: a little overshoot as it pops in.
      const grow = p >= 1 ? 1 : 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2);
      const bob = this.still || s.fate === 'wrong' ? 0 : Math.round(Math.sin(time / 600 + s.phase) * 2);
      const pulse = this.still ? 0.6 : 0.5 + 0.5 * Math.sin(time / 520 + s.phase);
      let cy = s.y - 4 + bob;
      let size = grow, artAlpha = fade, glowAlpha = fade, flash = 1 - p;
      if (s.fate === 'right') {
        // A bright flash, then the scroll fades out as it lifts a little.
        cy -= Math.round(8 * k);
        artAlpha = Math.min(1, 2 * fade);
        flash += Math.max(0, 1 - 3 * k) * 1.5;
      } else if (s.fate === 'wrong') {
        // It shivers, its light goes out, then it crumbles (poof) at a quarter of the way.
        glowAlpha = Math.max(0, 1 - 4 * k);
        if (k >= 0.25 && !s.dusted) { s.dusted = true; this.poof(s, cy); }
        size = k < 0.25 ? 1 : 0;
        artAlpha = k < 0.25 ? 1 : 0;
      } else if (s.dying !== null) {
        // Gone for some other reason: it swells a little, bursts and fades.
        size = 1 + 0.4 * k;
        flash += k;
      }
      const shiver = s.fate === 'wrong' && k < 0.25 ? (Math.floor(time / 40) % 2 ? 1 : -1) : 0;

      s.img?.setPosition(s.x + shiver, cy).setScale(ART_SCALE * size).setAlpha(artAlpha);
      this.syncOutline(s);
      s.outline.forEach((o, i) => o.setPosition(s.x + [-1, 1, 0, 0][i], cy + [0, 0, -1, 1][i]).setScale(ART_SCALE * size).setAlpha(outlineAlpha(time)));
      s.shadow.setScale(1 - bob * 0.06).setAlpha(s.fate === 'wrong' ? artAlpha : fade);
      s.pool.setAlpha((0.55 + 0.3 * pulse) * glowAlpha).setScale(grow);
      s.halo.setPosition(s.x, cy).setScale((2 + 0.35 * pulse + flash) * grow).setAlpha(Math.min(1, (0.6 + 0.3 * pulse + flash) * glowAlpha));

      s.wisps.forEach((w, i) => {
        const a = time / 950 + s.phase + (i * Math.PI * 2) / WISPS;
        const front = Math.sin(a) > 0;
        let r = (17 + Math.sin(time / 700 + i) * 2) * grow;
        let wy = cy - 3 + Math.sin(a) * r * 0.4 + Math.sin(time / 300 + i * 2) * 2;
        let alpha = (front ? 1 : 0.5) * grow, glow = (front ? 0.8 : 0.4) * (0.8 + 0.2 * Math.sin(time / 110 + i * 5));
        let tex = `critter:wisp_gold${Math.floor(time / 140 + i) % 3}`, scale = front ? 0.8 : 0.6;
        if (s.fate === 'right') {
          // They spiral in and shoot up into the sky, one after another.
          const kk = Math.max(0, k - i * 0.08);
          r *= Math.max(0, 1 - 2 * kk);
          wy -= 320 * kk * kk;
          alpha = Math.min(1, 3 * (1 - kk)); glow = alpha; scale = 0.9;
          tex = `critter:wisp_gold${Math.floor(time / 60 + i) % 3}`;
        } else if (s.fate === 'wrong') {
          // Grey and still: they sink to the ground and fade.
          r *= 1 - 0.3 * k;
          wy += 14 * k;
          alpha = (front ? 0.9 : 0.5) * fade; glow = 0;
          tex = `critter:wisp_ash${Math.floor(time / 260 + i) % 3}`;
        } else if (s.dying !== null) {
          // They spin out and fly away.
          r += 50 * k;
          alpha *= fade; glow *= fade;
        }
        const wx = Math.round(s.x + Math.cos(a) * r);
        w.img.setTexture(tex).setPosition(wx, Math.round(wy)).setScale(scale).setAlpha(alpha);
        w.glow.setPosition(wx, Math.round(wy) - 4).setAlpha(glow);
      });

      for (const m of s.motes) {
        // An ending throws the sparkles out once (none for a wrong answer).
        if (s.fate === 'wrong') { m.img.setAlpha(0); continue; }
        if (s.dying !== null && m.start < s.dying) this.resetMote(m, s, time, true);
        const age = time - m.start;
        if (age < 0) { m.img.setAlpha(0); continue; }
        if (age > m.life) {
          if (s.dying === null) this.resetMote(m, s, time, false);
          m.img.setAlpha(0);
          continue;
        }
        const mk = age / m.life, sec = age / 1000;
        const twinkle = 0.65 + 0.35 * Math.sin(time / 90 + m.x);
        m.img.setPosition(Math.round(m.x + m.vx * sec), Math.round(m.y + m.vy * sec)).setAlpha(Math.sin(Math.PI * mk) * twinkle);
      }
    }
  }

  destroy() {
    this.ground.destroy();
    this.glowBox.destroy();
    this.scrolls.clear();
  }
}
