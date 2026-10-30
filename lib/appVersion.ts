// lib/appVersion.ts
//
// "New version ready" check. Every build bakes its own id in (NEXT_PUBLIC_BUILD_ID, the
// commit Vercel built, next.config.mjs); /api/version answers with the id of whatever build
// is live now. Kids keep a tab or the Play app open for hours, and the service worker
// (public/sw.js) only swaps itself, not the page already running, so without this they keep
// playing an old build after a fix goes live.
import { useEffect, useState } from 'react';

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
// Often enough to catch a merge within a play session, rare enough to cost nothing.
const CHECK_EVERY_MS = 10 * 60 * 1000;

async function liveBuild(): Promise<string | null> {
  try {
    const res = await fetch('/api/version', { cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body?.build === 'string' ? body.build : null;
  } catch {
    return null; // offline or a blip: say nothing
  }
}

/** True once the live site runs a different build than this page. Checks on load, every
 *  CHECK_EVERY_MS, and whenever the app comes back to the front. Off in dev. */
export function useNewVersionReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (BUILD_ID === 'dev' || ready) return;
    let stopped = false;
    const check = async () => {
      const live = await liveBuild();
      if (!stopped && live && live !== 'dev' && live !== BUILD_ID) setReady(true);
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    void check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ready]);
  return ready;
}
