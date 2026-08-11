// lib/phaserMap/TileArtMapScene.ts
// Renders a Tiled map using real tile-layer art (as opposed to
// TrainingMapScene, which draws a single painted background image and only
// uses Tiled for an invisible walkability layer). This is the trial for
// switching regions over to true tile-based art — see
// components/dev/TileArtMapPrototype.tsx for the test harness that mounts
// this, and public/tilesets/forgotten-memories/ for the tileset itself.
//
// Generic on purpose: works with any Tiled JSON map + external tileset
// image(s), so it isn't tied to one specific map file.
import Phaser from 'phaser';

export interface TileArtMapConfig {
  // The full Tiled map JSON, pre-merged so every tileset entry is fully
  // embedded (external .tsx references resolved and inlined) — Phaser's
  // Tiled parser can't follow external tileset files itself. See
  // TileArtMapPrototype.tsx for the fetch+merge step that produces this.
  mapJson: object;
  // Resolved (public-URL) image path per tileset, keyed by the tileset's
  // `name` field in the Tiled JSON.
  tilesetImages: Record<string, string>;
}

export default class TileArtMapScene extends Phaser.Scene {
  private config: TileArtMapConfig;

  constructor(config: TileArtMapConfig) {
    super('TileArtMapScene');
    this.config = config;
  }

  preload() {
    this.load.tilemapTiledJSON('map', this.config.mapJson);
    for (const [name, url] of Object.entries(this.config.tilesetImages)) {
      this.load.image(`tileset:${name}`, url);
    }
  }

  create() {
    const map = this.make.tilemap({ key: 'map' });

    const tilesets = map.tilesets
      .map(t => map.addTilesetImage(t.name, `tileset:${t.name}`))
      .filter((t): t is Phaser.Tilemaps.Tileset => t !== null);

    if (tilesets.length === 0) {
      this.add.text(16, 16, 'No tilesets loaded — check tileset names/image paths.', { color: '#f87171' });
      return;
    }

    let y = 0;
    for (const layerData of map.layers) {
      const layer = map.createLayer(layerData.name, tilesets, 0, 0);
      layer?.setDepth(y++);
    }

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    // Fit the whole map in view rather than 1:1 pixel zoom, since these test
    // maps are small (10x10-ish) and 32px tiles would otherwise render tiny
    // in a corner of the 896x504 canvas.
    const zoom = Math.min(896 / map.widthInPixels, 504 / map.heightInPixels);
    cam.setZoom(zoom);
    cam.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
  }
}
