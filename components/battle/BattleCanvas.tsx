'use client';
// components/battle/BattleCanvas.tsx
// Hosts the Phaser creature layer (lib/phaserBattle/BattleStageScene.ts)
// inside BattleStage's .bstage-stage box, and translates BattleStage's
// existing per-monster props into scene calls — animClassName
// ('battle-attack-*' / 'battle-hit') and damagePopup (keyed per hit) are the
// same signals the old CSS keyframes consumed, so BattleScreen and
// LiveBattleScreen drive this without any changes to their phase logic.
import { useEffect, useRef } from 'react';
import type { BattleStageMonster } from '@/components/battle/BattleStage';
import type BattleStageScene from '@/lib/phaserBattle/BattleStageScene';
import type { Side, StageMonster, StageLayout } from '@/lib/phaserBattle/BattleStageScene';

function toStageMonster(mon: BattleStageMonster): StageMonster {
  return {
    spriteUrl: curioSpriteUrl(mon.def),
    emoji: mon.def.emoji,
    size: mon.def.size,
    floats: mon.def.floats,
    element: mon.def.element,
    fainted: mon.currentHp <= 0,
  };
}

export function curioSpriteUrl(def: { id: string; spriteId?: string }): string {
  return `/monsters/${def.spriteId ?? def.id}.webp`;
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
export default function BattleCanvas({ leftMon, rightMon, layout = 'landscape', ready = true, preloadUrls, onAssetsReady }: {
  leftMon: BattleStageMonster;
  rightMon: BattleStageMonster;
  layout?: StageLayout;
  ready?: boolean;
  preloadUrls?: string[];
  onAssetsReady?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const sceneRef = useRef<BattleStageScene | null>(null);
  // Latest stage state per side, written by the sync effects below — game
  // creation is async, so it seeds the scene from here once it exists.
  const latestRef = useRef<Partial<Record<Side, StageMonster>>>({});
  // Mirrors for the async init below (refs, not render-time reads).
  const readyRef = useRef(ready);
  const preloadRef = useRef(preloadUrls);
  const onAssetsReadyRef = useRef(onAssetsReady);
  useEffect(() => {
    readyRef.current = ready;
    preloadRef.current = preloadUrls;
    onAssetsReadyRef.current = onAssetsReady;
  });

  useEffect(() => {
    let destroyed = false;
    (async () => {
      const family = resolveBungeeFamily();
      const [{ default: Phaser }, sceneMod] = await Promise.all([
        import('phaser'),
        import('@/lib/phaserBattle/BattleStageScene'),
        document.fonts.load(`36px ${family}`).catch(() => undefined),
      ]);
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
        scene: [scene],
      });
      const canvas = gameRef.current.canvas;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
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
  useDamageSignal('left', leftMon.damagePopup, sceneRef);
  useDamageSignal('right', rightMon.damagePopup, sceneRef);

  return <div ref={containerRef} aria-hidden className="absolute inset-0 pointer-events-none" />;
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
  sceneRef: React.RefObject<BattleStageScene | null>,
) {
  const key = popup?.key;
  useEffect(() => {
    if (!popup) return;
    sceneRef.current?.damage(side, popup.value, popup.missed);
    // Keyed on the popup's key: one call per new hit.
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
