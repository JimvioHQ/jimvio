"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CJIntelligencePayload } from "./enrichment-types";
import {
  getBulkCachedIntelligence,
} from "./enrichment-cache";
import {
  IntelligenceEnrichmentQueue,
} from "./enrichment-queue";

export function useLazyCjEnrichment(enabled: boolean) {
  const [enrichmentMap, setEnrichmentMap] = useState<
    Record<string, CJIntelligencePayload>
  >({});
  const [version, setVersion] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const queueRef = useRef<IntelligenceEnrichmentQueue | null>(null);

  useEffect(() => {
    if (!enabled) return;

    queueRef.current = new IntelligenceEnrichmentQueue((pid, data) => {
      if (data) {
        setEnrichmentMap((prev) => ({ ...prev, [pid]: data }));
      }
      setVersion((v) => v + 1);
      setPendingCount(queueRef.current?.pendingCount ?? 0);
    });

    return () => {
      queueRef.current?.destroy();
      queueRef.current = null;
    };
  }, [enabled]);

  const hydrateFromCache = useCallback((pids: string[]) => {
    const bulk = getBulkCachedIntelligence(pids);
    if (Object.keys(bulk).length === 0) return;
    setEnrichmentMap((prev) => ({ ...prev, ...bulk }));
    setVersion((v) => v + 1);
  }, []);

  const scheduleVisible = useCallback(
    (pids: string[]) => {
      if (!enabled || pids.length === 0) return;
      hydrateFromCache(pids);
      queueRef.current?.scheduleVisible(pids);
      setPendingCount(queueRef.current?.pendingCount ?? 0);
    },
    [enabled, hydrateFromCache]
  );

  const reset = useCallback(() => {
    setEnrichmentMap({});
    setVersion(0);
    queueRef.current?.destroy();
    queueRef.current = null;
  }, []);

  return {
    enrichmentMap,
    version,
    pendingCount,
    scheduleVisible,
    reset,
    enrichedCount: Object.keys(enrichmentMap).length,
  };
}
