/* Jimvio PWA service worker */
const VERSION = "v1";
const STATIC_CACHE = `jimvio-static-${VERSION}`;
const RUNTIME_CACHE = `jimvio-runtime-${VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_URLS).catch(() => {});
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/logos/") ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests over http(s)
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API or auth routes — always go to network
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Navigations: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline ?? Response.error();
        }
      })()
    );
    return;
  }

  // Static assets: cache-first, then network (and cache it)
  if (isCacheableAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch {
          return cached ?? Response.error();
        }
      })()
    );
  }
});
