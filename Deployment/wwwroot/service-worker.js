// Blazor WASM PWA Service Worker - Optimized for Offline
const CACHE_NAME = 'blazor-pwa-v2';
const BASE_PATH = '/Deployment/';

// Critical Blazor assets that MUST be cached for offline boot
const CRITICAL_ASSETS = [
    `${BASE_PATH}`,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}manifest.webmanifest`,
    `${BASE_PATH}_framework/blazor.webassembly.js`,
    `${BASE_PATH}_framework/blazor.boot.json`,
    `${BASE_PATH}_framework/dotnet.wasm`,
    `${BASE_PATH}_framework/dotnet.js`
];

// Import service worker assets if available
try {
    self.importScripts('./service-worker-assets.js');
} catch (e) {
    console.warn('Service worker assets not found, using fallback');
}

self.addEventListener('install', event => {
    console.log('SW: Installing');

    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        // Cache critical assets first
        try {
            await cache.addAll(CRITICAL_ASSETS);
            console.log('SW: Critical assets cached');
        } catch (error) {
            console.error('SW: Failed to cache critical assets:', error);
        }

        // Cache additional assets from manifest if available
        if (self.assetsManifest?.assets) {
            const additionalAssets = self.assetsManifest.assets
                .map(asset => asset.url.startsWith('/') ? asset.url : `${BASE_PATH}${asset.url}`)
                .filter(url => !CRITICAL_ASSETS.includes(url));

            try {
                await cache.addAll(additionalAssets);
                console.log('SW: Additional assets cached');
            } catch (error) {
                console.warn('SW: Some additional assets failed to cache:', error);
            }
        }

        self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    console.log('SW: Activating');

    event.waitUntil((async () => {
        // Clean old caches
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter(name => name !== CACHE_NAME)
                .map(name => caches.delete(name))
        );

        self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Only handle same-origin requests under our base path
    if (url.origin !== location.origin || !url.pathname.startsWith(BASE_PATH)) {
        return;
    }

    // Skip service worker and hot reload requests
    if (url.pathname.includes('service-worker') ||
        url.pathname.includes('_blazor') ||
        url.searchParams.has('hot-reload')) {
        return;
    }

    event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
    try {
        // Try cache first for all requests
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('SW: Cache hit:', request.url);
            return cachedResponse;
        }

        // Try network
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.ok && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            console.log('SW: Cached from network:', request.url);
        }

        return networkResponse;

    } catch (error) {
        console.error('SW: Fetch failed:', request.url, error);

        // Fallback for navigation requests
        if (request.destination === 'document') {
            const fallback = await caches.match(`${BASE_PATH}index.html`);
            return fallback || new Response('Offline', { status: 503 });
        }

        return new Response('Network Error', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}