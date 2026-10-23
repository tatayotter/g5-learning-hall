// lib/phaserMap/wildTrees.ts
// Draws the trees of a map's daily nature layer (lib/mapNature.ts), and the chop effects.
// Each tree's art is a strip of two 96x144 frames, grown and stump, with the trunk base at
// (48, 134) so it stands near the bottom of its trunk tile.
//
// Like the map's own trees, each one is split in two at the top of the trunk tile: the trunk
// part sits under the players, the canopy above them, so a kid walking behind a tree goes
// under its leaves. A grown tree's canopy glides a little like the map's trees
// (swayingTrees.ts).
//
// Effects: swing() shakes the tree and throws wood chips and a few leaves; when a tree goes
// from ready to a stump it topples over and lands in a puff of dust and leaves.
import Phaser from 'phaser';
import type { TreeId, TreeStage } from '@/lib/gardenConfig';
import { addOutline, outlineAlpha } from './outline';

export interface TreeSprite {
  id: string;
  tree: TreeId;
  x: number;
  y: number;
  stage: TreeStage;
  hits: number;
}

const FW = 96;
const FH = 144;
const BASE_X = 48;
const BASE_Y = 134;
// Frame row at the top of the trunk tile: above it is canopy (drawn over the players).
const SPLIT = BASE_Y - 28;
// The rows of a grown tree above its stump's cut (the part that falls when it's chopped).
const FALL_H = BASE_Y - 20;
const FRAME_OF: Record<TreeStage, number> = { ready: 0, stump: 1 };
const GLIDE_MS = 7000;

interface Drawn {
  key: string;
  tree: TreeSprite;
  below: Phaser.GameObjects.Image[];
  canopy: Phaser.GameObjects.Image | null;
  canopyX: number;
  // The gold outline when this is the tree the kid can chop now: the trunk's copies are in
  // `below` (so they shake with it), the canopy's follow the canopy each frame.
  outline: Phaser.GameObjects.Image[];
  canopyOutline: { image: Phaser.GameObjects.Image; dx: number }[];
  phase: number;
  // Sideways shake from a swing, in art pixels (the canopy's glide adds it each frame).
  shake: number;
}

