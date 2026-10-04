// Service worker: Web Push, plus a cache for game art and voice clips.
//
// Registered at startup in production (instrumentation-client.ts) and from
// lib/push.ts at scope '/'.
//
// Asset cache (2026-10-04): public/ files have no content hash in their
// names and Next serves them with max-age=0, so without this every visit
// re-requested every image and voice clip — slow on mobile data. Art and
// voice under ASSET_PREFIXES are served from the cache straight away and
// refreshed in the background (stale-while-revalidate), so a replaced file
// shows up on the visit after next. Pages, scripts and API calls are never
// touched, and neither are Range requests (<audio> streaming music asks for
// byte ranges; answering those from a whole cached file breaks iOS playback).
// Bump ASSET_CACHE to drop everything cached.
const ASSET_CACHE = 'lh-assets-v1';
const ASSET_PREFIXES = [
  '/intro/', '/monsters/', '/battleui/', '/bosses/', '/npcs/', '/eggs/', '/elements/', '/items/',
  '/icons/', '/main ui/', '/main%20ui/', '/guilds/', '/codex/', '/subjects/', '/event/', '/sidequests/',
  '/sprite/', '/tap_npc_sprites/', '/tiles/', '/tilesets/', '/maps/', '/maps-tiled/', '/maps-tiled-art/',
  '/sounds/',
];
const ASSET_EXT = /\.(webp|png|jpe?g|gif|svg|mp3|ogg|m4a)$/i;

self.addEventListener('install', () => {
  // Activate immediately instead of waiting for old tabs to close — cached
  // assets are interchangeable between worker versions.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('lh-assets-') && key !== ASSET_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Images and audio only — map/data JSON can change together with the code
  // that reads it, so a stale copy could break the page.
  if (!ASSET_EXT.test(url.pathname) || !ASSET_PREFIXES.some(p => url.pathname.startsWith(p))) return;
  event.respondWith(staleWhileRevalidate(event, req));
});

async function staleWhileRevalidate(event, req) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(req);
  const refresh = fetch(req)
    .then((res) => {
      if (res.status === 200 && res.type === 'basic') void cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  return (await refresh) ?? Response.error();
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Learning Hall', body: event.data.text() };
  }

  const title = payload.title || 'Learning Hall';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    data: {
      url: payload.url || '/',
      qid: payload.qid || null,
    },
  };
  // Same tag = the new notification replaces the old one instead of
  // stacking (e.g. two weekly-content pushes, or a repeat reminder).
  if (payload.tag) options.tag = payload.tag;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.url || '/';
  const target = new URL(targetPath, self.location.origin);
  // Queue row id, so the page can record the open (mark_push_opened).
  const qid = event.notification.data?.qid;
  if (qid) target.searchParams.set('pq', qid);
  const targetUrl = target.href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      // `client.url` is always absolute while targetPath is typically
      // relative ('/?tab=monster') — comparing them directly never matched,
      // so this always opened a brand-new tab even when the app was already
      // open. Focus any existing tab of the app and navigate *that* one to
      // the deep link instead, falling back to a new window only if none
      // are open.
      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try { await client.navigate(targetUrl); } catch { /* best-effort */ }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
