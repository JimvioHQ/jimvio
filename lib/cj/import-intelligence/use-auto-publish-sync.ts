"use client";

import { useEffect, useRef } from "react";
import type { EnrichedProduct } from "./types";

const PERSIST_DEBOUNCE_MS = 2_000;

/** Debounced background persist of auto-publish scores — does not block catalog UI. */
export function useAutoPublishSync(products: EnrichedProduct[], enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeyRef = useRef("");

  useEffect(() => {
    if (!enabled || products.length === 0) return;

    const key = products
      .map(
        (p) =>
          `${p.pid}:${p.intelligence.autoPublish?.score ?? 0}:${p.intelligence.autoPublish?.ready ?? false}:${p.intelligence.autoPublish?.status ?? ""}`
      )
      .join("|");

    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const payload = products
        .filter((p) => p.intelligence.autoPublish)
        .slice(0, 200)
        .map((p) => ({
          pid: p.pid,
          auto_publish_ready: p.intelligence.autoPublish!.ready,
          auto_publish_score: p.intelligence.autoPublish!.score,
          auto_publish_status: p.intelligence.autoPublish!.status,
          auto_publish_failures: p.intelligence.autoPublish!.failures,
          pending_enrichment_reasons: p.intelligence.autoPublish!.pendingEnrichment,
        }));

      if (payload.length === 0) return;

      void fetch("/api/admin/cj/auto-publish/persist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      }).catch(() => {
        // Silent — client scores remain authoritative for UI
      });
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [products, enabled]);
}
