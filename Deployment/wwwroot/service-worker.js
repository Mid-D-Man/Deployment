// Fixed Blazor WASM PWA Service Worker for GitHub Pages
const CACHE_NAME = 'blazor-pwa-v3';
const BASE_PATH = '/Deployment/'; // Must match GitHub Pages path

// Critical assets with correct GitHub Pages paths
const CRITICAL_ASSETS = [
    `${BASE_PATH}`,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}manifest.webmanifest`,
    `${BASE_PATH}_framework/blazor.webassembly.js`,
    `${BASE_PATH}_framework/blazor.boot.json`,
    `${BASE_PATH}_framework/dotnet.wasm`,
    `${BASE_PATH}_framework/dotnet.js`,
    `${BASE_PATH}offline.html`
];

// Import Blazor assets manifest
try {
    self.importScripts('./service-worker-assets.js');
    console.log('SW: Assets manifest loaded');
} catch (e) {
    console.warn('SW: Assets manifest not found, using fallback');
}

self.addEventListener('install', event => {
    console.log('SW: Installing v3');

    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        // Cache critical assets with error handling
        for (const asset of CRITICAL_ASSETS) {
            try {
                await cache.add(asset);
                console.log(`SW: Cached ${asset}`);
            } catch (error) {
                console.error(`SW: Failed to cache ${asset}:`, error);
            }
        }

        // Cache additional Blazor framework assets
        if (self.assetsManifest?.assets) {
            const additionalAssets = self.assetsManifest.assets
                .map(asset => {
                    const url = asset.url.startsWith('/') ? asset.url : `/${asset.url}`;
                    return url.startsWith(BASE_PATH) ? url : `${BASE_PATH.slice(1)}${url}`;
                })
                .filter(url => !CRITICAL_ASSETS.includes(url));

            for (const asset of additionalAssets.slice(0, 50)) { // Limit to prevent timeout
                try {
                    await cache.add(asset);
                } catch (error) {
                    console.warn(`SW: Failed to cache additional asset ${asset}`);
                }
            }
        }

        self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    console.log('SW: Activating v3');

    event.waitUntil((async () => {
        // Clean old caches
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter(name => name !== CACHE_NAME)
                .map(name => {
                    console.log(`SW: Deleting old cache ${name}`);
                    return caches.delete(name);
                })
        );

        self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Only handle same-origin requests under our base path
    if (url.origin !== location.origin) {
        return;
    }

    // Skip service worker and hot reload requests
    if (url.pathname.includes('service-worker') ||
        url.pathname.includes('_blazor') ||
        url.searchParams.has('hot-reload')) {
        return;
    }

    event.respondWith(handleFetch(event.request, url));
});

async function handleFetch(request, url) {
    try {
        // For root path, redirect to base path
        if (url.pathname === '/' || url.pathname === '/Deployment') {
            const cachedIndex = await caches.match(`${BASE_PATH}index.html`);
            if (cachedIndex) {
                return cachedIndex;
            }
        }

        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('SW: Cache hit:', request.url);
            return cachedResponse;
        }

        // Try network with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const networkResponse = await fetch(request, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

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
            const fallback = await caches.match(`${BASE_PATH}offline.html`) ||
                await caches.match(`${BASE_PATH}index.html`);

            if (fallback) {
                return fallback;
            }
        }

        // Fallback for Blazor framework files
        if (url.pathname.includes('_framework/')) {
            const cachedFallback = await caches.match(request);
            if (cachedFallback) {
                return cachedFallback;
            }
        }

        return new Response('Offline - Resource not available', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}