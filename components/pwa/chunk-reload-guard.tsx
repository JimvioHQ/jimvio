"use client";

import { useEffect } from "react";

function isChunkFailure(reason: unknown): boolean {
  const msg =
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : String(reason ?? "");
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(
    msg
  );
}

function reloadOnce() {
  try {
    const key = "jimvio-chunk-reload";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    window.location.reload();
  } catch {
    window.location.reload();
  }
}

/** Catches ChunkLoadError outside React render (soft nav / dynamic import). */
export function ChunkReloadGuard() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isChunkFailure(event.error ?? event.message)) {
        event.preventDefault();
        reloadOnce();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkFailure(event.reason)) {
        event.preventDefault();
        reloadOnce();
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
