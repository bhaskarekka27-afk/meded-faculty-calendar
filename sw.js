/**
 * PW MedEd - Progressive Web App Service Worker
 * Enables installability, full-screen offline shell, and instant launching.
 */

const CACHE_NAME = 'pw-meded-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/faculty-login.html',
  '/admin-login.html',
  '/faculty.html',
  '/admin.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[PWA SW] Precache partial error (ignored):', err.message);
      });
    }).then(() => self.skipWaiting())
  );
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Exclude non-GET requests and dynamic backend APIs from caching
  if (req.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.hostname.includes('google.com') || url.hostname.includes('googleapis.com')) {
    return; // Pass through to network for real-time data
  }

  // Navigation requests: Network-first, fallback to cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match(req).then((cached) => {
          return cached || caches.match('/login.html') || caches.match('/');
        });
      })
    );
    return;
  }

  // Static Assets (Images, Icons, CSS, JS, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});
