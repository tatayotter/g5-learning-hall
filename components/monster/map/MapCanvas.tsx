'use client';
// components/monster/map/MapCanvas.tsx
// Replaces the old CSS-grid `frameContent` in TrainingMap.tsx with a real
// Phaser canvas (lib/phaserMap/TrainingMapScene.ts) for the "world" layer —
// background image, player/other-player sprites, footstep dust, wall-bump
// shake. Name tags, GM badges, wave/sticker speech bubbles, and the town
// marker stay as a thin DOM overlay on top (same tile-percentage positioning
// the old CSS grid used) since canvas text/rounded-rect primitives would
// only regress that polish's fidelity for no gameplay benefit — see the
// scene file's header comment for the full rationale.
import { useEffect, useRef } from 'react';
import { USERS } from '@/lib/userSession';
import { GMBadge } from '@/components/battle/shared';
import type { MapCanvasSyncState, MapCanvasPlayer } from '@/lib/phaserMap/TrainingMapScene';
import type { OnlinePlayer } from '@/hooks/useMapPresence';

function spriteSrcFor(userId: string): string {
  const profile = USERS[userId];
  return profile?.avatar?.startsWith('/userpics/')
    ? profile.avatar
    : profile?.gender === 'girl' ? '/sprite/girl1.webp' : '/sprite/boy1.webp';
}

interface MapCanvasProps {
  mapSize: number;
  mapImageSrc: string;
  bumping: boolean;
  stepping: boolean;
  posX: number;
  posY: number;
  userId: string;
  waves: Record<string, number>;
  stickers: Record<string, { text: string; at: number }>;
  dustPuffs: { id: number; x: number; y: number }[];
  onlinePlayers: Record<string, OnlinePlayer>;
  inBattle: (userId: string) => boolean;
  resultWon: (userId: string) => boolean | undefined;
  townMarkerTile: { x: number; y: number } | null;
  onPlayerClick: (userId: string) => void;
}

export default function MapCanvas({
  mapSize, mapImageSrc, bumping, stepping, posX, posY, userId, waves, stickers,
  dustPuffs, onlinePlayers, inBattle, resultWon, townMarkerTile, onPlayerClick,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const sceneRef = useRef<import('@/lib/phaserMap/TrainingMapScene').default | null>(null);

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
      id: p.userId, x: p.x, y: p.y, spriteSrc: spriteSrcFor(p.userId),
    }));
    const state: MapCanvasSyncState = {
      mapSize,
      mapImageSrc,
      self: { id: userId, x: posX, y: posY, spriteSrc: spriteSrcFor(userId) },
      others,
      bumping,
      stepping,
      dustPuffs,
      onPlayerClick,
    };
    sceneRef.current?.sync(state);
  });

  const tilePct = 100 / mapSize;

  const nameTag = (targetId: string) => {
    const profile = USERS[targetId];
    return (
      <p className="absolute -bottom-4 flex items-center gap-1 text-[10px] map-name-tag bg-black/60 px-1 rounded whitespace-nowrap">
        {profile?.name || targetId}
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
      {stickers[targetId] && (
        <div className="absolute -top-8 bg-white text-black text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow">
          {stickers[targetId].text}
        </div>
      )}
    </>
  );

  return (
    <div className={`relative w-full h-full ${bumping ? 'map-bump-shake' : ''}`}>
      <div ref={containerRef} className="absolute inset-0" />

      {townMarkerTile && (
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            left: `${townMarkerTile.x * tilePct}%`, top: `${townMarkerTile.y * tilePct}%`,
            width: `${tilePct}%`, height: `${tilePct}%`,
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

      {/* Self */}
      <div
        className="absolute pointer-events-none transition-[left,top] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center"
        style={{ left: `${posX * tilePct}%`, top: `${posY * tilePct}%`, width: `${tilePct}%`, height: `${tilePct}%` }}
      >
        <div className="w-full h-full flex items-center justify-center relative">
          {statusIcon(userId)}
          {bubbles(userId)}
          {nameTag(userId)}
        </div>
      </div>

      {/* Other online players — clickable to open stats popup */}
      {Object.values(onlinePlayers).map(p => (
        <div
          key={p.userId}
          className="absolute transition-[left,top] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer flex items-center justify-center"
          style={{ left: `${p.x * tilePct}%`, top: `${p.y * tilePct}%`, width: `${tilePct}%`, height: `${tilePct}%` }}
          onClick={() => onPlayerClick(p.userId)}
          title={USERS[p.userId]?.name || p.name}
        >
          <div className="w-full h-full flex items-center justify-center relative">
            {statusIcon(p.userId)}
            {bubbles(p.userId)}
            {nameTag(p.userId)}
          </div>
        </div>
      ))}
    </div>
  );
}
