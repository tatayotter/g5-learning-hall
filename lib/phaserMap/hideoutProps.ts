// lib/phaserMap/hideoutProps.ts
// Draws the Hideout's plots (lib/hideoutConfig.ts) and the Hideout signpost in town: one image
// each, standing on its tile. A prop can show part of a bigger image (a young tree is its grown
// frame, drawn small) and the one the kid is next to gets the gold outline, like plants and trees.
//
// The images sit in one Container that follows the camera like a tilemap layer (the scene keeps
// it in its tilemapLayers list), with the plants, under the players.
import Phaser from 'phaser';
import { addOutline, outlineAlpha } from './outline';

export interface PropSprite {
  id: string;
  src: string;
  x: number;
  y: number;
  // The part of the image to show (default: all of it).
  frame?: { x: number; y: number; w: number; h: number };
  // Where in that frame the bottom middle of the tile goes (default: its bottom middle).
  anchor?: { x: number; y: number };
  scale?: number;
}

interface Drawn {
  key: string;
  image: Phaser.GameObjects.Image;
  outline: Phaser.GameObjects.Image[];
}

const keyOf = (p: PropSprite) => `${p.src}:${p.x},${p.y}:${p.frame ? Object.values(p.frame).join(',') : ''}:${p.scale ?? 1}`;

export default class HideoutProps {
  readonly container: Phaser.GameObjects.Container;
  private drawn = new Map<string, Drawn>();
  private wanted: PropSprite[] = [];
  private highlight: string | null = null;

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.Tilemaps.TilemapLayer,
    depth: number,
    private loadTexture: (key: string, url: string, onReady: () => void) => void,
  ) {
    this.container = scene.add.container(layer.x, layer.y);
    this.container.setScale(layer.scaleX);
    this.container.setDepth(depth);
  }

  setProps(props: PropSprite[]) {
    this.wanted = props;
    const ids = new Set(props.map(p => p.id));
    for (const [id, d] of this.drawn) {
      if (!ids.has(id)) { this.clear(d); this.drawn.delete(id); }
    }
    for (const p of props) {
      const key = keyOf(p);
      if (this.drawn.get(p.id)?.key === key) continue;
      const tex = `prop:${p.src}`;
      this.loadTexture(tex, p.src, () => {
        const now = this.wanted.find(w => w.id === p.id);
        if (!now || keyOf(now) !== key || this.drawn.get(p.id)?.key === key) return;
        this.draw(now, tex, key, this.drawn.has(p.id));
      });
    }
  }

  /** Outline the prop with this id (the plot the kid can use now), or none. */
  setHighlight(id: string | null) {
    if (id === this.highlight) return;
    const was = this.highlight;
    this.highlight = id;
    for (const pid of [was, id]) {
      const p = pid && this.wanted.find(w => w.id === pid);
      // Only redraw what's on screen as it is now; a prop whose new look is still loading gets
      // the outline when it's drawn.
      if (p && this.drawn.get(p.id)?.key === keyOf(p)) this.draw(p, `prop:${p.src}`, keyOf(p));
    }
  }

  private clear(d: Drawn) {
    d.image.destroy();
    d.outline.forEach(o => o.destroy());
  }

  private draw(p: PropSprite, tex: string, key: string, hop = false) {
    const old = this.drawn.get(p.id);
    if (old) this.clear(old);
    const texture = this.scene.textures.get(tex);
    const src = texture.getSourceImage() as { width: number; height: number };
    const f = p.frame ?? { x: 0, y: 0, w: src.width, h: src.height };
    const name = `${f.x},${f.y},${f.w},${f.h}`;
    if (!texture.has(name)) texture.add(name, 0, f.x, f.y, f.w, f.h);
    const scale = p.scale ?? 1;
    const anchor = p.anchor ?? { x: f.w / 2, y: f.h };
    const left = p.x * 32 + 16 - anchor.x * scale;
    const top = (p.y + 1) * 32 - anchor.y * scale;
    let outline: Phaser.GameObjects.Image[] = [];
    if (p.id === this.highlight) {
      outline = addOutline(this.scene, this.container, tex, name, left, top);
      for (const o of outline) o.setScale(scale);
    }
    const image = this.scene.add.image(left, top, tex, name).setOrigin(0, 0).setScale(scale);
    this.container.add(image);
    // A plot that just changed (built, planted) gives a little hop.
    if (hop) {
      this.scene.tweens.add({ targets: image, y: top - 3, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
    }
    this.drawn.set(p.id, { key, image, outline });
  }

  update(now: number) {
    const glow = outlineAlpha(now);
    for (const d of this.drawn.values()) for (const o of d.outline) o.setAlpha(glow);
  }

  destroy() {
    this.container.destroy();
    this.drawn.clear();
  }
}
