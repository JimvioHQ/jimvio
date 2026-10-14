"use client";

import { useEffect } from "react";
import {
  chunkReloadStorageKey,
  decideChunkRecovery,
  isChunkLoadFailure,
  readChunkDeploymentId,
} from "@/lib/client/chunk-recovery";

function currentDeploymentId(): string | null {
  const fromDom = document.body?.dataset.deploymentId?.trim();
  return fromDom || null;
}

function alreadyAttempted(deploymentId: string | null): boolean {
  try {
    return sessionStorage.getItem(chunkReloadStorageKey(deploymentId, window.location.pathname)) === "1";
  } catch {
    return false;
  }
}

function reloadOnce(deploymentId: string | null) {
  try {
    sessionStorage.setItem(chunkReloadStorageKey(deploymentId, window.location.pathname), "1");
  } catch {
    /* still reload once */
  }
  window.location.reload();
}

/** One reload for a stale or interrupted chunk. Further failures stay manual. */
export function ChunkReloadGuard() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const reason = event.error ?? event.message;
      if (!isChunkLoadFailure(reason)) return;
      const deploymentId =
        readChunkDeploymentId(typeof event.filename === "string" ? event.filename : null) ??
        currentDeploymentId();
      const decision = decideChunkRecovery({
        isChunkError: true,
        online: navigator.onLine,
        alreadyAttempted: alreadyAttempted(deploymentId),
      });
      if (decision !== "reload") return;
      event.preventDefault();
      reloadOnce(deploymentId);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadFailure(event.reason)) return;
      const deploymentId = currentDeploymentId();
      const decision = decideChunkRecovery({
        isChunkError: true,
        online: navigator.onLine,
        alreadyAttempted: alreadyAttempted(deploymentId),
      });
      if (decision !== "reload") return;
      event.preventDefault();
      reloadOnce(deploymentId);
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
