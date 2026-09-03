'use client';
// hooks/useStageScale.ts
// Shared sizing/mobile-fullscreen logic behind both BattleStage
// (components/battle/BattleStage.tsx) and MapStage (components/MapStage.tsx)
// — a fixed-aspect canvas that scales to fit its actual rendered container
// width on desktop/tablet (via ResizeObserver, not a vw-based CSS media
// query — these screens sit inside a sidebar layout narrower than the
// viewport, so scaling off 100vw overflows past the real content column),
// and goes full-screen on mobile-width screens, scaling to fit both width
// AND height (the page chrome otherwise pushes the canvas below the fold).
import { useState, useEffect, useRef } from 'react';

// Matches the app's existing mobile/tablet breakpoint (see the "Mobile
// Typography Scale" media query in app/globals.css).
const MOBILE_QUERY = '(max-width: 1024px)';

export function useStageScale(canvasWidth: number, canvasHeight: number, coverMode = false) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    // coverMode (fullscreen maps, e.g. the training map) always fills the
    // viewport edge-to-edge by scaling off window dimensions, not just on
    // mobile widths — desktop windows are routinely wider than the 896px
    // canvas, so the old isMobile-only gating left coverMode desktop users
    // stuck at the ResizeObserver contain-fit below (scale capped at 1,
    // centered with letterbox bars) instead of actually covering the screen.
    if (isMobile || coverMode) {
      const update = () => {
        const scaleW = window.innerWidth / canvasWidth;
        const scaleH = window.innerHeight / canvasHeight;
        // coverMode = fill viewport: scale by the larger axis so both
        // dimensions are at least as big as the viewport (overflow cropped).
        // Default = fit/contain: scale by the smaller axis (letterbox).
        setScale(coverMode ? Math.max(scaleW, scaleH) : Math.min(scaleW, scaleH));
      };
      update();
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const el = shellRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / canvasWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile, canvasWidth, canvasHeight, coverMode]);

  return { shellRef, scale, isMobile };
}
