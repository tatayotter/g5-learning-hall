'use client';
// components/monster/map/MapCanvas.tsx
// Replaces the old CSS-grid `frameContent` in TrainingMap.tsx with a real
// Phaser canvas (lib/phaserMap/TrainingMapScene.ts) for the "world" layer —
// background image, player/other-player sprites, footstep dust, wall-bump
// shake. Name tags, GM badges, wave speech bubbles, and the town
// marker stay as a thin DOM overlay on top (same tile-percentage positioning
// the old CSS grid used) since canvas text/rounded-rect primitives would
// only regress that polish's fidelity for no gameplay benefit — see the
// scene file's header comment for the full rationale.
import { useEffect, useRef, useContext } from 'react';
import { MapScaleContext } from '@/components/MapStage';
import { USERS } from '@/lib/userSession';
import { GMBadge, MonsterImage } from '@/components/battle/shared';
import { ELEMENT_ICON_SRC, type MonsterDef } from '@/lib/monsterConfig';
import { REGIONS } from '@/lib/regions';
import { getQualityGroundGlowColor, type QualityTier } from '@/lib/curioQuality';
import type { MapCanvasSyncState, MapCanvasPlayer, MapBackground } from '@/lib/phaserMap/TrainingMapScene';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE_ART_ZOOM } from '@/lib/phaserMap/constants';
import type { OnlinePlayer } from '@/hooks/useMapPresence';
import type { ContinuousMovementHandle } from '@/hooks/useContinuousMovement';
import type { TrashItem } from '@/hooks/useTrashItems';
import { TRASH_DEFS } from '@/lib/trashConfig';

function spriteSrcFor(userId: string, userpicOverride?: string): string {
  // Bot userpic takes highest priority — set explicitly in BotProfile.
  if (userpicOverride) return userpicOverride;
  const profile = USERS[userId];
  // Use whatever avatar the profile has (covers /userpics/…, /tala-avatar.png,
  if (profile?.avatar) return profile.avatar;
  return profile?.gender === 'girl'
    ? '/userpics/userpics_premium/ssg3.png'
    : '/userpics/userpics_premium/ssb3.png';
}

// Translates tile coordinates into percentages of the canvas box so the DOM
// overlay (name tags, bubbles, portal/town markers) lines up with what the
// Phaser canvas actually drew. Valid because the .mstage-frame container is
// always a fixed 896:504 (16:9) box, so "% of container" and "% of canvas
// pixels" are the same number.
//
// Painted-background regions stretch to fill the canvas at a fixed scale, so
// this is static. Real tilemaps instead render at native scale behind a
// panning/zooming camera that follows the player (see TrainingMapScene's
// updateCameraForTilemap) — rather than asking that scene what its camera is
// currently doing (which would lag a render behind whenever posX/posY changes,
// producing a one-frame mismatch), this recomputes the exact same clamped
// scroll target independently: it's a pure function of props already
// available here, using the identical formula, so both always agree.
// visibleCanvasW: the actual number of canvas pixels visible horizontally,
// which equals CANVAS_WIDTH except in cover-mode fullscreen (where CSS
// transform scale > 1 crops both sides). Passed so the scroll clamps keep
// the player sprite within the visible viewport rather than the full canvas.
function overlayPositioning(mapWidth: number, mapHeight: number, background: MapBackground, selfX: number, selfY: number, visibleCanvasW = CANVAS_WIDTH) {
  if (background.type === 'image') {
    const tileWPct = 100 / mapWidth;
    const tileHPct = 100 / mapHeight;
    return { tileWPct, tileHPct, leftPct: (x: number) => x * tileWPct, topPct: (y: number) => y * tileHPct };
  }
  const { tileSize } = background;
  const zoom = TILE_ART_ZOOM;
  const viewW = CANVAS_WIDTH / zoom;
  const viewH = CANVAS_HEIGHT / zoom;
  const mapPixelW = mapWidth * tileSize;
  const mapPixelH = mapHeight * tileSize;
  const selfWorldX = (selfX + 0.5) * tileSize;
  const selfWorldY = (selfY + 0.5) * tileSize;

  // Horizontal scroll: in cover mode use PURE VISIBILITY clamping — the player
  // must stay inside the visible canvas window [visLeft, visRight] even at map
  // edges (may briefly show transparent void past the map edge, but the player
  // never leaves the visible strip). This mirrors TrainingMapScene.computeTransform
  // exactly; both must stay in sync.
  // visLeft = (CANVAS_WIDTH - visibleCanvasW) / 2  (canvas px cropped from each side)
  // Player canvas X = (selfWorldX - scrollX) * zoom
  //   Visible-left  → scrollX <= selfWorldX - visLeft/zoom
  //   Visible-right → scrollX >= selfWorldX - visRight/zoom
  let scrollX: number;
  if (visibleCanvasW < CANVAS_WIDTH) {
    const visLeft = (CANVAS_WIDTH - visibleCanvasW) / 2;
    const visRight = CANVAS_WIDTH - visLeft;
    // Prefer centering; clamp only to keep player within visible strip.
    scrollX = Math.min(
      Math.max(selfWorldX - viewW / 2, selfWorldX - visRight / zoom),
      selfWorldX - visLeft / zoom,
    );
  } else {
    // Normal mode: standard map-boundary clamp.
    scrollX = Math.min(Math.max(selfWorldX - viewW / 2, 0), Math.max(0, mapPixelW - viewW));
  }

  const scrollY = Math.min(Math.max(selfWorldY - viewH / 2, 0), Math.max(0, mapPixelH - viewH));
  const tileWPct = (tileSize * zoom / CANVAS_WIDTH) * 100;
  const tileHPct = (tileSize * zoom / CANVAS_HEIGHT) * 100;
  return {
    tileWPct,
    tileHPct,
    leftPct: (x: number) => ((x * tileSize - scrollX) * zoom / CANVAS_WIDTH) * 100,
    topPct: (y: number) => ((y * tileSize - scrollY) * zoom / CANVAS_HEIGHT) * 100,
  };
}

