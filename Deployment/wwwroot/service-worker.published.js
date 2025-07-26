// Critical fix for GitHub Pages deployment
self.importScripts('./service-worker-assets.js');
self.addEventListener('install', event => event.waitUntil(onInstall(event)));
self.addEventListener('activate', event => event.waitUntil(onActivate(event)));
self.addEventListener('fetch', event => event.respondWith(onFetch(event)));

const cacheNamePrefix = 'deployment-cache-';
const cacheName = `${cacheNamePrefix}${self.assetsManifest.version}`;
const offlineAssetsInclude = [ /\.dll$/, /\.pdb$/, /\.wasm/, /\.html/, /\.js$/, /\.json$/, /\.css$/, /\.woff$/, /\.png$/, /\.jpe?g$/, /\.gif$/, /\.ico$/, /\.blat$/, /\.dat$/, /\.webmanifest$/ ];
const offlineAssetsExclude = [ /^service-worker\.js$/ ];

async function onInstall(event) {
    console.info('SW: Installing with assets:', self.assetsManifest.assets.length);

    const assetsRequests = self.assetsManifest.assets
        .filter(asset => offlineAssetsInclude.some(pattern => pattern.test(asset.url)))
        .filter(asset => !offlineAssetsExclude.some(pattern => pattern.test(asset.url)))
        .map(asset => new Request(asset.url, { integrity: asset.hash, cache: 'no-cache' }));

    console.info('SW: Caching', assetsRequests.length, 'assets');
    const cache = await caches.open(cacheName);
    await cache.addAll(assetsRequests);

    // Critical: Cache counter page
    await cache.add('/Deployment/counter');
}

async function onActivate(event) {
    console.info('SW: Activate');
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys
        .filter(key => key.startsWith(cacheNamePrefix) && key !== cacheName)
        .map(key => caches.delete(key)));
}

async function onFetch(event) {
    if (event.request.method !== 'GET') {
        return fetch(event.request);
    }

    const cache = await caches.open(cacheName);
    let cachedResponse = await cache.match(event.request);

    if (cachedResponse) {
        console.log('SW: Cache hit:', event.request.url);
        return cachedResponse;
    }

    // Navigation fallback to index.html
    if (event.request.mode === 'navigate') {
        cachedResponse = await cache.match('/Deployment/index.html');
        if (cachedResponse) {
            console.log('SW: Navigation fallback');
            return cachedResponse;
        }
    }

    // Network with cache fallback
    try {
        const response = await fetch(event.request);
        if (response.ok) {
            cache.put(event.request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('SW: Network failed:', event.request.url);
        return new Response('Offline', { status: 503 });
    }
}