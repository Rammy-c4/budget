const CACHE_NAME = 'local-budget-v3';

self.addEventListener('install', (event) => {
  const scopePath = new URL(self.registration.scope).pathname;
  const base = scopePath.endsWith('/') ? scopePath : `${scopePath}/`;
  const assetsToCache = [
    base,
    `${base}index.html`,
    `${base}manifest.json`,
    `${base}icon.svg`,
    `${base}apple-touch-icon.png`,
    `${base}pwa-192x192.png`,
    `${base}pwa-512x512.png`,
    `${base}pwa-maskable-512x512.png`,
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        assetsToCache.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('[SW] Failed to pre-cache asset:', asset, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip WebSocket connections and Vite dev-server hot updates
  if (
    url.protocol === 'ws:' ||
    url.protocol === 'wss:' ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/')
  ) {
    return;
  }

  // Navigation requests: Network first with offline cache fallback to index.html under base scope
  if (event.request.mode === 'navigate') {
    const scopePath = new URL(self.registration.scope).pathname;
    const base = scopePath.endsWith('/') ? scopePath : `${scopePath}/`;

    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() =>
          caches
            .match(`${base}index.html`)
            .then((res) => res || caches.match(base))
        )
    );
    return;
  }

  // Static assets: Cache first with network update and fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Revalidate in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
          })
          .catch(() => {
            // Offline - ignore network error since cached version was returned
          });
        return cachedResponse;
      }

      // Not in cache: fetch and cache if same-origin or Google fonts
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === self.location.origin ||
              url.hostname.includes('googleapis.com') ||
              url.hostname.includes('gstatic.com'))
          ) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request));
    })
  );
});
