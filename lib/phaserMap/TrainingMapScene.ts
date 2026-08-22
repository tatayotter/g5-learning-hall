// lib/phaserMap/TrainingMapScene.ts
// Phaser scene that renders the training map "world": either a single
// painted background image (the original regions) or a real multi-layer
// Tiled tilemap (Ledger's Heart, see lib/tiledArtMap.ts) — plus the player +
// other-player sprites, footstep dust puffs, and the wall-bump shake. Purely
// presentational — it owns no game logic (movement legality, encounters, DB
// writes all stay in components/monster/TrainingMap.tsx exactly as before);
// it just reconciles Phaser GameObjects against whatever state React last
// handed it via `sync()`.
//
// Name tags, GM badges, and wave/sticker speech bubbles stay as a DOM overlay
// rendered by components/monster/map/MapCanvas.tsx alongside this canvas —
// canvas text/rounded-rect primitives would regress the fidelity of that
// polish for no gameplay benefit, so only the parts that actually benefit
// from a real canvas (the world image/tilemap, sprite movement, particles)
// live here. Because the tilemap "camera" pans (see below), that DOM overlay
// can't use static tile-percentage math the way the old CSS grid did —
// MapCanvas.tsx independently recomputes the same clamped-follow-offset math
// this scene uses (same inputs, same formula), rather than this scene
// reporting its position back to React.
//
// Tilemap layering: layers from lib/tiledArtMap.ts are split into
// "below player" and "above player" groups (everything from a layer literally
// named "Above Player" onward renders in front of the sprites).
//
// "Camera": painted-background regions render at a fixed 1:1 scale filling
// the whole canvas (no panning — they're small enough to show at once). Real
// tilemaps (bigger, meant to be walked around) render scaled up (TILE_ART_ZOOM)
// with a follow offset that keeps the player centered, clamped to the map's
// edges. This is done by directly scaling/positioning the tilemap layers and
// sprites ourselves (see Transform/computeTransform/tileToPixel below) rather
// than via Phaser's own Camera zoom+scroll+bounds — this Phaser version's
// zoomed-camera path turned out to have two separate bugs (a bounds-clamp
// formula that doesn't match a zoomed camera, and a WebGL tile-culling
// calculation that silently drops roughly half the map even with the correct
// scroll applied). The plain GameObject transform path used here is the same
// mechanism the original "fit the whole map, centered, no panning" version
// used successfully — only the offset is now dynamic (follows the player)
// instead of static.
//
// Two position-setting paths for the SELF sprite (this used to be only one):
// the full `sync()` path below (background/others/dust/bump, once per tile
// crossed) still handles self's first spawn + the stepping squash/stretch
// tween, but no longer moves an already-existing self sprite — that's now
// `updateSelfPosition()`'s job, called every animation frame by MapCanvas.tsx
// from the local player's continuous-movement loop (see
// hooks/useContinuousMovement.ts), with no tween (direct position, since the
// smoothness now comes from 60fps update frequency, not from tweening
// between discrete tile-hops). Other players still move via the original
// snap-on-presence-update + 200ms tween path — they're not driven by
// continuous movement (see MapCanvas.tsx's header comment).
import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE_ART_ZOOM } from './constants';

export { CANVAS_WIDTH, CANVAS_HEIGHT, TILE_ART_ZOOM };

export interface MapCanvasPlayer {
  id: string;
  x: number; // tile coords
  y: number;
  spriteSrc: string;
}

export type MapBackground =
  | { type: 'image'; src: string }
  | {
      type: 'tilemap';
      key: string; // stable identity for this map (e.g. its .tmx path)
      mapJson: object;
      tilesetImages: Record<string, string>;
      tileSize: number;
      belowPlayerLayers: string[];
      abovePlayerLayers: string[];
    };

export interface MapCanvasSyncState {
  mapWidth: number;
  mapHeight: number;
  background: MapBackground;
  self: MapCanvasPlayer;
  others: MapCanvasPlayer[];
  bumping: boolean;
  stepping: boolean;
  dustPuffs: { id: number; x: number; y: number }[];
  onPlayerClick: (userId: string) => void;
  /** Visible canvas width in CSS pixels (pre-transform). Equals CANVAS_WIDTH
   *  normally; narrower in cover-mode fullscreen (portrait mobile) where the
   *  CSS scale crops both sides. Used to tighten the camera clamp so the
   *  player sprite stays within the visible viewport. */
  visibleCanvasW?: number;
  /** Trash items to render below the foliage layer (depth 9). */
  trashItems?: Array<{ id: string; type: string; x: number; y: number }>;
  /** IDs of trash items currently in pickup animation. */
  collectingTrashIds?: string[];
  /** Recycler NPC tile position — rendered in canvas at depth 8 so the player
   *  sprite (depth 10) always appears in front of it. */
  recyclerTile?: { x: number; y: number } | null;
}

