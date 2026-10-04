'use client';
import { useEffect, useRef } from 'react';
import { trackParentEvent, type TrackOptions } from '@/lib/analytics';

type Emit = (eventName: string, properties: Record<string, unknown>, options: TrackOptions) => void;

// A gap longer than this with no tap/key/scroll counts as idle, so a phone
// left open on a desk doesn't log an hour on one screen (same idea as GA4's
// "engagement time").
const IDLE_GRACE_MS = 2 * 60 * 1000;
const MIN_REPORT_MS = 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;

/**
 * Emits one `screen_time` event ({ screen, duration_ms }) each time the named
 * screen is left: on screen change, when the page is hidden, or on unmount.
 * `duration_ms` is active (non-idle) time while visible. Pass null to pause.
 */
export function useScreenTime(screen: string | null, emit: Emit) {
  const emitRef = useRef(emit);
  useEffect(() => { emitRef.current = emit; }, [emit]);

  useEffect(() => {
    if (!screen) return;
    let activeMs = 0;
    let lastActivity: number | null = document.visibilityState === 'visible' ? Date.now() : null;

    const accrue = (now: number) => {
      if (lastActivity === null) return;
      activeMs += Math.min(now - lastActivity, IDLE_GRACE_MS);
      lastActivity = now;
    };
    const flush = (keepalive: boolean) => {
      accrue(Date.now());
      lastActivity = null;
      const ms = activeMs;
      activeMs = 0;
      if (ms < MIN_REPORT_MS) return;
      emitRef.current('screen_time', { screen, duration_ms: Math.round(ms) }, { keepalive });
    };

    const onActivity = () => accrue(Date.now());
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush(true);
      else lastActivity = Date.now();
    };
    const onPageHide = () => flush(true);

    for (const e of ACTIVITY_EVENTS) window.addEventListener(e, onActivity, { passive: true, capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, onActivity, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      flush(false);
    };
  }, [screen]);
}

/** Parent sub-page: one `parent_page_viewed` on mount plus its screen time. */
export function useParentPage(page: string) {
  useEffect(() => {
    trackParentEvent('parent_page_viewed', { page });
  }, [page]);
  useScreenTime(page, trackParentEvent);
}
