// lib/phaserMap/scrollGlow.ts
// The question scrolls on the map, with their magic: a warm pool of light on the ground, a
// pulsing halo, three little gold wisps (the same pixel wisps as the Cinderreach and Unread
// Margins, critters.ts) circling the scroll, and sparkles drifting up off it. A new scroll pops
// in with a burst; a picked-up one bursts and its wisps fly off.
//
// Map units (32 per tile) inside containers that follow the map camera, like the critters. The
// glow sits on GLOW_DEPTH so a scroll still shines at night. With "reduce motion" on the scroll
// stays still with a steady glow (no wisps or sparkles).
import Phaser from 'phaser';
import { GLOW_DEPTH, type Transform } from './ambience';
import { makeTextures } from './critters';
import { TILE_ART_ZOOM } from './constants';

const UNIT = 32;
const GROUND_DEPTH = 9.4; // on the ground, under players (10) and critters (9.6)
// The scroll art is drawn at its own pixel size at the usual zoom (48 px art = about 27 map units).
const ART_SCALE = 1 / TILE_ART_ZOOM;
const WISPS = 3;
const MOTES = 6;
const POP_MS = 450;
const FADE_MS = 550;

interface Mote { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; start: number; life: number }
interface Scroll {
  id: number;
  x: number; y: number; // tile centre, map units
  phase: number;
  born: number;
  dying: number | null;
  shadow: Phaser.GameObjects.Ellipse;
  pool: Phaser.GameObjects.Image;
  halo: Phaser.GameObjects.Image;
  img: Phaser.GameObjects.Image | null;
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

  setScrolls(list: { id: number; x: number; y: number }[]) {
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
    for (const s of this.scrolls.values()) if (!seen.has(s.id) && s.dying === null) s.dying = now;
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
    const s: Scroll = { id, x, y, phase: Math.random() * Math.PI * 2, born, dying: null, shadow, pool, halo, img: null, wisps, motes };
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

  private remove(s: Scroll) {
    for (const o of [s.shadow, s.pool, s.halo, s.img, ...s.wisps.flatMap(w => [w.img, w.glow]), ...s.motes.map(m => m.img)]) o?.destroy();
    this.scrolls.delete(s.id);
  }

  private resetMote(m: Mote, s: Scroll, time: number, burst: boolean) {
    if (burst) {
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
      const fade = s.dying === null ? 1 : 1 - (time - s.dying) / FADE_MS;
      if (fade <= 0) { this.remove(s); continue; }
      const p = Math.min(1, (time - s.born) / POP_MS);
      // Back-out ease: a little overshoot as it pops in.
      const grow = p >= 1 ? 1 : 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2);
      // A picked-up scroll swells a little as it vanishes.
      const size = grow * (s.dying === null ? 1 : 1 + 0.4 * (1 - fade));
      const bob = this.still ? 0 : Math.round(Math.sin(time / 600 + s.phase) * 2);
      const pulse = this.still ? 0.6 : 0.5 + 0.5 * Math.sin(time / 520 + s.phase);
      const cy = s.y - 4 + bob;

      s.img?.setPosition(s.x, cy).setScale(ART_SCALE * size).setAlpha(fade);
      s.shadow.setScale(1 - bob * 0.06).setAlpha(fade);
      s.pool.setAlpha((0.55 + 0.3 * pulse) * fade).setScale(grow);
      // Brighter for a moment when it pops in or out.
      const flash = (1 - p) + (s.dying === null ? 0 : 1 - fade);
      s.halo.setPosition(s.x, cy).setScale((2 + 0.35 * pulse + flash) * grow).setAlpha(Math.min(1, (0.6 + 0.3 * pulse + flash) * fade));

      s.wisps.forEach((w, i) => {
        const a = time / 950 + s.phase + (i * Math.PI * 2) / WISPS;
        const front = Math.sin(a) > 0;
        // When the scroll is picked up, the wisps spin out and fly away.
        const r = (17 + Math.sin(time / 700 + i) * 2) * grow + (s.dying === null ? 0 : 50 * (1 - fade));
        const wx = Math.round(s.x + Math.cos(a) * r);
        const wy = Math.round(cy - 3 + Math.sin(a) * r * 0.4 + Math.sin(time / 300 + i * 2) * 2);
        w.img.setTexture(`critter:wisp_gold${Math.floor(time / 140 + i) % 3}`)
          .setPosition(wx, wy).setScale(front ? 0.8 : 0.6).setAlpha((front ? 1 : 0.5) * fade * grow);
        w.glow.setPosition(wx, wy - 4).setAlpha((front ? 0.8 : 0.4) * fade * (0.8 + 0.2 * Math.sin(time / 110 + i * 5)));
      });

      for (const m of s.motes) {
        // A picked-up scroll throws its sparkles out once.
        if (s.dying !== null && m.start < s.dying) this.resetMote(m, s, time, true);
        const age = time - m.start;
        if (age < 0) { m.img.setAlpha(0); continue; }
        if (age > m.life) {
          if (s.dying === null) this.resetMote(m, s, time, false);
          m.img.setAlpha(0);
          continue;
        }
        const k = age / m.life, sec = age / 1000;
        const twinkle = 0.65 + 0.35 * Math.sin(time / 90 + m.x);
        m.img.setPosition(Math.round(m.x + m.vx * sec), Math.round(m.y + m.vy * sec)).setAlpha(Math.sin(Math.PI * k) * twinkle);
      }
    }
  }

  destroy() {
    this.ground.destroy();
    this.glowBox.destroy();
    this.scrolls.clear();
  }
}
