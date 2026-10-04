// Ensures an analytics session id exists as early as possible, before any
// component needs one. Does not fire session_start here — identity
// (getActiveUser()) isn't resolved yet at this point; that happens in the
// app/page.tsx hydration effect once the active user is known.
import { getOrCreateSessionId } from '@/lib/analytics';

getOrCreateSessionId();

// The service worker (public/sw.js) caches game art and voice clips, so every
// player gets it, not only those who turned on push notifications. Production
// only: in dev it would serve stale copies of art being worked on.
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  const register = () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}); };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
