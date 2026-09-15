const CACHE_NAME = 'py-ide-max-cache-v1';

// Local files to cache immediately
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// Install Event: Cache local files
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Cache First, fallback to Network
self.addEventListener('fetch', (event) => {
    // We only want to cache GET requests (ignore POST, etc.)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 1. If it's in the cache, return it immediately (Offline Mode)
            if (cachedResponse) {
                return cachedResponse;
            }

            // 2. If not in cache, fetch from the network
            return fetch(event.request).then((networkResponse) => {
                // Check if we received a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
                    return networkResponse;
                }

                // 3. Clone the response and save it to cache for next time
                // This is crucial for caching Pyodide's and Tesseract's CDN files
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    // Only cache HTTP/HTTPS requests (ignores chrome-extension:// etc.)
                    if (event.request.url.startsWith('http')) {
                        cache.put(event.request, responseToCache);
                    }
                });

                return networkResponse;
            }).catch(() => {
                // If network fails and it's not in cache, do nothing or return a fallback
                console.warn('[Service Worker] Fetch failed, returning offline fallback');
            });
        })
    );
});
