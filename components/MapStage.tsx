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
import GameButton, { questButtonDropShadow, questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { woodTextureStyle, Nail } from '@/components/battle/MonsterHpPanel';

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
        <div className="bg-[#0a0807]/70 text-[#ffffff] font-bold text-[13px] px-3 py-1 rounded-br-lg truncate max-w-[45%]">
          {leftTag}
        </div>
        {rightTag && (
          <div className="bg-[#0a0807]/70 text-[#ffffff] font-bold text-[13px] px-3 py-1 rounded-bl-lg truncate max-w-[45%]">
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
          {/* Same wood-plank + gold trim + corner-nail frame as the battle screen's
              MonsterHpPanel / the map's PlayerStatsPopup, reusing the exported style
              pieces instead of a flat one-off dark panel — see docs/STYLE_GUIDE.md's
              "deliberately still dark" list (this drawer is map chrome, not a
              parchment content panel). Frame is only applied while open — a border
              on a height:0 element would otherwise paint as a stray line. */}
          <div
            className={`mstage-drawer relative ${drawerOpen ? 'open border-2 border-[#4a2f18]' : ''}`}
            style={drawerOpen ? { boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle } : undefined}
          >
            {drawerOpen && (
              <>
                <Nail className="top-1.5 left-1.5" />
                <Nail className="top-1.5 right-1.5" />
              </>
            )}
            <div
              className="flex items-center justify-between px-3 py-2 border-b border-[#3a2610]/70 flex-shrink-0"
              style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: 13 }}
            >
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span aria-hidden style={questTextShadowStyle}>{drawerLabel}</span>
                <span style={questTextStyle}>{drawerLabel}</span>
              </span>
            </div>
            <div className="mstage-drawer-content px-3 py-2">
              {drawer}
            </div>
          </div>
          <GameButton
            variant="quest"
            color="#8a6a0e"
            onClick={() => setDrawerOpen(o => !o)}
            className="mstage-show-drawer"
            style={{ fontSize: 11, padding: '0.3em 1em', borderRadius: '0.5em 0.5em 0 0' }}
          >
            {drawerOpen ? `Hide ${drawerLabel}` : `Show ${drawerLabel}`}
          </GameButton>
        </>
      )}
    </div>
  );

  const overlayLayer = overlay ? (
    <div className="stage-overlay bg-[#0a0807]/70">
      {overlay}
    </div>
  ) : null;

  const shell = (
    <div ref={shellRef} className={`mstage-shell mx-auto${fullscreen ? ' mstage-shell-cover' : ''}`} style={{ height: CANVAS_HEIGHT * scale }}>
      <div className="mstage-scale-inner" style={{ transform: `scale(${scale})` }}>
        {canvas}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <MapScaleContext.Provider value={scale}>
        <div className="fixed inset-0 z-[78] overflow-hidden flex items-center justify-center bg-[#0a0807]">
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
              {/* Same wood-plank + gold trim + corner-nail frame as MonsterHpPanel /
                  PlayerStatsPopup — map chrome, not a parchment panel (see
                  docs/STYLE_GUIDE.md's "deliberately still dark" list). Bigger than
                  the old flat panel (max-w-sm/220px) since it was reading cramped
                  next to everything else in the game using this frame at a larger
                  scale. */}
              {drawerOpen && (
                <div
                  className="relative pointer-events-auto w-full max-w-md mx-auto border-2 border-[#4a2f18] rounded-b-2xl overflow-hidden"
                  style={{ maxHeight: 340, boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, ...woodTextureStyle }}
                >
                  <Nail className="top-1.5 left-1.5" />
                  <Nail className="top-1.5 right-1.5" />
                  <div
                    className="flex items-center px-4 py-2.5 border-b border-[#3a2610]/70"
                    style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: 14 }}
                  >
                    <span style={{ position: 'relative', display: 'inline-block' }}>
                      <span aria-hidden style={questTextShadowStyle}>{drawerLabel}</span>
                      <span style={questTextStyle}>{drawerLabel}</span>
                    </span>
                  </div>
                  <div className="overflow-y-auto px-3 py-2.5" style={{ maxHeight: 290 }}>
                    {drawer}
                  </div>
                </div>
              )}
              <GameButton
                variant="quest"
                color="#8a6a0e"
                onClick={() => setDrawerOpen(o => !o)}
                className="pointer-events-auto"
                style={{ fontSize: 11, padding: '0.3em 1.1em', borderRadius: '0 0 0.5em 0.5em' }}
              >
                {drawerOpen ? `Hide ${drawerLabel}` : `Show ${drawerLabel}`}
              </GameButton>
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