interface TrackedSprite {
  image: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  x: number;
  y: number;
  // The sprite's "resting" (post-setDisplaySize) scale — used as the base
  // for the stepping squash/stretch tween so repeated pulses always tween
  // from/to a stable value instead of compounding on whatever an
  // still-in-flight tween last reached. Only meaningfully used for self.
  baseScaleY: number;
}

interface Transform { tileW: number; tileH: number; offsetX: number; offsetY: number }

// Avatar → walk-cycle spritesheet registry. Only the local player ever plays
// the animation (see updateSelfPosition) — another player wearing this
// avatar still renders the correct art, just always parked on frame 0
// (idle), since other players don't get continuous-movement updates at all
// (see this file's header + MapCanvas.tsx: "no real-time movement for other
// players" is an explicit product decision, not a limitation to work around).
interface AnimatedAvatarDef {
  spriteSheet: string;
  frameWidth: number;
  frameHeight: number;
  animKey: string;
  // First/last frame INDEX (row-major) of the looping walk cycle — NOT
  // necessarily the whole sheet. These sheets are a 6x6 grid where row 0
  // (frames 0-5) is a static standing/idle pose — every column in that row
  // is essentially the same "stopped" frame — and the final row's trailing
  // cells are empty/transparent padding. Looping the *whole* range (as an
  // earlier version of this did for ssb3) played through row 0's
  // idle-looking frames every cycle: visibly at the start of every walk
  // (position already moving at full speed while the sprite still looked
  // stopped for ~0.6s — "sliding") and again periodically during a long
  // walk (the loop freezing back to the idle pose mid-stride). So the loop
  // deliberately skips row 0 — frame 0 is still used directly (via
  // setFrame) for the true idle/stopped pose, just never part of the loop.
  walkFirstFrame: number;
  walkLastFrame: number;
}
const ANIMATED_AVATARS: Record<string, AnimatedAvatarDef> = {
  '/userpics/userpics_premium/ssb3.png': {
    spriteSheet: '/sprite/ssb3_walk.png',
    frameWidth: 64,
    frameHeight: 64,
    animKey: 'ssb3-walk',
    walkFirstFrame: 6,
    walkLastFrame: 30,
  },
  '/userpics/userpics_premium/ssg3.png': {
    spriteSheet: '/sprite/ssg3_walk.png',
    frameWidth: 64,
    frameHeight: 64,
    animKey: 'ssg3-walk',
    walkFirstFrame: 6,
    walkLastFrame: 30,
  },
};

function textureKeyFor(spriteSrc: string): string {
  return ANIMATED_AVATARS[spriteSrc] ? `sheet:${spriteSrc}` : `sprite:${spriteSrc}`;
}

export default class TrainingMapScene extends Phaser.Scene {
  private ready = false;
  private pendingState: MapCanvasSyncState | null = null;
  private bg: Phaser.GameObjects.Image | null = null;
  private bgSrc = '';
  private tilemapKey = '';
  private tilemapLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private self: TrackedSprite | null = null;
  private others = new Map<string, TrackedSprite>();
  private renderedDustPuffIds = new Set<number>();
  private lastBumping = false;
  private lastStepping = false;
  private lastTransform: Transform = { tileW: 1, tileH: 1, offsetX: 0, offsetY: 0 };
  // Cached inputs to computeTransform() so updateSelfPosition() (called every
  // frame, without a full MapCanvasSyncState) can recompute the same math.
  private lastBackground: MapBackground | null = null;
  private lastMapWidth = 0;
  private lastMapHeight = 0;
  private visibleCanvasW = CANVAS_WIDTH;
  // Whether the follow offset has ever been placed for the current tilemap —
  // the very first placement snaps instead of tweening (see applyState).
  private followInitialized = false;
  private selfWasMoving = false;
  // Trash items rendered below the foliage layer.
  // Key = trash id; value = { image sprite, tile coords }.
  private trashTexts = new Map<string, { sprite: Phaser.GameObjects.Image; tx: number; ty: number }>();
  // IDs currently mid-pickup-tween — excluded from per-frame repositioning.
  private trashAnimating = new Set<string>();
  // Recycler NPC sprite — depth 8, below player sprites (depth 9/10).
  private recyclerSprite: Phaser.GameObjects.Image | null = null;
  private recyclerShadow: Phaser.GameObjects.Ellipse | null = null;
  private recyclerTilePos: { x: number; y: number } | null = null;

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

