// Service worker: Web Push, a cache for game art and voice clips, and the
// offline app shell.
//
// Registered at startup in production (instrumentation-client.ts) and from
// lib/push.ts at scope '/'.
//
// Asset cache (2026-10-04): public/ files have no content hash in their
// names and Next serves them with max-age=0, so without this every visit
// re-requested every image and voice clip — slow on mobile data. Art and
// voice under ASSET_PREFIXES are served from the cache straight away and
// refreshed in the background (stale-while-revalidate), so a replaced file
// shows up on the visit after next. Range requests are never touched (<audio>
// streaming music asks for byte ranges; answering those from a whole cached
// file breaks iOS playback). Bump ASSET_CACHE to drop everything cached.
//
// Offline shell (2026-10-06): so the dashboard opens with no connection.
// - The dashboard page ('/', any query string) is network-first and kept as
//   one cached copy; offline, or when the network takes longer than
//   NAV_TIMEOUT_MS, the last copy is served instead. Other pages are left
//   alone (they're online-only).
// - /_next/static/ files are content-hashed, so they're cache-first. Every
//   fresh copy of the dashboard page also fetches any of its scripts, styles
//   and fonts not cached yet, so the shell works offline after one online
//   visit, even for files the page loaded before this worker took control.
// - /api/content (this week's quiz content, answers already stripped
//   server-side) is network-first with the cached copy as the offline
//   fallback, so the board still has its quests.
// Player data (stats, journal) comes from Supabase, not through here; the
// page keeps its own last-loaded copy for offline (hooks/useWeeklyData.ts).
const ASSET_CACHE = 'lh-assets-v1';
const SHELL_CACHE = 'lh-shell-v1';
const STATIC_CACHE = 'lh-static-v1';
const CONTENT_CACHE = 'lh-content-v1';
const KNOWN_CACHES = [ASSET_CACHE, SHELL_CACHE, STATIC_CACHE, CONTENT_CACHE];
const SHELL_KEY = '/';
const NAV_TIMEOUT_MS = 6000;
// Old deploys' hashed files pile up otherwise. Files the current shell page
// references are never trimmed.
const STATIC_MAX_ENTRIES = 500;
// A few weeks per grade is plenty; only the newest is normally needed.
const CONTENT_MAX_ENTRIES = 12;
const ASSET_PREFIXES = [
  '/intro/', '/monsters/', '/battleui/', '/bosses/', '/npcs/', '/eggs/', '/elements/', '/items/',
  '/icons/', '/main ui/', '/main%20ui/', '/guilds/', '/codex/', '/subjects/', '/event/', '/sidequests/',
  '/sprite/', '/tap_npc_sprites/', '/tiles/', '/tilesets/', '/maps/', '/maps-tiled/', '/maps-tiled-art/',
  '/sounds/', '/userpics/',
];
// Art an offline screen can need before it has ever been shown online: the reward icons on
// every quest and guild result screen.
const PRECACHE_ASSETS = ['/icons/stats/star.png', '/icons/rewards/gold_coin.svg'];
const ASSET_EXT = /\.(webp|png|jpe?g|gif|svg|mp3|ogg|m4a)$/i;

// Art and voice under ASSET_PREFIXES, plus the handful of top-level public/
// images (loading screens, the menu compass).
// The Training Map's Tiled files (map layouts and tilesets), so the map also opens offline
// (lib/offlineMap.ts).
const MAP_DATA_PREFIXES = ['/maps-tiled/', '/maps-tiled-art/'];
const MAP_DATA_EXT = /\.(json|tmx|tsx)$/i;

function isAsset(url) {
  if (MAP_DATA_EXT.test(url.pathname) && MAP_DATA_PREFIXES.some(p => url.pathname.startsWith(p))) return true;
  if (!ASSET_EXT.test(url.pathname)) return false;
  return url.pathname.lastIndexOf('/') === 0 || ASSET_PREFIXES.some(p => url.pathname.startsWith(p));
}

