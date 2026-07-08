/**
 * Marketplace Maintenance v5 — self-healing, duplicates, stuck jobs, index refresh.
 */

import { getCatalogDB } from "./db";
import { refreshSearchIndexBatch } from "./search-index";
import { invalidateCatalogCache } from "./catalog-cache";
import { logAutoPublishEvent } from "./auto-publish-events";
import { runStockHealthMonitor } from "./auto-unpublish-monitor";
import { restoreAggressiveUnpublishes, fixMisalignedLiveIntelligence } from "./marketplace-restore";
import { realignPendingEnrichmentStatus, resetStuckEnrichmentJobs } from "./catalog-repository";

const STUCK_PROCESSING_MS = 15 * 60_000;

export interface MarketplaceMaintenanceResult {
  restored: number;
  intelligenceFixed: number;
  stuckQueueReset: number;
  stuckSignalReset: number;
  duplicateRowsRemoved: number;
  searchIndexed: number;
  unpublish: { scanned: number; unpublished: number };
  analyticsRefreshed: boolean;
  filtersRefreshed: boolean;
  durationMs: number;
}

async function resetStuckAutoPublishJobs(): Promise<number> {
  const db = getCatalogDB();
  const cutoff = new Date(Date.now() - STUCK_PROCESSING_MS).toISOString();

  const { data } = await db
    .from("cj_auto_publish_queue")
    .update({
      status: "pending",
      next_attempt_at: new Date().toISOString(),
      last_error: "Reset from stuck processing",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .lt("updated_at", cutoff)
    .select("id");

  return data?.length ?? 0;
}

async function resetStuckSignalJobs(): Promise<number> {
  try {
    const db = getCatalogDB();
    const cutoff = new Date(Date.now() - STUCK_PROCESSING_MS).toISOString();

    const { data } = await db
      .from("cj_signal_watch_queue")
      .update({
        status: "pending",
        next_attempt_at: new Date().toISOString(),
        last_error: "Reset from stuck processing",
        updated_at: new Date().toISOString(),
      })
      .eq("status", "processing")
      .lt("updated_at", cutoff)
      .select("pid");

    return data?.length ?? 0;
  } catch {
    return 0;
  }
}

async function removeDuplicateQueueEntries(): Promise<number> {
  const db = getCatalogDB();
  const { data: dupes } = await db
    .from("cj_auto_publish_queue")
    .select("pid, id, status, created_at")
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true });

  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (const row of dupes ?? []) {
    const pid = row.pid as string;
    if (seen.has(pid)) {
      toDelete.push(row.id as string);
    } else {
      seen.add(pid);
    }
  }

  if (toDelete.length === 0) return 0;

  const { data: deleted } = await db
    .from("cj_auto_publish_queue")
    .delete()
    .in("id", toDelete.slice(0, 100))
    .select("id");

  return deleted?.length ?? 0;
}

export async function runMarketplaceMaintenance(): Promise<MarketplaceMaintenanceResult> {
  const start = Date.now();
  const result: MarketplaceMaintenanceResult = {
    restored: 0,
    intelligenceFixed: 0,
    stuckQueueReset: 0,
    stuckSignalReset: 0,
    duplicateRowsRemoved: 0,
    searchIndexed: 0,
    unpublish: { scanned: 0, unpublished: 0 },
    analyticsRefreshed: false,
    filtersRefreshed: false,
    durationMs: 0,
  };

  const restoreResult = await restoreAggressiveUnpublishes(200);
  result.restored = restoreResult.restored;
  result.intelligenceFixed = restoreResult.intelligenceFixed;

  await realignPendingEnrichmentStatus(500);
  await resetStuckEnrichmentJobs();

  const misaligned = await fixMisalignedLiveIntelligence(200);
  result.intelligenceFixed += misaligned.fixed;

  result.stuckQueueReset = await resetStuckAutoPublishJobs();
  result.stuckSignalReset = await resetStuckSignalJobs();
  result.duplicateRowsRemoved = await removeDuplicateQueueEntries();

  const indexBatch = await refreshSearchIndexBatch("", 300);
  result.searchIndexed = indexBatch.indexed;

  const unpublish = await runStockHealthMonitor();
  result.unpublish = { scanned: unpublish.scanned, unpublished: unpublish.unpublished };

  try {
    invalidateCatalogCache();
    result.analyticsRefreshed = true;
    result.filtersRefreshed = true;
  } catch {
    // optional
  }

  await logAutoPublishEvent({
    eventType: "catalog_cleanup",
    failureReasons: [
      `Restored ${result.restored} products, fixed ${result.intelligenceFixed} intelligence rows`,
      `Maintenance: reset ${result.stuckQueueReset} stuck publish jobs`,
      `Indexed ${result.searchIndexed} search rows`,
      `Unpublished ${result.unpublish.unpublished}`,
    ],
  });

  result.durationMs = Date.now() - start;
  return result;
}
