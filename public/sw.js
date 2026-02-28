const CACHE_NAME = 'syncbeat-pwa-cache-v2';
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Cache the root page so Chrome considers it installable
            return cache.addAll([
                OFFLINE_URL,
                '/manifest.json',
                '/app_icon.png'
            ]);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
        return; // Let normal network handle this
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request).then((response) => {
                if (response) {
                    return response;
                }
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
                return new Response('Network error happened', {
                    status: 408,
                    headers: { 'Content-Type': 'text/plain' },
                });
            });
        })
    );
});
