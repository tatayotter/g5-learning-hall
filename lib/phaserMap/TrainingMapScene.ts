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
// can't use static tile-percentage math the way the old CSS grid did — this
// scene is the single source of truth for the clamped-follow-offset math
// (computeTransform/lastTransform below); MapCanvas.tsx reads it back every
// frame via getTransform() and only converts canvas pixels to percentages,
// rather than recomputing the clamp logic itself. (An earlier version had
// MapCanvas.tsx independently reimplement the same formula — two copies of
// the same clamp math that had to be hand-kept in sync was the actual bug
// risk, not a real requirement.)
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
// snap-on-presence-update path (a new destination arrives only every few
// seconds — see hooks/useMapPresence.ts's wander), but NOT via a Phaser
// tween: updateSelfPosition's per-frame camera-follow loop already
// repositions every other sprite every frame (needed regardless, to keep
// them locked to the panning camera), so a separate tween on the same
// sprite would just get overridden/cancelled by that loop every frame —
// which used to be exactly the "blinks instead of walks" bug. Instead each
// TrackedSprite tracks its own current leg (animFromX/animFromY/
// animMoveStart, see the interface below) and that per-frame loop
// interpolates from it directly. The duration/easing live in constants.ts
// (OTHER_PLAYER_MOVE_TWEEN_MS/easeInOutSine, not local constants here)
// since MapCanvas.tsx's DOM overlay needs the exact same numbers to
// interpolate name tags/badges/bubbles in lockstep with the sprite.
import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE_ART_ZOOM, OTHER_PLAYER_MOVE_TWEEN_MS, easeInOutSine } from './constants';
import SwayingGrass from './swayingGrass';
import GardenPlants, { type PlantSprite } from './gardenPlants';
import WildTrees, { type TreeSprite } from './wildTrees';
import ChopSwing from './chopSwing';
import type { SwingKind } from '@/lib/gardenConfig';
import SwayingTrees from './swayingTrees';
import { MAP_TAP_EVENT } from '@/lib/mapTap';
import AmbienceLayer, { GLOW_DEPTH } from './ambience';
import CritterLayer, { type Habitat } from './critters';
import GroundFx from './groundFx';
import type { CritterGroup, GroundFxKinds } from '@/lib/wildlife';
import type { Ambience } from '@/lib/ambience';

// Sprite shadows lie on the ground: above the flat ground layers (Ground, and
// Ground Detail's paths, pebbles and flowers) but under the swaying tall
// grass (Ground Detail + 0.5) and every object layer or sprite above that.
// Painted-background regions have no layers, so any depth above 0 works.
const SHADOW_ABOVE_DETAIL = 0.25;
const DEFAULT_SHADOW_DEPTH = 1.5;

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
      layerOpacity?: Record<string, number>;
      // Animated tiles (water, lava): gid -> its frames' gids, from the tilesets.
      animatedTiles?: Record<number, { frames: number[]; ms: number }>;
      // Lamps (tile coords of each lamp's head): they glow at night.
      lights?: { x: number; y: number }[];
      // Exits on the map's edge (a run of portal tiles to one map): a glow, drifting sparks and a
      // bobbing arrow pointing out. `side` is the edge they're on; locked ones glow grey.
      exits?: MapExit[];
      // Roofs, awnings, lamp heads, bench backs: per tile the ground row each stands on (-1 none),
      // so a player in front of one draws over it and one behind it is covered (lib/tiledArtMap.ts).
      ysortBase?: number[];
      ysortLayers?: string[];
    };

// `color`: the glow's tint (the next map's element color).
export interface MapExit { x: number; y: number; w: number; h: number; side: 'n' | 's' | 'e' | 'w'; locked: boolean; color: number }

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
  /** Visible band of canvas rows (canvas px): cover mode can crop the top and
   *  bottom, and the fixed HUD covers the top. The camera keeps the map's top
   *  and bottom edges inside this band. Default 0..CANVAS_HEIGHT. */
  visibleCanvasTop?: number;
  visibleCanvasBottom?: number;
  /** Tilemap camera zoom (player-adjustable); defaults to TILE_ART_ZOOM. */
  zoom?: number;
  /** Trash items to render below the foliage layer (depth 9). */
  trashItems?: Array<{ id: string; type: string; x: number; y: number }>;
  /** IDs of trash items currently in pickup animation. */
  collectingTrashIds?: string[];
  /** Recycler NPC tile position — rendered in canvas at depth 8 so the player
   *  sprite (depth 10) always appears in front of it. */
  recyclerTile?: { x: number; y: number } | null;
  /** Wild veggie plants (lib/phaserMap/gardenPlants.ts), tile-art maps only. */
  gardenPlants?: PlantSprite[];
  /** Wild trees (lib/phaserMap/wildTrees.ts), tile-art maps only. */
  wildTrees?: TreeSprite[];
  /** The latest swing at a tree (hit, miss, or the one that fells it); n goes up by one per swing. */
  treeSwing?: { id: string; n: number; kind: SwingKind } | null;
  /** The tree the kid is chopping (chop panel open): they stand ready with the axe. */
  chopTree?: string | null;
  /** The plant or tree the player is close enough to use: drawn with a gold outline. */
  highlight?: { kind: 'plant' | 'tree'; id: string } | null;
  /** A tap or click on the map, as the tile under it. */
  onMapTap?: (x: number, y: number) => void;
  /** The map's sky (cloud shadows, drifting bits, sunset): key is region + day. */
  ambience?: { key: string; sky: Ambience } | null;
  /** The map's little animals (lib/phaserMap/critters.ts): key is the map. */
  wildlife?: { key: string; groups: CritterGroup[]; habitat: Habitat; fx?: GroundFxKinds; sand: boolean[][]; puddle?: boolean[][] } | null;
}

interface TrackedSprite {
  image: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  // Current tile. For self this is wherever updateSelfPosition() last put
  // it (updated every frame). For others it's the current DESTINATION —
  // where they're headed, or already resting once a leg completes — see
  // OtherTrackedSprite's animFromX/animFromY/animMoveStart for where
  // they're actually drawn mid-leg.
  x: number;
  y: number;
  // The sprite's "resting" (post-setDisplaySize) scale — used as the base
  // for the stepping squash/stretch tween so repeated pulses always tween
  // from/to a stable value instead of compounding on whatever an
  // still-in-flight tween last reached. Only meaningfully used for self.
  baseScaleY: number;
  // The logical avatar key from textureKeyFor(spriteSrc) — NOT necessarily
  // image.texture.key, since loadSpriteVisual may swap in a pre-baked
  // "smooth:<key>:<size>" texture (see bakeSmoothTexture) for plain-image
  // avatars. Re-skin/no-op checks compare against this, not the live
  // texture key, so they detect an actual avatar change rather than
  // spuriously firing on every sync once the displayed key differs from
  // the raw one.
  srcKey: string;
}

// Other-player sprites are repositioned every animation frame (see
// updateSelfPosition, called for the local player's camera-follow, which
// also has to keep every OTHER sprite locked to the panning camera) — so
// rather than a Phaser tween on the sprite itself (which that per-frame
// reposition would instantly override, snapping the sprite straight to its
// destination and defeating the tween — this used to be exactly the
// "blinks instead of walks" bug), each leg's start tile/time is tracked
// here and every frame recomputes the current interpolated tile from these
// plus `x`/`y` (the destination) using
// OTHER_PLAYER_MOVE_TWEEN_MS/easeInOutSine. None of this applies to self,
// which moves via its own continuous per-frame position — hence a separate
// type rather than more optional fields on TrackedSprite.
interface OtherTrackedSprite extends TrackedSprite {
  animFromX: number;
  animFromY: number;
  animMoveStart: number;
  // Facing direction of the CURRENT leg (true = flipped/facing right) —
  // persists across frames since it only changes when a new leg starts.
  facingRight: boolean;
  // Whether the walk-cycle animation is currently playing — lets
  // updateOtherAnimation only call sprite.play()/stop() on an actual
  // moving⇄idle transition instead of every frame.
  wasMoving: boolean;
}

