/* Jimvio PWA service worker — DISABLED (v3)
 *
 * Root cause (P0 Live): cache-first interception of Next static chunks and
 * document navigations caused ChunkLoadError / failed soft navigations.
 * Next.js then renders DefaultGlobalError: "This page couldn't load".
 *
 * This worker clears all caches and unregisters itself. Do not re-enable
 * fetch caching until a Workbox strategy keyed by build ID is in place.
 */
const VERSION = "v3-disabled";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        try {
          client.postMessage({ type: "SW_DISABLED", version: VERSION });
        } catch {
          /* ignore */
        }
      }
    })()
  );
});

// Intentionally no fetch handler — never intercept navigations or chunks.
