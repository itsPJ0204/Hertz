const CACHE_NAME = 'syncbeat-pwa-cache-v1';

// We do not cache everything because we want the app to primarily be online and use real data.
// We just cache a minimal skeleton or completely bypass the cache, fetching directly from the network.
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the waiting service worker to become the active service worker.
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim()); // Claim all clients immediately so we don't need a page reload.
});

self.addEventListener('fetch', (event) => {
    // For a simple PWA installable experience without breaking any Next.js/Supabase APIs,
    // we use a "Network First" approach or even direct network fallback.

    // We only handle GET requests
    if (event.request.method !== 'GET') return;

    // Do not cache API routes, supabase requests, or stream endpoints to guarantee no online-features break
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            // If offline, we could serve a fallback offline page, but right now we simply fail gracefully.
            return caches.match(event.request);
        })
    );
});
