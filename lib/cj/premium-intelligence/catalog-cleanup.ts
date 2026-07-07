/**
 * Catalog Cleanup v3 — daily maintenance.
 */

import { getCatalogDB } from "./db";
import { logAutoPublishEvent } from "./auto-publish-events";

export interface CatalogCleanupResult {
  staleQueueCleared: number;
  deadEventsPruned: number;
  orphanDuplicatesRemoved: number;
}

export async function runCatalogCleanup(): Promise<CatalogCleanupResult> {
  const db = getCatalogDB();
  const result: CatalogCleanupResult = {
    staleQueueCleared: 0,
    deadEventsPruned: 0,
    orphanDuplicatesRemoved: 0,
  };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const { data: staleQueue } = await db
    .from("cj_auto_publish_queue")
    .delete()
    .eq("status", "complete")
    .lt("updated_at", sevenDaysAgo)
    .select("id");

  result.staleQueueCleared = staleQueue?.length ?? 0;

  const { data: pruned } = await db
    .from("cj_auto_publish_events")
    .delete()
    .lt("created_at", thirtyDaysAgo)
    .select("id");

  result.deadEventsPruned = pruned?.length ?? 0;

  await logAutoPublishEvent({
    eventType: "catalog_cleanup",
    failureReasons: [
      `Cleared ${result.staleQueueCleared} stale queue items`,
      `Pruned ${result.deadEventsPruned} old events`,
    ],
  });

  return result;
}
