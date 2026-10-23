// lib/phaserMap/swayingGrass.ts
// Makes the tall-grass tufts (and each region's own grass and flowers) on a tile-art map sway
// in the wind, and rustle when the player walks into them. Purely visual.
//
// A tilemap layer is one baked surface, so a single tile can't move on its
// own. At map build, each tuft tile in the "Ground Detail" layer is hidden
// and redrawn as three horizontal slices (same tileset texture, same spot),
// all held in one Container that follows the camera like a tilemap layer
// does (the scene keeps it in its tilemapLayers list).
//
// The sway bends rather than rotates: the bottom slice (roots) stays put, the
// middle slice slides up to 1 art pixel and the top slice up to 2, always in
// whole art pixels so the pixel art stays crisp. One slow wind wave rolls
// across the field (neighbours move together), with a per-tuft seed so the
// field doesn't move in lockstep.
import Phaser from 'phaser';

// Swaying tiles, by tileset name and tile id within it: the pixel row where the clump's base
// sits inside its 32 px tile, and how tall the clump is. The pack's tall grass draws the same
// 16 px clump at three heights; a region's own plants (FireNature: grass, flowers) stand on
// their shadow near the bottom of the tile.
const CLUMPS: Record<string, { base: number; h: number }> = {
  'Trees:370': { base: 32, h: 16 },
  'Trees:371': { base: 24, h: 16 },
  'Trees:372': { base: 16, h: 16 },
  'FireNature:2': { base: 26, h: 17 },
  'FireNature:3': { base: 25, h: 18 },
};
// Slices from the top of the clump down, as shares of its height: [share, max shift in art
// pixels]. Bottom 30% anchored, top 70% bends (same rule as the garden plants).
const SLICES: [number, number][] = [[6 / 16, 2], [5 / 16, 1], [5 / 16, 0]];

const SWAY_PERIOD_MS = 5200;  // one full gust: slow and calm
const WAVE_X = 0.35;          // phase step per tile: the wave travels right...
const WAVE_Y = 0.2;           // ...and a little down the map
const RUSTLE_MS = 600;        // shake when stepped into

interface Tuft {
  slices: { image: Phaser.GameObjects.Image; x: number; shift: number; px: number }[];
  phase: number;
  seed: number;
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
      const tileset = tile.tileset;
      const clump = tileset && CLUMPS[`${tileset.name}:${tile.index - tileset.firstgid}`];
      if (!clump || !tileset.image) return;
      const at = tileset.getTileTextureCoordinates(tile.index) as { x: number; y: number } | null;
      if (!at) return;
      const texture = tileset.image;
      const px = tile.height / 32; // map pixels per art pixel
      const left = tile.x * tile.width;
      let row = clump.base - clump.h;
      const slices: Tuft['slices'] = [];
      SLICES.forEach(([share, shift], i) => {
        const rows = i === SLICES.length - 1 ? clump.base - row : Math.round(share * clump.h);
        const frameName = `tuft:${tile.index}:${i}`;
        if (!texture.has(frameName)) texture.add(frameName, 0, at.x, at.y + row, tileset.tileWidth, rows);
        const image = scene.add.image(left, tile.y * tile.height + row * px, texture.key, frameName).setOrigin(0, 0);
        this.container.add(image);
        slices.push({ image, x: left, shift, px });
        row += rows;
      });
      tile.setVisible(false);
      const seed = Math.sin(tile.x * 12.9898 + tile.y * 78.233) * 43758.5453;
      this.tufts.set(`${tile.x},${tile.y}`, {
        slices,
        phase: tile.x * WAVE_X + tile.y * WAVE_Y,
        seed: (seed - Math.floor(seed)) * Math.PI * 2,
        rustleStart: -Infinity,
      });
    });
  }

  update(now: number) {
    const wind = (now / SWAY_PERIOD_MS) * Math.PI * 2;
    for (const tuft of this.tufts.values()) {
      // Leans mostly one way (the wind's direction), with a slow per-tuft drift.
      let lean = 0.35 + 0.5 * Math.sin(wind - tuft.phase) + 0.25 * Math.sin(wind * 0.43 + tuft.seed);
      const r = (now - tuft.rustleStart) / RUSTLE_MS;
      if (r < 1) lean += 1.2 * Math.sin(r * Math.PI * 4) * (1 - r);
      lean = Math.max(-1, Math.min(1, lean));
      for (const s of tuft.slices) s.image.x = s.x + Math.round(lean * s.shift) * s.px;
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
