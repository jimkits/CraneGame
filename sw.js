const GAME_CACHE = 'crane-game-v1';
const CDN_CACHE  = 'crane-cdn-v1';
const ALL_CACHES = [GAME_CACHE, CDN_CACHE];

const CDN_URLS = [
  'https://unpkg.com/three@0.160.0/build/three.module.js',
  'https://unpkg.com/@dimforge/rapier3d-compat@0.12.0/rapier.es.js',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CDN_CACHE).then(c =>
      Promise.allSettled(CDN_URLS.map(u => c.add(u)))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !ALL_CACHES.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // CDN — cache-first (versioned URLs never change)
  if (url.hostname === 'unpkg.com') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) caches.open(CDN_CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // Game files — network-first, cache fallback (picks up updates)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) caches.open(GAME_CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
