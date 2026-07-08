/**
 * CJ Continuous Watcher v5 — detects catalog changes and schedules re-evaluation.
 * Runs inside the 2-minute worker; webhooks enqueue immediately.
 */

import { getCatalogDB } from "./db";
import {
  scheduleSignalRecalc,
  type WatchSignal,
} from "./signal-watch";
import { enqueueEnrichment } from "./catalog-repository";
import { invalidateCatalogCache } from "./catalog-cache";

const WATCH_BATCH = 150;

export interface CjWatcherResult {
  watched: number;
  signalsDetected: number;
  enrichmentQueued: number;
  newProducts: number;
}

async function schemaReady(): Promise<boolean> {
  try {
    const db = getCatalogDB();
    const { error } = await db.from("cj_watcher_state").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function getWatcherState(): Promise<{ last_raw_pid: string }> {
  const db = getCatalogDB();
  const { data } = await db
    .from("cj_watcher_state")
    .select("last_raw_pid")
    .eq("id", "default")
    .maybeSingle();
  return { last_raw_pid: (data?.last_raw_pid as string) ?? "" };
}

async function saveWatcherState(patch: {
  last_raw_pid: string;
  watched?: number;
  signals?: number;
}): Promise<void> {
  const db = getCatalogDB();
  const { data: current } = await db
    .from("cj_watcher_state")
    .select("products_watched, signals_detected")
    .eq("id", "default")
    .maybeSingle();

  await db
    .from("cj_watcher_state")
    .update({
      last_raw_pid: patch.last_raw_pid,
      products_watched:
        (Number(current?.products_watched) || 0) + (patch.watched ?? 0),
      signals_detected:
        (Number(current?.signals_detected) || 0) + (patch.signals ?? 0),
      last_run_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default");
}

/**
 * Watch a batch of raw products — detect stock/warehouse/order changes vs intelligence.
 */
export async function runCjWatcherBatch(batchSize = WATCH_BATCH): Promise<CjWatcherResult> {
  const empty: CjWatcherResult = {
    watched: 0,
    signalsDetected: 0,
    enrichmentQueued: 0,
    newProducts: 0,
  };

  if (!(await schemaReady())) return empty;

  const db = getCatalogDB();
  const state = await getWatcherState();

  let query = db
    .from("cj_raw_products")
    .select("pid, stock, warehouse, orders, list_synced_at")
    .order("pid", { ascending: true })
    .limit(batchSize);

  if (state.last_raw_pid) {
    query = query.gt("pid", state.last_raw_pid);
  }

  const { data: rawRows, error } = await query;
  if (error || !rawRows?.length) {
    await saveWatcherState({ last_raw_pid: "" });
    return empty;
  }

  const pids = rawRows.map((r) => r.pid as string);
  const { data: intelRows } = await db
    .from("cj_product_intelligence")
    .select(
      "pid, has_video, supplier_verified, delivery_days, image_count, description_length, trending, enrichment_status, auto_publish_status, catalog_tier"
    )
    .in("pid", pids);

  const intelMap = new Map((intelRows ?? []).map((r) => [r.pid as string, r]));

  let signalsDetected = 0;
  let enrichmentQueued = 0;
  let newProducts = 0;
  const toEnrich: string[] = [];

  for (const raw of rawRows) {
    const pid = raw.pid as string;
    const intel = intelMap.get(pid);

    if (!intel) {
      newProducts += 1;
      toEnrich.push(pid);
      await scheduleSignalRecalc(pid, ["new_product"]);
      signalsDetected += 1;
      continue;
    }

    if (intel.enrichment_status === "pending" || intel.enrichment_status === "failed") {
      toEnrich.push(pid);
      continue;
    }

    const status = intel.auto_publish_status as string | undefined;
    const tier = intel.catalog_tier as string | undefined;
    const needsRecheck =
      status === "PENDING_ENRICHMENT" ||
      status === "REQUIREMENTS_MISSING" ||
      tier === "HIDDEN" ||
      tier === "PENDING";

    if (needsRecheck) {
      await scheduleSignalRecalc(pid, ["stock"]);
      signalsDetected += 1;
    }
  }

  if (toEnrich.length > 0) {
    enrichmentQueued = await enqueueEnrichment(toEnrich.slice(0, 100), 10);
  }

  const lastPid = rawRows[rawRows.length - 1]!.pid as string;
  const cycleComplete = rawRows.length < batchSize;

  await saveWatcherState({
    last_raw_pid: cycleComplete ? "" : lastPid,
    watched: rawRows.length,
    signals: signalsDetected,
  });

  if (cycleComplete) {
    invalidateCatalogCache();
  }

  return {
    watched: rawRows.length,
    signalsDetected,
    enrichmentQueued,
    newProducts,
  };
}

/** Webhook entry — schedule immediate signal recalc from changed field names. */
export async function scheduleFromWebhookFields(
  pid: string,
  fields?: string[]
): Promise<void> {
  if (!pid) return;

  const fieldSet = new Set((fields ?? []).map((f) => f.toLowerCase()));
  const signals: WatchSignal[] = [];

  if (fieldSet.has("productvideo") || fieldSet.has("video")) signals.push("video");
  if (fieldSet.has("supplier") || fieldSet.has("suppliername")) signals.push("supplier");
  if (fieldSet.has("stock") || fieldSet.has("sellstock")) signals.push("stock");
  if (fieldSet.has("productimage") || fieldSet.has("bigimage")) signals.push("images");
  if (fieldSet.has("description")) signals.push("description");
  if (fieldSet.has("deliverycycle")) signals.push("shipping");
  if (fieldSet.has("listednum") || fieldSet.has("orders")) signals.push("best_seller");
  if (fieldSet.has("warehouse") || fieldSet.has("countrycode")) signals.push("warehouse");

  if (signals.length === 0) signals.push("stock");

  await scheduleSignalRecalc(pid, [...new Set(signals)]);
  await enqueueEnrichment([pid], 100);
}

export async function scheduleProductRemoval(pid: string): Promise<void> {
  await scheduleSignalRecalc(pid, ["removed"], { priority: 9500 });
}