  // Called every animation frame by MapCanvas.tsx while the local player is
  // (potentially) moving continuously — a much cheaper path than sync()'s
  // full state diff. xTile/yTile use the same "raw tile coordinate, needs
  // +0.5 to reach pixel-center" convention as everywhere else in this file
  // (MapCanvas.tsx converts the movement hook's center-based float position
  // by subtracting 0.5 before calling this).
  updateSelfPosition(xTile: number, yTile: number, isMoving: boolean, facingRight: boolean) {
    if (!this.ready || !this.self || !this.lastBackground) return;
    this.lastTransform = this.computeTransform(this.lastBackground, this.lastMapWidth, this.lastMapHeight, xTile, yTile);
    for (const layer of this.tilemapLayers) layer.setPosition(this.lastTransform.offsetX, this.lastTransform.offsetY);
    if (this.tilemapLayers.length > 0) this.followInitialized = true;

    const { px, py, h } = this.tileToPixel(this.lastTransform, xTile, yTile);
    this.self.image.setPosition(px, py);
    this.self.image.setFlipX(facingRight);
    if (this.self.shadow) this.self.shadow.setPosition(px, py + h * 0.44);
    this.self.x = xTile;
    this.self.y = yTile;

    // The camera (transform offset) changes every frame as the player moves.
    // Reposition every other-player sprite to keep them locked to their world
    // tile — without this they stay at the pixel position `sync()` computed
    // for them, which drifts relative to the scrolling tilemap.
    for (const [, tracked] of this.others) {
      const { px: opx, py: opy, h: oh } = this.tileToPixel(this.lastTransform, tracked.x, tracked.y);
      tracked.image.setPosition(opx, opy);
      tracked.shadow.setPosition(opx, opy + oh * 0.44);
    }

    this.updateSelfAnimation(isMoving);
  }

  private updateSelfAnimation(isMoving: boolean) {
    if (!this.self) return;
    const sprite = this.self.image;
    const key = sprite.texture.key;
    if (!key.startsWith('sheet:')) return;
    const def = ANIMATED_AVATARS[key.slice('sheet:'.length)];
    if (!def) return;
    if (isMoving && !this.selfWasMoving) {
      sprite.play(def.animKey, true);
    } else if (!isMoving && this.selfWasMoving) {
      sprite.stop();
      sprite.setFrame(0);
    }
    this.selfWasMoving = isMoving;
  }

  // Computes the tile size + offset for this frame. For tilemaps, the offset
  // follows the player (clamped to the map edges) — see the file header for
  // why this is done as a manual GameObject transform instead of a Phaser
  // Camera. MapCanvas.tsx's overlayPositioning() mirrors this exactly.
  private computeTransform(background: MapBackground, mapWidth: number, mapHeight: number, selfX: number, selfY: number): Transform {
    if (background.type === 'image') {
      // Stretch-to-fill — painted backgrounds are continuous art, so
      // non-square logic tiles are never visible.
      return { tileW: CANVAS_WIDTH / mapWidth, tileH: CANVAS_HEIGHT / mapHeight, offsetX: 0, offsetY: 0 };
    }
    const { tileSize } = background;
    const tileW = tileSize * TILE_ART_ZOOM;
    const tileH = tileSize * TILE_ART_ZOOM;
    const mapPixelW = mapWidth * tileW;
    const mapPixelH = mapHeight * tileH;
    const playerCenterX = (selfX + 0.5) * tileW;
    const playerCenterY = (selfY + 0.5) * tileH;
    let offsetX: number;
    if (this.visibleCanvasW < CANVAS_WIDTH) {
      // Cover-mode fullscreen: only the central strip [visLeft, visRight] of
      // the canvas is visible. Clamp purely to keep the player inside that
      // strip — the camera may scroll slightly past the map boundary at edges,
      // briefly revealing a transparent void, which is better than the player
      // disappearing off-screen.
      const visLeft = (CANVAS_WIDTH - this.visibleCanvasW) / 2;
      const visRight = CANVAS_WIDTH - visLeft;
      offsetX = Phaser.Math.Clamp(
        CANVAS_WIDTH / 2 - playerCenterX,
        visLeft - playerCenterX,   // player ≥ visLeft
        visRight - playerCenterX,  // player ≤ visRight
      );
    } else {
      // Normal mode: keep tilemap within canvas edges (no void).
      offsetX = Phaser.Math.Clamp(CANVAS_WIDTH / 2 - playerCenterX, Math.min(0, CANVAS_WIDTH - mapPixelW), 0);
    }
    const offsetY = Phaser.Math.Clamp(CANVAS_HEIGHT / 2 - playerCenterY, Math.min(0, CANVAS_HEIGHT - mapPixelH), 0);
    return { tileW, tileH, offsetX, offsetY };
  }

