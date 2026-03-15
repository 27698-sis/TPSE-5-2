const CACHE_NAME = 'tfpc-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './app.js'
];

// Instalación: guarda los archivos básicos en el celular
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Estrategia: si no hay internet, busca en el caché
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
