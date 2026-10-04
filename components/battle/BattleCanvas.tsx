'use client';
// components/battle/BattleCanvas.tsx
// Hosts the Phaser creature layer (lib/phaserBattle/BattleStageScene.ts)
// inside BattleStage's .bstage-stage box, and translates BattleStage's
// existing per-monster props into scene calls — animClassName
// ('battle-attack-*' / 'battle-hit') and damagePopup (keyed per hit) are the
// same signals the old CSS keyframes consumed, so BattleScreen and
// LiveBattleScreen drive this without any changes to their phase logic.
import { useEffect, useRef, useState } from 'react';
import type { BattleStageMonster } from '@/components/battle/BattleStage';
import type BattleStageScene from '@/lib/phaserBattle/BattleStageScene';
import type { Side, StageMonster, StageLayout } from '@/lib/phaserBattle/BattleStageScene';
import { trackEvent } from '@/lib/analytics';
import { CURIO_SIZE_HEIGHT_PX, FLOAT_LIFT_PX } from '@/lib/curioBody';

function toStageMonster(mon: BattleStageMonster): StageMonster {
  return {
    spriteUrl: mon.spriteUrl ?? curioSpriteUrl(mon.def),
    emoji: mon.def.emoji,
    size: mon.def.size,
    floats: mon.def.floats,
    element: mon.def.element,
    fainted: mon.currentHp <= 0,
    heightPx: mon.heightPx,
  };
}

export function curioSpriteUrl(def: { id: string; spriteId?: string }): string {
  return `/monsters/${def.spriteId ?? def.id}.webp`;
}

// Per attempt; Phaser retries a timed-out file twice more.
const CURIO_LOAD_TIMEOUT_MS = 12000;

// Phaser is a big download; on a flaky connection its chunk can fail once,
// which would leave the stage empty for the whole battle.
async function importWithRetry<T>(load: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await load();
    } catch (e) {
      if (i >= attempts) throw e;
      await new Promise(r => setTimeout(r, 1500 * i));
    }
  }
}

// Once per page per issue, so a flaky battle can't flood analytics.
const reportedIssues = new Set<string>();
function reportAssetIssue(reason: string, url: string) {
  const key = `${reason}:${url}`;
  if (reportedIssues.has(key)) return;
  reportedIssues.add(key);
  void trackEvent('asset_load_slow', { where: 'battle', reason, url: url.slice(0, 300) });
}

// next/font exposes Bungee only as a CSS variable holding its generated
// family name; canvas text needs the literal family string.
function resolveBungeeFamily(): string {
  const v = getComputedStyle(document.body).getPropertyValue('--font-bungee').trim()
    || getComputedStyle(document.documentElement).getPropertyValue('--font-bungee').trim();
  return v || 'sans-serif';
}

