// lib/phaserMap/cookFire.ts
// A Kitchen that's cooking (lib/crafting.ts CookingPot): a fire flickering in the hearth under the
// pot and steam puffing out of it. Once the food is done the fire goes out and only a thin wisp of
// steam is left, so a kid can see from across the island that it's ready to take out.
//
// Drawn on one Graphics in a Container that follows the camera like a tilemap layer (the scene
// keeps it in its tilemapLayers list), just over the plots.
import Phaser from 'phaser';

export interface CookFx {
  id: string;
  // The Kitchen's tile.
  x: number;
  y: number;
  readyAt: number;
}

// Where things are in the Kitchen's art (public/hideout/kitchen.png, 48 x 48, standing on the
// bottom middle of its tile): the pot's mouth and the front of the stone hearth under it.
const ART = { w: 48, h: 48, pot: { x: 16, y: 18 }, hearth: { x: 16, y: 37 } };

interface Puff { x: number; y: number; born: number; life: number; drift: number; size: number }

export default class CookFire {
  readonly container: Phaser.GameObjects.Container;
  private gfx: Phaser.GameObjects.Graphics;
  private fx: CookFx[] = [];
  private puffs = new Map<string, Puff[]>();
  private nextPuff = new Map<string, number>();
  private lastDraw = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.Tilemaps.TilemapLayer, depth: number) {
    this.container = scene.add.container(layer.x, layer.y);
    this.container.setScale(layer.scaleX);
    this.container.setDepth(depth);
    this.gfx = scene.add.graphics();
    this.container.add(this.gfx);
  }

  setFx(fx: CookFx[]) {
    this.fx = fx;
    for (const id of [...this.puffs.keys()]) if (!fx.some(f => f.id === id)) { this.puffs.delete(id); this.nextPuff.delete(id); }
    if (!fx.length) this.gfx.clear();
  }

  update(time: number) {
    if (!this.fx.length || time - this.lastDraw < 50) return;
    this.lastDraw = time;
    const now = Date.now();
    const g = this.gfx;
    g.clear();
    for (const f of this.fx) {
      const left = f.x * 32 + 16 - ART.w / 2, top = (f.y + 1) * 32 - ART.h;
      const cooking = now < f.readyAt;
      if (cooking) this.drawFire(g, left + ART.hearth.x, top + ART.hearth.y, time);
      this.drawSteam(g, f.id, left + ART.pot.x, top + ART.pot.y, time, cooking);
    }
  }

  // The hearth: a dark opening in the stone with a warm glow and three flickering flames.
  private drawFire(g: Phaser.GameObjects.Graphics, cx: number, by: number, t: number) {
    const glow = 0.25 + 0.1 * Math.sin(t / 90) + 0.05 * Math.sin(t / 37);
    g.fillStyle(0xff8a1f, glow).fillEllipse(cx, by - 2, 22, 12);
    g.fillStyle(0x1b120c, 1).fillRect(cx - 5, by - 6, 10, 6);
    g.fillRect(cx - 4, by - 7, 8, 1);
    // Logs.
    g.fillStyle(0x5a3a1e, 1).fillRect(cx - 5, by - 1, 10, 1);
    const flames = [{ dx: -2.5, w: 3, p: 0 }, { dx: 0, w: 4, p: 1.7 }, { dx: 2.5, w: 3, p: 3.1 }];
    for (const fl of flames) {
      const h = 3.5 + 1.5 * Math.sin(t / 70 + fl.p) + Math.sin(t / 31 + fl.p * 2) * 0.8;
      const x = cx + fl.dx - fl.w / 2;
      g.fillStyle(0xe8521c, 1).fillRect(Math.round(x), Math.round(by - 1 - h), fl.w, Math.round(h));
      g.fillStyle(0xffb020, 1).fillRect(Math.round(x + 0.5), Math.round(by - 1 - h * 0.65), Math.max(1, fl.w - 1), Math.round(h * 0.65));
      g.fillStyle(0xfff2a8, 1).fillRect(Math.round(x + fl.w / 2 - 0.5), Math.round(by - 1 - h * 0.3), 1, Math.max(1, Math.round(h * 0.3)));
    }
    // A spark now and then.
    const sp = (t / 400) % 1;
    if (Math.floor(t / 400) % 3 === 0) g.fillStyle(0xffd060, 1 - sp).fillRect(Math.round(cx + Math.sin(t / 400) * 3), Math.round(by - 6 - sp * 8), 1, 1);
  }

  // Steam: soft puffs that rise, grow, drift and fade. Lots while cooking, a thin wisp once done.
  private drawSteam(g: Phaser.GameObjects.Graphics, id: string, cx: number, cy: number, t: number, cooking: boolean) {
    const list = this.puffs.get(id) ?? [];
    const gap = cooking ? 260 : 900;
    if (t >= (this.nextPuff.get(id) ?? 0)) {
      list.push({ x: cx + (Math.random() - 0.5) * 8, y: cy, born: t, life: cooking ? 1500 : 1200, drift: (Math.random() - 0.5) * 6, size: cooking ? 2.5 : 1.5 });
      this.nextPuff.set(id, t + gap + Math.random() * 120);
    }
    const alive = list.filter(p => t - p.born < p.life);
    this.puffs.set(id, alive);
    for (const p of alive) {
      const k = (t - p.born) / p.life;
      const x = p.x + p.drift * k + Math.sin(k * 6 + p.born) * 1.2;
      const y = p.y - 22 * k;
      g.fillStyle(0xffffff, (cooking ? 0.7 : 0.45) * (1 - k)).fillCircle(x, y, p.size + 3 * k);
    }
  }
}
