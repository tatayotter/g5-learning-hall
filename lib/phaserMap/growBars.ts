// lib/phaserMap/growBars.ts
// A small bar over everything a kid is growing at their Hideout (lib/hideoutConfig.ts): how far a
// crop or a tree has come from planting to ripe (and the Kitchen's food, from the pot to done). It fills as time passes and goes once it's ripe.
//
// The bars sit in one Container that follows the camera like a tilemap layer (the scene keeps it
// in its tilemapLayers list), over the plants and the players.
import Phaser from 'phaser';

export interface GrowBar {
  id: string;
  x: number;
  y: number;
  plantedAt: number;
  readyAt: number;
  // How far above the tile's bottom the bar goes, in map pixels (the top of the plant's art).
  top: number;
  // Watered: the fill is blue-green instead of green.
  watered?: boolean;
  // A fill colour of its own (the Kitchen's cooking bar is orange).
  color?: number;
}

const W = 18, H = 4;

export default class GrowBars {
  readonly container: Phaser.GameObjects.Container;
  private bars: GrowBar[] = [];
  private gfx: Phaser.GameObjects.Graphics;
  private lastDraw = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.Tilemaps.TilemapLayer, depth: number) {
    this.container = scene.add.container(layer.x, layer.y);
    this.container.setScale(layer.scaleX);
    this.container.setDepth(depth);
    this.gfx = scene.add.graphics();
    this.container.add(this.gfx);
  }

  setBars(bars: GrowBar[]) {
    this.bars = bars;
    this.draw(Date.now());
  }

  update(time: number) {
    // Growing takes minutes to hours: twice a second is plenty.
    if (time - this.lastDraw < 500) return;
    this.lastDraw = time;
    this.draw(Date.now());
  }

  private draw(now: number) {
    const g = this.gfx;
    g.clear();
    for (const b of this.bars) {
      if (now >= b.readyAt) continue;
      const done = Math.max(0, Math.min(1, (now - b.plantedAt) / Math.max(1, b.readyAt - b.plantedAt)));
      const left = b.x * 32 + 16 - W / 2, top = (b.y + 1) * 32 - b.top - H - 2;
      g.fillStyle(0x1b120c, 0.85).fillRect(left - 1, top - 1, W + 2, H + 2);
      g.fillStyle(0x3d3226, 1).fillRect(left, top, W, H);
      const fill = Math.max(1, Math.round(W * done));
      g.fillStyle(b.color ?? (b.watered ? 0x4cc9b0 : 0x7bc043), 1).fillRect(left, top, fill, H);
      g.fillStyle(0xffffff, 0.35).fillRect(left, top, fill, 1);
    }
  }
}
