'use client';
// components/intro/IntroFx.tsx
// Mounts the intro's transparent Phaser effects layer (lib/intro/IntroFxScene.ts)
// over the art and registers it for lib/intro/introCues.ts. Phaser loads
// lazily, the same way the battle stage does (components/battle/BattleCanvas.tsx);
// until it's ready, cues just play their sounds.
import { useEffect, useRef } from 'react';
import { setIntroFx } from '@/lib/intro/introFxRegistry';

export default function IntroFx() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;
    let game: import('phaser').Game | null = null;
    (async () => {
      const [{ default: Phaser }, { default: IntroFxScene }] = await Promise.all([
        import('phaser'),
        import('@/lib/intro/IntroFxScene'),
      ]);
      if (destroyed || !containerRef.current) return;
      const scene = new IntroFxScene();
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        transparent: true,
        antialias: true,
        banner: false,
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
        scene: [scene],
      });
      await scene.whenReady;
      if (!destroyed) setIntroFx(scene);
    })();
    return () => {
      destroyed = true;
      setIntroFx(null);
      game?.destroy(true);
    };
  }, []);

  return <div ref={containerRef} aria-hidden className="absolute inset-0 pointer-events-none" />;
}