interface MapCanvasProps {
  mapWidth: number;
  mapHeight: number;
  background: MapBackground;
  bumping: boolean;
  stepping: boolean;
  posX: number;
  posY: number;
  // Drives the local player's continuous, per-frame position — see the rAF
  // effect below. posX/posY above stay as the "settled" (once-per-tile)
  // integer feed used everywhere else (background/others/dust/bump sync).
  movement: ContinuousMovementHandle;
  userId: string;
  waves: Record<string, number>;
  dustPuffs: { id: number; x: number; y: number }[];
  onlinePlayers: Record<string, OnlinePlayer>;
  inBattle: (userId: string) => boolean;
  resultWon: (userId: string) => boolean | undefined;
  townMarkerTile: { x: number; y: number } | null;
  portalMarkers?: { x: number; y: number; regionId: string; locked: boolean }[];
  // Scrolls (training questions) and the curio (wild-encounter entry point)
  // are stationary, walked-into map entities — rendered the same way as
  // portal markers (static DOM overlay, no per-frame updates needed) since
  // neither moves once spawned. See components/monster/TrainingMap.tsx for
  // the spawn/lifecycle logic; this component only draws them.
  scrollMarkers?: { id: number; x: number; y: number }[];
  curioMarker?: { x: number; y: number; monsterDef: MonsterDef; quality: QualityTier } | null;
  /** Trainer NPC currently on the map — renders as a DOM overlay; cleared on encounter. */
  trainerMarker?: { id: string; x: number; y: number; emoji: string; name: string; spriteOverride?: string } | null;
  /** Trash items currently on the map (uncollected). */
  trashItems?: TrashItem[];
  /** IDs of trash items currently mid-pickup animation. */
  collectingTrashIds?: Set<string>;
  /** Recycler NPC tile for the active region. */
  recyclerTile?: { x: number; y: number } | null;
  onPlayerClick: (userId: string) => void;
}

