// Development service worker - disabled caching
const CACHE_NAME = 'blazor-offline-cache';

self.addEventListener('install', event => {
    console.log('Service worker installing...');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service worker activating...');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    // Pass through all requests in development
    event.respondWith(fetch(event.request));
});