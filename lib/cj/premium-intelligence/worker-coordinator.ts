/**
 * Heavy-worker coordination — one heavy CJ task at a time, enrichment checkpoints, metrics.
 * Uses existing tables only (cj_catalog_sync_runs, cj_watcher_state).
 */

import { getCatalogDB } from "./db";
import { finishSyncRun, startSyncRun } from "./catalog-repository";

/** Valid cj_catalog_sync_runs.job_type values (see migration 065). */
const HEAVY_JOB_TYPES = [
  "enrichment",
  "list_sync",
  "stock_refresh",
  "price_refresh",
  "shipping_refresh",
  "score_recalc",
] as const;

const DEFAULT_STALE_MS = 310_000; // slightly above Vercel 300s limit
const CHECKPOINT_ROW_ID = "enrichment_checkpoint";
const LIST_SYNC_ROW_ID = "list_sync_checkpoint";

export type HeavyWorkerLockResult =
  | { acquired: true; runId: string | null }
  | { acquired: false; reason: string; activeJob?: string };

export type EnrichmentCheckpoint = {
  lastPid: string;
  batchCompleted: number;
  remainingEstimate: number;
  updatedAt: string | null;
};

export type EnrichmentRunMetrics = {
  batchSize: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  remainingEstimate: number;
  queueLength: number;
  cjRequestsPerSec: number;
  rateLimit429Count: number;
  timeoutExit: boolean;
  avgEnrichmentMs: number;
  checkpointPid: string;
};

async function releaseStaleRunningLocks(staleBefore: string): Promise<void> {
  const db = getCatalogDB();
  await db
    .from("cj_catalog_sync_runs")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: "Stale worker lock released",
    })
    .eq("status", "running")
    .lt("started_at", staleBefore);
}

/** Only one heavy CJ worker may run at a time across all crons. */
export async function tryAcquireHeavyWorkerLock(
  jobType: string,
  options?: { staleMs?: number; metadata?: Record<string, unknown> }
): Promise<HeavyWorkerLockResult> {
  const staleMs = options?.staleMs ?? DEFAULT_STALE_MS;
  const staleBefore = new Date(Date.now() - staleMs).toISOString();
  const db = getCatalogDB();

  await releaseStaleRunningLocks(staleBefore);

  const { data: active } = await db
    .from("cj_catalog_sync_runs")
    .select("id, job_type, started_at")
    .eq("status", "running")
    .in("job_type", [...HEAVY_JOB_TYPES])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) {
    return {
      acquired: false,
      reason: "Another heavy worker is active",
      activeJob: active.job_type as string,
    };
  }

  const runId = await startSyncRun(jobType);
  if (runId && options?.metadata) {
    await db
      .from("cj_catalog_sync_runs")
      .update({ metadata: options.metadata })
      .eq("id", runId);
  }

  return { acquired: true, runId };
}

export async function releaseHeavyWorkerLock(
  runId: string | null,
  result: {
    status: "success" | "partial" | "failed";
    total_fetched?: number;
    total_saved?: number;
    total_errors?: number;
    error_message?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await finishSyncRun(runId, result);
}

async function ensureCheckpointRow(): Promise<void> {
  const db = getCatalogDB();
  await db
    .from("cj_watcher_state")
    .upsert(
      {
        id: CHECKPOINT_ROW_ID,
        last_raw_pid: "",
        last_list_sync_page: 0,
        products_watched: 0,
        signals_detected: 0,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
}

export async function getEnrichmentCheckpoint(): Promise<EnrichmentCheckpoint> {
  await ensureCheckpointRow();
  const db = getCatalogDB();
  const { data } = await db
    .from("cj_watcher_state")
    .select("last_raw_pid, last_list_sync_page, products_watched, updated_at")
    .eq("id", CHECKPOINT_ROW_ID)
    .maybeSingle();

  return {
    lastPid: (data?.last_raw_pid as string) ?? "",
    batchCompleted: Number(data?.last_list_sync_page) || 0,
    remainingEstimate: Number(data?.products_watched) || 0,
    updatedAt: (data?.updated_at as string) ?? null,
  };
}

export async function saveEnrichmentCheckpoint(
  lastPid: string,
  batchCompleted: number,
  remainingEstimate: number
): Promise<void> {
  await ensureCheckpointRow();
  const db = getCatalogDB();
  await db
    .from("cj_watcher_state")
    .update({
      last_raw_pid: lastPid,
      last_list_sync_page: batchCompleted,
      products_watched: remainingEstimate,
      last_run_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", CHECKPOINT_ROW_ID);
}

export async function resetEnrichmentCheckpoint(): Promise<void> {
  await saveEnrichmentCheckpoint("", 0, 0);
}

/** Next CJ list page to fetch. Stored on its own watcher row so enrichment cursors stay intact. */
export async function getListSyncPage(): Promise<number> {
  const db = getCatalogDB();
  await db.from("cj_watcher_state").upsert(
    {
      id: LIST_SYNC_ROW_ID,
      last_raw_pid: "",
      last_list_sync_page: 1,
      products_watched: 0,
      signals_detected: 0,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  const { data } = await db
    .from("cj_watcher_state")
    .select("last_list_sync_page")
    .eq("id", LIST_SYNC_ROW_ID)
    .maybeSingle();
  const page = Number(data?.last_list_sync_page) || 1;
  return page < 1 ? 1 : page;
}

export async function saveListSyncPage(page: number): Promise<void> {
  const db = getCatalogDB();
  const next = page < 1 ? 1 : page;
  await db.from("cj_watcher_state").upsert(
    {
      id: LIST_SYNC_ROW_ID,
      last_list_sync_page: next,
      last_run_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}

export async function countPendingEnrichmentQueue(): Promise<number> {
  const db = getCatalogDB();
  const { count } = await db
    .from("cj_enrichment_queue")
    .select("pid", { count: "exact", head: true })
    .in("status", ["pending", "failed"]);
  return count ?? 0;
}

export async function getActiveHeavyWorkerJob(): Promise<string | null> {
  const db = getCatalogDB();
  const staleBefore = new Date(Date.now() - DEFAULT_STALE_MS).toISOString();
  await releaseStaleRunningLocks(staleBefore);

  const { data: active } = await db
    .from("cj_catalog_sync_runs")
    .select("job_type")
    .eq("status", "running")
    .in("job_type", [...HEAVY_JOB_TYPES])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (active?.job_type as string) ?? null;
}
