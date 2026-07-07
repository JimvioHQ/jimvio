/**
 * Signal Recalc — immediate re-evaluation when product signals change.
 */

import { getCatalogDB } from "./db";
import { triggerAutoPublishEvaluation, type TriggerReason } from "./auto-publish-trigger";
import { triggerAutoPublishFromWorker } from "./auto-publish-worker";

export interface SignalRecalcResult {
  scanned: number;
  reevaluated: number;
  queued: number;
  published: number;
}

const SIGNAL_TO_REASON: Record<string, TriggerReason> = {
  video: "video_change",
  supplier: "supplier_change",
  stock: "stock_change",
  images: "images_change",
  description: "description_change",
  shipping: "shipping_change",
  trending: "trending_change",
};

/**
 * Re-evaluate specific PIDs after a signal change and queue/publish if READY.
 */
export async function recalcAutoPublishForPids(
  pids: string[],
  signal: keyof typeof SIGNAL_TO_REASON
): Promise<SignalRecalcResult> {
  const reason = SIGNAL_TO_REASON[signal] ?? "signal_recalc";
  let reevaluated = 0;
  let queued = 0;

  for (const pid of pids) {
    const r = await triggerAutoPublishEvaluation(pid, reason);
    reevaluated += 1;
    if (r.queued) queued += 1;
  }

  const worker = await triggerAutoPublishFromWorker({ processQueueOnly: queued > 0 });

  return {
    scanned: pids.length,
    reevaluated,
    queued,
    published: worker.published,
  };
}

/**
 * Scan draft CJ products with recent intelligence updates and re-evaluate.
 */
export async function recalcRecentlyUpdatedProducts(
  limit = 100
): Promise<SignalRecalcResult> {
  const db = getCatalogDB();
  const since = new Date(Date.now() - 30 * 60_000).toISOString();

  const { data: rows } = await db
    .from("cj_product_intelligence")
    .select("pid")
    .eq("enrichment_status", "complete")
    .gte("last_auto_publish_check", since)
    .limit(limit);

  const pids = (rows ?? []).map((r) => r.pid as string);
  return recalcAutoPublishForPids(pids, "signal_recalc");
}