// Canvas-pixel camera transform — exported so MapCanvas.tsx can convert it to
// overlay percentages without recomputing the clamp math itself.
export interface Transform { tileW: number; tileH: number; offsetX: number; offsetY: number }

// Avatar → walk-cycle spritesheet registry. Both the local player
// (updateSelfAnimation) and other players (updateOtherAnimation) play this
// while actually moving between tiles and rest on frame 0 (idle) otherwise
// — another player wearing an avatar NOT in this registry still renders
// correct static art, just never animates (no sheet to play).
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
  // Every sheet in this registry is drawn facing left by default, so
  // setFlipX(facingRight) below mirrors it to face right when moving right —
  // EXCEPT dynokid_walk.png, whose source frames face right by default,
  // which made it walk backwards-looking (facing left while moving right and
  // vice versa) once the shared left-default flip logic was applied to it.
  // Set true to invert the flip for a sheet whose native art faces right.
  facesRightByDefault?: boolean;
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
  // dynokid/purplegirl sheets are a 5x5 grid of 256x256 frames (row-major,
  // trailing cells empty) with no dedicated idle row like ssb3/ssg3 above —
  // the whole sequence is the walk loop, and frame 0 (first walk pose)
  // doubles as the idle/stopped frame via the same setFrame(0) on stop.
  // Re-trimmed 2026-09-12: the original 256x256 frames had ~24-28% of their
  // height as unused transparent padding (top+bottom margins ~31-35px each)
  // vs. near-zero padding on sheets like ssb3/ssg3 above. Since every avatar
  // is rendered at the same setDisplaySize(h*0.95, h*0.95) box regardless of
  // its native frame size, that padding made dynokid's actual character art
  // render visibly smaller than every other avatar on the map. Frame size
  // below is the tightest common bounding box across all 22 used frames
  // (never clips any frame's content) plus a 6px safety margin.
  '/userpics/userpics_premium/dynokid.png': {
    spriteSheet: '/sprite/dynokid_walk.png',
    frameWidth: 112,
    frameHeight: 205,
    animKey: 'dynokid-walk',
    walkFirstFrame: 0,
    walkLastFrame: 21,
    facesRightByDefault: true,
  },
  '/userpics/userpics_premium/purplegirl.png': {
    spriteSheet: '/sprite/purplegirl_walk.png',
    frameWidth: 256,
    frameHeight: 256,
    animKey: 'purplegirl-walk',
    walkFirstFrame: 0,
    walkLastFrame: 20,
  },
};

function textureKeyFor(spriteSrc: string): string {
  return ANIMATED_AVATARS[spriteSrc] ? `sheet:${spriteSrc}` : `sprite:${spriteSrc}`;
}

// setFlipX's meaning depends on which way the sprite's native art already
// faces — see AnimatedAvatarDef.facesRightByDefault. `textureKey` is the
// Phaser texture key as stored on the GameObject (the `sheet:`/`sprite:`
// prefixed form from textureKeyFor), so this can be called directly from a
// live sprite via `.texture.key` without the caller re-deriving it.
function resolveFlipX(textureKey: string, facingRight: boolean): boolean {
  if (textureKey.startsWith('sheet:')) {
    const def = ANIMATED_AVATARS[textureKey.slice('sheet:'.length)];
    if (def?.facesRightByDefault) return !facingRight;
  }
  return facingRight;
}

// Player silhouettes under leaves: over every canopy (wild trees' at 11.5, and above the map's Objects
// Top), a pale blue that reads on any leaf color.
const GHOST_DEPTH = 12.5;
const GHOST_COLOR = 0xdce8ff;
const GHOST_ALPHA = 0.6;

export default class TrainingMapScene extends Phaser.Scene {
  private ready = false;
  private pendingState: MapCanvasSyncState | null = null;
  private bg: Phaser.GameObjects.Image | null = null;
  private bgSrc = '';
  private tilemapKey = '';
  // Everything that pans/zooms with the map: the tilemap layers plus the
  // swaying-grass container (see swayingGrass.ts), which sits between them.
  private tilemapLayers: (Phaser.Tilemaps.TilemapLayer | Phaser.GameObjects.Container)[] = [];
  private grass: SwayingGrass | null = null;
  // Bushes on Objects Base that bend in the wind (only maps whose bush is listed in swayingGrass's CLUMPS).
  private bushes: SwayingGrass | null = null;
  // The map's wind (lib/ambience.ts `wind`): how hard the plants sway.
  private windStrength = 1;
  private grassTile = '';
  private trees: SwayingTrees | null = null;
  private garden: GardenPlants | null = null;
  private gardenPlants: PlantSprite[] = [];
  private wildTrees: WildTrees | null = null;
  private chopSwing: ChopSwing | null = null;
  private chopTree: string | null = null;
  // The map's "Objects Top" layer (canopy drawn over players), when it has one.
  private topLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  // A see-through silhouette for each player (and bot) standing under leaves, drawn over them.
  private ghosts = new Map<Phaser.GameObjects.Sprite, Phaser.GameObjects.Sprite>();
  // Holds the silhouettes. With WebGL and no Objects Top, it's masked by the wild trees' canopies,
  // so only the part of a player the leaves hide shows through (walking half behind a tree too).
  private ghostLayer: Phaser.GameObjects.Container | null = null;
  private ghostMasked = false;
  // Silhouettes of players behind a roof, awning or lamp: one holder per such layer, masked by it
  // (WebGL), so only the part of the player it hides shows through.
  private roofGhostLayers = new Map<Phaser.Tilemaps.TilemapLayer, Phaser.GameObjects.Container>();
  // Over everything drawn over the players: a player in front of a roof or lamp is drawn here.
  private frontDepth = 40;
  private wildTreeSprites: TreeSprite[] = [];
  private highlight: MapCanvasSyncState['highlight'] = null;
  private ambience: AmbienceLayer | null = null;
  private critters: CritterLayer | null = null;
  private groundFx: GroundFx | null = null;
  private nightLight: Phaser.GameObjects.Image | null = null;
  private lampGlows: { img: Phaser.GameObjects.Image; x: number; y: number; seed: number }[] = [];
  private lampKey = '';
  private exitFx: { band: Phaser.GameObjects.Image; arrow: Phaser.GameObjects.Image; sparks: Phaser.GameObjects.Image[]; exit: MapExit; seed: number }[] = [];
  private exitKey = '';
  private crittersKey = '';
  // Whether this map has shadow creatures peeking from behind its trees (lib/wildlife.ts).
  private peekersOn = false;
  private ambienceKey = '';
  private onMapTap: MapCanvasSyncState['onMapTap'];
  private lastTreeSwing = 0;
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private self: TrackedSprite | null = null;
  private others = new Map<string, OtherTrackedSprite>();
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
  private visibleCanvasTop = 0;
  private visibleCanvasBottom = CANVAS_HEIGHT;
  private zoom = TILE_ART_ZOOM;
  // Whether the follow offset has ever been placed for the current tilemap —
  // the very first placement snaps instead of tweening (see applyState).
  private followInitialized = false;
  private selfWasMoving = false;
  private selfFacingRight = false;
  // Trash items rendered below the foliage layer.
  // Key = trash id; value = { image sprite, tile coords }.
  private trashTexts = new Map<string, { sprite: Phaser.GameObjects.Image; tx: number; ty: number }>();
  // IDs currently mid-pickup-tween — excluded from per-frame repositioning.
  private trashAnimating = new Set<string>();
  // Recycler NPC sprite — depth 8, below player sprites (depth 9/10).
  private recyclerSprite: Phaser.GameObjects.Image | null = null;
  private recyclerShadow: Phaser.GameObjects.Ellipse | null = null;
  private shadowDepth = DEFAULT_SHADOW_DEPTH;
  private recyclerTilePos: { x: number; y: number } | null = null;

