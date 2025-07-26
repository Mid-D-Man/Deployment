const CACHE_NAME = 'blazor-pwa-v1.0';
const BASE_PATH = '/Deployment/';

// Critical assets for offline functionality
const CRITICAL_ASSETS = [
    `${BASE_PATH}`,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}manifest.webmanifest`,
    `${BASE_PATH}_framework/blazor.webassembly.js`,
    `${BASE_PATH}_framework/blazor.boot.json`,
    `${BASE_PATH}css/app.css`,
    `${BASE_PATH}css/bootstrap/bootstrap.min.css`,
    `${BASE_PATH}offline.html`
];

self.addEventListener('install', event => {
    console.log('[SW] Installing service worker');
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        // Cache critical assets with error handling
        await Promise.allSettled(
            CRITICAL_ASSETS.map(async url => {
                try {
                    await cache.add(url);
                    console.log(`[SW] Cached: ${url}`);
                } catch (error) {
                    console.warn(`[SW] Failed to cache ${url}:`, error);
                }
            })
        );

        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    console.log('[SW] Activating service worker');
    // Add to service worker temporarily
    console.log('Assets manifest:', self.assetsManifest.assets.slice(0, 5));
    event.waitUntil((async () => {
        // Clean old caches
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter(name => name !== CACHE_NAME)
                .map(name => caches.delete(name))
        );

        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle requests within our app scope
    if (!url.pathname.startsWith(BASE_PATH)) {
        return;
    }

    event.respondWith((async () => {
        try {
            // Network first for API calls and dynamic content
            if (request.url.includes('api/') || request.method !== 'GET') {
                const networkResponse = await fetch(request);
                return networkResponse;
            }

            // Cache first for static assets
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                console.log(`[SW] Serving from cache: ${request.url}`);
                return cachedResponse;
            }

            // Network fallback
            const networkResponse = await fetch(request);

            // Cache successful responses
            if (networkResponse.ok) {
                const cache = await caches.open(CACHE_NAME);
             await   cache.put(request, networkResponse.clone());
                console.log(`[SW] Cached new resource: ${request.url}`);
            }

            return networkResponse;

        } catch (error) {
            console.error(`[SW] Fetch failed for ${request.url}:`, error);

            // Fallback to cached index for navigation requests
            if (request.mode === 'navigate') {
                const cachedIndex = await caches.match(`${BASE_PATH}index.html`);
                if (cachedIndex) return cachedIndex;

                // Last resort: offline page
                return caches.match(`${BASE_PATH}offline.html`);
            }

            throw error;
        }
    })());
});