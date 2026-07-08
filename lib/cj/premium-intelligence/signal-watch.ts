/**
 * Signal Watch Queue — schedules immediate re-evaluation when CJ signals change.
 */

import { getCatalogDB } from "./db";
import { computePublishPriority } from "./smart-queue-priority";
import { triggerAutoPublishEvaluation, type TriggerReason } from "./auto-publish-trigger";
import { enrichProduct } from "../import-intelligence/filters";
import { evaluateAutoPublish } from "../import-intelligence/auto-publish-engine";
import { rawRowToCJProduct } from "./map-to-cj-product";

export type WatchSignal =
  | "video"
  | "supplier"
  | "stock"
  | "images"
  | "description"
  | "shipping"
  | "trending"
  | "warehouse"
  | "new_product"
  | "removed"
  | "best_seller";

const SIGNAL_PRIORITY: Record<WatchSignal, number> = {
  new_product: 9000,
  stock: 8500,
  video: 8000,
  supplier: 7500,
  shipping: 7000,
  trending: 6500,
  best_seller: 6000,
  images: 5500,
  description: 5000,
  warehouse: 4500,
  removed: 4000,
};

const SIGNAL_REASON: Record<WatchSignal, TriggerReason> = {
  video: "video_change",
  supplier: "supplier_change",
  stock: "stock_change",
  images: "images_change",
  description: "description_change",
  shipping: "shipping_change",
  trending: "trending_change",
  warehouse: "shipping_change",
  new_product: "enrichment_complete",
  removed: "signal_recalc",
  best_seller: "signal_recalc",
};

export interface SignalWatchResult {
  processed: number;
  reevaluated: number;
  queued: number;
  failed: number;
}

async function schemaReady(): Promise<boolean> {
  try {
    const db = getCatalogDB();
    const { error } = await db.from("cj_signal_watch_queue").select("pid").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/** Schedule a product for immediate re-evaluation (idempotent upsert). */
export async function scheduleSignalRecalc(
  pid: string,
  signals: WatchSignal[],
  options?: { priority?: number }
): Promise<boolean> {
  if (!pid || signals.length === 0) return false;
  if (!(await schemaReady())) return false;

  const db = getCatalogDB();
  const signalPriority = Math.max(...signals.map((s) => SIGNAL_PRIORITY[s] ?? 0));
  const priority = options?.priority ?? signalPriority;
  const now = new Date().toISOString();

  const { error } = await db.from("cj_signal_watch_queue").upsert(
    {
      pid,
      signals,
      priority,
      status: "pending",
      next_attempt_at: now,
      updated_at: now,
    },
    { onConflict: "pid" }
  );

  return !error;
}

async function resolvePriority(pid: string, basePriority: number): Promise<number> {
  const db = getCatalogDB();
  const [{ data: raw }, { data: intel }] = await Promise.all([
    db.from("cj_raw_products").select("*").eq("pid", pid).maybeSingle(),
    db.from("cj_product_intelligence").select("*").eq("pid", pid).maybeSingle(),
  ]);
  if (!raw) return basePriority;

  const cj = rawRowToCJProduct(raw, intel);
  const enriched = enrichProduct(cj, {});
  if (intel) {
    enriched.intelligence.enrichmentStatus = intel.enrichment_status;
    enriched.intelligence.trending = intel.trending;
  }
  enriched.intelligence.autoPublish = evaluateAutoPublish(enriched);
  return Math.max(basePriority, computePublishPriority(enriched));
}

export async function processSignalWatchQueue(limit = 50): Promise<SignalWatchResult> {
  const result: SignalWatchResult = {
    processed: 0,
    reevaluated: 0,
    queued: 0,
    failed: 0,
  };

  if (!(await schemaReady())) return result;

  const db = getCatalogDB();
  const { data: jobs } = await db
    .from("cj_signal_watch_queue")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  for (const job of jobs ?? []) {
    const pid = job.pid as string;
    const signals = (job.signals as WatchSignal[]) ?? [];
    const primary = signals[0] ?? "stock";
    const reason = SIGNAL_REASON[primary] ?? "signal_recalc";

    await db
      .from("cj_signal_watch_queue")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("pid", pid);

    result.processed += 1;

    try {
      const priority = await resolvePriority(pid, Number(job.priority) || 0);
      await db.from("cj_signal_watch_queue").update({ priority }).eq("pid", pid);

      const evalResult = await triggerAutoPublishEvaluation(pid, reason);
      result.reevaluated += 1;
      if (evalResult.queued) result.queued += 1;

      await db
        .from("cj_signal_watch_queue")
        .update({
          status: "complete",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("pid", pid);
    } catch (err) {
      result.failed += 1;
      const attempts = (Number(job.attempts) || 0) + 1;
      const message = err instanceof Error ? err.message : "signal recalc failed";
      await db
        .from("cj_signal_watch_queue")
        .update({
          status: attempts >= 5 ? "failed" : "pending",
          attempts,
          last_error: message,
          next_attempt_at: new Date(Date.now() + attempts * 60_000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("pid", pid);
    }
  }

  return result;
}

export interface IntelSnapshot {
  has_video?: boolean;
  supplier_verified?: boolean;
  delivery_days?: number | null;
  image_count?: number;
  description_length?: number;
  trending?: boolean;
  stock?: number;
  warehouse?: string | null;
  orders?: number;
}

/** Compare intelligence snapshots and return changed signals. */
export function detectSignalChanges(
  before: IntelSnapshot,
  after: IntelSnapshot
): WatchSignal[] {
  const changed: WatchSignal[] = [];

  if (before.has_video !== after.has_video) changed.push("video");
  if (before.supplier_verified !== after.supplier_verified) changed.push("supplier");
  if (before.delivery_days !== after.delivery_days) changed.push("shipping");
  if (before.image_count !== after.image_count) changed.push("images");
  if (before.description_length !== after.description_length) changed.push("description");
  if (before.trending !== after.trending) changed.push("trending");
  if (before.stock !== after.stock) changed.push("stock");
  if (before.warehouse !== after.warehouse) changed.push("warehouse");
  if ((before.orders ?? 0) !== (after.orders ?? 0)) changed.push("best_seller");

  return changed;
}