export default class WildTrees {
  readonly below: Phaser.GameObjects.Container;
  readonly above: Phaser.GameObjects.Container;
  private drawn = new Map<string, Drawn>();
  private wanted: TreeSprite[] = [];
  private readonly still: boolean;
  private highlight: string | null = null;

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.Tilemaps.TilemapLayer,
    belowDepth: number,
    aboveDepth: number,
    private loadTexture: (key: string, url: string, onReady: () => void) => void,
  ) {
    const make = (depth: number) => scene.add.container(layer.x, layer.y).setScale(layer.scaleX).setDepth(depth);
    this.below = make(belowDepth);
    this.above = make(aboveDepth);
    this.still = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  setTrees(trees: TreeSprite[]) {
    this.wanted = trees;
    const ids = new Set(trees.map(t => t.id));
    for (const [id, d] of this.drawn) {
      if (!ids.has(id)) { this.clear(d); this.drawn.delete(id); }
    }
    for (const t of trees) {
      const key = `${t.tree}:${t.stage}`;
      const prev = this.drawn.get(t.id);
      if (prev?.key === key) continue;
      const tex = `garden:tree_${t.tree}`;
      this.loadTexture(tex, `/garden/tree_${t.tree}.png`, () => {
        const now = this.wanted.find(w => w.id === t.id);
        if (!now || `${now.tree}:${now.stage}` !== key || this.drawn.get(t.id)?.key === key) return;
        this.draw(now, tex, key, prev?.key ?? null);
      });
    }
  }

  private clear(d: Drawn) {
    d.below.forEach(i => i.destroy());
    d.canopy?.destroy();
    d.canopyOutline.forEach(o => o.image.destroy());
  }

  /** Outline the tree with this id (the one the kid can chop now), or none. */
  setHighlight(id: string | null) {
    if (id === this.highlight) return;
    const was = this.highlight;
    this.highlight = id;
    for (const tid of [was, id]) {
      const t = tid && this.wanted.find(w => w.id === tid);
      const d = tid ? this.drawn.get(tid) : undefined;
      if (t && d) this.draw(t, `garden:tree_${t.tree}`, d.key, d.key);
    }
  }

  private origin(t: { x: number; y: number }) {
    return { left: t.x * 32 + 16 - BASE_X, top: t.y * 32 + 28 - BASE_Y };
  }

  // 'top' and 'bottom' are the canopy and trunk; the 'clip' versions leave out the row at the
  // seam, for the outline copies that would otherwise draw a gold line across the trunk there.
  private frame(tex: string, stage: TreeStage, part: 'top' | 'bottom' | 'topclip' | 'bottomclip') {
    const name = `${stage}:${part}`;
    const texture = this.scene.textures.get(tex);
    if (!texture.has(name)) {
      const fx = FRAME_OF[stage] * FW;
      if (part === 'top') texture.add(name, 0, fx, 0, FW, SPLIT);
      else if (part === 'topclip') texture.add(name, 0, fx, 0, FW, SPLIT - 1);
      else if (part === 'bottom') texture.add(name, 0, fx, SPLIT, FW, FH - SPLIT);
      else texture.add(name, 0, fx, SPLIT + 1, FW, FH - SPLIT - 1);
    }
    return name;
  }

  private draw(t: TreeSprite, tex: string, key: string, prevKey: string | null) {
    const old = this.drawn.get(t.id);
    if (old) this.clear(old);
    const { left, top } = this.origin(t);
    // Just chopped: the full tree falls over before the stump shows.
    if (prevKey?.endsWith(':ready') && t.stage === 'stump') this.topple(t, tex);

    const below: Phaser.GameObjects.Image[] = [];
    const outline: Phaser.GameObjects.Image[] = [];
    const canopyOutline: Drawn['canopyOutline'] = [];
    const focus = t.id === this.highlight;
    if (focus) {
      const trunkRim = [
        ...addOutline(this.scene, this.below, tex, this.frame(tex, t.stage, 'bottom'), left, top + SPLIT, ['left', 'right', 'down']),
        ...addOutline(this.scene, this.below, tex, this.frame(tex, t.stage, 'bottomclip'), left, top + SPLIT + 1, ['up']),
      ];
      below.push(...trunkRim);
      outline.push(...trunkRim);
      if (t.stage !== 'stump') {
        const rim = [
          ...addOutline(this.scene, this.above, tex, this.frame(tex, t.stage, 'top'), left, top, ['left', 'right', 'up']),
          ...addOutline(this.scene, this.above, tex, this.frame(tex, t.stage, 'topclip'), left, top, ['down']),
        ];
        for (const image of rim) { canopyOutline.push({ image, dx: image.x - left }); outline.push(image); }
      }
    }
    const trunk = this.scene.add.image(left, top + SPLIT, tex, this.frame(tex, t.stage, 'bottom')).setOrigin(0, 0);
    this.below.add(trunk);
    below.push(trunk);
    const canopy = t.stage === 'stump' ? null
      : this.scene.add.image(left, top, tex, this.frame(tex, t.stage, 'top')).setOrigin(0, 0);
    if (canopy) this.above.add(canopy);
    this.drawn.set(t.id, { key, tree: t, below, canopy, canopyX: left, outline, canopyOutline, phase: Math.random() * Math.PI * 2, shake: 0 });
  }

  /** Whether tile (x, y) is under a standing tree's leaves (the rows above its trunk). */
  covers(x: number, y: number) {
    for (const d of this.drawn.values()) {
      if (d.canopy && y >= d.tree.y - 3 && y < d.tree.y && Math.abs(x - d.tree.x) <= 1) return true;
    }
    return false;
  }

  /** Whether a player at float tile (x, y) may be partly behind a standing tree's leaves. */
  near(x: number, y: number) {
    for (const d of this.drawn.values()) {
      if (d.canopy && Math.abs(x - d.tree.x) < 2.2 && y > d.tree.y - 5 && y < d.tree.y + 0.5) return true;
    }
    return false;
  }

  update(now: number) {
    const glow = outlineAlpha(now);
    for (const d of this.drawn.values()) {
      if (d.canopy) d.canopy.x = d.canopyX + d.shake + (this.still ? 0 : Math.sin((now / GLIDE_MS) * Math.PI * 2 + d.phase));
      for (const o of d.canopyOutline) o.image.x = (d.canopy?.x ?? d.canopyX) + o.dx;
      for (const o of d.outline) o.setAlpha(glow);
    }
  }

  /** One swing landed on the tree: it shakes, chips fly from the trunk and a few leaves drop. */
  swing(id: string) {
    const d = this.drawn.get(id);
    if (!d || this.still) return;
    const { left, top } = this.origin(d.tree);
    const bx = left + BASE_X;
    const by = top + BASE_Y;
    for (const img of d.below) {
      const x = img.x;
      this.scene.tweens.add({ targets: img, x: x + 1.5, duration: 50, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => { img.x = x; } });
    }
    // The canopy swings further than the trunk.
    this.scene.tweens.add({ targets: d, shake: 3, duration: 60, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => { d.shake = 0; } });
    const chips = [0x8a5a33, 0xc89a62, 0x6b4426, 0xe0c08a];
    for (let i = 0; i < 7; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const chip = this.scene.add.rectangle(bx + side * 4, by - 14, 2 + (i % 2), 2, chips[i % chips.length]);
      this.above.add(chip);
      const dx = side * (8 + Math.random() * 16);
      this.scene.tweens.add({ targets: chip, x: chip.x + dx, angle: side * 180, duration: 420, ease: 'Linear' });
      this.scene.tweens.add({
        targets: chip, y: by - 22 - Math.random() * 10, duration: 160, ease: 'Quad.easeOut',
        onComplete: () => this.scene.tweens.add({ targets: chip, y: by + 2, alpha: 0, duration: 260, ease: 'Quad.easeIn', onComplete: () => chip.destroy() }),
      });
    }
    this.leaves(bx, top + 40, 4, 30);
  }

  // Leaves that flutter down from (x, y), spread over `spread` art pixels.
  private leaves(x: number, y: number, n: number, spread: number) {
    const greens = [0x5d8a2e, 0x7fae3e, 0xc0782a, 0xd09a30];
    for (let i = 0; i < n; i++) {
      const leaf = this.scene.add.rectangle(x + (Math.random() - 0.5) * spread, y + Math.random() * 20, 2, 2, greens[i % greens.length]);
      this.above.add(leaf);
      const drift = (Math.random() - 0.5) * 24;
      this.scene.tweens.add({
        targets: leaf, y: leaf.y + 34 + Math.random() * 20, x: leaf.x + drift, alpha: 0,
        duration: 900 + Math.random() * 400, ease: 'Sine.easeIn', onComplete: () => leaf.destroy(),
      });
    }
  }

  // The tree tips over from its stump, away from the trunk tile, and lands in dust.
  private topple(t: TreeSprite, tex: string) {
    if (this.still) return;
    const { left, top } = this.origin(t);
    const bx = left + BASE_X;
    const by = top + BASE_Y;
    // Everything above the stump falls; the stump stays (drawn by the stump frame).
    const name = `ready:fall`;
    const texture = this.scene.textures.get(tex);
    if (!texture.has(name)) texture.add(name, 0, 0, 0, FW, FALL_H);
    const tree = this.scene.add.image(bx, top + FALL_H, tex, name).setOrigin(BASE_X / FW, 1);
    this.above.add(tree);
    const side = t.x % 2 === 0 ? 1 : -1;
    this.scene.tweens.add({
      targets: tree, angle: side * 84, duration: 650, ease: 'Quad.easeIn',
      onComplete: () => {
        const landX = bx + side * 70;
        this.dust(landX, by - 4, 9, 60);
        this.leaves(landX, by - 30, 12, 60);
        this.scene.tweens.add({ targets: tree, alpha: 0, duration: 260, onComplete: () => tree.destroy() });
      },
    });
  }

  // Soft dust clouds that swell and fade, spread along `spread` art pixels.
  private dust(x: number, y: number, n: number, spread: number) {
    for (let i = 0; i < n; i++) {
      const px = x + (i / (n - 1) - 0.5) * spread;
      const puff = this.scene.add.ellipse(px, y, 12, 8, 0xe8dcc0, 0.85);
      this.above.add(puff);
      this.scene.tweens.add({
        targets: puff, y: y - 8 - Math.random() * 8, x: px + (Math.random() - 0.5) * 10,
        scaleX: 2, scaleY: 1.8, alpha: 0, duration: 500 + Math.random() * 200, ease: 'Cubic.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
  }

  destroy() {
    this.below.destroy();
    this.above.destroy();
    this.drawn.clear();
  }
}
