// lib/phaserMap/groundTexture.ts
// Texture on a tile-art map's plain ground (lib/groundLooks.ts says what each region gets):
// one picture the size of the map, laid just over the ground layers, see-through everywhere
// except the plain ground. Purely visual, and nothing moves, so it costs one image a frame.
//
// At map build the ground layers are drawn flat onto a canvas (the cliff skirts as a solid
// stand-in colour, so their stone never counts as plain ground; tufts the swaying grass took
// over are left out, so the texture runs on under them). paintGroundSteps turns that into the
// texture, a strip at a time over a few frames, and it fades in when done.
import Phaser from 'phaser';
import { GROUND_LOOKS, paintGroundSteps, type GroundLook } from '@/lib/groundLooks';

// Layers that make up the ground, and the ones among them that are never plain ground.
const GROUND_LAYERS = new Set(['under ground', 'liquid', 'ground', 'ground detail', 'skirt', 'excess skirt', 'fountain circle']);
const NEVER_PLAIN = new Set(['skirt', 'excess skirt']);
const BUDGET_MS = 6; // painting time per frame
const FADE_MS = 400;

let textures = 0;

export default class GroundTexture {
  readonly container: Phaser.GameObjects.Container;
  private key = '';
  private steps: Generator<void, boolean> | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private image: ImageData | null = null;
  private dead = false;

  // Null when the region has no look, or the map has no tile layers to read.
  static build(scene: Phaser.Scene, regionId: string | undefined, layers: Phaser.Tilemaps.TilemapLayer[], depth: number): GroundTexture | null {
    const look = regionId ? GROUND_LOOKS[regionId] : undefined;
    const ground = layers.filter(l => GROUND_LAYERS.has(l.layer.name.trim().toLowerCase()));
    if (!look || !ground.length) return null;
    return new GroundTexture(scene, regionId!, look, ground, depth);
  }

  private constructor(private scene: Phaser.Scene, regionId: string, look: GroundLook, layers: Phaser.Tilemaps.TilemapLayer[], depth: number) {
    const first = layers[0];
    this.container = scene.add.container(first.x, first.y).setScale(first.scaleX).setDepth(depth);
    const map = first.tilemap;
    const W = map.width * map.tileWidth, H = map.height * map.tileHeight;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const solids = new Map<number, HTMLCanvasElement>();
    for (const layer of layers) {
      const never = NEVER_PLAIN.has(layer.layer.name.trim().toLowerCase());
      ctx.globalAlpha = layer.alpha;
      layer.forEachTile(tile => {
        const ts = tile.tileset;
        const at = ts?.getTileTextureCoordinates(tile.index) as { x: number; y: number } | null;
        const src = ts?.image?.getSourceImage() as CanvasImageSource | undefined;
        if (!ts || !at || !src || !tile.visible) return;
        let img: CanvasImageSource = src, sx = at.x, sy = at.y;
        if (never) {
          // Its shape in one flat colour that no ground uses.
          let solid = solids.get(tile.index);
          if (!solid) {
            solid = document.createElement('canvas');
            solid.width = ts.tileWidth;
            solid.height = ts.tileHeight;
            const s = solid.getContext('2d')!;
            s.drawImage(src, at.x, at.y, ts.tileWidth, ts.tileHeight, 0, 0, ts.tileWidth, ts.tileHeight);
            s.globalCompositeOperation = 'source-in';
            s.fillStyle = '#ff00fe';
            s.fillRect(0, 0, ts.tileWidth, ts.tileHeight);
            solids.set(tile.index, solid);
          }
          img = solid; sx = 0; sy = 0;
        }
        const x = tile.x * map.tileWidth, y = tile.y * map.tileHeight;
        if (tile.flipX || tile.flipY || tile.rotation) {
          ctx.save();
          ctx.translate(x + map.tileWidth / 2, y + map.tileHeight / 2);
          ctx.rotate(tile.rotation);
          ctx.scale(tile.flipX ? -1 : 1, tile.flipY ? -1 : 1);
          ctx.drawImage(img, sx, sy, ts.tileWidth, ts.tileHeight, -map.tileWidth / 2, -map.tileHeight / 2, map.tileWidth, map.tileHeight);
          ctx.restore();
        } else {
          ctx.drawImage(img, sx, sy, ts.tileWidth, ts.tileHeight, x, y, map.tileWidth, map.tileHeight);
        }
      }, undefined, 0, 0, map.width, map.height, { isNotEmpty: true });
    }
    ctx.globalAlpha = 1;
    this.canvas = canvas;
    this.image = ctx.getImageData(0, 0, W, H);
    // Same map, same look, every visit.
    this.steps = paintGroundSteps(this.image.data, W, H, look, regionId);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.step, this);
  }

  // A few milliseconds of painting a frame; once done, the texture goes up and fades in.
  private step() {
    if (!this.steps) return;
    const until = performance.now() + BUDGET_MS;
    let r = this.steps.next();
    while (!r.done && performance.now() < until) r = this.steps.next();
    if (!r.done) return;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.step, this);
    this.steps = null;
    const canvas = this.canvas!, image = this.image!;
    this.image = null;
    this.canvas = null;
    if (!r.value || this.dead) return;
    canvas.getContext('2d')!.putImageData(image, 0, 0);
    this.key = `ground:tex:${++textures}`;
    const tex = this.scene.textures.addCanvas(this.key, canvas);
    // Filtered like the tilesets (TrainingMapScene.setLinearFilter), so it lines up with them.
    tex?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const pic = this.scene.add.image(0, 0, this.key).setOrigin(0, 0).setAlpha(0);
    this.container.add(pic);
    this.scene.tweens.add({ targets: pic, alpha: 1, duration: FADE_MS });
  }

  destroy() {
    this.dead = true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.step, this);
    this.steps = null;
    this.container.destroy();
    if (this.key && this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
  }
}
