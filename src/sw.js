/* Primal Force service worker. Precache list is injected by vite.config.ts. */
const VERSION = 'v2';
const SHELL_CACHE = 'primal-force-shell-' + VERSION;
const VIDEO_CACHE = 'primal-force-videos-v1';
const KEEP_VIDEO_NAMES = ['primal-force-videos-v1', 'primal-force-videos-v2'];
const PRECACHE = self.__PRECACHE__ || ['./', './index.html', './manifest.json'];
const VIDEO_ORIGIN = 'https://download.blender.org';
const FONT_HOSTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))).catch(() => undefined),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('primal-force-') && !KEEP_VIDEO_NAMES.includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isVideo(url) {
  return url.origin === VIDEO_ORIGIN && url.pathname.endsWith('.mp4');
}

/** 416 for unsatisfiable ranges, so <video> can restart cleanly. */
function rangeError() {
  return new Response(null, {
    status: 416,
    statusText: 'Range Not Satisfiable',
    headers: { 'Content-Range': 'bytes */0' },
  });
}

/** Builds a 206 from a cached full body. Returns null when no full body is cached. */
async function partialResponse(request, cache) {
  const full = await cache.match(new Request(request.url, { method: 'GET' }));
  if (!full || !full.ok) return null;
  const buffer = await full.arrayBuffer();
  const size = buffer.byteLength;
  const range = request.headers.get('range');
  if (!range) return full;

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  if (!match) return full;
  let start = match[1] === '' ? null : Number(match[1]);
  let end = match[2] === '' ? null : Number(match[2]);
  if (start === null && end === null) return rangeError();

  if (start === null) {
    // suffix range: last N bytes
    const len = end;
    start = Math.max(0, size - len);
    end = size - 1;
  } else {
    if (end === null || end >= size) end = size - 1;
    if (start >= size || start > end) return rangeError();
  }

  const slice = buffer.slice(start, end + 1);
  const headers = new Headers();
  headers.set('Content-Type', full.headers.get('Content-Type') || 'video/mp4');
  headers.set('Content-Length', String(slice.byteLength));
  headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + size);
  headers.set('Accept-Ranges', 'bytes');
  return new Response(slice, { status: 206, statusText: 'Partial Content', headers });
}

async function videoStrategy(request) {
  const cache = await caches.open(VIDEO_CACHE);
  const ranged = request.headers.has('range');

  if (!ranged) {
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.status === 200) {
        // Only fully buffered bodies are cacheable as a plain entry.
        const buffer = await response.clone().arrayBuffer();
        cache.put(request, new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
            'Content-Length': String(buffer.byteLength),
            'Accept-Ranges': 'bytes',
          },
        }));
      }
      return response;
    } catch {
      return new Response('V?deo indispon?vel offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  }

  // Ranged request: prefer a cached full body, otherwise pass through to the network.
  const partial = await partialResponse(request, cache);
  if (partial) return partial;
  try {
    return await fetch(request);
  } catch {
    return new Response('V?deo indispon?vel offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isVideo(url)) {
    event.respondWith(videoStrategy(request));
    return;
  }
  if (FONT_HOSTS.includes(url.origin)) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Navigations: network first so deploys land, cache as the offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(SHELL_CACHE).then((c) => c.put('./index.html', response.clone()));
          return response;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))),
    );
    return;
  }

  // Hashed build assets are immutable: cache first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) caches.open(SHELL_CACHE).then((c) => c.put(request, response.clone()));
        return response;
      });
    }),
  );
});

/* ---- Offline download queue ---- */

async function notify(payload) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((c) => c.postMessage(payload));
}

async function processQueue() {
  const cache = await caches.open('primal-force-queue');
  const requests = await cache.keys();
  let done = 0;
  for (const request of requests) {
    const url = request.url;
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok || response.status !== 200) throw new Error('HTTP ' + response.status);
      const buffer = await response.arrayBuffer();
      const videoCache = await caches.open(VIDEO_CACHE);
      await videoCache.put(
        new Request(url),
        new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
            'Content-Length': String(buffer.byteLength),
            'Accept-Ranges': 'bytes',
          },
        }),
      );
      await cache.delete(request);
      done += 1;
      await notify({ type: 'pf-offline', status: 'done', url });
    } catch (err) {
      await notify({ type: 'pf-offline', status: 'failed', url, error: String(err) });
      // Keep the request queued and stop so Backoff is respected by the browser.
      throw err;
    }
  }
  if (done > 0) await notify({ type: 'pf-offline', status: 'batch-done', count: done });
  return done;
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'pf-download-queue') {
    event.waitUntil(processQueue().catch(() => undefined));
  }
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'pf-queue-download') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open('primal-force-queue');
        await cache.put(new Request(data.url), new Response('queued'));
        await notify({ type: 'pf-offline', status: 'queued', url: data.url });
        if ('sync' in self.registration) {
          try {
            await self.registration.sync.register('pf-download-queue');
          } catch {
            /* Background Sync unsupported (iOS Safari): client retries on 'online'. */
          }
        }
      })(),
    );
  }
  if (data.type === 'pf-process-queue') {
    event.waitUntil(processQueue().catch(() => undefined));
  }
  if (data.type === 'pf-cleanup-videos') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(VIDEO_CACHE);
        const keys = await cache.keys();
        if (keys.length > 50) {
          for (const key of keys.slice(0, keys.length - 50)) await cache.delete(key);
        }
      })(),
    );
  }
});
