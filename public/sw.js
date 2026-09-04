// Web Push service worker. Deliberately minimal for now — plumbing only,
// no offline caching (see docs/STYLE_GUIDE.md-adjacent decision: this app
// leans on Vercel/Next HTTP caching + a separate Capacitor native wrapper
// for "installed app" reliability, not a full offline cache layer).
//
// Registered from lib/push.ts at scope '/'.

self.addEventListener('install', () => {
  // Activate immediately instead of waiting for old tabs to close — there's
  // no cached content here that an old worker needs to keep serving.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

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
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
