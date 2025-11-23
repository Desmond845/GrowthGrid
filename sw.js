const CACHE = 'growthgrid-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll([
        '/GrowthGrid/',
        '/GrowthGrid/index.html',
        '/GrowthGrid/style.css',
        '/GrowthGrid/script.js',
        '/GrowthGrid/img.png'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});