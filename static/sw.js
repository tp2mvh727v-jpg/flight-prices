// ============================================================
// Aero-Hub Service Worker — PWA offline support
// ============================================================

const CACHE_NAME = 'aerohub-v5.20';

const PRECACHE_URLS = [
  '/',
  '/static/css/style.css',
  '/static/js/app.js',
  '/static/js/state.js',
  '/static/js/search-page.js',
  '/static/js/results-page.js',
  '/static/js/flight-profile.js',
  '/static/js/flight-card.js',
  '/static/js/flightService.js',
  '/static/js/api.js',
  '/static/js/autocomplete.js',
  '/static/js/airports.js',
  '/static/js/utils.js',
  '/static/js/analytics.js',
  '/static/manifest.json',
  '/static/icon.svg',
];

const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://unpkg.com/globe.gl',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE_URLS);
      // Best-effort: warm CDN resources (cross-origin may fail silently)
      for (const url of CDN_URLS) {
        try {
          const resp = await fetch(url, { mode: 'no-cors' });
          if (resp.ok || resp.type === 'opaque') {
            cache.put(url, resp);
          }
        } catch { /* CDN unreachable during install — will cache on first access */ }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // CSS + JS files: network-first so fixes reach users without cache-busting params
  if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Images: network-first with cache fallback — avoids stale cache blocking new uploads
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)(\?|$)/i.test(url.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  // Stale-while-revalidate: return cached, update in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);

  if (cached) {
    // Fire-and-forget background update
    fetchPromise;
    return cached;
  }
  try {
    const response = await fetchPromise;
    if (response) return response;
  } catch { /* fall through to offline */ }
  return new Response('Offline', { status: 503 });
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
