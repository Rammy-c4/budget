const CACHE_NAME = 'local-budget-v5';

// Precache manifest injected during production build by Vite plugin
self.__PRECACHE_MANIFEST__ = [];

self.addEventListener('install', (event) => {
  const scopeUrl = new URL(self.registration.scope);
  const scopePath = scopeUrl.pathname;
  const base = scopePath.endsWith('/') ? scopePath : `${scopePath}/`;

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Core shell assets that must always be cached
      const assetSet = new Set([
        base,
        `${base}index.html`,
        `${base}404.html`,
        `${base}manifest.json`,
        `${base}icon.svg`,
        `${base}apple-touch-icon.png`,
        `${base}pwa-192x192.png`,
        `${base}pwa-512x512.png`,
        `${base}pwa-maskable-512x512.png`,
      ]);

      // Add build-injected production assets (JS chunks, CSS stylesheets, etc.)
      if (Array.isArray(self.__PRECACHE_MANIFEST__)) {
        for (const item of self.__PRECACHE_MANIFEST__) {
          if (!item) continue;
          const cleanItem = item.replace(/^\/+/, '');
          assetSet.add(new URL(cleanItem, self.registration.scope).pathname);
        }
      }

      // Supplement with precache-manifest.json if available
      try {
        const manifestRes = await fetch(
          `${base}precache-manifest.json?v=${encodeURIComponent(CACHE_NAME)}`,
          { cache: 'no-cache' }
        );
        if (manifestRes.ok) {
          const list = await manifestRes.json();
          if (Array.isArray(list)) {
            for (const item of list) {
              if (!item) continue;
              const cleanItem = item.replace(/^\/+/, '');
              assetSet.add(new URL(cleanItem, self.registration.scope).pathname);
            }
          }
        }
      } catch (e) {
        // Safe to ignore if offline or file not reachable
      }

      const urlsToCache = Array.from(assetSet);
      console.log('[SW] Pre-caching assets for', CACHE_NAME, urlsToCache);

      await Promise.allSettled(
        urlsToCache.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Failed to pre-cache asset:', url, err);
          })
        )
      );
    })()
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting obsolete cache:', key);
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
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/__vite_ping')
  ) {
    return;
  }

  // Navigation requests: Network-first with offline cache fallback to index.html
  if (event.request.mode === 'navigate') {
    const scopePath = new URL(self.registration.scope).pathname;
    const base = scopePath.endsWith('/') ? scopePath : `${scopePath}/`;

    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy.clone());
              cache.put(`${base}index.html`, copy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback to cached application shell
          return caches
            .match(event.request)
            .then((res) => res || caches.match(`${base}index.html`))
            .then((res) => res || caches.match(base))
            .then((res) => res || caches.match('/index.html'));
        })
    );
    return;
  }

  // Static application assets: Cache-first with background revalidation when online
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached asset immediately
        if (url.origin === self.location.origin) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const copy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
              }
            })
            .catch(() => {
              // Ignore background fetch failure when offline
            });
        }
        return cachedResponse;
      }

      // Not in cache: fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            (networkResponse.status === 200 || networkResponse.type === 'opaque') &&
            (url.origin === self.location.origin ||
              url.hostname.includes('googleapis.com') ||
              url.hostname.includes('gstatic.com'))
          ) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and Google Fonts was requested, return harmless empty CSS
          if (
            url.hostname.includes('googleapis.com') ||
            url.hostname.includes('gstatic.com')
          ) {
            return new Response('', {
              status: 200,
              headers: { 'Content-Type': 'text/css' },
            });
          }

          return caches.match(event.request, { ignoreSearch: true });
        });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(self.registration.scope);
      }
    })
  );
});
