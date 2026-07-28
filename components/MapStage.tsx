'use client';
// components/MapStage.tsx
// Shared visual shell for both "world" screens — the region-select hub
// (components/WorldMap.tsx) and the walkable grid map (TrainingMap, inside
// components/MonsterGuild.tsx) — so they read as the same visual system as
// the battle screen (components/battle/BattleStage.tsx) instead of each
// owning unrelated card/sidebar layouts.
//
// Same fixed 896x504 canvas + mobile-fullscreen treatment as BattleStage
// (see hooks/useStageScale.ts). The map/hub art is 16:9 (a 16x16 grid or a
// circular region wheel, both painted onto wide backgrounds), so it sits
// centered in an ornate-framed 16:9 rectangle (`.mstage-frame`), with
// movement controls overlaid directly on top of it (bottom-left corner)
// instead of living outside in a separate row, and an info drawer (team
// roster / who's online / legend / regions list — whatever the caller needs)
// collapsed by default beneath it, matching the battle log's pattern.
import { useState, ReactNode } from 'react';
import { useStageScale } from '@/hooks/useStageScale';

interface MapStageProps {
  leftTag: ReactNode;
  rightTag?: ReactNode;
  frame: ReactNode;
  controls?: ReactNode;
  drawerLabel?: string;
  drawer?: ReactNode;
  overlay?: ReactNode;
  // Only rendered in mobile fullscreen mode — on desktop the app's own nav
  // tabs are already visible, but the fullscreen wrapper below covers them
  // entirely (still in the DOM, just painted over), so mobile needs its own
  // explicit way back out. Positioned in real viewport coordinates (outside
  // the scaled canvas) so it stays a consistent tap size regardless of scale.
  onExit?: () => void;
}

const CANVAS_WIDTH = 896;
const CANVAS_HEIGHT = 504;

export default function MapStage({ leftTag, rightTag, frame, controls, drawerLabel = 'Info', drawer, overlay, onExit }: MapStageProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { shellRef, scale, isMobile } = useStageScale(CANVAS_WIDTH, CANVAS_HEIGHT);

  const canvas = (
    <div className="mstage-container">
      <div className="mstage-top-tags">
        <div className="bg-black/70 text-white font-bold text-[13px] px-3 py-1 rounded-br-lg truncate max-w-[45%]">
          {leftTag}
        </div>
        {rightTag && (
          <div className="bg-black/70 text-white font-bold text-[13px] px-3 py-1 rounded-bl-lg truncate max-w-[45%]">
            {rightTag}
          </div>
        )}
      </div>

      <div className="mstage-frame">
        {frame}
        {controls && <div className="mstage-controls">{controls}</div>}
      </div>

      {drawer && (
        <>
          <div className={`mstage-drawer bg-black/95 ${drawerOpen ? 'open border-2 border-neutral-700' : ''}`}>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800 text-[11px] font-bold uppercase tracking-wide text-gray-400 flex-shrink-0">
              <span>{drawerLabel}</span>
            </div>
            <div className="mstage-drawer-content px-2.5 py-1.5">
              {drawer}
            </div>
          </div>

          <button
            onClick={() => setDrawerOpen(o => !o)}
            className="mstage-show-drawer bg-neutral-800 hover:bg-neutral-700 text-gray-200 font-bold text-[11px]"
          >
            {drawerOpen ? `Hide ${drawerLabel}` : `Show ${drawerLabel}`}
          </button>
        </>
      )}
    </div>
  );

  const overlayLayer = overlay && (
    <div className="stage-overlay bg-black/70">
      {overlay}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--background)' }}>
          <div className="mstage-scale-inner" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
            {canvas}
          </div>
          {onExit && (
            <button
              onClick={onExit}
              className="fixed top-3 right-3 z-[60] w-9 h-9 bg-black/70 hover:bg-black/90 border border-neutral-700 rounded-full text-white flex items-center justify-center"
              title="Exit map"
            >
              ✕
            </button>
          )}
        </div>
        {overlayLayer}
      </>
    );
  }

  return (
    <>
      <div ref={shellRef} className="mstage-shell mx-auto" style={{ height: CANVAS_HEIGHT * scale }}>
        <div className="mstage-scale-inner" style={{ transform: `scale(${scale})` }}>
          {canvas}
        </div>
      </div>
      {overlayLayer}
    </>
  );
}
