const CACHE_NAME = 'govids-v1';
const urlsToCache = [
  './',
  './index.html',
  './database.js',
  './translite.js',
  './brain.js',
  './icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Memaksa service worker baru langsung aktif
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim()); // Mengambil alih kontrol halaman dengan cepat
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
