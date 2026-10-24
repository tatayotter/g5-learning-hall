// lib/phaserMap/swayingTrees.ts
// A gentle sway for the tree canopies on a tile-art map. Purely visual.
//
// Same trick as swayingGrass.ts: each canopy tile in the "Objects Top" layer
// is hidden and redrawn as its own Image in one Container that follows the
// camera like the layer does. Trees are stacks of tiles, so each tile slides
// by how high it sits above the bottom of its tree (counting tree tiles in
// "Objects Base" too): the bottom tile (trunk) stays put, the next row slides
// up to 1 art pixel, rows above that up to 2. The slide is continuous (the
// tileset is drawn with smooth filtering, so sub-pixel steps don't smear),
// which keeps the motion fluid. Slower and smaller than the grass: trees are heavy.
import Phaser from 'phaser';

// The Trees tileset's global ids in Ledger's Heart (firstgid 5121, 1024 tiles),
// minus the tall-grass tufts that live on the same sheet.
const TREE_GIDS = { first: 5121, last: 6144 };
const NOT_CANOPY = new Set([5491, 5492, 5493]);
const isTree = (index: number) => index >= TREE_GIDS.first && index <= TREE_GIDS.last && !NOT_CANOPY.has(index);

const SWAY_PERIOD_MS = 7000;
const WAVE_X = 0.12;
const WAVE_Y = 0.06;

interface CanopyTile {
  image: Phaser.GameObjects.Image;
  x: number;
  shift: number;  // art pixels at full lean
  px: number;     // layer units per art pixel
  phase: number;
}

export default class SwayingTrees {
  readonly container: Phaser.GameObjects.Container;
  private tiles: CanopyTile[] = [];

  // null when there are no canopy tiles, or the player asked for less motion.
  static build(scene: Phaser.Scene, top: Phaser.Tilemaps.TilemapLayer, base: Phaser.Tilemaps.TilemapLayer | null): SwayingTrees | null {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
    const trees = new SwayingTrees(scene, top, base);
    return trees.tiles.length > 0 ? trees : (trees.container.destroy(), null);
  }

  private constructor(scene: Phaser.Scene, top: Phaser.Tilemaps.TilemapLayer, base: Phaser.Tilemaps.TilemapLayer | null) {
    this.container = scene.add.container(top.x, top.y);
    this.container.setScale(top.scaleX);
    this.container.setDepth(top.depth + 0.5);
    const treeAt = (x: number, y: number) =>
      isTree(top.getTileAt(x, y)?.index ?? -1) || isTree(base?.getTileAt(x, y)?.index ?? -1);
    // How many rows of tree sit below each canopy tile (0 = trunk row).
    const below = new Map<Phaser.Tilemaps.Tile, number>();
    top.forEachTile(tile => {
      if (!isTree(tile.index) || !tile.tileset?.image) return;
      let n = 0;
      while (n < 3 && treeAt(tile.x, tile.y + n + 1)) n++;
      below.set(tile, n);
    });
    // Side-by-side tiles in one row must slide together, or a 1 px gap opens
    // between them; each row run takes its lowest tile's shift.
    const runShift = new Map<Phaser.Tilemaps.Tile, { shift: number; phase: number }>();
    for (const tile of below.keys()) {
      if (runShift.has(tile)) continue;
      const run: Phaser.Tilemaps.Tile[] = [];
      let x = tile.x;
      while (x > 0 && below.has(top.getTileAt(x - 1, tile.y)!)) x--;
      for (let t = top.getTileAt(x, tile.y); t && below.has(t); t = top.getTileAt(++x, tile.y)) run.push(t);
      const shift = Math.min(...run.map(t => Math.min(below.get(t)!, 2)));
      // One phase per run too, so the run moves as one piece.
      const phase = (run[0].x + run[run.length - 1].x) / 2 * WAVE_X + tile.y * WAVE_Y;
      for (const t of run) runShift.set(t, { shift, phase });
    }
    for (const [tile, { shift, phase }] of runShift) {
      if (shift === 0) continue; // trunk rows stay in the layer
      const tileset = tile.tileset!;
      const texture = tileset.image!;
      const frameName = `tree:${tile.index}`;
      if (!texture.has(frameName)) {
        const at = tileset.getTileTextureCoordinates(tile.index) as { x: number; y: number } | null;
        if (!at) continue;
        texture.add(frameName, 0, at.x, at.y, tileset.tileWidth, tileset.tileHeight);
      }
      const x = tile.x * tile.width;
      const image = scene.add.image(x, tile.y * tile.height, texture.key, frameName).setOrigin(0, 0);
      this.container.add(image);
      tile.setVisible(false);
      this.tiles.push({ image, x, shift, px: tile.height / 32, phase });
    }
  }

  // strength: the map's wind (1 = the usual breeze); stronger bends the canopies further and faster.
  update(now: number, strength = 1) {
    const wind = (now / (SWAY_PERIOD_MS / (0.5 + 0.5 * strength))) * Math.PI * 2;
    const gusty = Math.max(0, strength - 1) * 0.2;
    for (const t of this.tiles) {
      // Leans with the wind and eases back, never far upwind.
      const lean = 0.25 + 0.55 * Math.sin(wind - t.phase) + 0.2 * Math.sin(wind * 0.37 - t.phase * 2)
        + gusty * Math.sin(now / 260 + t.phase * 5);
      t.image.x = t.x + lean * t.shift * strength * t.px;
    }
  }

  destroy() {
    this.container.destroy();
    this.tiles = [];
  }
}
