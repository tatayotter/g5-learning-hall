// lib/phaserMap/TrainingMapScene.ts
// Phaser scene that renders the training map "world": the painted background
// image, the player + other-player sprites, footstep dust puffs, and the
// wall-bump shake. Purely presentational — it owns no game logic (movement
// legality, encounters, DB writes all stay in components/monster/TrainingMap.tsx
// exactly as before); it just reconciles Phaser GameObjects against whatever
// state React last handed it via `sync()`.
//
// Name tags, GM badges, and wave/sticker speech bubbles stay as a DOM overlay
// rendered by components/monster/map/MapCanvas.tsx alongside this canvas
// (positioned with the same tile-percentage math the old CSS grid used) —
// canvas text/rounded-rect primitives would regress the fidelity of that
// polish for no gameplay benefit, so only the parts that actually benefit
// from a real canvas (the world image, sprite movement tweening, particles)
// moved here.
import Phaser from 'phaser';

export const CANVAS_WIDTH = 896;
export const CANVAS_HEIGHT = 504;

export interface MapCanvasPlayer {
  id: string;
  x: number; // tile coords
  y: number;
  spriteSrc: string;
}

export interface MapCanvasSyncState {
  mapSize: number;
  mapImageSrc: string;
  self: MapCanvasPlayer;
  others: MapCanvasPlayer[];
  bumping: boolean;
  stepping: boolean;
  dustPuffs: { id: number; x: number; y: number }[];
  onPlayerClick: (userId: string) => void;
}

interface TrackedSprite {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
}

export default class TrainingMapScene extends Phaser.Scene {
  private ready = false;
  private pendingState: MapCanvasSyncState | null = null;
  private bg: Phaser.GameObjects.Image | null = null;
  private bgSrc = '';
  private self: TrackedSprite | null = null;
  private others = new Map<string, TrackedSprite>();
  private renderedDustPuffIds = new Set<number>();
  private lastBumping = false;
  private lastStepping = false;

  constructor() {
    super('TrainingMapScene');
  }

  create() {
    this.ready = true;
    if (this.pendingState) {
      this.applyState(this.pendingState);
      this.pendingState = null;
    }
  }

  // Public entry point — safe to call before the scene has finished booting;
  // the most recent call is applied once `create()` runs.
  sync(state: MapCanvasSyncState) {
    if (!this.ready) {
      this.pendingState = state;
      return;
    }
    this.applyState(state);
  }

  private tileSize(mapSize: number) {
    return { w: CANVAS_WIDTH / mapSize, h: CANVAS_HEIGHT / mapSize };
  }

  private tileToPixel(mapSize: number, x: number, y: number) {
    const { w, h } = this.tileSize(mapSize);
    return { px: (x + 0.5) * w, py: (y + 0.5) * h, w, h };
  }

  private ensureTexture(key: string, url: string, onReady: () => void) {
    if (this.textures.exists(key)) {
      onReady();
      return;
    }
    this.load.image(key, url);
    this.load.once(`filecomplete-image-${key}`, onReady);
    if (!this.load.isLoading()) this.load.start();
  }

  private applyState(state: MapCanvasSyncState) {
    this.applyBackground(state);
    this.applySelf(state);
    this.applyOthers(state);
    this.applyDustPuffs(state);
    if (state.bumping && !this.lastBumping) this.playBump();
    this.lastBumping = state.bumping;
    this.lastStepping = state.stepping;
  }

  private applyBackground(state: MapCanvasSyncState) {
    if (state.mapImageSrc === this.bgSrc && this.bg) return;
    this.bgSrc = state.mapImageSrc;
    const key = `bg:${state.mapImageSrc}`;
    this.ensureTexture(key, state.mapImageSrc, () => {
      if (this.bgSrc !== state.mapImageSrc) return; // superseded by a newer call
      this.bg?.destroy();
      this.bg = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, key);
      this.bg.setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);
      this.bg.setDepth(0);
    });
  }

  private spawnOrMoveSprite(
    tracked: TrackedSprite | null,
    player: MapCanvasPlayer,
    mapSize: number,
    depth: number,
    interactive: boolean,
    onClick?: (id: string) => void,
  ): TrackedSprite {
    const { px, py, h } = this.tileToPixel(mapSize, player.x, player.y);
    const key = `sprite:${player.spriteSrc}`;

    if (tracked && tracked.x === player.x && tracked.y === player.y && tracked.image.texture.key === key) {
      return tracked;
    }

    if (!tracked) {
      const placeholder = this.textures.exists(key) ? key : '__DEFAULT';
      const image = this.add.image(px, py, placeholder);
      image.setDisplaySize(h * 0.95, h * 0.95);
      image.setDepth(depth);
      if (interactive && onClick) {
        image.setInteractive({ useHandCursor: true });
        image.on('pointerdown', () => onClick(player.id));
      }
      const next: TrackedSprite = { image, x: player.x, y: player.y };
      this.ensureTexture(key, player.spriteSrc, () => {
        if (next.image.active) next.image.setTexture(key);
      });
      return next;
    }

    // Moved and/or re-skinned — tween to the new tile position.
    if (tracked.x !== player.x || tracked.y !== player.y) {
      this.tweens.add({ targets: tracked.image, x: px, y: py, duration: 200, ease: 'Cubic.easeOut' });
      tracked.x = player.x;
      tracked.y = player.y;
    }
    if (tracked.image.texture.key !== key) {
      this.ensureTexture(key, player.spriteSrc, () => {
        if (tracked.image.active) tracked.image.setTexture(key);
      });
    }
    return tracked;
  }

  private applySelf(state: MapCanvasSyncState) {
    this.self = this.spawnOrMoveSprite(this.self, state.self, state.mapSize, 10, false);
    if (state.stepping && !this.lastStepping && this.self) {
      const img = this.self.image;
      this.tweens.add({
        targets: img, scaleY: img.scaleY * 1.12, duration: 90, yoyo: true, ease: 'Sine.easeInOut',
      });
    }
  }

  private applyOthers(state: MapCanvasSyncState) {
    const seen = new Set<string>();
    for (const player of state.others) {
      seen.add(player.id);
      const tracked = this.spawnOrMoveSprite(
        this.others.get(player.id) ?? null, player, state.mapSize, 9, true, state.onPlayerClick,
      );
      this.others.set(player.id, tracked);
    }
    for (const [id, tracked] of this.others) {
      if (!seen.has(id)) {
        tracked.image.destroy();
        this.others.delete(id);
      }
    }
  }

  private applyDustPuffs(state: MapCanvasSyncState) {
    for (const puff of state.dustPuffs) {
      if (this.renderedDustPuffIds.has(puff.id)) continue;
      this.renderedDustPuffIds.add(puff.id);
      const { w, h } = this.tileSize(state.mapSize);
      const px = (puff.x + 0.5) * w;
      const py = (puff.y + 0.8) * h;
      const circle = this.add.circle(px, py, 5, 0xd6c496, 0.9);
      circle.setDepth(8);
      this.tweens.add({
        targets: circle, alpha: 0, scale: 1.8, duration: 450, ease: 'Cubic.easeOut',
        onComplete: () => { circle.destroy(); this.renderedDustPuffIds.delete(puff.id); },
      });
    }
  }

  private playBump() {
    const target = this.bg;
    if (!target) return;
    const originX = target.x;
    this.tweens.add({
      targets: target, x: originX + 6, duration: 45, yoyo: true, repeat: 3, ease: 'Sine.easeInOut',
      onComplete: () => { target.x = originX; },
    });
  }
}
