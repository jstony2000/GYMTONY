const CACHE = 'gymtony-pro-v3.6.0';
const MEDIA_CACHE = 'gymtony-media-v1';
const MAX_MEDIA_ITEMS = 50;

const CORE = [
  './',
  './index.html',
  './manifest.json',
  './videos_catalog.json',
  './icons/logo-red-192x192.png',
  './icons/logo-red-512x512.png',
  './icons/logo-maskable-192x192.png',
  './icons/logo-maskable-512x512.png',
  './logos/PECHO.png',
  './logos/PIERNA.png',
  './logos/BRAZO_transparente.png'
];

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await Promise.all(keys.slice(0, keys.length - maxItems).map(k => cache.delete(k)));
  }
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== MEDIA_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('api.github.com') || e.request.url.includes('raw.githubusercontent.com')) return;
  const url = new URL(e.request.url);

  const isAppShell = e.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.js');

  const isMedia = url.pathname.includes('/VIDEOS/') ||
    url.pathname.includes('/ejercicios/') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.gif');

  if (isAppShell) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then(res => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else if (isMedia) {
    e.respondWith(
      caches.open(MEDIA_CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const res = await fetch(e.request);
          if (res.status === 200) {
            cache.put(e.request, res.clone()).then(() => trimCache(MEDIA_CACHE, MAX_MEDIA_ITEMS));
          }
          return res;
        } catch (err) {
          return cached;
        }
      })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        return cached || fetch(e.request).then(res => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached);
      })
    );
  }
});
