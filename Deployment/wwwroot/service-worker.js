// Production service worker for Blazor WASM PWA
// Replace your current service-worker.js content with this for production

const VERSION = 'v1.0.0';
const CACHE_NAME = `Deployment-${VERSION}`;
const BASE_URL = '/Deployment/'; // Update this to match your GitHub repo name

// Import the assets manifest - this is generated during build
self.importScripts('./service-worker-assets.js');

// Configure offline assets
const offlineAssetsInclude = [/^\/Deployment\//];
const offlineAssetsExclude = [/\/Deployment\/service-worker\.js$/];

// Assets to precache
const assetsManifest = self.assetsManifest || {
    assets: [
        { url: '/', hash: 'default' },
        { url: '/index.html', hash: 'default' },
        { url: '/manifest.json', hash: 'default' }
    ]
};

// Install event - precache critical assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');

                // Get the assets to precache from the manifest
                const urlsToCache = assetsManifest.assets
                    .filter(asset => asset.url.startsWith('/Deployment/') || asset.url === '/')
                    .map(asset => {
                        let url = asset.url;
                        if (url === '/') url = '/Deployment/';
                        return new URL(url, self.location).href;
                    });

                console.log('Caching assets:', urlsToCache);
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('All assets cached');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Cache installation failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Only handle same-origin requests
    if (url.origin !== self.location.origin) {
        return;
    }

    // Skip service worker requests
    if (offlineAssetsExclude.some(pattern => pattern.test(url.pathname))) {
        return;
    }

    // Handle requests with cache-first strategy
    if (offlineAssetsInclude.some(pattern => pattern.test(url.pathname))) {
        event.respondWith(
            cacheFirst(event.request)
        );
    }
});

// Cache-first strategy with network fallback
async function cacheFirst(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('Cache hit for:', request.url);
            return cachedResponse;
        }

        // Fallback to network
        console.log('Cache miss, fetching from network:', request.url);
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('Fetch failed:', error);

        // Return offline fallback if available
        if (request.destination === 'document') {
            const offlineResponse = await caches.match('/offline.html');
            if (offlineResponse) {
                return offlineResponse;
            }
        }

        return new Response('Network error occurred', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}

// Handle background sync (if needed)
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    console.log('Background sync triggered');
    // Implement your background sync logic here
}

// Handle push notifications (if needed)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/icon-192.png',
                badge: '/icon-192.png'
            })
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(BASE_URL)
    );
});

// Debug logging
console.log('Service Worker loaded with config:', {
    VERSION,
    CACHE_NAME,
    BASE_URL,
    assetsCount: assetsManifest.assets?.length || 0
});