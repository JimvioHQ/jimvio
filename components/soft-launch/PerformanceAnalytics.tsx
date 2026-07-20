"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function track(eventName: string, properties: Record<string, unknown> = {}) {
  void fetch("/api/growth/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventName, properties }),
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Performance analytics: reports LCP once per route via PerformanceObserver.
 * Complements Vercel Speed Insights with first-party KPI events.
 */
export function PerformanceAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;

    let reported = false;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime?: number };
      if (!last || reported) return;
      reported = true;
      const lcpMs = Math.round(last.startTime ?? last.duration ?? 0);
      track("growth.web_vital_lcp", {
        value: lcpMs,
        path: pathname,
        rating: lcpMs < 2000 ? "good" : lcpMs < 4000 ? "needs_improvement" : "poor",
      });
    });

    try {
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // Unsupported browsers — Speed Insights still covers RUM.
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
