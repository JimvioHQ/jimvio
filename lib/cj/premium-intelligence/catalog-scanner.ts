/**
 * Full Catalog Scanner — continuously evaluates the entire imported CJ catalog.
 * Runs in background batches; resumes after restart via cj_catalog_scan_state.
 */

import { getCatalogDB } from "./db";
import { triggerAutoPublishEvaluation } from "./auto-publish-trigger";
import { computeAutoPublishAnalytics } from "./auto-publish-analytics";
import { invalidateCatalogCache } from "./catalog-cache";

const DEFAULT_BATCH_SIZE = 200;
const MIN_BATCH = 100;
const MAX_BATCH = 300;

export interface CatalogScannerResult {
  batchSize: number;
  evaluated: number;
  queued: number;
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

async function syncPublishLink(pid: string, productId: string | null): Promise<void> {
  if (!productId) return;
  const db = getCatalogDB();

  const { data: product } = await db
    .from("products")
    .select("status, is_active, published_by_admin_override")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return;

  await db
    .from("cj_product_intelligence")
    .update({
      linked_product_id: productId,
      is_published_active:
        product.status === "active" && product.is_active === true,
      is_admin_override: Boolean(product.published_by_admin_override),
      updated_at: new Date().toISOString(),
    })
    .eq("pid", pid);
}

/**
 * Evaluate one batch of products: 8 Auto Publish rules → intelligence → queue READY.
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
    cycleNumber: 1,
    totalScanned: 0,
    cycleComplete: false,
    lastPid: "",
    durationMs: Date.now() - start,
  };

  if (!(await isScannerSchemaReady())) {
    return empty;
  }

  const state = await getScanState();
  const pids = await fetchNextBatch(state.last_pid, size);

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
  const db = getCatalogDB();
  const now = new Date().toISOString();

  for (const pid of pids) {
    const result = await triggerAutoPublishEvaluation(pid, "signal_recalc");
    evaluated += 1;
    if (result.queued) queued += 1;

    if (result.productId) {
      await syncPublishLink(pid, result.productId);
    }

    await db
      .from("cj_product_intelligence")
      .update({ last_scanned_at: now })
      .eq("pid", pid);
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
    invalidateCatalogCache();
    await computeAutoPublishAnalytics().catch(() => {});
  }

  return {
    batchSize: evaluated,
    evaluated,
    queued,
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
}> {
  if (!(await isScannerSchemaReady())) {
    return {
      lastPid: "",
      cycleNumber: 0,
      totalScanned: 0,
      lastBatchAt: null,
      status: "schema_missing",
    };
  }

  const db = getCatalogDB();
  const { data } = await db
    .from("cj_catalog_scan_state")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  return {
    lastPid: (data?.last_pid as string) ?? "",
    cycleNumber: Number(data?.cycle_number) || 0,
    totalScanned: Number(data?.total_scanned) || 0,
    lastBatchAt: (data?.last_batch_at as string) ?? null,
    status: (data?.status as string) ?? "idle",
  };
}
