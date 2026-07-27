"use client";

import { useEffect } from "react";

/**
 * P0: actively disable any previously registered Jimvio service worker.
 * Soft navigations + cache-first /_next/static caused ChunkLoadError →
 * Next.js DefaultGlobalError ("This page couldn't load") on Live.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const disable = async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch (err) {
        console.error("[PWA] Service worker unregister failed:", err);
      }
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (err) {
        console.error("[PWA] Cache clear failed:", err);
      }
      // Install kill-switch SW once so older tabs still running v1/v2 get replaced.
      if (process.env.NODE_ENV === "production") {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });
          await reg.update();
        } catch {
          /* ignore — unregister above is the critical path */
        }
      }
    };

    if (document.readyState === "complete") void disable();
    else window.addEventListener("load", () => void disable(), { once: true });
  }, []);

  return null;
}