  private tileToPixel(t: Transform, x: number, y: number) {
    return { px: t.offsetX + (x + 0.5) * t.tileW, py: t.offsetY + (y + 0.5) * t.tileH, w: t.tileW, h: t.tileH };
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

  private ensureSpritesheet(key: string, url: string, frameWidth: number, frameHeight: number, onReady: () => void) {
    if (this.textures.exists(key)) {
      onReady();
      return;
    }
    this.load.spritesheet(key, url, { frameWidth, frameHeight });
    this.load.once(`filecomplete-spritesheet-${key}`, onReady);
    if (!this.load.isLoading()) this.load.start();
  }

  // Loads whatever texture a player's avatar needs (plain image, or — for
  // avatars in ANIMATED_AVATARS — a spritesheet with its walk animation
  // registered) and hands back the resulting texture key once ready.
  private loadSpriteVisual(spriteSrc: string, onReady: (textureKey: string) => void) {
    const animated = ANIMATED_AVATARS[spriteSrc];
    if (!animated) {
      const key = textureKeyFor(spriteSrc);
      this.ensureTexture(key, spriteSrc, () => {
        // Override pixelArt:true global setting — player avatars are smooth
        // PNG art, not pixel sprites, and need bilinear filtering.
        this.setLinearFilter(key);
        onReady(key);
      });
      return;
    }
    const key = textureKeyFor(spriteSrc);
    this.ensureSpritesheet(key, animated.spriteSheet, animated.frameWidth, animated.frameHeight, () => {
      this.setLinearFilter(key);
      if (!this.anims.exists(animated.animKey)) {
        this.anims.create({
          key: animated.animKey,
          frames: this.anims.generateFrameNumbers(key, { start: animated.walkFirstFrame, end: animated.walkLastFrame }),
          frameRate: 10,
          repeat: -1,
        });
      }
      onReady(key);
    });
  }

  private applyState(state: MapCanvasSyncState) {
    this.lastMapWidth = state.mapWidth;
    this.lastMapHeight = state.mapHeight;
    this.lastBackground = state.background;
    if (state.visibleCanvasW !== undefined) this.visibleCanvasW = state.visibleCanvasW;
    const prevTransform = this.lastTransform;
    const prevTileH = this.lastTransform.tileH;
    if (this.self) {
      // Once the self sprite exists, updateSelfPosition() (called every
      // animation frame from MapCanvas.tsx's continuous-movement loop) is
      // the sole owner of the follow-offset/camera pan. This full-sync path
      // only runs once per tile crossed, using self's settled (rounded to
      // whole tiles) position — recomputing offsetX/offsetY from that here
      // and re-tweening the tilemap layers to it (via applyFollowOffset)
      // would fight the continuous per-frame positioning, producing a
      // periodic re-snap/stutter in the pan on every tile crossed instead
      // of a smooth track. tileW/tileH are recomputed anyway (they only
      // depend on tileSize/zoom, not position, so this is always safe) but
      // the offset is left exactly as updateSelfPosition last set it.
      const t = this.computeTransform(state.background, state.mapWidth, state.mapHeight, state.self.x, state.self.y);
      this.lastTransform = { ...this.lastTransform, tileW: t.tileW, tileH: t.tileH };
    } else {
      this.lastTransform = this.computeTransform(state.background, state.mapWidth, state.mapHeight, state.self.x, state.self.y);
    }
    // If tileH changed (e.g. image→tilemap background transition while sprites
    // were already spawned), refit every sprite to the new tile size — they were
    // sized against the old tileH and would otherwise stay visually wrong
    // indefinitely since applySelf/spawnOrMoveSprite only resize on first-spawn
    // or texture-swap, not on background-type transitions.
    const newTileH = this.lastTransform.tileH;
    if (newTileH !== prevTileH) {
      if (this.self?.image.active) {
        this.tweens.killTweensOf(this.self.image);
        this.fitSprite(this.self.image, newTileH * 0.95);
        this.self.baseScaleY = this.self.image.scaleY;
      }
      for (const [, tracked] of this.others) {
        if (tracked.image.active) {
          this.tweens.killTweensOf(tracked.image);
          this.fitSprite(tracked.image, newTileH * 0.95);
          tracked.baseScaleY = tracked.image.scaleY;
        }
      }
    }
    this.applyBackground(state);
    if (!this.self) this.applyFollowOffset(prevTransform);
    this.applySelf(state);
    this.applyOthers(state);
    this.applyDustPuffs(state);
    this.applyTrashItems(state, this.lastTransform);
    this.applyRecycler(state, this.lastTransform);
    // Wall-bump screen shake was removed (felt too jarring) — `bumping`
    // still flows through from TrainingMap.tsx (it still drives the bump
    // sound there) but this scene no longer reacts to it visually.
    this.lastBumping = state.bumping;
    this.lastStepping = state.stepping;
  }

  // Moves the tilemap layers to lastTransform's offset — snapping on first
  // placement for this map, tweening (matching the player sprite's own move
  // tween) on every placement after that. Only relevant for the once-per-
  // tile full sync path; continuous self movement repositions layers
  // directly every frame via updateSelfPosition instead.
  private applyFollowOffset(prevTransform: Transform) {
    if (this.tilemapLayers.length === 0) return;
    const t = this.lastTransform;
    const unchanged = prevTransform.offsetX === t.offsetX && prevTransform.offsetY === t.offsetY;
    if (!this.followInitialized) {
      this.followInitialized = true;
      for (const layer of this.tilemapLayers) layer.setPosition(t.offsetX, t.offsetY);
    } else if (!unchanged) {
      this.tweens.add({ targets: this.tilemapLayers, x: t.offsetX, y: t.offsetY, duration: 200, ease: 'Cubic.easeOut' });
    }
  }

  private applyBackground(state: MapCanvasSyncState) {
    if (state.background.type === 'image') {
      this.clearTilemap();
      if (state.background.src === this.bgSrc && this.bg) return;
      this.bgSrc = state.background.src;
      const key = `bg:${state.background.src}`;
      this.ensureTexture(key, state.background.src, () => {
        if (this.bgSrc !== (state.background as { type: 'image'; src: string }).src) return; // superseded
        this.bg?.destroy();
        this.bg = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, key);
        this.bg.setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);
        this.bg.setDepth(0);
      });
      return;
    }