  constructor() {
    super('TrainingMapScene');
  }

  update(time: number) {
    this.animateTiles(time);
    this.grass?.update(time, this.windStrength);
    this.bushes?.update(time, this.windStrength);
    this.trees?.update(time, this.windStrength);
    this.garden?.update(time);
    this.wildTrees?.update(time, this.windStrength, this.self);
    this.sortAgainstRoofs();
    this.updateGhosts();
    this.ambience?.update(this.lastTransform, time);
    this.updateNightLight();
    this.updateLamps(time);
    this.updateExits(time);
    if (this.critters || this.groundFx) {
      const walkers = this.walkers();
      this.critters?.update(this.lastTransform, time, walkers, this.ambience?.nightLevel ?? 0, this.windStrength);
      if (this.groundFx) {
        const liquid = this.tilemapLayers.find(l => l instanceof Phaser.Tilemaps.TilemapLayer && l.layer.name.toLowerCase() === 'liquid');
        this.groundFx.setDepths((liquid?.depth ?? 1) + 0.5, this.shadowDepth - 0.05);
        this.groundFx.update(this.lastTransform, time, walkers, this.ambience?.nightLevel ?? 0, this.ambience?.rainNow ?? false);
      }
    }
  }

  // A soft warm round light (the kid's light at night, and the lamps').
  private makeNightLightTexture() {
    if (this.textures.exists('night-light')) return true;
    const n = 256;
    const tex = this.textures.createCanvas('night-light', n, n);
    if (!tex) return false;
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    grad.addColorStop(0, 'rgba(255,214,150,0.55)');
    grad.addColorStop(0.45, 'rgba(255,190,120,0.22)');
    grad.addColorStop(1, 'rgba(255,170,100,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, n, n);
    tex.refresh();
    return true;
  }

  // Every lamp on the map shines: a small warm glow around its head by day that grows into a
  // pool of light at night, flickering a little (steady with "reduce motion" on).
  private updateLamps(time: number) {
    const bg = this.lastBackground;
    const lights = bg?.type === 'tilemap' ? bg.lights ?? [] : [];
    const key = bg?.type === 'tilemap' ? `${bg.key}:${lights.length}` : '';
    if (key !== this.lampKey) {
      for (const g of this.lampGlows) g.img.destroy();
      this.lampGlows = [];
      this.lampKey = key;
      if (lights.length && this.makeNightLightTexture()) {
        this.lampGlows = lights.map((l, i) => ({
          img: this.add.image(0, 0, 'night-light').setDepth(GLOW_DEPTH).setBlendMode(Phaser.BlendModes.ADD).setVisible(false),
          x: l.x, y: l.y, seed: (i * 2.399) % (Math.PI * 2),
        }));
      }
    }
    if (!this.lampGlows.length) return;
    const night = this.ambience?.nightLevel ?? 0;
    const still = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = this.lastTransform;
    for (const g of this.lampGlows) {
      const flicker = still ? 1 : 0.92 + 0.05 * Math.sin(time / 170 + g.seed) + 0.03 * Math.sin(time / 53 + g.seed * 3);
      g.img.setVisible(true)
        .setPosition(t.offsetX + (g.x + 0.5) * t.tileW, t.offsetY + (g.y + 0.45) * t.tileH)
        .setScale((t.tileW * (2.2 + 2.8 * night)) / 256).setAlpha((0.45 + 0.4 * night) * flicker);
    }
  }

  // Textures for the exits: a glow fading from the edge inward (drawn pointing up, rotated per
  // side), a pixel chevron arrow, and a soft spark.
  private makeExitTextures() {
    if (this.textures.exists('exit-glow')) return true;
    const band = this.textures.createCanvas('exit-glow', 64, 64);
    const arrow = this.textures.createCanvas('exit-arrow', 15, 11);
    const spark = this.textures.createCanvas('exit-spark', 8, 8);
    if (!band || !arrow || !spark) return false;
    // Light pouring in from beyond the map's edge: brightest right at the edge (the texture's top
    // row), fading as it reaches in, across the road's whole width with only a hair of softening
    // at its two sides so it sits exactly on the road.
    let ctx = band.getContext();
    const img = ctx.createImageData(64, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const side = Math.min(1, (Math.min(x, 63 - x) + 0.5) / 3);
      const reach = Math.pow(1 - y / 63, 1.7);
      const i = (y * 64 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * side * reach);
    }
    ctx.putImageData(img, 0, 0);
    band.refresh();
    // Chevron pointing up: dark outline, then a warm white body.
    ctx = arrow.getContext();
    const rows = ['.......#.......', '......#o#......', '.....#ooo#.....', '....#ooooo#....', '...#ooo#ooo#...', '..#ooo#.#ooo#..', '.#ooo#...#ooo#.', '#ooo#.....#ooo#', '#oo#.......#oo#', '.##.........##.', '...............'];
    rows.forEach((r, y) => [...r].forEach((c, x) => {
      if (c === '.') return;
      ctx.fillStyle = c === '#' ? '#2a2233' : '#ffffff';
      ctx.fillRect(x, y, 1, 1);
    }));
    arrow.refresh();
    ctx = spark.getContext();
    const rg = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, 8, 8);
    spark.refresh();
    return true;
  }

  // Every exit on the map's edge shines: a glow that breathes along the gap, sparks drifting out
  // through it, and an arrow bobbing toward it (all still with "reduce motion" on).
  private updateExits(time: number) {
    const bg = this.lastBackground;
    const exits = bg?.type === 'tilemap' ? bg.exits ?? [] : [];
    const key = bg?.type === 'tilemap' ? `${bg.key}:${exits.map(e => `${e.x},${e.y},${e.locked},${e.color}`).join(';')}` : '';
    if (key !== this.exitKey) {
      for (const f of this.exitFx) { f.band.destroy(); f.arrow.destroy(); f.sparks.forEach(sp => sp.destroy()); }
      this.exitFx = [];
      this.exitKey = key;
      if (exits.length && this.makeExitTextures()) {
        // Over every ground and object layer, just under the players (9): the arrow under the kid.
        const depth = 8.8;
        this.exitFx = exits.map((exit, i) => {
          const tint = exit.locked ? 0x9a9a9a : exit.color;
          return {
            exit, seed: i * 1.7,
            band: this.add.image(0, 0, 'exit-glow').setOrigin(0.5, 0).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD).setTint(tint),
            arrow: this.add.image(0, 0, 'exit-arrow').setDepth(depth + 0.01).setTint(exit.locked ? 0x9a9a9a : 0xffffff, 0xffffff, tint, tint),
            sparks: Array.from({ length: Math.max(3, (exit.w + exit.h) * 2) }, () =>
              this.add.image(0, 0, 'exit-spark').setDepth(depth + 0.02).setBlendMode(Phaser.BlendModes.ADD).setTint(tint)),
          };
        });
      }
    }
    if (!this.exitFx.length) return;
    const still = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = this.lastTransform;
    const ROT = { n: 0, s: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
    for (const f of this.exitFx) {
      const { exit } = f;
      // Out of the map, in tile units, and along the gap.
      const out = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[exit.side];
      const along = exit.side === 'n' || exit.side === 's' ? exit.w : exit.h;
      const deep = 2.2;
      // The gap's outer edge, at its middle (px).
      const mx = t.offsetX + (exit.x + exit.w / 2 + out[0] * (exit.w / 2)) * t.tileW;
      const my = t.offsetY + (exit.y + exit.h / 2 + out[1] * (exit.h / 2)) * t.tileH;
      const breathe = still ? 0.8 : 0.7 + 0.25 * Math.sin(time / 600 + f.seed);
      // The glow hangs from the map's edge, exactly as wide as the road, reaching in 3 tiles.
      f.band.setPosition(mx, my).setRotation(ROT[exit.side])
        .setDisplaySize(along * t.tileW, 3 * t.tileH).setAlpha((exit.locked ? 0.35 : 0.9) * breathe);
      const bob = still ? 0 : (Math.sin(time / 260 + f.seed) + 1) * 0.12;
      f.arrow.setPosition(mx - out[0] * (1.5 - bob) * t.tileW, my - out[1] * (1.5 - bob) * t.tileH).setRotation(ROT[exit.side])
        .setScale(t.tileW / 12).setAlpha(exit.locked ? 0.5 : 1);
      f.sparks.forEach((sp, k) => {
        // Each spark drifts from inside the gap out through it, fading, then starts again.
        const life = 2400, ph = still ? 0.5 : ((time + k * 977 + f.seed * 500) % life) / life;
        const across = ((k * 0.618 + Math.floor((time + k * 977) / life) * 0.37) % 1) * along - along / 2;
        const inward = (1 - ph) * deep;
        const x = mx + (out[1] !== 0 ? across : 0) * t.tileW - out[0] * inward * t.tileW;
        const y = my + (out[0] !== 0 ? across : 0) * t.tileH - out[1] * inward * t.tileH;
        sp.setPosition(x + (still ? 0 : Math.sin(time / 300 + k) * t.tileW * 0.08), y).setScale(t.tileW / 40)
          .setAlpha(Math.sin(ph * Math.PI) * (exit.locked ? 0.4 : 0.9));
      });
    }
  }

