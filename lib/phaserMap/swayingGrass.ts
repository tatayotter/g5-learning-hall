// lib/phaserMap/swayingGrass.ts
// Makes the tall-grass tufts on a tile-art map sway in the wind, and rustle
// when the player walks into them. Purely visual.
//
// A tilemap layer is one baked surface, so a single tile can't move on its
// own. At map build, each tuft tile in the "Ground Detail" layer is hidden
// and redrawn as its own Image (same tileset texture, same spot), all held
// in one Container that follows the camera like a tilemap layer does (the
// scene keeps it in its tilemapLayers list). Every frame one shared wind wave
// rolls across the field: each tuft leans by a sine of time minus its map
// position, so neighbours move together and the wave travels diagonally.
//
// Each tuft pivots at the bottom of its painted grass (not the tile's
// bottom): the three tuft tiles draw the same 32x16 clump at three heights.
import Phaser from 'phaser';

// Global tile ids (Ledger's Heart's tileset order) of the tall-grass tufts,
// mapped to the pixel row where the clump's base sits inside its 32 px tile.
const TUFT_BASE_Y: Record<number, number> = { 5491: 32, 5492: 24, 5493: 16 };

const SWAY_DEG = 4;           // how far a tuft leans at the top of a gust
const SWAY_PERIOD_MS = 2600;  // one full gust
const WAVE_X = 0.45;          // phase step per tile: the wave travels right...
const WAVE_Y = 0.25;          // ...and a little down the map
const RUSTLE_DEG = 14;        // extra lean when stepped into
const RUSTLE_MS = 450;

interface Tuft {
  image: Phaser.GameObjects.Image;
  phase: number;
  rustleStart: number;
}

export default class SwayingGrass {
  readonly container: Phaser.GameObjects.Container;
  private tufts = new Map<string, Tuft>();

  // Returns null when the layer has no tufts, or the player asked for less
  // motion (the tiles then just stay drawn in the layer as before).
  static build(scene: Phaser.Scene, layer: Phaser.Tilemaps.TilemapLayer): SwayingGrass | null {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
    const grass = new SwayingGrass(scene, layer);
    return grass.tufts.size > 0 ? grass : (grass.container.destroy(), null);
  }

  private constructor(scene: Phaser.Scene, layer: Phaser.Tilemaps.TilemapLayer) {
    this.container = scene.add.container(layer.x, layer.y);
    this.container.setScale(layer.scaleX);
    this.container.setDepth(layer.depth + 0.5);
    layer.forEachTile(tile => {
      const baseY = TUFT_BASE_Y[tile.index];
      const tileset = tile.tileset;
      if (baseY === undefined || !tileset?.image) return;
      const texture = tileset.image;
      const frameName = `tuft:${tile.index}`;
      if (!texture.has(frameName)) {
        const at = tileset.getTileTextureCoordinates(tile.index) as { x: number; y: number } | null;
        if (!at) return;
        texture.add(frameName, 0, at.x, at.y, tileset.tileWidth, tileset.tileHeight);
      }
      const w = tile.width;
      const h = tile.height;
      const image = scene.add.image(tile.x * w + w / 2, tile.y * h + baseY * (h / 32), texture.key, frameName);
      image.setOrigin(0.5, baseY / 32);
      this.container.add(image);
      tile.setVisible(false);
      this.tufts.set(`${tile.x},${tile.y}`, { image, phase: tile.x * WAVE_X + tile.y * WAVE_Y, rustleStart: -Infinity });
    });
  }

  update(now: number) {
    const wind = (now / SWAY_PERIOD_MS) * Math.PI * 2;
    for (const tuft of this.tufts.values()) {
      // A main gust plus a faster, smaller flutter so it never looks mechanical.
      let deg = SWAY_DEG * Math.sin(wind - tuft.phase) + 1.2 * Math.sin(wind * 2.3 - tuft.phase * 1.7);
      const r = (now - tuft.rustleStart) / RUSTLE_MS;
      if (r < 1) deg += RUSTLE_DEG * Math.sin(r * Math.PI * 3) * (1 - r);
      tuft.image.setAngle(deg);
    }
  }

  // The player just walked onto tile (x, y): shake the tuft there, if any.
  rustle(x: number, y: number, now: number) {
    const tuft = this.tufts.get(`${x},${y}`);
    if (tuft) tuft.rustleStart = now;
  }

  destroy() {
    this.container.destroy();
    this.tufts.clear();
  }
}