    // Tilemap mode.
    this.bg?.destroy();
    this.bg = null;
    this.bgSrc = '';
    const bgState = state.background;
    if (bgState.key === this.tilemapKey && this.tilemap) return;
    this.tilemapKey = bgState.key;
    this.followInitialized = false;
    this.buildTilemap(bgState);
  }

  private clearTilemap() {
    if (!this.tilemap) return;
    for (const layer of this.tilemapLayers) layer.destroy();
    this.tilemapLayers = [];
    this.tilemap.destroy();
    this.tilemap = null;
    this.tilemapKey = '';
  }

  private buildTilemap(bg: Extract<MapBackground, { type: 'tilemap' }>) {
    const mapDataKey = `tilemapdata:${bg.key}`;
    const imageKeys = Object.entries(bg.tilesetImages).map(([name, url]) => [name, `tileset:${bg.key}:${name}`] as const);

    let pending = imageKeys.length;
    const tryBuild = () => {
      if (pending > 0) return;
      if (bg.key !== this.tilemapKey) return; // superseded by a newer call
      this.clearTilemap();
      this.tilemapKey = bg.key;
      const map = this.add.tilemap(mapDataKey);
      const tilesets = map.tilesets
        .map(t => map.addTilesetImage(t.name, `tileset:${bg.key}:${t.name}`))
        .filter((t): t is Phaser.Tilemaps.Tileset => t !== null);
      if (tilesets.length === 0) return;

      const t = this.lastTransform;
      const scale = t.tileW / bg.tileSize;
      let depth = 1;
      const order = [...bg.belowPlayerLayers, ...bg.abovePlayerLayers];
      for (const layerName of order) {
        const layer = map.createLayer(layerName, tilesets, t.offsetX, t.offsetY);
        if (!layer) continue;
        // Phaser (still very new in this v4 line) leaves a freshly-created
        // TilemapLayer's alpha in a state its WebGL renderer treats as
        // invisible unless explicitly set — without this the layer never
        // draws a single pixel despite otherwise reporting fully built.
        layer.setAlpha(1);
        layer.setScale(scale);
        const isAbove = bg.abovePlayerLayers.includes(layerName);
        layer.setDepth(isAbove ? 11 + depth : depth);
        depth++;
        this.tilemapLayers.push(layer as Phaser.Tilemaps.TilemapLayer);
      }
      this.tilemap = map;
      this.followInitialized = true;
    };

    let needsLoad = false;
    if (!this.cache.tilemap.exists(mapDataKey)) {
      this.load.tilemapTiledJSON(mapDataKey, bg.mapJson);
      needsLoad = true;
    }
    for (const [name, key] of imageKeys) {
      if (this.textures.exists(key)) {
        pending--;
        continue;
      }
      this.load.image(key, bg.tilesetImages[name]);
      needsLoad = true;
    }

    if (needsLoad) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        pending = 0;
        tryBuild();
      });
      if (!this.load.isLoading()) this.load.start();
    } else {
      tryBuild();
    }
  }

  // Others-only (self has its own dedicated creation/update path — see
  // applySelf and updateSelfPosition — so it never fights the tween below).
  private spawnOrMoveSprite(
    tracked: TrackedSprite | null,
    player: MapCanvasPlayer,
    t: Transform,
    depth: number,
    interactive: boolean,
    onClick?: (id: string) => void,
  ): TrackedSprite {
    const { px, py, h } = this.tileToPixel(t, player.x, player.y);
    const key = textureKeyFor(player.spriteSrc);

    if (tracked && tracked.x === player.x && tracked.y === player.y && tracked.image.texture.key === key) {
      return tracked;
    }

    if (!tracked) {
      const placeholder = this.textures.exists(key) ? key : '__DEFAULT';
      const image = this.add.sprite(px, py, placeholder);
      image.setDisplaySize(h * 0.95, h * 0.95);
      image.setDepth(depth);
      // Spawn-in fade rather than popping in instantly.
      image.setAlpha(0);
      this.tweens.add({ targets: image, alpha: 1, duration: 250, ease: 'Sine.easeOut' });
      if (interactive && onClick) {
        image.setInteractive({ useHandCursor: true });
        image.on('pointerdown', () => onClick(player.id));
      }
      const shadow = this.makeShadow(px, py, h, depth);
      const next: TrackedSprite = { image, shadow, x: player.x, y: player.y, baseScaleY: image.scaleY };
      this.loadSpriteVisual(player.spriteSrc, (texKey) => {
        // setTexture() swaps the frame but doesn't preserve the display size
        // set above (it was computed against the tiny placeholder frame) —
        // without reapplying it here, the real sprite art snaps to its own
        // native pixel size instead of staying tile-sized.
        if (next.image.active) {
          // Kill any in-flight stepping tween — it was aimed at the placeholder
          // baseScaleY (h/32 ≈ 1.9×) and would fight fitSprite's correction.
          this.tweens.killTweensOf(next.image);
          next.image.setTexture(texKey, 0);
          this.fitSprite(next.image, h * 0.95);
          next.baseScaleY = next.image.scaleY;
        }
      });
      return next;
    }

    // Moved and/or re-skinned — tween to the new tile position. Other
    // players don't move in real time (see file header) so this only fires
    // on the infrequent presence-update cadence, not every frame.
    if (tracked.x !== player.x || tracked.y !== player.y) {
      this.tweens.add({ targets: tracked.image, x: px, y: py, duration: 200, ease: 'Cubic.easeOut' });
      tracked.x = player.x;
      tracked.y = player.y;
    }
    if (tracked.image.texture.key !== key) {
      this.loadSpriteVisual(player.spriteSrc, (texKey) => {
        if (tracked.image.active) {
          this.tweens.killTweensOf(tracked.image);
          tracked.image.setTexture(texKey, 0);
          this.fitSprite(tracked.image, h * 0.95);
          tracked.baseScaleY = tracked.image.scaleY;
        }
      });
    }
    return tracked;
  }

  // Only handles first-spawn creation and the stepping squash/stretch tween
  // trigger — position updates for an existing self sprite happen
  // exclusively via updateSelfPosition() (called every frame from
  // MapCanvas.tsx's continuous-movement loop), never here, so the two paths
  // never fight over the sprite's position.
  private applySelf(state: MapCanvasSyncState) {
    const key = textureKeyFor(state.self.spriteSrc);
    if (!this.self) {
      const { px, py, h } = this.tileToPixel(this.lastTransform, state.self.x, state.self.y);
      const placeholder = this.textures.exists(key) ? key : '__DEFAULT';
      const image = this.add.sprite(px, py, placeholder);
      image.setDisplaySize(h * 0.95, h * 0.95);
      image.setDepth(10);
      const shadow = this.makeShadow(px, py, h, 10);
      const next: TrackedSprite = { image, shadow, x: state.self.x, y: state.self.y, baseScaleY: image.scaleY };
      this.self = next;
      this.loadSpriteVisual(state.self.spriteSrc, (texKey) => {
        if (next.image.active) {
          // Kill any stepping tween launched while we were still showing the
          // placeholder — its target was the placeholder's inflated baseScaleY
          // and would override fitSprite's correction.
          this.tweens.killTweensOf(next.image);
          next.image.setTexture(texKey, 0);
          this.fitSprite(next.image, h * 0.95);
          next.baseScaleY = next.image.scaleY;
        }
      });
    } else if (this.self.image.texture.key !== key) {
      // Avatar changed (e.g. bought/equipped a new one mid-session) — swap
      // texture in place, leave position untouched.
      const h = this.lastTransform.tileH;
      const self = this.self;
      this.loadSpriteVisual(state.self.spriteSrc, (texKey) => {
        if (self.image.active) {
          this.tweens.killTweensOf(self.image);
          self.image.setTexture(texKey, 0);
          this.fitSprite(self.image, h * 0.95);
          self.baseScaleY = self.image.scaleY;
        }
      });
    }
    if (state.stepping && !this.lastStepping && this.self) {
      const img = this.self.image;
      // Animated avatars (the ssb3 walk cycle) already convey movement via
      // their own frames — layering this squash/stretch on top of that,
      // under continuous movement's much more frequent tile-crossings than
      // the old discrete-move design assumed, stacked overlapping tweens on
      // the same scaleY (each new pulse's target computed relative to
      // whatever scaleY the previous still-in-flight tween had reached)
      // and produced a visible small/big stutter. Skip it entirely for
      // animated sprites; for plain-image ones (no walk cycle of their own)
      // keep the bounce, but always tween from/to the sprite's actual rest
      // scale and kill any tween still in flight first so pulses can never
      // compound.
      if (!img.texture.key.startsWith('sheet:')) {
        const restScaleY = this.self.baseScaleY;
        this.tweens.killTweensOf(img);
        img.scaleY = restScaleY;
        this.tweens.add({
          targets: img, scaleY: restScaleY * 1.12, duration: 90, yoyo: true, ease: 'Sine.easeInOut',
        });
      }
    }
  }

  private applyOthers(state: MapCanvasSyncState) {
    const seen = new Set<string>();
    for (const player of state.others) {
      seen.add(player.id);
      const tracked = this.spawnOrMoveSprite(
        this.others.get(player.id) ?? null, player, this.lastTransform, 9, true, state.onPlayerClick,
      );
      this.others.set(player.id, tracked);
    }
    for (const [id, tracked] of this.others) {
      if (!seen.has(id)) {
        this.others.delete(id);
        // Spawn-out fade rather than disappearing instantly.
        tracked.shadow.destroy();
        this.tweens.add({
          targets: tracked.image, alpha: 0, duration: 250, ease: 'Sine.easeIn',
          onComplete: () => tracked.image.destroy(),
        });
      }
    }
  }

  private applyDustPuffs(_state: MapCanvasSyncState) {
    // Footstep dust puffs removed — effect was distracting.
  }

  /** Scale a sprite uniformly so its longest dimension fits within `size`
   *  pixels. Replaces setDisplaySize(size, size) which would stretch
   *  non-square art. The sprite's texture must already be set before calling. */
  private fitSprite(img: Phaser.GameObjects.Sprite, size: number) {
    // Use the frame's *natural* pixel dimensions, not img.width/img.height which
    // are (natural × currentScale) — wrong when setDisplaySize was previously
    // applied to a placeholder frame with different native dimensions.
    const maxDim = Math.max(img.frame.realWidth, img.frame.realHeight) || 1;
    const scale = size / maxDim;
    img.setScale(scale);
  }

  /** Ellipse ground-shadow beneath a sprite's feet.
   *  depth: same as the owning sprite — the ellipse renders on top of the
   *  ground tiles but behind the sprite because Phaser draws objects at the
   *  same integer depth in insertion order, and shadows are always added first. */
  private makeShadow(px: number, py: number, h: number, depth: number): Phaser.GameObjects.Ellipse {
    const shadow = this.add.ellipse(px, py + h * 0.44, h * 0.5, h * 0.12, 0x000000, 0.28);
    shadow.setDepth(depth - 0.5);
    return shadow;
  }

  // ── Trash items ─────────────────────────────────────────────────────────────
  // Rendered at depth 9 (same as other player sprites), below the "Above Player"
  // foliage layers at depth 12+. Called from applyState (once per tile crossed);
  // updateTrashPositions() repositions them every rAF frame as the camera pans.

  private applyTrashItems(state: MapCanvasSyncState, t: Transform) {
    const items = state.trashItems ?? [];
    const collecting = new Set(state.collectingTrashIds ?? []);

    // Create image sprites for newly-spawned trash items.
    // Textures are type-keyed (5 total) and loaded lazily on first use.
    const seen = new Set<string>();
    for (const item of items) {
      seen.add(item.id);
      if (!this.trashTexts.has(item.id) && !this.trashAnimating.has(item.id)) {
        const key = `trash:${item.type}`;
        const url = `/trash/${item.type}.png`;
        const { tx, ty } = { tx: item.x, ty: item.y };
        this.ensureTexture(key, url, () => {
          // Guard: item may have been collected or respawned while loading.
          if (this.trashTexts.has(item.id) || this.trashAnimating.has(item.id)) return;
          // Override global pixelArt:true so smooth PNGs render with bilinear filtering.
          this.setLinearFilter(key);
          const { px, py, h } = this.tileToPixel(this.lastTransform, tx, ty);
          const sprite = this.add.image(px, py, key);
          sprite.setOrigin(0.5, 0.5).setDepth(9);
          // Scale so the longest edge fits within 22% of a tile.
          sprite.setScale((h * 0.22) / Math.max(sprite.width, sprite.height));
          this.trashTexts.set(item.id, { sprite, tx, ty });
        });
      }
    }

    // Start pickup animations for newly-collecting items.
    for (const id of collecting) {
      if (!this.trashAnimating.has(id)) {
        const entry = this.trashTexts.get(id);
        if (entry) {
          this.trashAnimating.add(id);
          this.trashTexts.delete(id);
          this.tweens.add({
            targets: entry.sprite,
            y: entry.sprite.y - 28,
            alpha: 0,
            scaleX: entry.sprite.scaleX * 1.4,
            scaleY: entry.sprite.scaleY * 1.4,
            duration: 450,
            ease: 'Cubic.easeOut',
            onComplete: () => {
              entry.sprite.destroy();
              this.trashAnimating.delete(id);
            },
          });
        }
      }
    }

    // Destroy items that are no longer on the map (respawn reset).
    for (const [id, entry] of this.trashTexts) {
      if (!seen.has(id)) {
        entry.sprite.destroy();
        this.trashTexts.delete(id);
      }
    }
  }

  // ── Recycler NPC ────────────────────────────────────────────────────────────
  // Rendered at depth 8 so the player sprite (depth 10) always draws on top.
  // The name-tag stays as a DOM overlay (registerMarker in MapCanvas.tsx).

  private applyRecycler(state: MapCanvasSyncState, t: Transform) {
    const tile = state.recyclerTile ?? null;
    if (!tile) {
      if (this.recyclerSprite) {
        this.recyclerSprite.destroy();
        this.recyclerSprite = null;
        this.recyclerTilePos = null;
      }
      if (this.recyclerShadow) { this.recyclerShadow.destroy(); this.recyclerShadow = null; }
      return;
    }

    const { px, py, h } = this.tileToPixel(t, tile.x, tile.y);
    const key = 'npc:recycler';
    const placeSprite = () => {
      if (this.recyclerSprite) this.recyclerSprite.destroy();
      // Override global pixelArt:true for this smooth PNG.
      this.setLinearFilter(key);
      const img = this.add.image(px, py + h * 0.5, key);
      // Bottom-anchor: sprite's bottom edge sits at the tile's bottom edge.
      img.setOrigin(0.5, 1);
      // Scale uniformly so the image keeps its natural aspect ratio;
      // target display height is ~1.4× a tile height.
      const targetH = h * 0.85;
      img.setScale(targetH / img.height);
      img.setDepth(8);
      this.recyclerSprite = img;
      this.recyclerTilePos = { x: tile.x, y: tile.y };
      // Shadow at depth 7 — beneath the recycler sprite.
      if (this.recyclerShadow) this.recyclerShadow.destroy();
      // Recycler bottom-anchor sits at py + h*0.5; shadow goes near its feet.
      this.recyclerShadow = this.add.ellipse(px, py + h * 0.5, h * 0.55, h * 0.12, 0x000000, 0.25);
      this.recyclerShadow.setDepth(7);
    };

    this.ensureTexture(key, '/npcs/recycler.png', placeSprite);
  }

  /** Called every rAF frame by MapCanvas.tsx to keep trash and recycler NPC
   *  positions aligned with the panning camera — same pattern as updateSelfPosition(). */
  /** Apply bilinear (LINEAR) filtering to one texture, overriding the global
   *  pixelArt:true setting. Safe to call repeatedly — no-ops once set. */
  private setLinearFilter(key: string) {
    try {
      // Phaser stores FilterMode as integer: NEAREST=0, LINEAR=1.
      this.textures.get(key).setFilter(1 as any);
    } catch {
      // Silently ignore if the API differs in this Phaser build.
    }
  }

  updateTrashPositions(floatX: number, floatY: number) {
    if (!this.ready || !this.lastBackground) return;
    const t = this.computeTransform(
      this.lastBackground, this.lastMapWidth, this.lastMapHeight, floatX, floatY,
    );
    for (const [, entry] of this.trashTexts) {
      const { px, py } = this.tileToPixel(t, entry.tx, entry.ty);
      entry.sprite.setPosition(px, py);
    }
    if (this.recyclerSprite && this.recyclerTilePos) {
      const { px, py, h } = this.tileToPixel(t, this.recyclerTilePos.x, this.recyclerTilePos.y);
      this.recyclerSprite.setPosition(px, py + h * 0.5);
      if (this.recyclerShadow) this.recyclerShadow.setPosition(px, py + h * 0.5);
    }
  }

}
