const CACHE_NAME = 'primal-force-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap'
];

const VIDEO_CACHE_NAME = 'primal-force-videos-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== VIDEO_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Vídeos da Blender — cache first com fallback de rede
  if (url.origin === 'https://download.blender.org' && url.pathname.endsWith('.mp4')) {
    event.respondWith(
      caches.open(VIDEO_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch (e) {
          return new Response('Vídeo não disponível offline', { status: 503 });
        }
      })
    );
    return;
  }

  // Fontes Google — stale while revalidate
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Outros recursos — network first, fallback cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Limpeza periódica do cache de vídeos (máx 50 itens)
self.addEventListener('message', (event) => {
  if (event.data === 'cleanup-videos') {
    caches.open(VIDEO_CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        if (keys.length > 50) {
          keys.slice(0, keys.length - 50).forEach((key) => cache.delete(key));
        }
      });
    });
  }
});