const CACHE = 'gymtony-pro-v3.5.9';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icons/logo-red-192x192.png',
  './icons/logo-red-512x512.png',
  './icons/logo-maskable-192x192.png',
  './icons/logo-maskable-512x512.png',
  './logos/PECHO.png',
  './logos/PIERNA.png',
  './logos/BRAZO_transparente.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
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
