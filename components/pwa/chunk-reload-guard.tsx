"use client";

import { useEffect } from "react";

function isChunkFailure(reason: unknown): boolean {
  const msg =
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : String(reason ?? "");
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|ChunkLoadError/i.test(
    msg
  );
}

async function clearStaleClientCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
}

function hardReloadOnce() {
  try {
    const key = "jimvio-chunk-reload";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    /* continue */
  }

  void clearStaleClientCaches().finally(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("_chunkfix", String(Date.now()));
    window.location.replace(url.toString());
  });
}

/** Catches ChunkLoadError outside React render (soft nav / dynamic import). */
export function ChunkReloadGuard() {
  useEffect(() => {
    // Successful hydration after a chunk-reload — allow future recoveries.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("_chunkfix")) {
        url.searchParams.delete("_chunkfix");
        window.history.replaceState({}, "", url.toString());
        sessionStorage.removeItem("jimvio-chunk-reload");
      }
    } catch {
      /* ignore */
    }

    const onError = (event: ErrorEvent) => {
      if (isChunkFailure(event.error ?? event.message)) {
        event.preventDefault();
        hardReloadOnce();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkFailure(event.reason)) {
        event.preventDefault();
        hardReloadOnce();
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
