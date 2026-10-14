"use client";

import { useEffect, useState } from "react";
import {
  chunkReloadStorageKey,
  decideChunkRecovery,
  isChunkLoadFailure,
  readChunkDeploymentId,
} from "@/lib/client/chunk-recovery";

/**
 * Replaces Next.js DefaultGlobalError so production never hides the real
 * exception behind "This page couldn't load" with no details.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [recovery, setRecovery] = useState<"reload" | "offline" | "manual" | "ignore">("ignore");
  const [showLive, setShowLive] = useState(false);

  useEffect(() => {
    console.error("[global-error]", {
      name: error.name,
      message: error.message,
      digest: error.digest,
    });

    const chunk = isChunkLoadFailure(error);
    if (!chunk || typeof window === "undefined") return;
    const deploymentId =
      readChunkDeploymentId(error.message) || document.body?.dataset.deploymentId?.trim() || null;
    setShowLive(window.location.pathname.includes("/live"));
    let attempted = false;
    try {
      attempted = sessionStorage.getItem(chunkReloadStorageKey(deploymentId, window.location.pathname)) === "1";
    } catch {
      attempted = false;
    }
    const decision = decideChunkRecovery({
      isChunkError: true,
      online: navigator.onLine,
      alreadyAttempted: attempted,
    });
    setRecovery(decision);
    if (decision !== "reload") return;
    try {
      sessionStorage.setItem(chunkReloadStorageKey(deploymentId, window.location.pathname), "1");
    } catch {
      /* continue */
    }
    window.location.reload();
  }, [error]);

  const chunkMessage =
    recovery === "offline"
      ? "You appear to be offline. Reconnect, then reload this page."
      : recovery === "manual"
        ? "This page is still missing a file from the latest deploy. Reload once you are back online."
        : null;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          background: "#f7f7f8",
          color: "#18181b",
          padding: 24,
        }}
      >
        <div
          role="alert"
          style={{
            width: "100%",
            maxWidth: 560,
            borderRadius: 16,
            border: "1px solid #e4e4e7",
            background: "#fff",
            padding: 24,
            boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            This page couldn’t load
          </h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#52525b" }}>
            {chunkMessage || "This page hit a problem while loading. You can reload without losing your place."}
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: 8,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                color: "#a1a1aa",
              }}
            >
              Ref: {error.digest}
            </p>
          ) : null}
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 10,
                border: 0,
                background: "#18181b",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
            <button
              type="button"
              onClick={reset}
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 10,
                border: "1px solid #e4e4e7",
                background: "#fff",
                color: "#18181b",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {showLive ? (
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/communities/live";
                }}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 10,
                  border: "1px solid #e4e4e7",
                  background: "#fff",
                  color: "#18181b",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Open Live
              </button>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}