export default function MapCanvas({
  mapWidth, mapHeight, background, bumping, stepping, posX, posY, movement, userId, waves,
  dustPuffs, onlinePlayers, inBattle, resultWon, townMarkerTile, portalMarkers, scrollMarkers,
  curioMarker, trainerMarker, trashItems, collectingTrashIds, recyclerTile, onPlayerClick,
}: MapCanvasProps) {
  // When MapStage renders in fullscreen cover mode (CSS scale > 1) only a
  // central strip of the canvas is visible. Consume the scale so we can
  // tighten the overlay scroll clamps to match the actual visible window.
  const mapScale = useContext(MapScaleContext);
  // Visible strip of the canvas in CSS pixels = viewport width ÷ CSS scale.
  // (CANVAS_WIDTH is the canvas's own pre-transform CSS pixel width; the
  // transform scales it up so only viewport_width / scale pixels are visible.)
  const visibleCanvasW = (mapScale > 1 && typeof window !== 'undefined')
    ? Math.round(window.innerWidth / mapScale)
    : CANVAS_WIDTH;

  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const sceneRef = useRef<import('@/lib/phaserMap/TrainingMapScene').default | null>(null);
  // Direct DOM target for the self name-tag/status-icon wrapper — positioned
  // imperatively every animation frame (see the rAF effect below), bypassing
  // React re-render entirely so 60fps movement doesn't churn this component.
  const selfWrapRef = useRef<HTMLDivElement>(null);
  // Other-player overlays (name tags / status icons) suffer the same camera-
  // drift problem as static markers if only repositioned on React re-renders
  // (once per tile crossed). Keep their DOM nodes and current world-tile
  // positions in refs so the rAF loop can reposition them every frame, just
  // like selfWrapRef and markerElsRef below.
  const otherPlayerElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  // Mutated every render so the rAF loop always reads the latest tile position
  // without needing to re-subscribe to `onlinePlayers` as a dep.
  const otherPlayerPosRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  // Update positions synchronously during render — ref writes are safe here.
  otherPlayerPosRef.current = new Map(
    Object.values(onlinePlayers).map(p => [p.userId, { x: p.x, y: p.y }]),
  );
  // Every OTHER stationary-tile marker (town, portals, scrolls, curio) also
  // needs its left/top repositioned every frame the camera pans — earlier
  // these only used the once-per-tile posX/posY-derived leftPct/topPct
  // computed at render time, which was fine when the only markers were a
  // rare town icon and static portals (barely noticeable lag), but became
  // an obvious stutter once several bobbing scroll markers made the
  // once-per-tile snap vs. the continuously-panning background/self
  // visually obvious. Same imperative-ref pattern as selfWrapRef, keyed so
  // each marker's own tile position is known at reposition time.
  const markerElsRef = useRef<Map<string, { el: HTMLDivElement; x: number; y: number }>>(new Map());
  const registerMarker = (key: string, x: number, y: number) => (el: HTMLDivElement | null) => {
    if (el) markerElsRef.current.set(key, { el, x, y });
    else markerElsRef.current.delete(key);
  };
  // Mirrors whatever the sync effect below last computed, kept current on
  // every render regardless of whether the Phaser Game exists yet. Needed
  // because game creation is async (dynamic import) — if it finishes after
  // the sync effect's most recent run (the common case: nothing else
  // triggers a re-render in between), sceneRef.current would otherwise stay
  // pointed at a scene that's never actually been sent any real state.
  const latestStateRef = useRef<MapCanvasSyncState | null>(null);

  useEffect(() => {
    let destroyed = false;
    (async () => {
      const [{ default: Phaser }, { default: TrainingMapScene, CANVAS_WIDTH, CANVAS_HEIGHT }] = await Promise.all([
        import('phaser'),
        import('@/lib/phaserMap/TrainingMapScene'),
      ]);
      if (destroyed || !containerRef.current) return;

      const scene = new TrainingMapScene();
      sceneRef.current = scene;
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        transparent: true,
        pixelArt: true,
        scale: { mode: Phaser.Scale.NONE },
        scene: [scene],
      });
      // Scene queues this (via its own `ready` guard) until create() has
      // actually run — safe to call immediately.
      if (latestStateRef.current) scene.sync(latestStateRef.current);
    })();

    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // Game is created once; all subsequent updates flow through sync() below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const others: MapCanvasPlayer[] = Object.values(onlinePlayers).map(p => ({
      id: p.userId, x: p.x, y: p.y, spriteSrc: spriteSrcFor(p.userId, p.userpic),
    }));
    const state: MapCanvasSyncState = {
      mapWidth,
      mapHeight,
      background,
      self: { id: userId, x: posX, y: posY, spriteSrc: spriteSrcFor(userId) },
      others,
      bumping,
      stepping,
      dustPuffs,
      onPlayerClick,
      visibleCanvasW,
      trashItems: trashItems?.map(i => ({
        id: i.id,
        type: i.type,
        x: i.x,
        y: i.y,
      })),
      collectingTrashIds: collectingTrashIds ? [...collectingTrashIds] : [],
      recyclerTile: recyclerTile ?? null,
    };
    latestStateRef.current = state;
    sceneRef.current?.sync(state);
  });

  // Cheap high-frequency path for the LOCAL player only — runs every
  // animation frame, fully decoupled from the full-state sync effect above
  // (which stays at "once per tile crossed"). Pushes position directly into
  // the Phaser scene and writes the self name-tag wrapper's DOM style
  // directly, bypassing React re-render entirely — the whole point of
  // keeping 60fps movement off this component's render path (see
  // useContinuousMovement.ts's header comment).
  useEffect(() => {
    let raf: number;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const { x, y } = movement.getFloatPos();
      const isMoving = movement.isMoving();
      const facingRight = movement.isFacingRight();
      sceneRef.current?.updateSelfPosition(x - 0.5, y - 0.5, isMoving, facingRight);
      sceneRef.current?.updateTrashPositions(x - 0.5, y - 0.5);
      if (selfWrapRef.current) {
        // overlayPositioning's leftPct/topPct expect a raw tile-index-style
        // coordinate (same convention as posX/posY elsewhere) — the
        // movement hook's float position is center-based, so subtract 0.5
        // to convert back before reusing the same pure function.
        const { leftPct: lp, topPct: tp } = overlayPositioning(mapWidth, mapHeight, background, x - 0.5, y - 0.5, visibleCanvasW);
        selfWrapRef.current.style.left = `${lp(x - 0.5)}%`;
        selfWrapRef.current.style.top = `${tp(y - 0.5)}%`;
        // Every other stationary marker (town/portals/scrolls/curio) shares
        // the exact same camera-relative lp/tp this frame, just evaluated
        // at each marker's own fixed tile position instead of the player's.
        markerElsRef.current.forEach(({ el, x: mx, y: my }) => {
          el.style.left = `${lp(mx)}%`;
          el.style.top = `${tp(my)}%`;
        });
        // Other-player overlays use the same per-frame camera transform so
        // they track the world correctly even while the camera is panning.
        otherPlayerElsRef.current.forEach((el, uid) => {
          const pos = otherPlayerPosRef.current.get(uid);
          if (!pos) return;
          el.style.left = `${lp(pos.x)}%`;
          el.style.top = `${tp(pos.y)}%`;
        });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [movement, mapWidth, mapHeight, background, visibleCanvasW]);

  const { tileWPct, tileHPct, leftPct, topPct } = overlayPositioning(mapWidth, mapHeight, background, posX, posY, visibleCanvasW);

  const nameTag = (targetId: string, displayName?: string) => {
    const profile = USERS[targetId];
    // Use the passed displayName first (e.g. bot firstName), then the USERS
    // record, then the raw id as last resort.
    const label = displayName ?? profile?.name ?? targetId;
    return (
      <p className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] map-name-tag bg-black/60 px-1 rounded whitespace-nowrap">
        {label}
        {profile?.isFamily && <GMBadge />}
      </p>
    );
  };

  const statusIcon = (targetId: string) => {
    if (inBattle(targetId)) {
      return (
        <span
          className="absolute -top-1 left-1/2 -translate-x-1/2 text-sm z-10 animate-pulse drop-shadow"
          title={`${USERS[targetId]?.name ?? 'This player'} is in a battle`}
        >
          ⚔️
        </span>
      );
    }
    const won = resultWon(targetId);
    if (won !== undefined) {
      return (
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 drop-shadow" title={won ? 'Won their battle!' : 'Lost their battle'}>
          <img src={won ? '/icons/stats/victory.svg' : '/icons/stats/defeat.svg'} alt={won ? 'Won' : 'Lost'} className="w-4 h-4 object-contain" />
        </span>
      );
    }
    return null;
  };

  const bubbles = (targetId: string) => (
    <>
      {waves[targetId] && <span className="absolute -top-5 text-xl animate-bounce">👋</span>}
    </>
  );

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />

      {townMarkerTile && (
        <div
          ref={registerMarker('town', townMarkerTile.x, townMarkerTile.y)}
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            left: `${leftPct(townMarkerTile.x)}%`, top: `${topPct(townMarkerTile.y)}%`,
            width: `${tileWPct}%`, height: `${tileHPct}%`,
          }}
        >
          <img
            src="/items/health_potion_l_100.webp"
            alt="Town — heals your team"
            title="Town — heals your team"
            className="w-8 h-8 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]"
          />
        </div>
      )}

      {portalMarkers?.map(portal => {
        const region = REGIONS[portal.regionId];
        if (!region) return null;
        return (
          <div
            key={`${portal.x},${portal.y}`}
            ref={registerMarker(`portal:${portal.x},${portal.y}`, portal.x, portal.y)}
            className={`absolute pointer-events-none ${portal.locked ? 'opacity-50 grayscale' : ''}`}
            style={{
              left: `${leftPct(portal.x)}%`, top: `${topPct(portal.y)}%`,
              width: `${tileWPct}%`, height: `${tileHPct}%`,
            }}
            title={portal.locked ? `${region.name} — locked until level ${region.unlockLevel}` : region.name}
          >
            {/* The sprite (public/tilesets/portals/portal-orange.png) is
                32x48 — taller than a tile — so it's bottom-anchored to sit on
                the tile like a standee instead of being squashed to fit. */}
            <div className="map-portal-sprite absolute left-1/2 bottom-0 -translate-x-1/2" style={{ width: '100%', aspectRatio: '32 / 48' }} />
            {region.element !== 'all' && (
              <img
                src={ELEMENT_ICON_SRC[region.element]}
                alt={region.name}
                className="absolute -bottom-1 -right-1 w-4 h-4 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
              />
            )}
            {portal.locked && <span className="absolute top-0 left-1/2 -translate-x-1/2 text-xs drop-shadow">🔒</span>}
          </div>
        );
      })}

      {scrollMarkers?.map(scroll => (
        <div
          key={scroll.id}
          ref={registerMarker(`scroll:${scroll.id}`, scroll.x, scroll.y)}
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            left: `${leftPct(scroll.x)}%`, top: `${topPct(scroll.y)}%`,
            width: `${tileWPct}%`, height: `${tileHPct}%`,
          }}
        >
          {/* Strong radiating orange glow behind the scroll, independent of
              the bob animation on the image itself, so it reads from a
              distance the same way the curio ground-glow does. */}
          <span className="map-scroll-glow absolute rounded-full" />
          <img
            src="/sprite/question-scroll.png"
            alt="Training scroll"
            className="map-scroll-sprite relative w-8 h-8 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]"
          />
        </div>
      ))}

      {curioMarker && (
        <div
          ref={registerMarker('curio', curioMarker.x, curioMarker.y)}
          className="absolute pointer-events-none flex items-end justify-center"
          style={{
            left: `${leftPct(curioMarker.x)}%`, top: `${topPct(curioMarker.y)}%`,
            width: `${tileWPct}%`, height: `${tileHPct}%`,
          }}
        >
          {/* Ground-shadow glow: an oval pooled under the curio's feet, as if
              lit from above, colored by its rolled QUALITY tier (not
              element) so rarer spawns visibly stand out from a distance. */}
          <span
            className="map-curio-ground-glow absolute rounded-full"
            style={{ ['--glow-color' as string]: getQualityGroundGlowColor(curioMarker.quality) }}
          />
          {/* Periodic hop — an occasional attention-grabbing jump, not a
              continuous bounce, so a spawned curio still reads as "idle"
              most of the time. */}
          <MonsterImage monster={curioMarker.monsterDef} className="relative w-8 h-8 map-curio-hop" />
        </div>
      )}

      {/* Trainer NPC marker — a stationary spawned trainer the player can
          encounter by walking into their 1-tile detection radius. Uses the
          same registerMarker pattern as scrolls/curio so the rAF loop
          repositions it every frame as the camera pans. */}
      {trainerMarker && (
        <div
          ref={registerMarker(`trainer:${trainerMarker.id}`, trainerMarker.x, trainerMarker.y)}
          className="absolute pointer-events-none"
          style={{
            left: `${leftPct(trainerMarker.x)}%`, top: `${topPct(trainerMarker.y)}%`,
            width: `${tileWPct}%`, height: `${tileHPct}%`,
          }}
        >
          {/* Ground shadow — ellipse radial gradient at the trainer's feet */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: '60%', height: '12%',
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.30) 0%, transparent 70%)',
            }}
          />
          {/* Trainer sprite — bottom-anchored, overflows upward like a standee */}
          <img
            src={trainerMarker.spriteOverride ?? `/trainers/${trainerMarker.id}.png`}
            alt={trainerMarker.name}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-24 w-auto object-contain object-bottom"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Attack icon bounces above the sprite to signal a challenge */}
          <img
            src="/icons/stats/atk.svg"
            alt="challenge"
            className="absolute -top-14 left-1/2 -translate-x-1/2 w-6 h-6 animate-bounce"
            style={{ animationDuration: '0.9s' }}
          />
          {/* Name tag below the tile */}
          <p className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] bg-black/70
                        text-amber-300 font-bold px-1 rounded whitespace-nowrap">
            {trainerMarker.name}
          </p>
        </div>
      )}

      {/* Self — position is written directly to this ref every animation
          frame by the rAF effect above, not via React state/props, so no
          CSS transition here (it would fight/lag behind 60fps updates). */}
      <div
        ref={selfWrapRef}
        className="absolute pointer-events-none flex items-center justify-center"
        style={{ left: `${leftPct(posX)}%`, top: `${topPct(posY)}%`, width: `${tileWPct}%`, height: `${tileHPct}%` }}
      >
        <div className="w-full h-full flex items-center justify-center relative">
          {statusIcon(userId)}
          {bubbles(userId)}
          {nameTag(userId)}
        </div>
      </div>

      {/* Other online players — clickable to open stats popup.
          Position is written imperatively every rAF frame (otherPlayerElsRef)
          so it tracks the camera continuously, matching selfWrapRef and
          markerElsRef. No CSS transition — rAF runs at 60fps and a transition
          would fight the per-frame style writes. */}
      {Object.values(onlinePlayers).map(p => (
        <div
          key={p.userId}
          ref={(el) => {
            if (el) otherPlayerElsRef.current.set(p.userId, el);
            else otherPlayerElsRef.current.delete(p.userId);
          }}
          className="absolute cursor-pointer flex items-center justify-center"
          style={{ left: `${leftPct(p.x)}%`, top: `${topPct(p.y)}%`, width: `${tileWPct}%`, height: `${tileHPct}%` }}
          onClick={() => onPlayerClick(p.userId)}
          title={USERS[p.userId]?.name || p.name}
        >
          <div className="w-full h-full flex items-center justify-center relative">
            {statusIcon(p.userId)}
            {bubbles(p.userId)}
            {nameTag(p.userId, p.name)}
          </div>
        </div>
      ))}

      {/* Trash items are rendered inside the Phaser scene at depth 9 (below
          foliage at depth 12+) via applyTrashItems / updateTrashPositions —
          no DOM element needed here. */}

      {/* ── Recycler NPC ────────────────────────────────────────────────────── */}
      {/* The recycler sprite is rendered in the Phaser canvas at depth 8 so the
          player (depth 10) always appears in front. Only the name tag stays DOM. */}
      {recyclerTile && (
        <div
          ref={registerMarker('recycler', recyclerTile.x, recyclerTile.y)}
          className="absolute pointer-events-none"
          style={{
            left: `${leftPct(recyclerTile.x)}%`,
            top:  `${topPct(recyclerTile.y)}%`,
            width: `${tileWPct}%`,
            height: `${tileHPct}%`,
          }}
        >
          <p className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] bg-black/70 text-green-300 font-bold px-1 rounded whitespace-nowrap">
            ♻️ Recycler
          </p>
        </div>
      )}
    </div>
  );
}
