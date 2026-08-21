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
import { useState, useEffect, ReactNode, createContext } from 'react';
import { useStageScale } from '@/hooks/useStageScale';

/** CSS-transform scale applied to the map canvas by MapStage.
 *  Consumed by MapCanvas to compute the actual visible canvas width and
 *  tighten edge scroll-clamping so the player never drifts off-screen in
 *  cover-mode portrait fullscreen. Defaults to 1 (no transform). */
export const MapScaleContext = createContext(1);

interface MapStageProps {
  leftTag: ReactNode;
  rightTag?: ReactNode;
  frame: ReactNode;
  controls?: ReactNode;
  drawerLabel?: string;
  drawer?: ReactNode;
  overlay?: ReactNode;
  /** When true, the stage mounts as a fixed full-viewport layer (z-78, below
   *  the HUD at z-79 and the arena FAB at z-80). On mobile the canvas scales
   *  to fill the full screen height (cover mode), cropping the excess width. */
  fullscreen?: boolean;
}

const CANVAS_WIDTH = 896;
const CANVAS_HEIGHT = 504;

export default function MapStage({
  leftTag,
  rightTag,
  frame,
  controls,
  drawerLabel = 'Info',
  drawer,
  overlay,
  fullscreen,
}: MapStageProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { shellRef, scale } = useStageScale(CANVAS_WIDTH, CANVAS_HEIGHT, fullscreen);

  // Measure the HUD's bottom edge so the fullscreen drawer toggle sits flush
  // against it in every orientation (HUD is 55px tall in portrait, ~33px in
  // landscape). Uses ResizeObserver on the HUD element so we measure AFTER
  // it has relaid (window 'resize' fires too early — the HUD may still report
  // its old size). Falls back to 55 on SSR where document is not available.
  const [hudBottom, setHudBottom] = useState(55);
  useEffect(() => {
    if (!fullscreen) return;
    const measure = () => {
      const hud = document.querySelector<HTMLElement>('[class*="z-\\[79\\]"]');
      if (hud) setHudBottom(Math.round(hud.getBoundingClientRect().bottom));
    };
    measure();
    const hud = document.querySelector<HTMLElement>('[class*="z-\\[79\\]"]');
    const ro = hud ? new ResizeObserver(measure) : null;
    if (ro && hud) ro.observe(hud);
    return () => ro?.disconnect();
  }, [fullscreen]);

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
        {/* In fullscreen mode controls are lifted out to a fixed overlay so they
            aren't cropped by the cover-mode horizontal overflow. */}
        {controls && !fullscreen && <div className="mstage-controls">{controls}</div>}
      </div>

      {/* In fullscreen mode the drawer + toggle are lifted to a fixed top overlay
          so they aren't inside the scaled/cropped canvas. */}
      {drawer && !fullscreen && (
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

  const overlayLayer = overlay ? (
    <div className="stage-overlay bg-black/70">
      {overlay}
    </div>
  ) : null;

  const shell = (
    <div ref={shellRef} className="mstage-shell mx-auto" style={{ height: CANVAS_HEIGHT * scale }}>
      <div className="mstage-scale-inner" style={{ transform: `scale(${scale})` }}>
        {canvas}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <MapScaleContext.Provider value={scale}>
        <div className="fixed inset-0 z-[78] overflow-hidden flex items-center justify-center bg-black">
          {shell}
          {overlayLayer}
          {controls && (
            <div className="map-joystick-wrap fixed z-[81]">
              {controls}
            </div>
          )}
          {drawer && (
            <div
              className="fixed left-0 right-0 z-[81] flex flex-col items-center pointer-events-none"
              style={{ top: hudBottom }}
            >
              {drawerOpen && (
                <div
                  className="pointer-events-auto w-full max-w-sm mx-auto bg-black/90 border border-neutral-700 rounded-b-xl overflow-hidden"
                  style={{ maxHeight: 220 }}
                >
                  <div className="flex items-center px-3 py-1.5 border-b border-neutral-800 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    <span>{drawerLabel}</span>
                  </div>
                  <div className="overflow-y-auto px-2.5 py-1.5" style={{ maxHeight: 180 }}>
                    {drawer}
                  </div>
                </div>
              )}
              <button
                onClick={() => setDrawerOpen(o => !o)}
                className="pointer-events-auto bg-black/80 hover:bg-black/95 text-gray-200 font-bold text-[11px] px-4 py-1 rounded-b-lg"
              >
                {drawerOpen ? `Hide ${drawerLabel}` : `Show ${drawerLabel}`}
              </button>
            </div>
          )}
        </div>
      </MapScaleContext.Provider>
    );
  }

  return (
    <>
      {shell}
      {overlayLayer}
    </>
  );
}
