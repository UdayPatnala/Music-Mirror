/**
 * Music Mirror — High-Resilience Audio Stream & Static Asset Service Worker
 * Version: 2.04.04.0
 *
 * Provides:
 * 1. Offline application shell caching (stale-while-revalidate).
 * 2. Dedicated audio stream caching (CacheStorage 'mm-audio-stream-v1') for
 *    uninterrupted playback during transient network disconnections.
 * 3. Cache lifecycle management & diagnostics control channel (postMessage).
 */

const STATIC_CACHE = 'mm-static-v2.04.04.0';
const AUDIO_CACHE = 'mm-audio-stream-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/music-mirror-mark.svg',
];

// Maximum audio items allowed in audio stream cache to prevent unbounded storage
const MAX_AUDIO_CACHE_ENTRIES = 60;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAudioRequest(request) {
  const url = request.url.toLowerCase();
  const accept = request.headers.get('accept') || '';

  return (
    url.endsWith('.mp3') ||
    url.endsWith('.m4a') ||
    url.endsWith('.wav') ||
    url.endsWith('.ogg') ||
    url.endsWith('.aac') ||
    url.includes('/audio/') ||
    url.includes('storage.jamendo.com') ||
    url.includes('audio-ssl.itunes.apple.com') ||
    accept.includes('audio/')
  );
}

async function trimAudioCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_AUDIO_CACHE_ENTRIES) {
    const toDelete = keys.slice(0, keys.length - MAX_AUDIO_CACHE_ENTRIES);
    for (const req of toDelete) {
      await cache.delete(req);
    }
  }
}

// ---------------------------------------------------------------------------
// Service Worker Lifecycle
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Warning only: some dev assets might not exist at install time
        console.warn('[SW] Non-critical static asset caching issue:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('mm-static-') && name !== STATIC_CACHE)
          .map((name) => {
            console.log('[SW] Evicting deprecated cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Fetch Event Interception
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bypass non-GET requests (e.g. POST to backend or external APIs)
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 1. Audio stream caching strategy: Cache-first, then network, with auto-save
  if (isAudioRequest(request)) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            // Cache valid audio stream chunk
            cache.put(request, networkResponse.clone()).then(() => {
              trimAudioCache(cache);
            });
          }
          return networkResponse;
        } catch {
          // If offline and not in audio cache, return fallback audio headers or 503
          return new Response(
            JSON.stringify({
              error: 'AUDIO_STREAM_OFFLINE',
              message: 'Audio asset unavailable offline in cache storage.',
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      })
    );
    return;
  }

  // 2. Navigation / App shell strategy: Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match('/index.html');
        return cached || Response.error();
      })
    );
    return;
  }

  // 3. Static assets & bundles: Stale-While-Revalidate
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.json'))
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: pass-through to network
});

// ---------------------------------------------------------------------------
// Diagnostic & Control Messages
// ---------------------------------------------------------------------------

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data.type === 'PURGE_AUDIO_CACHE') {
    caches.delete(AUDIO_CACHE).then((deleted) => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: 'PURGE_AUDIO_CACHE_RESULT', success: deleted });
      }
    });
  }

  if (data.type === 'GET_CACHE_STATS') {
    Promise.all([
      caches.open(STATIC_CACHE).then((c) => c.keys()),
      caches.open(AUDIO_CACHE).then((c) => c.keys()),
    ]).then(([staticKeys, audioKeys]) => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          type: 'CACHE_STATS_RESULT',
          staticEntries: staticKeys.length,
          audioEntries: audioKeys.length,
          staticCacheName: STATIC_CACHE,
          audioCacheName: AUDIO_CACHE,
        });
      }
    });
  }
});
