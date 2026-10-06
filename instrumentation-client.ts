// Ensures an analytics session id exists as early as possible, before any
// component needs one. Does not fire session_start here — identity
// (getActiveUser()) isn't resolved yet at this point; that happens in the
// app/page.tsx hydration effect once the active user is known.
import { getOrCreateSessionId } from '@/lib/analytics';
import { listenForNotificationTaps } from '@/lib/push';

getOrCreateSessionId();

// Play app: route notification taps from the very first page, signed in or not.
listenForNotificationTaps();

// The service worker (public/sw.js) caches game art, voice clips and the
// offline app shell, so every
// player gets it, not only those who turned on push notifications. Production
// only: in dev it would serve stale copies of art being worked on.
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    // Hand the worker everything this page already loaded, so the art and
    // scripts fetched before it took control still work offline. A few
    // seconds in, to catch the dashboard's first screen.
    void navigator.serviceWorker.ready.then((reg) => {
      setTimeout(() => {
        const urls = performance.getEntriesByType('resource').map((e) => e.name);
        reg.active?.postMessage({ type: 'cache-loaded-assets', urls });
      }, 5000);
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