  // At night a soft warm light around the kid, so they can always see where they're going.
  private updateNightLight() {
    const night = this.ambience?.nightLevel ?? 0;
    if (night < 0.05 || !this.self) { this.nightLight?.setVisible(false); return; }
    if (!this.nightLight) {
      if (!this.makeNightLightTexture()) return;
      this.nightLight = this.add.image(0, 0, 'night-light').setDepth(GLOW_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
    }
    const t = this.lastTransform;
    this.nightLight.setVisible(true).setPosition(this.self.shadow.x, this.self.shadow.y - t.tileH * 0.4)
      .setScale((t.tileW * 7) / 256).setAlpha(0.6 * night);
  }

  // Everyone walking the map (the kid, bots, other players), in map units (32 per tile).
  // Where their feet are: the shadow under each.
  private walkers(): { id: string; x: number; y: number }[] {
    const t = this.lastTransform;
    const k = 32 / t.tileW;
    const out: { id: string; x: number; y: number }[] = [];
    const add = (id: string, at: { x: number; y: number }) => out.push({ id, x: (at.x - t.offsetX) * k, y: (at.y - t.offsetY) * k });
    if (this.self) add('self', this.self.shadow);
    for (const [id, o] of this.others) add(id, o.shadow);
    return out;
  }

  // Ready to chop (axe up, facing the tree) while the chop panel is open; axe away after.
  private applyChopStance() {
    const swing = this.chopSwing;
    if (!swing) return;
    const trunk = this.chopTree ? this.wildTrees?.trunkAt(this.chopTree) : null;
    if (trunk && this.self && swing.holding !== this.chopTree) {
      swing.hold(this.chopTree!, trunk.x, trunk.y, this.self.x, this.self.y, this.selfFacingRight);
    } else if (!this.chopTree && swing.holding) {
      swing.putAway();
    }
  }

  private applyHighlight() {
    const h = this.highlight;
    this.garden?.setHighlight(h?.kind === 'plant' ? h.id : null);
    this.wildTrees?.setHighlight(h?.kind === 'tree' ? h.id : null);
  }

  // Where a player stands against the roofs, awnings and lamps their sprite overlaps (its tile and
  // the one above): 'behind' one (it stands on a row below the player's feet), else 'front' when
  // it overlaps any, else null.
  private roofSide(p: TrackedSprite): 'behind' | 'front' | null {
    return this.roofCover(p).side;
  }

  // The same, plus the layer covering a player who is behind one.
  private roofCover(p: TrackedSprite): { side: 'behind' | 'front' | null; layer?: Phaser.Tilemaps.TilemapLayer } {
    const bg = this.lastBackground;
    const base = bg?.type === 'tilemap' ? bg.ysortBase : undefined;
    const W = this.tilemap?.width ?? 0;
    if (!base || !W) return { side: null };
    const x = Math.round(p.x), feet = Math.round(p.y);
    let front = false;
    for (let y = feet - 1; y <= feet; y++) {
      const b = base[y * W + x];
      if (b === undefined || b < 0) continue;
      if (b > feet) return { side: 'behind', layer: [...this.roofGhostLayers.keys()].find(l => l.hasTileAt(x, y)) };
      front = true;
    }
    return { side: front ? 'front' : null };
  }

  // A player in front of a roof, awning or lamp is drawn over it (whole); behind one, it covers
  // them as before (with a silhouette, see updateGhosts).
  private sortAgainstRoofs() {
    const players: [TrackedSprite, number][] = [
      ...(this.self ? [[this.self, 10] as [TrackedSprite, number]] : []),
      ...[...this.others.values()].map(o => [o, 9] as [TrackedSprite, number]),
    ];
    for (const [p, normal] of players) {
      const want = this.roofSide(p) === 'front' ? this.frontDepth + (normal - 9) * 0.1 : normal;
      if (p.image.depth !== want) p.image.setDepth(want);
    }
  }

  // Under leaves (a wild tree's canopy or the map's own Objects Top), a player shows through as
  // a soft silhouette: a copy of their sprite, filled one color, drawn over every canopy.
  private updateGhosts() {
    const layer = this.ghostLayer;
    if (!layer) return;
    const players = [...(this.self ? [this.self] : []), ...this.others.values()];
    const live = new Set<Phaser.GameObjects.Sprite>();
    let any = false;
    for (const p of players) {
      const img = p.image;
      if (!img.active) continue;
      const cover = img.visible ? this.roofCover(p) : { side: null };
      const behindRoof = cover.side === 'behind';
      const covered = img.visible && (behindRoof || (this.ghostMasked
        ? !!this.wildTrees?.near(p.x, p.y)
        : !!this.wildTrees?.covers(Math.round(p.x), Math.round(p.y)) || !!this.topLayer?.hasTileAt(Math.round(p.x), Math.round(p.y))));
      let ghost = this.ghosts.get(img);
      if (!covered) { ghost?.setVisible(false); if (ghost) live.add(img); continue; }
      if (!ghost) {
        ghost = this.add.sprite(img.x, img.y, img.texture.key, img.frame.name)
          .setTint(GHOST_COLOR).setTintMode(Phaser.TintModes.FILL);
        this.ghosts.set(img, ghost);
      }
      // Behind a roof: the unmasked layer; under leaves: the one masked by the canopies.
      const into = (behindRoof && cover.layer && this.roofGhostLayers.get(cover.layer)) || layer;
      if (ghost.parentContainer !== into) { ghost.parentContainer?.remove(ghost); into.add(ghost); }
      live.add(img);
      any = true;
      if (ghost.texture.key !== img.texture.key || ghost.frame.name !== img.frame.name) ghost.setTexture(img.texture.key, img.frame.name);
      ghost.setPosition(img.x, img.y).setOrigin(img.originX, img.originY).setScale(img.scaleX, img.scaleY)
        .setFlipX(img.flipX).setAngle(img.angle).setAlpha(GHOST_ALPHA * img.alpha).setVisible(true);
    }
    for (const [img, ghost] of this.ghosts) {
      if (!live.has(img)) { ghost.destroy(); this.ghosts.delete(img); }
    }
    // Hidden when nobody is under leaves, so the mask isn't drawn for nothing.
    layer.setVisible(any && layer.list.some(g => (g as Phaser.GameObjects.Sprite).visible));
    for (const c of this.roofGhostLayers.values()) c.setVisible(c.list.some(g => (g as Phaser.GameObjects.Sprite).visible));
  }

  create() {
    this.ready = true;
    const tap = (gx: number, gy: number) => {
      const t = this.lastTransform;
      this.onMapTap?.(Math.floor((gx - t.offsetX) / t.tileW), Math.floor((gy - t.offsetY) / t.tileH));
    };
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => tap(pointer.x, pointer.y));
    // Taps on the left half land on the joystick's touch area (FloatingJoystick.tsx), which
    // passes quick taps on as this event, in page coordinates.
    const onJoystickTap = (e: Event) => {
      const { clientX, clientY } = (e as CustomEvent<{ clientX: number; clientY: number }>).detail;
      const rect = this.game.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      tap((clientX - rect.left) * (this.scale.width / rect.width), (clientY - rect.top) * (this.scale.height / rect.height));
    };
    window.addEventListener(MAP_TAP_EVENT, onJoystickTap);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => window.removeEventListener(MAP_TAP_EVENT, onJoystickTap));
    if (this.pendingState) {
      this.applyState(this.pendingState);
      this.pendingState = null;
    }
  }

  // Read-only view of the camera transform this scene last computed —
  // authoritative for both the full sync() path (once per tile) and the
  // per-frame updateSelfPosition() path, so it's always current regardless
  // of which one ran most recently. MapCanvas.tsx's DOM overlay reads this
  // every animation frame instead of recomputing computeTransform() itself.
  getTransform(): Transform {
    return this.lastTransform;
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
    // Chopping moves the whole body (chopSwing.ts): its lean and lunge ride on the sprite.
    const pose = this.chopSwing?.pose;
    const k = this.lastTransform.tileW / 32;
    this.self.image.setPosition(px + (pose?.dx ?? 0) * k, py + (pose?.dy ?? 0) * k).setAngle(pose?.angle ?? 0);
    this.self.image.setFlipX(resolveFlipX(this.self.image.texture.key, pose?.face ? pose.face > 0 : facingRight));
    this.selfFacingRight = facingRight;
    if (this.self.shadow) this.self.shadow.setPosition(px, py + h * 0.44);
    this.self.x = xTile;
    this.self.y = yTile;
    const grassTile = `${Math.round(xTile)},${Math.round(yTile)}`;
    if (grassTile !== this.grassTile) {
      this.grassTile = grassTile;
      this.grass?.rustle(Math.round(xTile), Math.round(yTile), this.time.now);
      this.garden?.rustle(Math.round(xTile), Math.round(yTile), this.time.now);
    }

    // The camera (transform offset) changes every frame as the player moves,
    // so every other-player sprite needs repositioning every frame too, camera
    // pan or not — this is also where their own leg interpolation (toward
    // `tracked.x`/`y` from `tracked.animFromX`/`animFromY`, started at
    // `tracked.animMoveStart`) actually gets applied, since a plain Phaser
    // tween on the sprite would just get overwritten by this same per-frame
    // reposition (see the file header + TrackedSprite's comment).
    const now = performance.now();
    for (const [, tracked] of this.others) {
      const t = Math.min(1, (now - tracked.animMoveStart) / OTHER_PLAYER_MOVE_TWEEN_MS);
      const eased = easeInOutSine(t);
      const ix = tracked.animFromX + (tracked.x - tracked.animFromX) * eased;
      const iy = tracked.animFromY + (tracked.y - tracked.animFromY) * eased;
      const { px: opx, py: opy, h: oh } = this.tileToPixel(this.lastTransform, ix, iy);
      tracked.image.setPosition(opx, opy);
      tracked.image.setFlipX(resolveFlipX(tracked.image.texture.key, tracked.facingRight));
      tracked.shadow.setPosition(opx, opy + oh * 0.44);
      this.updateOtherAnimation(tracked, t < 1);
    }

    this.updateSelfAnimation(isMoving);
  }

  private updateOtherAnimation(tracked: OtherTrackedSprite, isMoving: boolean) {
    const sprite = tracked.image;
    const key = sprite.texture.key;
    if (key.startsWith('sheet:')) {
      const def = ANIMATED_AVATARS[key.slice('sheet:'.length)];
      if (def) {
        if (isMoving && !tracked.wasMoving) {
          sprite.play(def.animKey, true);
        } else if (!isMoving && tracked.wasMoving) {
          sprite.stop();
          sprite.setFrame(0);
        }
      }
    }
    tracked.wasMoving = isMoving;
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
    const tileW = tileSize * this.zoom;
    const tileH = tileSize * this.zoom;
    const mapPixelW = mapWidth * tileW;
    const mapPixelH = mapHeight * tileH;
    const playerCenterX = (selfX + 0.5) * tileW;
    const playerCenterY = (selfY + 0.5) * tileH;
    let offsetX: number;
    if (this.visibleCanvasW < CANVAS_WIDTH) {
      // Cover-mode fullscreen: only the central strip [visLeft, visRight] of
      // the canvas is visible. Centre the player in that strip, but stop at
      // the map's edges like the top and bottom do, so no empty void shows
      // beside the map (the strip is narrower than the map, so the player
      // always stays in view).
      const visLeft = (CANVAS_WIDTH - this.visibleCanvasW) / 2;
      const visRight = CANVAS_WIDTH - visLeft;
      offsetX = Phaser.Math.Clamp(
        CANVAS_WIDTH / 2 - playerCenterX,
        Math.min(visLeft, visRight - mapPixelW), // map's right edge ≥ visRight
        visLeft,                                 // map's left edge ≤ visLeft
      );
    } else {
      // Normal mode: keep tilemap within canvas edges (no void).
      offsetX = Phaser.Math.Clamp(CANVAS_WIDTH / 2 - playerCenterX, Math.min(0, CANVAS_WIDTH - mapPixelW), 0);
    }
    // Centre the player in the visible band and keep the map's top edge at or
    // above the band's top (never under the HUD) and its bottom edge at or
    // below the band's bottom.
    const visTop = this.visibleCanvasTop;
    const visBottom = this.visibleCanvasBottom;
    const offsetY = Phaser.Math.Clamp((visTop + visBottom) / 2 - playerCenterY, Math.min(visTop, visBottom - mapPixelH), visTop);
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
  // `targetSize` (the tile-fit pixel size the caller is about to display this
  // at, via fitSprite) lets a plain-image avatar get pre-baked down to that
  // size — see bakeSmoothTexture's header comment for why plain LINEAR
  // filtering alone isn't enough at these source→display downscale ratios.
  // Animated (spritesheet) avatars skip baking: their frames are sub-rects
  // of one shared sheet image, and downscaling the whole sheet as one bitmap
  // would bleed adjacent frames into each other at the seams.
  private loadSpriteVisual(spriteSrc: string, targetSize: number, onReady: (textureKey: string) => void) {
    const animated = ANIMATED_AVATARS[spriteSrc];
    if (!animated) {
      const key = textureKeyFor(spriteSrc);
      this.ensureTexture(key, spriteSrc, () => {
        // Override pixelArt:true global setting — player avatars are smooth
        // PNG art, not pixel sprites, and need bilinear filtering.
        this.setLinearFilter(key);
        onReady(this.bakeSmoothTexture(key, targetSize));
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
    if (state.visibleCanvasTop !== undefined) this.visibleCanvasTop = state.visibleCanvasTop;
    if (state.visibleCanvasBottom !== undefined) this.visibleCanvasBottom = state.visibleCanvasBottom;
    const prevTransform = this.lastTransform;
    const prevTileH = this.lastTransform.tileH;
    if (state.zoom !== undefined && state.zoom !== this.zoom) this.applyZoom(state.zoom);
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
    this.gardenPlants = state.gardenPlants ?? [];
    this.garden?.setPlants(this.gardenPlants);
    this.wildTreeSprites = state.wildTrees ?? [];
    this.wildTrees?.setTrees(this.wildTreeSprites);
    this.onMapTap = state.onMapTap;
    this.windStrength = state.ambience?.sky.wind ?? 1;
    const skyKey = state.ambience ? `${state.ambience.key}:${state.mapWidth}x${state.mapHeight}` : '';
    if (skyKey !== this.ambienceKey) {
      this.ambienceKey = skyKey;
      this.ambience?.destroy();
      this.ambience = state.ambience ? new AmbienceLayer(this, state.ambience.sky, state.ambience.key, state.mapWidth, state.mapHeight) : null;
    }
    const critterKey = state.wildlife?.key ?? '';
    if (critterKey !== this.crittersKey) {
      this.crittersKey = critterKey;
      this.critters?.destroy();
      this.critters = state.wildlife ? CritterLayer.build(this, state.wildlife.groups, state.wildlife.habitat) : null;
      this.groundFx?.destroy();
      const w = state.wildlife;
      this.peekersOn = !!w?.fx?.peekers;
      this.wildTrees?.setPeekers(this.peekersOn);
      this.groundFx = w ? GroundFx.build(this, w.fx, { width: w.habitat.width, height: w.habitat.height, liquid: w.habitat.liquid, sand: w.sand, puddle: w.puddle }) : null;
    }
    this.highlight = state.highlight ?? null;
    this.applyHighlight();
    this.chopTree = state.chopTree ?? null;
    this.applyChopStance();
    if (state.treeSwing && state.treeSwing.n !== this.lastTreeSwing) {
      this.lastTreeSwing = state.treeSwing.n;
      const { id, kind } = state.treeSwing;
      const land = () => this.wildTrees?.swing(id, kind === 'felled');
      if (this.chopSwing?.holding === id) this.chopSwing.swing(kind, land);
      else if (kind !== 'miss') land();
    }
    // Wall-bump screen shake was removed (felt too jarring) — `bumping`
    // still flows through from TrainingMap.tsx (it still drives the bump
    // sound there) but this scene no longer reacts to it visually.
    this.lastBumping = state.bumping;
    this.lastStepping = state.stepping;
  }

  // Player changed the camera zoom: everything sized against the old tile
  // size (tilemap layer scale, trash sprites, shadows) is rescaled by the
  // ratio. Self/other sprites are refit by applyState's tileH-change check,
  // and the recycler is rebuilt on every sync anyway.
  private applyZoom(next: number) {
    const ratio = next / this.zoom;
    this.zoom = next;
    for (const layer of this.tilemapLayers) layer.setScale(next);
    for (const [, entry] of this.trashTexts) entry.sprite.setScale(entry.sprite.scaleX * ratio);
    const shadows = [this.self?.shadow, ...[...this.others.values()].map(o => o.shadow)];
    for (const sh of shadows) if (sh?.active) sh.setScale(sh.scaleX * ratio, sh.scaleY * ratio);
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
        // Override pixelArt:true global setting — this is painted region art,
        // not pixel sprites, and needs bilinear filtering (see setLinearFilter
        // for player avatars above; map art was missing the same treatment).
        this.setLinearFilter(key);
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

  // Water and lava: every animated tile shows the frame for the shared clock, so a whole lake
  // moves together (each tile's frame list starts at the frame it was painted with).
  private animTiles: { tile: Phaser.Tilemaps.Tile; frames: number[]; ms: number }[] = [];
  private readonly reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  private animateTiles(time: number) {
    if (this.reduceMotion) return;
    for (const a of this.animTiles) {
      const index = a.frames[Math.floor(time / a.ms) % a.frames.length];
      if (a.tile.index !== index) a.tile.index = index;
    }
  }

  private clearTilemap() {
    this.animTiles = [];
    if (!this.tilemap) return;
    for (const layer of this.tilemapLayers) layer.destroy();
    this.tilemapLayers = [];
    this.grass = null;
    this.bushes = null;
    this.trees = null;
    this.garden = null;
    this.wildTrees = null;
    this.chopSwing = null;
    this.topLayer = null;
    this.ghostLayer?.destroy();
    this.ghostLayer = null;
    for (const c of this.roofGhostLayers.values()) c.destroy();
    this.roofGhostLayers.clear();
    this.ghostMasked = false;
    this.ghosts.clear();
    this.tilemap.destroy();
    this.tilemap = null;
    this.tilemapKey = '';
  }

  private buildTilemap(bg: Extract<MapBackground, { type: 'tilemap' }>) {
    const mapDataKey = `tilemapdata:${bg.key}`;
    const imageKeys = Object.entries(bg.tilesetImages).map(([name]) => [name, `tileset:${bg.key}:${name}`] as const);

    let pending = imageKeys.length;
    const tryBuild = () => {
      if (pending > 0) return;
      if (bg.key !== this.tilemapKey) return; // superseded by a newer call
      // Override pixelArt:true global setting — tileset art is painted line
      // art, not pixel sprites, and needs bilinear filtering (same reasoning
      // as setLinearFilter for player avatars/background image above).
      for (const [, key] of imageKeys) this.setLinearFilter(key);
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
      // Layers under the players stay under 8.5 (plants, trunks) and the players (9, 10), however
      // many a map has (the town has a dozen); above ones go from 11 up.
      const belowStep = Math.min(1, 7 / Math.max(1, bg.belowPlayerLayers.length));
      let detailLayer: Phaser.Tilemaps.TilemapLayer | null = null;
      let baseLayer: Phaser.Tilemaps.TilemapLayer | null = null;
      let topLayer: Phaser.Tilemaps.TilemapLayer | null = null;
      const order = [...bg.belowPlayerLayers, ...bg.abovePlayerLayers];
      for (const layerName of order) {
        const layer = map.createLayer(layerName, tilesets, t.offsetX, t.offsetY);
        if (!layer) continue;
        // Phaser (still very new in this v4 line) leaves a freshly-created
        // TilemapLayer's alpha in a state its WebGL renderer treats as
        // invisible unless explicitly set — without this the layer never
        // draws a single pixel despite otherwise reporting fully built.
        layer.setAlpha(bg.layerOpacity?.[layerName] ?? 1);
        layer.setScale(scale);
        const isAbove = bg.abovePlayerLayers.includes(layerName);
        layer.setDepth(isAbove ? 11 + depth : 1 + (depth - 1) * belowStep);
        depth++;
        this.tilemapLayers.push(layer as Phaser.Tilemaps.TilemapLayer);
        if (bg.animatedTiles) {
          const anims = bg.animatedTiles;
          layer.forEachTile(tile => {
            const a = anims[tile.index];
            if (a) this.animTiles.push({ tile, frames: a.frames, ms: a.ms });
          });
        }
        const lower = layerName.toLowerCase();
        if (lower === 'ground detail') detailLayer = layer as Phaser.Tilemaps.TilemapLayer;
        if (lower === 'objects base') baseLayer = layer as Phaser.Tilemaps.TilemapLayer;
        if (lower === 'objects top') topLayer = layer as Phaser.Tilemaps.TilemapLayer;
      }
      this.topLayer = topLayer;
      this.setShadowDepth(detailLayer ? detailLayer.depth + SHADOW_ABOVE_DETAIL : DEFAULT_SHADOW_DEPTH);
      this.grass = detailLayer && SwayingGrass.build(this, detailLayer);
      if (this.grass) this.tilemapLayers.push(this.grass.container);
      this.bushes = baseLayer && SwayingGrass.build(this, baseLayer);
      if (this.bushes) this.tilemapLayers.push(this.bushes.container);
      this.trees = topLayer && SwayingTrees.build(this, topLayer, baseLayer);
      if (this.trees) this.tilemapLayers.push(this.trees.container);
      // Plants stand on the ground objects but under every player (9-10) and the trash (9).
      const anyLayer = detailLayer ?? baseLayer ?? topLayer;
      if (anyLayer) {
        this.garden = new GardenPlants(this, anyLayer, 8.5, (key, url, onReady) => this.ensureTexture(key, url, onReady));
        this.tilemapLayers.push(this.garden.container);
        this.garden.setPlants(this.gardenPlants);
        // Trunks with the plants; canopies over the players, next to the map's own canopies.
        this.wildTrees = new WildTrees(this, anyLayer, 8.5, topLayer ? topLayer.depth + 0.6 : 11.5, (key, url, onReady) => this.ensureTexture(key, url, onReady));
        this.tilemapLayers.push(this.wildTrees.below, this.wildTrees.above, this.wildTrees.tools, this.wildTrees.peek);
        this.wildTrees.setTrees(this.wildTreeSprites);
        this.wildTrees.setPeekers(this.peekersOn);
        this.chopSwing = new ChopSwing(this, this.wildTrees.tools, (key, url, onReady) => this.ensureTexture(key, url, onReady));
        this.applyHighlight();
      }
      // Over every layer drawn over the players (roofs included), so silhouettes show on them.
      const aboveMax = this.tilemapLayers.reduce((m, l) => Math.max(m, l.depth), 0);
      this.frontDepth = aboveMax + 1;
      this.ghostLayer = this.add.container(0, 0).setDepth(Math.max(GHOST_DEPTH, (topLayer?.depth ?? 0) + 1, aboveMax + 2));
      for (const name of bg.ysortLayers ?? []) {
        const roof = this.tilemapLayers.find(l => l instanceof Phaser.Tilemaps.TilemapLayer && l.layer.name === name) as Phaser.Tilemaps.TilemapLayer | undefined;
        if (!roof) continue;
        const holder = this.add.container(0, 0).setDepth(this.ghostLayer.depth).setVisible(false);
        if (this.renderer.type === Phaser.WEBGL) {
          holder.enableFilters();
          holder.filtersFocusContext = true;
          holder.filters?.internal.addMask(roof);
        }
        this.roofGhostLayers.set(roof, holder);
      }
      if (this.wildTrees && !topLayer && this.renderer.type === Phaser.WEBGL) {
        this.ghostLayer.enableFilters();
        // The filter covers the whole view, not just the silhouettes' bounds.
        this.ghostLayer.filtersFocusContext = true;
        this.ghostLayer.filters?.internal.addMask(this.wildTrees.above);
        this.ghostMasked = true;
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
    tracked: OtherTrackedSprite | null,
    player: MapCanvasPlayer,
    t: Transform,
    depth: number,
    interactive: boolean,
    onClick?: (id: string) => void,
  ): OtherTrackedSprite {
    const { px, py, h } = this.tileToPixel(t, player.x, player.y);
    const key = textureKeyFor(player.spriteSrc);

    if (tracked && tracked.x === player.x && tracked.y === player.y && tracked.srcKey === key) {
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
      const shadow = this.makeShadow(px, py, h);
      const next: OtherTrackedSprite = {
        image, shadow, x: player.x, y: player.y, baseScaleY: image.scaleY, srcKey: key,
        // Spawns already "at rest" on its own tile — nothing to interpolate
        // from, so from === to (see updateSelfPosition's per-frame loop).
        animFromX: player.x, animFromY: player.y, animMoveStart: performance.now(),
        facingRight: false, wasMoving: false,
      };
      this.loadSpriteVisual(player.spriteSrc, h * 0.95, (texKey) => {
        // setTexture() swaps the frame but doesn't preserve the display size
        // set above (it was computed against the tiny placeholder frame) —
        // without reapplying it here, the real sprite art snaps to its own
        // native pixel size instead of staying tile-sized.
        if (next.image.active) {
          // Kill any in-flight stepping tween — it was aimed at the placeholder
          // baseScaleY (h/32 ≈ 1.9×) and would fight fitSprite's correction.
          // This ALSO kills the spawn-in alpha fade added just above, and
          // when the avatar's texture is already cached (ensureTexture/
          // ensureSpritesheet call onReady() synchronously in that case —
          // e.g. another online player already wearing this exact avatar, or
          // self already loaded it) this callback runs in the very same tick
          // the fade tween was added, before Phaser's tween manager has
          // advanced it even one frame — killing it while alpha is still 0
          // and leaving the sprite permanently invisible, since nothing else
          // ever sets it back. Explicitly restoring it below is a no-op on
          // the (much more common) async path where the fade already
          // finished normally.
          this.tweens.killTweensOf(next.image);
          next.image.setTexture(texKey, 0);
          next.image.setAlpha(1);
          this.fitSprite(next.image, h * 0.95);
          next.baseScaleY = next.image.scaleY;
        }
      });
      return next;
    }

    // Moved and/or re-skinned — start a new leg toward the new tile. Other
    // players don't move in real time (see file header) so this only fires
    // on the infrequent wander-tick cadence, not every frame; the actual
    // interpolation happens every frame in updateSelfPosition's per-frame
    // loop, NOT via a Phaser tween here (see TrackedSprite's comment for why).
    if (tracked.x !== player.x || tracked.y !== player.y) {
      // Depart from wherever the PREVIOUS leg has them interpolated to right
      // now (not necessarily their last full destination) — a wander step
      // that lands mid-glide should continue smoothly, not jump backward to
      // the old destination first.
      const now = performance.now();
      const prevT = Math.min(1, (now - tracked.animMoveStart) / OTHER_PLAYER_MOVE_TWEEN_MS);
      const prevEased = easeInOutSine(prevT);
      const curX = tracked.animFromX + (tracked.x - tracked.animFromX) * prevEased;
      const curY = tracked.animFromY + (tracked.y - tracked.animFromY) * prevEased;
      tracked.facingRight = player.x > tracked.x ? true : player.x < tracked.x ? false : tracked.facingRight;
      tracked.animFromX = curX;
      tracked.animFromY = curY;
      tracked.animMoveStart = now;
      tracked.x = player.x;
      tracked.y = player.y;
    }
    if (tracked.srcKey !== key) {
      // srcKey is only updated once the swap actually lands (inside the
      // .active branch below), not eagerly here — if the load never
      // completes (e.g. a failed fetch; ensureTexture has no error handler)
      // or the sprite goes inactive first, the mismatch stays visible and
      // this keeps retrying on every subsequent sync instead of getting
      // permanently stuck showing the stale avatar.
      this.loadSpriteVisual(player.spriteSrc, h * 0.95, (texKey) => {
        if (tracked.image.active) {
          this.tweens.killTweensOf(tracked.image);
          tracked.image.setTexture(texKey, 0);
          this.fitSprite(tracked.image, h * 0.95);
          tracked.baseScaleY = tracked.image.scaleY;
          tracked.srcKey = key;
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
      const shadow = this.makeShadow(px, py, h);
      const next: TrackedSprite = { image, shadow, x: state.self.x, y: state.self.y, baseScaleY: image.scaleY, srcKey: key };
      this.self = next;
      this.loadSpriteVisual(state.self.spriteSrc, h * 0.95, (texKey) => {
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
    } else if (this.self.srcKey !== key) {
      // Avatar changed (e.g. bought/equipped a new one mid-session) — swap
      // texture in place, leave position untouched.
      const h = this.lastTransform.tileH;
      const self = this.self;
      // srcKey is only updated once the swap actually lands (see the
      // matching comment in spawnOrMoveSprite) so a failed/dropped load
      // keeps retrying instead of getting permanently stuck.
      this.loadSpriteVisual(state.self.spriteSrc, h * 0.95, (texKey) => {
        if (self.image.active) {
          this.tweens.killTweensOf(self.image);
          self.image.setTexture(texKey, 0);
          this.fitSprite(self.image, h * 0.95);
          self.baseScaleY = self.image.scaleY;
          self.srcKey = key;
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

  /** Pre-bakes a properly downscaled copy of `sourceKey`, sized so its
   *  longest edge is `targetSize` px, and returns the new texture's key
   *  (caching by source+size so repeat calls are free).
   *
   *  Why this exists: avatar/trash/recycler art (~100-500px source) renders
   *  at a small fraction of that on the tile grid (~5-8x downscale).
   *  setLinearFilter (bilinear, single 2x2-texel sample, no mipmaps) looks
   *  fine scaling UP (that's all the map background/tileset art needs) but
   *  aliases badly minifying by more than ~2x — plain WebGL bilinear just
   *  isn't a real minification filter. A browser's own <img> tag (used for
   *  the DOM-overlay question-scroll marker, which shrinks by a similar
   *  ratio and looks clean) instead uses proper box/mipmap-quality
   *  downscaling automatically. This replicates that by hand: repeatedly
   *  halving via Canvas2D (which *does* do quality minification) down to
   *  the actual target size once, so what WebGL displays afterward is a
   *  near-1:1 sample instead of an 5-8x-aliased one. */
  private bakeSmoothTexture(sourceKey: string, targetSize: number): string {
    const size = Math.max(1, Math.round(targetSize));
    const smoothKey = `smooth:${sourceKey}:${size}`;
    if (this.textures.exists(smoothKey)) return smoothKey;

    const srcImg = this.textures.get(sourceKey).getSourceImage() as (HTMLImageElement | HTMLCanvasElement | ImageBitmap);
    const srcW = (srcImg as HTMLImageElement).naturalWidth || (srcImg as HTMLCanvasElement).width;
    const srcH = (srcImg as HTMLImageElement).naturalHeight || (srcImg as HTMLCanvasElement).height;
    if (!srcW || !srcH) return sourceKey; // shouldn't happen once loaded; fall back to raw texture

    const scale = size / Math.max(srcW, srcH);
    const dstW = Math.max(1, Math.round(srcW * scale));
    const dstH = Math.max(1, Math.round(srcH * scale));

    // Progressive halving: single-step drawImage from source resolution
    // straight to target still aliases at these ratios (Canvas2D's own
    // quality mode is best when no single step downscales by more than 2x).
    let cur: HTMLCanvasElement | HTMLImageElement | ImageBitmap = srcImg;
    let curW = srcW, curH = srcH;
    while (curW > dstW * 2 && curH > dstH * 2) {
      const nextW = Math.max(dstW, Math.floor(curW / 2));
      const nextH = Math.max(dstH, Math.floor(curH / 2));
      const step = document.createElement('canvas');
      step.width = nextW;
      step.height = nextH;
      const stepCtx = step.getContext('2d')!;
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(cur as CanvasImageSource, 0, 0, curW, curH, 0, 0, nextW, nextH);
      cur = step;
      curW = nextW;
      curH = nextH;
    }

    const final = document.createElement('canvas');
    final.width = dstW;
    final.height = dstH;
    const finalCtx = final.getContext('2d')!;
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(cur as CanvasImageSource, 0, 0, curW, curH, 0, 0, dstW, dstH);

    this.textures.addCanvas(smoothKey, final);
    this.setLinearFilter(smoothKey);
    return smoothKey;
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

  /** Ellipse ground-shadow beneath a sprite's feet. Drawn right on the
   *  ground (shadowDepth), so grass tufts, bushes and the other
   *  map objects stay on top of it the way they would in real life. */
  // Sprites can be drawn before the tilemap finishes loading, so their
  // shadows are moved once the layer depths are known.
  private setShadowDepth(depth: number) {
    this.shadowDepth = depth;
    this.self?.shadow.setDepth(depth);
    for (const o of this.others.values()) o.shadow.setDepth(depth);
    this.recyclerShadow?.setDepth(depth);
  }

  private makeShadow(px: number, py: number, h: number): Phaser.GameObjects.Ellipse {
    const shadow = this.add.ellipse(px, py + h * 0.44, h * 0.5, h * 0.12, 0x000000, 0.28);
    shadow.setDepth(this.shadowDepth);
    return shadow;
  }

  // ── Trash items ─────────────────────────────────────────────────────────────
  // Rendered at depth 9 (same as other player sprites), below the "Above Player"
  // foliage layers at depth 12+. Called from applyState (once per tile crossed);
  // updateTrashPositions() repositions them every rAF frame as the camera pans.

  private applyTrashItems(state: MapCanvasSyncState, _t: Transform) {
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
          // Trash art shrinks ~7-8x to fit here — bake a properly downscaled
          // copy first (see bakeSmoothTexture) instead of letting WebGL
          // bilinear alias it at that ratio.
          const smoothKey = this.bakeSmoothTexture(key, h * 0.22);
          const sprite = this.add.image(px, py, smoothKey);
          sprite.setOrigin(0.5, 0.5).setDepth(9);
          // Scale so the longest edge fits within 22% of a tile (near-1:1
          // now that the texture itself is already baked to that size).
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
          // A quick shrink and a puff of dust; the icon itself pops up and flies to the
          // bag as a DOM overlay (components/monster/map/flyToBag.ts).
          this.dustPuff(entry.sprite.x, entry.sprite.y, entry.sprite.displayHeight);
          this.tweens.add({
            targets: entry.sprite,
            scaleX: 0,
            scaleY: 0,
            duration: 140,
            ease: 'Back.easeIn',
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

  // A small puff of dust at (x, y) in canvas pixels, `size` across: picking something up.
  private dustPuff(x: number, y: number, size: number) {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.random() * 0.6;
      const puff = this.add.ellipse(x + Math.cos(a) * size * 0.15, y + size * 0.2, size * 0.45, size * 0.3, 0xe8dcc0, 0.85);
      puff.setDepth(9);
      this.tweens.add({
        targets: puff,
        x: x + Math.cos(a) * size * 0.7,
        y: y + size * 0.1 - Math.random() * size * 0.3,
        scaleX: 1.8, scaleY: 1.6, alpha: 0,
        duration: 420 + Math.random() * 120, ease: 'Cubic.easeOut',
        onComplete: () => puff.destroy(),
      });
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
      // NPC art shrinks significantly to fit here — bake a properly
      // downscaled copy first (see bakeSmoothTexture) instead of letting
      // WebGL bilinear alias it at that ratio.
      const targetH = h * 0.85;
      const smoothKey = this.bakeSmoothTexture(key, targetH);
      const img = this.add.image(px, py + h * 0.5, smoothKey);
      // Bottom-anchor: sprite's bottom edge sits at the tile's bottom edge.
      img.setOrigin(0.5, 1);
      // Scale uniformly so the image keeps its natural aspect ratio (near-1:1
      // now that the texture itself is already baked). bakeSmoothTexture
      // sizes by the LONGEST edge, not specifically height, so the divisor
      // here must match that (same as fitSprite/the trash-item scale below)
      // — dividing by img.height alone only happens to work while
      // recycler.png is portrait (height is the long edge); a wider NPC
      // asset would silently upscale past 1:1 otherwise.
      img.setScale(targetH / Math.max(img.width, img.height));
      img.setDepth(8);
      this.recyclerSprite = img;
      this.recyclerTilePos = { x: tile.x, y: tile.y };
      // Shadow on the ground, under the grass like every other shadow.
      if (this.recyclerShadow) this.recyclerShadow.destroy();
      // Recycler bottom-anchor sits at py + h*0.5; shadow goes near its feet.
      this.recyclerShadow = this.add.ellipse(px, py + h * 0.5, h * 0.55, h * 0.12, 0x000000, 0.25);
      this.recyclerShadow.setDepth(this.shadowDepth);
    };

    this.ensureTexture(key, '/npcs/recycler.png', placeSprite);
  }

  /** Called every rAF frame by MapCanvas.tsx to keep trash and recycler NPC
   *  positions aligned with the panning camera — same pattern as updateSelfPosition(). */
  /** Apply bilinear (LINEAR) filtering to one texture, overriding the global
   *  pixelArt:true setting. Safe to call repeatedly — no-ops once set. */
  private setLinearFilter(key: string) {
    try {
      // NOTE: Phaser's FilterMode is LINEAR=0, NEAREST=1, so this has always
      // applied NEAREST (the raw `1` it used to pass) despite the name. Kept
      // that way so the map's current look doesn't change; use
      // FilterMode.LINEAR here to get the bilinear filtering described above.
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
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
