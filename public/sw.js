// Jemanews service worker (hand-rolled).
// - App shell precache + safe runtime caching (offline shell fallback)
// - Web Push: renders daily-brief notifications, opens the app on tap.

const VERSION = 'jemanews-v1';
const PRECACHE = ["/", "/manifest.json", "/favicon.ico", "/web-app-manifest-192x192.png"];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(VERSION);
            await cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))).catch(() => {});
            await self.skipWaiting();
        })()
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Navigations: network first, fall back to cached shell offline
    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    const res = await fetch(request);
                    const cache = await caches.open(VERSION);
                    cache.put(request, res.clone()).catch(() => {});
                    return res;
                } catch {
                    const cached = await caches.match(request);
                    return cached || caches.match('/');
                }
            })()
        );
        return;
    }

    // Static assets: cache first
    if (/\.(png|ico|svg|css|js|woff2?)$/.test(url.pathname)) {
        event.respondWith(
            (async () => {
                const cached = await caches.match(request);
                if (cached) return cached;
                const res = await fetch(request);
                const cache = await caches.open(VERSION);
                cache.put(request, res.clone()).catch(() => {});
                return res;
            })()
        );
    }
});

self.addEventListener('push', (event) => {
    let data = { title: 'Jemanews', body: "Today's briefing is ready", url: '/?tab=brief' };
    try {
        if (event.data) {
            const parsed = event.data.json();
            data = { ...data, ...parsed };
        }
    } catch {
        // keep defaults
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/web-app-manifest-192x192.png',
            badge: '/web-app-manifest-192x192.png',
            data: { url: data.url || '/?tab=brief' },
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/?tab=brief';
    event.waitUntil(
        (async () => {
            const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of windows) {
                if ('focus' in client) {
                    await client.focus();
                    if ('navigate' in client) {
                        await client.navigate(url);
                    }
                    return;
                }
            }
            await self.clients.openWindow(url);
        })()
    );
});
