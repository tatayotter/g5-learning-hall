'use client';
// components/MapStage.tsx
// Shared visual shell for both "world" screens — the region-select hub
// (components/WorldMap.tsx) and the walkable grid map (TrainingMap, inside
// components/MonsterGuild.tsx) — so they read as the same visual system as
// the battle screen (components/battle/BattleStage.tsx) instead of each
// owning unrelated card/sidebar layouts.
//
// Same fixed 896x504 canvas as BattleStage, scaled to fit its container's
// actual rendered width (see hooks/useStageScale.ts) — always inline within
// the page (no mobile-fullscreen mode; the sidebar/tab bar stays visible and
// reachable at every screen size). The map/hub art is 16:9 (a 16x16 grid or a
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
}

const CANVAS_WIDTH = 896;
const CANVAS_HEIGHT = 504;

export default function MapStage({ leftTag, rightTag, frame, controls, drawerLabel = 'Info', drawer, overlay }: MapStageProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { shellRef, scale } = useStageScale(CANVAS_WIDTH, CANVAS_HEIGHT);

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
