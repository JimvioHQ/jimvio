"use client";

import { useEffect } from "react";
import { captureProductionException } from "@/lib/ops/monitoring-client";

function track(eventName: string, properties: Record<string, unknown> = {}) {
  void fetch("/api/growth/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventName, properties }),
    keepalive: true,
  }).catch(() => undefined);
}

/** Client crash + unhandled rejection capture for soft launch reliability. */
export function CrashAnalytics() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event.message || "window.error";
      captureProductionException(event.error ?? message, {
        source: "window.error",
        filename: event.filename,
        lineno: event.lineno,
      });
      track("growth.client_error", {
        message: String(message).slice(0, 500),
        filename: event.filename || null,
        lineno: event.lineno ?? null,
        path: window.location.pathname,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "unhandledrejection";
      captureProductionException(reason, { source: "unhandledrejection" });
      track("growth.client_crash", {
        message: String(message).slice(0, 500),
        path: window.location.pathname,
      });
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
