const CACHE_NAME = 'toolzo-v1';
const ASSETS = [
    './',
    './index.html',
    './pdf-tools.html',
    './calculators.html',
    './productivity.html',
    './book-writer.html',
    './css/base.css',
    './css/bento.css',
    './css/home.css',
    './css/workspace.css',
    './css/book-writer.css',
    './js/main.js',
    './js/home.js',
    './js/pdf-tools.js',
    './js/calc-tools.js',
    './js/prod-tools.js',
    './js/book-writer.js',
    './manifest.json',
    './robots.txt',
    './sitemap.xml',
    './assets/icons/icon-192.svg',
    './assets/icons/icon-512.svg',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/favicon.svg',
    './favicon.ico',
    './favicon-32.png',
    './apple-touch-icon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    // Skip non-cacheable requests
    if (event.request.url.includes('chrome-extension') || event.request.url.includes('chrome://')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                const networked = fetch(event.request)
                    .then(response => {
                        if (response.ok && response.type === 'basic') {
                            const clone = response.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, clone);
                            });
                        }
                        return response;
                    })
                    .catch(() => cached);
                return cached || networked;
            })
    );
});