self.addEventListener('install', (event) => {
  // Activate immediately instead of waiting for old tabs to close — cached
  // assets are interchangeable between worker versions.
  self.skipWaiting();
  // Cache the shell now rather than on the next visit: the page that
  // registered this worker loaded before it could see any requests. Done
  // here, not in activate, because page loads wait on an activating worker
  // but not on an installing one. Best-effort: a failure mustn't stop push.
  event.waitUntil(Promise.all([
    refreshShell().catch(() => {}),
    caches.open(ASSET_CACHE).then(cache => cache.addAll(PRECACHE_ASSETS)).catch(() => {}),
  ]));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('lh-') && !KNOWN_CACHES.includes(key)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    if (url.pathname === SHELL_KEY) event.respondWith(shellNetworkFirst(event, req));
    return;
  }
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }
  // next/image output (the dashboard's art goes through it), keyed by its
  // own url/w/q query, so it's cached like the raw art.
  if (url.pathname === '/_next/image') {
    event.respondWith(staleWhileRevalidate(event, req));
    return;
  }
  if (url.pathname === '/api/content') {
    event.respondWith(networkFirst(event, req, CONTENT_CACHE, CONTENT_MAX_ENTRIES));
    return;
  }
  // Images and audio only — map/data JSON can change together with the code
  // that reads it, so a stale copy could break the page.
  if (!isAsset(url)) return;
  event.respondWith(staleWhileRevalidate(event, req));
});

function cacheable(res) {
  return res && res.status === 200 && res.type === 'basic';
}

async function shellNetworkFirst(event, req) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(SHELL_KEY);
  const network = fetch(req).then((res) => {
    // Only a real page, not a redirect or an error page, replaces the copy.
    if (cacheable(res) && !res.redirected) {
      const saving = storeShell(res.clone()).catch(() => {});
      // Throws if the cached copy already answered (timeout) and the event
      // has ended; the save still runs while the page stays open.
      try { event.waitUntil(saving); } catch { /* see above */ }
    }
    return res;
  });
  if (!cached) return network;
  if (!self.navigator.onLine) {
    network.catch(() => {});
    return cached;
  }
  const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NAV_TIMEOUT_MS));
  return Promise.race([network.catch(() => cached), timeout]);
}

async function refreshShell() {
  const res = await fetch(SHELL_KEY, { credentials: 'same-origin' });
  if (cacheable(res) && !res.redirected) await storeShell(res);
}

// Saves the dashboard page and makes sure every script, style and font it
// references is cached too, then trims old deploys' files.
async function storeShell(res) {
  const html = await res.clone().text();
  const shell = await caches.open(SHELL_CACHE);
  await shell.put(SHELL_KEY, res);
  const referenced = staticUrlsIn(html);
  const staticCache = await caches.open(STATIC_CACHE);
  await Promise.all([...referenced].map(async (path) => {
    if (await staticCache.match(path)) return;
    try {
      const r = await fetch(path);
      if (cacheable(r)) await staticCache.put(path, r);
    } catch { /* picked up on a later visit */ }
  }));
  await trimCache(STATIC_CACHE, STATIC_MAX_ENTRIES, referenced);
}

function staticUrlsIn(html) {
  const urls = new Set();
  // Matches src/href attributes and the escaped paths inside Next's inline
  // flight data (which lists the page's chunks).
  for (const m of html.matchAll(/\/_next\/static\/[^"'\s\\)<>]+/g)) {
    urls.add(new URL(m[0].replace(/&amp;/g, '&'), self.location.origin).href);
  }
  return urls;
}

async function trimCache(name, max, keep = new Set()) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  let excess = keys.length - max;
  // cache.keys() is in insertion order, so this drops the oldest first.
  for (const key of keys) {
    if (excess <= 0) break;
    if (keep.has(key.url)) continue;
    await cache.delete(key);
    excess--;
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (cacheable(res)) void cache.put(req, res.clone());
  return res;
}

async function networkFirst(event, req, cacheName, max) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (cacheable(res)) {
      event.waitUntil(cache.put(req, res.clone()).then(() => trimCache(cacheName, max)));
    }
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw err;
  }
}

// The page sends the art, scripts and fonts it loaded before this worker took
// control (instrumentation-client.ts), so a first visit is enough for them to
// show offline. Same filters as the fetch handler; most come from the HTTP cache.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache-loaded-assets' || !Array.isArray(event.data.urls)) return;
  event.waitUntil(cacheLoadedAssets(event.data.urls));
});

async function cacheLoadedAssets(urls) {
  const assets = await caches.open(ASSET_CACHE);
  const statics = await caches.open(STATIC_CACHE);
  for (const href of urls.slice(0, 300)) {
    let url;
    try { url = new URL(href); } catch { continue; }
    if (url.origin !== self.location.origin) continue;
    let cache = null;
    if (url.pathname.startsWith('/_next/static/')) cache = statics;
    else if (url.pathname === '/_next/image') cache = assets;
    else if (isAsset(url)) cache = assets;
    if (!cache || await cache.match(url.href)) continue;
    try {
      const res = await fetch(url.href);
      if (cacheable(res)) await cache.put(url.href, res);
    } catch { /* offline now; the next visit fills it in */ }
  }
}

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