// `layout` is fixed for this canvas's lifetime — BattleStage remounts it
// (via key) when the layout changes, since stage geometry is set at creation.
//
// Battle intro (components/battle/BattleIntro.tsx): `preloadUrls` are loaded
// into the scene as soon as it exists, then `onAssetsReady` fires. Curios
// aren't placed on stage until `ready` — so their entrance animations play
// right as the intro lifts, not hidden behind it.
export default function BattleCanvas({ leftMon, rightMon, layout = 'landscape', ready = true, preloadUrls, onAssetsReady, onPlayerHurt }: {
  leftMon: BattleStageMonster;
  rightMon: BattleStageMonster;
  layout?: StageLayout;
  ready?: boolean;
  preloadUrls?: string[];
  onAssetsReady?: () => void;
  // See BattleStageScene.onPlayerHurt.
  onPlayerHurt?: (fraction: number, knockout: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Phaser couldn't be loaded even after retries: show the curios as plain
  // images instead of an empty stage (no animations, but the fight is playable).
  const [phaserFailed, setPhaserFailed] = useState(false);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const sceneRef = useRef<BattleStageScene | null>(null);
  // Latest stage state per side, written by the sync effects below — game
  // creation is async, so it seeds the scene from here once it exists.
  const latestRef = useRef<Partial<Record<Side, StageMonster>>>({});
  // Mirrors for the async init below (refs, not render-time reads).
  const readyRef = useRef(ready);
  const preloadRef = useRef(preloadUrls);
  const onAssetsReadyRef = useRef(onAssetsReady);
  const onPlayerHurtRef = useRef(onPlayerHurt);
  useEffect(() => {
    readyRef.current = ready;
    preloadRef.current = preloadUrls;
    onAssetsReadyRef.current = onAssetsReady;
    onPlayerHurtRef.current = onPlayerHurt;
  });

  useEffect(() => {
    let destroyed = false;
    (async () => {
      const family = resolveBungeeFamily();
      let loaded;
      try {
        loaded = await Promise.all([
          importWithRetry(() => import('phaser')),
          importWithRetry(() => import('@/lib/phaserBattle/BattleStageScene')),
          document.fonts.load(`36px ${family}`).catch(() => undefined),
        ]);
      } catch (e) {
        // No stage this battle; the intro's own cutoff still lets it start.
        reportAssetIssue('phaser_import', e instanceof Error ? e.message : String(e));
        if (!destroyed) {
          setPhaserFailed(true);
          onAssetsReadyRef.current?.();
        }
        return;
      }
      const [{ default: Phaser }, sceneMod] = loaded;
      if (destroyed || !containerRef.current) return;
      const res = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      // clientWidth/Height are layout pixels, unaffected by the stage's CSS
      // scale transform — exactly the box the canvas is stretched over.
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const scene = new sceneMod.default(res, family, w, h, layout);
      sceneRef.current = scene;
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: w * res,
        height: h * res,
        transparent: true,
        antialias: true,
        roundPixels: true,
        scale: { mode: Phaser.Scale.NONE },
        banner: false,
        // Phaser's default is no timeout: a download that stalls on mobile data
        // never finishes or fails, and the curio is never drawn (not even its
        // emoji). A timeout turns the stall into an error, which is retried
        // (maxRetries, default 2) and then falls back to the emoji.
        loader: { timeout: CURIO_LOAD_TIMEOUT_MS },
        scene: [scene],
      });
      const canvas = gameRef.current.canvas;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      // iOS Safari drops WebGL under memory pressure; record it when it does.
      canvas.addEventListener('webglcontextlost', () => reportAssetIssue('webgl_lost', ''));
      scene.onPlayerHurt = (fraction, knockout) => onPlayerHurtRef.current?.(fraction, knockout);
      scene.onAssetIssue = reportAssetIssue;
      await scene.whenReady;
      await scene.preloadCurios(preloadRef.current ?? []);
      if (destroyed) return;
      onAssetsReadyRef.current?.();
      // Already past the intro (e.g. a layout remount mid-battle): place the
      // curios now. Otherwise the sync effects place them when `ready` flips.
      if (readyRef.current) {
        for (const side of ['left', 'right'] as Side[]) {
          const m = latestRef.current[side];
          if (m) scene.setMonster(side, m);
        }
      }
    })();
    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  const leftStage = toStageMonster(leftMon);
  const rightStage = toStageMonster(rightMon);
  const leftSig = JSON.stringify(leftStage);
  const rightSig = JSON.stringify(rightStage);
  useEffect(() => {
    latestRef.current.left = leftStage;
    if (ready) sceneRef.current?.setMonster('left', leftStage);
  }, [leftSig, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    latestRef.current.right = rightStage;
    if (ready) sceneRef.current?.setMonster('right', rightStage);
  }, [rightSig, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Declared before the damage/hit signals so a move's impact timing is
  // registered before the hit it carries (the scene also tolerates either
  // order via a short grace window).
  useActionSignal('left', leftMon.action, sceneRef);
  useActionSignal('right', rightMon.action, sceneRef);
  useAnimSignal('left', leftMon.animClassName, sceneRef);
  useAnimSignal('right', rightMon.animClassName, sceneRef);
  useDamageSignal('left', leftMon.damagePopup, leftMon.maxHp, sceneRef);
  useDamageSignal('right', rightMon.damagePopup, rightMon.maxHp, sceneRef);

  return (
    <div ref={containerRef} aria-hidden className="absolute inset-0 pointer-events-none">
      {phaserFailed && ready && (
        <>
          <FallbackCurio mon={leftStage} side="left" layout={layout} />
          <FallbackCurio mon={rightStage} side="right" layout={layout} />
        </>
      )}
    </div>
  );
}

// Plain-image stand-in for a curio when Phaser failed to load, placed where
// BattleStageScene would stand it (same ground lines, x positions and
// portrait depth; see its constructor).
function FallbackCurio({ mon, side, layout }: { mon: StageMonster; side: Side; layout: StageLayout }) {
  const back = layout === 'portrait' && side === 'right';
  const depth = back ? 0.8 : 1;
  const heightPx = (mon.heightPx ?? CURIO_SIZE_HEIGHT_PX[mon.size]) * depth;
  const lift = mon.floats ? FLOAT_LIFT_PX * depth : 0;
  const style: React.CSSProperties = {
    position: 'absolute',
    height: heightPx,
    width: 'auto',
    // Front ground line is 57px off the bottom (platform 75 tall, 16 up, feet sunk 34).
    bottom: back ? `calc(50% + ${lift}px)` : 57 + lift,
    transform: `translateX(-50%)${side === 'right' ? ' scaleX(-1)' : ''}`,
    opacity: mon.fainted ? 0.35 : 1,
    filter: mon.fainted ? 'grayscale(1)' : undefined,
  };
  if (layout === 'portrait') style.left = side === 'left' ? '26%' : '70%';
  else style.left = side === 'left' ? 157.5 : 'calc(100% - 157.5px)';
  return <img src={mon.spriteUrl} alt="" style={style} />;
}

// The callers reset animClassName to '' and then set it again (double rAF)
// to replay a CSS animation — so each transition to a non-empty value is
// one event.
function useAnimSignal(side: Side, anim: string | undefined, sceneRef: React.RefObject<BattleStageScene | null>) {
  useEffect(() => {
    if (!anim) return;
    if (anim.startsWith('battle-attack')) sceneRef.current?.attack(side);
    else if (anim === 'battle-hit') sceneRef.current?.hit(side);
  }, [anim, side, sceneRef]);
}

function useActionSignal(
  side: Side,
  action: BattleStageMonster['action'],
  sceneRef: React.RefObject<BattleStageScene | null>,
) {
  const key = action?.key;
  useEffect(() => {
    if (!action) return;
    sceneRef.current?.perform(side, action.animation, action.element);
    // Keyed on the action's key: one sequence per use.
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

function useDamageSignal(
  side: Side,
  popup: BattleStageMonster['damagePopup'],
  maxHp: number,
  sceneRef: React.RefObject<BattleStageScene | null>,
) {
  const key = popup?.key;
  useEffect(() => {
    if (!popup) return;
    sceneRef.current?.damage(side, popup.value, popup.missed, maxHp);
    // Keyed on the popup's key: one call per new hit.
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
