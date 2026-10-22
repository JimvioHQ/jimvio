/**
 * Full Catalog Scanner — continuously evaluates the entire imported CJ catalog.
 * Runs in background batches; resumes after restart via cj_catalog_scan_state.
 * Never stops on individual product failures — failed PIDs are retried later.
 */

import { getCatalogDB } from "./db";
import { enqueueAutoPublish } from "./auto-publish-queue";
import { computePublishDebounceMs } from "./system-publish";
import { invalidateCatalogCache } from "./catalog-cache";

const DEFAULT_BATCH_SIZE = 50;
const MIN_BATCH = 25;
const MAX_BATCH = 100;
const MAX_FAILURE_ATTEMPTS = 5;

export interface CatalogScannerResult {
  batchSize: number;
  evaluated: number;
  queued: number;
  failed: number;
  retried: number;
  cycleNumber: number;
  totalScanned: number;
  cycleComplete: boolean;
  lastPid: string;
  durationMs: number;
}

interface ScanState {
  last_pid: string;
  cycle_number: number;
  total_scanned: number;
  cycle_started_at: string;
}

async function isScannerSchemaReady(): Promise<boolean> {
  try {
    const db = getCatalogDB();
    const { error } = await db.from("cj_catalog_scan_state").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function getScanState(): Promise<ScanState> {
  const db = getCatalogDB();
  const { data, error } = await db
    .from("cj_catalog_scan_state")
    .select("last_pid, cycle_number, total_scanned, cycle_started_at")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return {
      last_pid: "",
      cycle_number: 1,
      total_scanned: 0,
      cycle_started_at: new Date().toISOString(),
    };
  }

  return {
    last_pid: (data.last_pid as string) ?? "",
    cycle_number: Number(data.cycle_number) || 1,
    total_scanned: Number(data.total_scanned) || 0,
    cycle_started_at: (data.cycle_started_at as string) ?? new Date().toISOString(),
  };
}

async function saveScanState(patch: {
  last_pid: string;
  cycle_number: number;
  total_scanned: number;
  last_batch_size: number;
  cycle_started_at?: string;
  status?: string;
}): Promise<void> {
  const db = getCatalogDB();
  await db
    .from("cj_catalog_scan_state")
    .update({
      ...patch,
      last_batch_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: patch.status ?? "idle",
    })
    .eq("id", "default");
}

async function fetchNextBatch(
  afterPid: string,
  limit: number
): Promise<string[]> {
  const db = getCatalogDB();
  let query = db
    .from("cj_raw_products")
    .select("pid")
    .order("pid", { ascending: true })
    .limit(limit);

  if (afterPid) {
    query = query.gt("pid", afterPid);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.pid as string);
}

async function fetchRetryBatch(limit: number): Promise<string[]> {
  try {
    const db = getCatalogDB();
    const { data } = await db
      .from("cj_scan_failures")
      .select("pid")
      .lte("next_retry_at", new Date().toISOString())
      .order("next_retry_at", { ascending: true })
      .limit(limit);
    return (data ?? []).map((r) => r.pid as string);
  } catch {
    return [];
  }
}

async function recordScanFailure(pid: string, error: string): Promise<void> {
  try {
    const db = getCatalogDB();
    const { data: existing } = await db
      .from("cj_scan_failures")
      .select("attempts")
      .eq("pid", pid)
      .maybeSingle();

    const attempts = (Number(existing?.attempts) || 0) + 1;
    const delayMs = Math.min(attempts * 120_000, 3_600_000);

    await db.from("cj_scan_failures").upsert(
      {
        pid,
        attempts,
        last_error: error.slice(0, 500),
        next_retry_at: new Date(Date.now() + delayMs).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pid" }
    );
  } catch {
    // table may not exist yet
  }
}

async function clearScanFailure(pid: string): Promise<void> {
  try {
    const db = getCatalogDB();
    await db.from("cj_scan_failures").delete().eq("pid", pid);
  } catch {
    // ignore
  }
}

async function syncPublishLink(pid: string, productId: string | null): Promise<void> {
  if (!productId) return;
  const db = getCatalogDB();

  const { data: product } = await db
    .from("products")
    .select("status, is_active, published_by_admin_override, auto_unpublished")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return;

  await db
    .from("cj_product_intelligence")
    .update({
      linked_product_id: productId,
      is_published_active:
        product.status === "active" &&
        product.is_active === true &&
        !product.auto_unpublished,
      is_admin_override: Boolean(product.published_by_admin_override),
      updated_at: new Date().toISOString(),
    })
    .eq("pid", pid);
}

async function evaluatePid(pid: string): Promise<{ queued: boolean }> {
  const db = getCatalogDB();
  const { data: intel } = await db
    .from("cj_product_intelligence")
    .select(
      "enrichment_status, auto_publish_ready, auto_publish_status, linked_product_id, publish_priority, duplicate_blocked"
    )
    .eq("pid", pid)
    .maybeSingle();

  const now = new Date().toISOString();

  if (intel?.enrichment_status !== "complete") {
    await db
      .from("cj_product_intelligence")
      .update({ last_scanned_at: now })
      .eq("pid", pid);
    await clearScanFailure(pid);
    return { queued: false };
  }

  if (intel.duplicate_blocked === true) {
    await db
      .from("cj_product_intelligence")
      .update({ last_scanned_at: now })
      .eq("pid", pid);
    await clearScanFailure(pid);
    return { queued: false };
  }

  let queued = false;

  if (intel.auto_publish_ready === true && intel.auto_publish_status === "READY") {
    let productId = (intel.linked_product_id as string) ?? null;

    if (!productId) {
      const { data: mapped } = await db
        .from("cj_product_map")
        .select("product_id")
        .eq("cj_pid", pid)
        .maybeSingle();
      productId = (mapped?.product_id as string) ?? null;
    }

    if (productId) {
      const { data: product } = await db
        .from("products")
        .select("status, is_active, published_by_admin_override")
        .eq("id", productId)
        .maybeSingle();

      if (
        product &&
        !product.published_by_admin_override &&
        !(product.status === "active" && product.is_active)
      ) {
        const debounceMs = computePublishDebounceMs();
        queued = await enqueueAutoPublish(
          pid,
          productId,
          Number(intel.publish_priority) || 0,
          debounceMs
        );
      }

      await syncPublishLink(pid, productId);
    }
  }

  await db
    .from("cj_product_intelligence")
    .update({ last_scanned_at: now })
    .eq("pid", pid);
  await clearScanFailure(pid);
  return { queued };
}

/**
 * Evaluate one batch of products: progressive publish rules → intelligence → queue READY.
 */
export async function runCatalogScannerBatch(
  batchSize = DEFAULT_BATCH_SIZE
): Promise<CatalogScannerResult> {
  const start = Date.now();
  const size = Math.min(MAX_BATCH, Math.max(MIN_BATCH, batchSize));

  const empty: CatalogScannerResult = {
    batchSize: 0,
    evaluated: 0,
    queued: 0,
    failed: 0,
    retried: 0,
    cycleNumber: 1,
    totalScanned: 0,
    cycleComplete: false,
    lastPid: "",
    durationMs: Date.now() - start,
  };

  const { isCjProductIntelligenceProcessingEnabled } = await import("@/lib/cj/intelligence-kill-switch");
  if (!isCjProductIntelligenceProcessingEnabled() || !(await isScannerSchemaReady())) {
    return empty;
  }

  const state = await getScanState();
  const retryPids = await fetchRetryBatch(Math.min(25, Math.floor(size / 4)));
  let pids = await fetchNextBatch(state.last_pid, size - retryPids.length);
  pids = [...new Set([...retryPids, ...pids])];

  if (pids.length === 0) {
    await saveScanState({
      last_pid: "",
      cycle_number: state.cycle_number + 1,
      total_scanned: state.total_scanned,
      last_batch_size: 0,
      cycle_started_at: new Date().toISOString(),
    });
    return {
      ...empty,
      cycleNumber: state.cycle_number + 1,
      totalScanned: state.total_scanned,
      cycleComplete: true,
    };
  }

  await saveScanState({
    last_pid: state.last_pid,
    cycle_number: state.cycle_number,
    total_scanned: state.total_scanned,
    last_batch_size: 0,
    status: "running",
  });

  let evaluated = 0;
  let queued = 0;
  let failed = 0;
  let retried = 0;

  for (const pid of pids) {
    const isRetry = retryPids.includes(pid);
    try {
      const r = await evaluatePid(pid);
      evaluated += 1;
      if (r.queued) queued += 1;
      if (isRetry) retried += 1;
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : "scan failed";
      await recordScanFailure(pid, message);
      evaluated += 1;
    }
  }

  const lastPid = pids[pids.length - 1]!;
  const cycleComplete = pids.length < size;
  const newTotal = state.total_scanned + evaluated;

  await saveScanState({
    last_pid: cycleComplete ? "" : lastPid,
    cycle_number: cycleComplete ? state.cycle_number + 1 : state.cycle_number,
    total_scanned: newTotal,
    last_batch_size: evaluated,
    cycle_started_at: cycleComplete ? new Date().toISOString() : state.cycle_started_at,
    status: "idle",
  });

  if (cycleComplete) {
    invalidateCatalogCache("filter-counts");
  }

  return {
    batchSize: evaluated,
    evaluated,
    queued,
    failed,
    retried,
    cycleNumber: cycleComplete ? state.cycle_number + 1 : state.cycle_number,
    totalScanned: newTotal,
    cycleComplete,
    lastPid,
    durationMs: Date.now() - start,
  };
}

export async function getCatalogScannerStatus(): Promise<{
  lastPid: string;
  cycleNumber: number;
  totalScanned: number;
  lastBatchAt: string | null;
  status: string;
  pendingRetries: number;
}> {
  if (!(await isScannerSchemaReady())) {
    return {
      lastPid: "",
      cycleNumber: 0,
      totalScanned: 0,
      lastBatchAt: null,
      status: "schema_missing",
      pendingRetries: 0,
    };
  }

  const db = getCatalogDB();
  const [{ data }, retryCount] = await Promise.all([
    db.from("cj_catalog_scan_state").select("*").eq("id", "default").maybeSingle(),
    (async () => {
      try {
        const { count } = await db
          .from("cj_scan_failures")
          .select("pid", { count: "exact", head: true });
        return count ?? 0;
      } catch {
        return 0;
      }
    })(),
  ]);

  return {
    lastPid: (data?.last_pid as string) ?? "",
    cycleNumber: Number(data?.cycle_number) || 0,
    totalScanned: Number(data?.total_scanned) || 0,
    lastBatchAt: (data?.last_batch_at as string) ?? null,
    status: (data?.status as string) ?? "idle",
    pendingRetries: retryCount,
  };
}
