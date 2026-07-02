import type { EnrichedProduct } from "./types";
import { deliveryDays, productHasVideo } from "./product-utils";

export interface PublishCheckResult {
  eligible: boolean;
  reasons: string[];
}

export interface AutoPublishRules {
  minHealthScore: number;
  minMargin: number;
  maxShippingDays: number;
  requireVerified: boolean;
  requireImages: boolean;
  requireDescription: boolean;
}

export const DEFAULT_AUTO_PUBLISH_RULES: AutoPublishRules = {
  minHealthScore: 90,
  minMargin: 30,
  maxShippingDays: 10,
  requireVerified: true,
  requireImages: true,
  requireDescription: true,
};

export type PublishVisibility = "public" | "hidden" | "scheduled";

export interface PublishSummary {
  published: number;
  drafted: number;
  skipped: number;
  skipReasons: Record<string, number>;
}

export function checkPublishEligibility(
  product: EnrichedProduct
): PublishCheckResult {
  const reasons: string[] = [];
  const { intelligence: intel } = product;

  if (intel.healthScore < 80) reasons.push("Low health score");
  if (!product.bigImage?.startsWith("http")) reasons.push("Missing images");
  if (!product.threeCategoryName && !product.categoryName)
    reasons.push("Missing description");
  if ((product.warehouseInventoryNum ?? 0) <= 0) reasons.push("No stock");
  if (!product.deliveryCycle) reasons.push("Missing shipping information");

  return { eligible: reasons.length === 0, reasons };
}

export function checkAutoPublishRules(
  product: EnrichedProduct,
  rules: AutoPublishRules
): boolean {
  const { intelligence: intel } = product;
  const days = deliveryDays(product) ?? 99;

  if (intel.healthScore < rules.minHealthScore) return false;
  if (intel.profit.marginPercent < rules.minMargin) return false;
  if (days > rules.maxShippingDays) return false;
  if (rules.requireVerified && product.verifiedWarehouse !== 1) return false;
  if (rules.requireImages && !product.bigImage?.startsWith("http")) return false;
  if (
    rules.requireDescription &&
    !product.threeCategoryName &&
    !product.categoryName
  )
    return false;

  return true;
}

export function shouldPublishProduct(
  product: EnrichedProduct,
  mode: "draft" | "publish" | "auto",
  autoRules: AutoPublishRules
): { action: "publish" | "draft" | "skip"; reasons: string[] } {
  if (mode === "draft") return { action: "draft", reasons: [] };

  const eligibility = checkPublishEligibility(product);

  if (mode === "publish") {
    if (eligibility.eligible) return { action: "publish", reasons: [] };
    return { action: "draft", reasons: eligibility.reasons };
  }

  // auto mode
  if (checkAutoPublishRules(product, autoRules)) {
    return { action: "publish", reasons: [] };
  }
  return { action: "draft", reasons: ["Did not meet auto-publish rules"] };
}

export function aggregateSkipReasons(
  items: Array<{ reasons: string[] }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    for (const r of item.reasons) {
      counts[r] = (counts[r] ?? 0) + 1;
    }
  }
  return counts;
}

export interface ImportQueueState {
  active: boolean;
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  published: number;
  drafted: number;
  skipped: number;
  currentName?: string;
  startTime?: number;
}

export function createQueueState(total: number): ImportQueueState {
  return {
    active: true,
    total,
    completed: 0,
    succeeded: 0,
    failed: 0,
    published: 0,
    drafted: 0,
    skipped: 0,
    startTime: Date.now(),
  };
}

export function estimateEtaSeconds(
  queue: ImportQueueState,
  avgSecondsPerItem = 4
): number {
  const remaining = queue.total - queue.completed;
  return remaining * avgSecondsPerItem;
}

export function formatEta(seconds: number): string {
  if (seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function queueProgress(queue: ImportQueueState): number {
  if (queue.total === 0) return 0;
  return Math.round((queue.completed / queue.total) * 100);
}

/** Video-ready products for priority badge */
export function isVideoReady(product: EnrichedProduct): boolean {
  return productHasVideo(product);
}
