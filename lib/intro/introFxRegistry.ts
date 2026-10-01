// lib/intro/introFxRegistry.ts
// The live intro effects scene, if any. components/intro/IntroFx.tsx sets it
// once Phaser has loaded (lazily, client-only); lib/intro/introCues.ts reads
// it. Kept separate so nothing but IntroFx.tsx imports Phaser itself.
import type IntroFxScene from '@/lib/intro/IntroFxScene';

let scene: IntroFxScene | null = null;

export function setIntroFx(s: IntroFxScene | null) {
  scene = s;
}

export function introFx(): IntroFxScene | null {
  return scene;
}
