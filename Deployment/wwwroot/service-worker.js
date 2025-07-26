const CACHE_NAME = 'blazor-pwa-fixed';

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        const assets = [
            '/Deployment/',
            '/Deployment/index.html',
            '/Deployment/manifest.webmanifest',
            '/Deployment/_framework/blazor.webassembly.js',
            '/Deployment/_framework/blazor.boot.json'
        ];

        await Promise.allSettled(assets.map(url => cache.add(url)));
       await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('/Deployment/')) {
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
                .catch(() => caches.match('/Deployment/index.html'))
        );
    }
});