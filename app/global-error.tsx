"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    console.error("[global-error]", {
      name: error.name,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });

    const chunk =
      error.name === "ChunkLoadError" ||
      /Loading chunk|Failed to fetch dynamically imported module|ChunkLoadError/i.test(
        error.message || ""
      );
    if (!chunk || typeof window === "undefined") return;
    try {
      const key = "jimvio-chunk-reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    } catch {
      /* ignore */
    }
  }, [error]);

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
            {error.message || "An unexpected client error stopped this page."}
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
          {error.stack ? (
            <pre
              style={{
                marginTop: 12,
                maxHeight: 220,
                overflow: "auto",
                borderRadius: 8,
                background: "#18181b",
                color: "#fafafa",
                fontSize: 11,
                lineHeight: 1.45,
                padding: 12,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {error.stack}
            </pre>
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
          </div>
        </div>
      </body>
    </html>
  );
}
