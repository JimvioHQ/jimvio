/**
 * Jimvio Auto Publish Engine v2 (Enterprise Edition)
 * Intelligence layer before publishing — does NOT modify publish pipeline.
 */

import type { CJProduct, EnrichedProduct } from "./types";
import { getDescriptionLength, getImageCount } from "./quality-engine";
import {
  deliveryDays,
  hasVariants,
  productHasVideo,
} from "./product-utils";
import { isFastShipping, isVerifiedSupplier } from "./quick-filter-intelligence";

export const AUTO_PUBLISH_SCORE_PER_REQUIREMENT = 12.5;
export const AUTO_PUBLISH_MAX_SCORE = 100;
export const AUTO_PUBLISH_MIN_IMAGES = 5;
export const AUTO_PUBLISH_MIN_DESCRIPTION_LENGTH = 80;
export const AUTO_PUBLISH_BEST_SELLING_ORDERS = 50;
export const AUTO_PUBLISH_QUEUE_BATCH_SIZE = 50;

export type AutoPublishRequirementKey =
  | "video"
  | "verified"
  | "trending"
  | "stock"
  | "variants"
  | "images"
  | "description"
  | "shipping";

export type AutoPublishStatus =
  | "READY"
  | "PENDING_ENRICHMENT"
  | "REQUIREMENTS_MISSING"
  | "PUBLISHED_BY_ADMIN";

export interface AutoPublishCheckItem {
  key: AutoPublishRequirementKey;
  emoji: string;
  label: string;
  passed: boolean;
  /** Tooltip explaining pass/fail/waiting state */
  tooltip: string;
  /** True when failure is due to missing enrichment data */
  pendingEnrichment?: boolean;
}

export interface AutoPublishDecision {
  status: "ACTIVE" | "DRAFT" | "PENDING_ENRICHMENT";
  visibility: "PUBLIC" | "PRIVATE";
  published: boolean;
}

export interface AutoPublishResult {
  ready: boolean;
  score: number;
  status: AutoPublishStatus;
  failures: string[];
  pendingEnrichment: string[];
  checks: AutoPublishCheckItem[];
  decision: AutoPublishDecision;
}

/** Priority order for failure reasons (lower index = higher priority) */
export const FAILURE_PRIORITY: AutoPublishRequirementKey[] = [
  "video",
  "verified",
  "shipping",
  "images",
  "description",
  "variants",
  "stock",
  "trending",
];

export const AUTO_PUBLISH_FAILURE_MESSAGES: Record<AutoPublishRequirementKey, string> = {
  video: "Missing Product Video",
  verified: "Supplier Not Verified",
  trending: "Product Not Trending",
  stock: "Out of Stock",
  variants: "Missing Variants",
  images: "Insufficient Images",
  description: "Incomplete Description",
  shipping: "Fast Shipping Missing",
};

export const PENDING_ENRICHMENT_MESSAGES: Partial<Record<AutoPublishRequirementKey, string>> = {
  video: "Waiting for Video",
  verified: "Waiting for Supplier Intelligence",
  images: "Waiting for Images",
  description: "Waiting for Description",
  shipping: "Waiting for Shipping",
};

const CHECK_META: Record<
  AutoPublishRequirementKey,
  { emoji: string; label: string; passTip: string; failTip: string }
> = {
  video: {
    emoji: "🎥",
    label: "Video",
    passTip: "Product has at least one valid video",
    failTip: "No valid product video found",
  },
  verified: {
    emoji: "🏆",
    label: "Supplier",
    passTip: "Supplier is verified and trusted",
    failTip: "Supplier is not verified",
  },
  trending: {
    emoji: "🔥",
    label: "Trending",
    passTip: "Product is trending or best selling",
    failTip: "Product is not trending or best selling",
  },
  stock: {
    emoji: "📦",
    label: "Stock",
    passTip: "Stock available with quantity > 0",
    failTip: "No stock available",
  },
  variants: {
    emoji: "🎨",
    label: "Variants",
    passTip: "Product has at least one variant",
    failTip: "No variants found",
  },
  images: {
    emoji: "🖼",
    label: "Images",
    passTip: "At least 5 product images",
    failTip: "Fewer than 5 images",
  },
  description: {
    emoji: "📝",
    label: "Description",
    passTip: "Description is complete",
    failTip: "Description is incomplete",
  },
  shipping: {
    emoji: "🚚",
    label: "Shipping",
    passTip: "Fast shipping available (≤7 days)",
    failTip: "Fast shipping not available",
  },
};

export function isEnrichmentComplete(product: EnrichedProduct): boolean {
  return (
    product.intelligence.enrichmentStatus === "complete" ||
    product.intelligenceEnriched === true
  );
}

export function hasValidVideo(p: CJProduct): boolean {
  return productHasVideo(p);
}

export function isSupplierVerified(p: EnrichedProduct): boolean {
  return isVerifiedSupplier(p);
}

export function isTrendingOrBestSelling(p: EnrichedProduct): boolean {
  if (p.intelligence?.trending) return true;
  return (p.listedNum ?? 0) >= AUTO_PUBLISH_BEST_SELLING_ORDERS;
}

export function hasStockAvailable(p: CJProduct): boolean {
  return (p.warehouseInventoryNum ?? 0) > 0;
}

export function hasProductVariants(p: CJProduct): boolean {
  if ((p.variantCount ?? 0) >= 1) return true;
  return hasVariants(p);
}

export function hasEnoughImages(p: CJProduct): boolean {
  return getImageCount(p) >= AUTO_PUBLISH_MIN_IMAGES;
}

export function isDescriptionComplete(p: CJProduct): boolean {
  const length = getDescriptionLength(p);
  if (length >= AUTO_PUBLISH_MIN_DESCRIPTION_LENGTH) return true;
  const hasCategory = Boolean(p.threeCategoryName?.trim() || p.categoryName?.trim());
  return hasCategory && length >= 40;
}

export function hasFastShipping(p: CJProduct): boolean {
  const days = deliveryDays(p);
  if (days === null) return false;
  return isFastShipping(p);
}

function needsEnrichmentForKey(
  product: EnrichedProduct,
  key: AutoPublishRequirementKey
): boolean {
  if (isEnrichmentComplete(product)) return false;

  switch (key) {
    case "video":
      return !productHasVideo(product) && product.isVideo !== 1;
    case "verified":
      return (
        product.verifiedWarehouse !== 1 &&
        product.supplierVerified !== true &&
        product.supplierVerified !== false
      );
    case "images":
      return getImageCount(product) < AUTO_PUBLISH_MIN_IMAGES && product.imageCount == null;
    case "description":
      return getDescriptionLength(product) < AUTO_PUBLISH_MIN_DESCRIPTION_LENGTH &&
        product.descriptionLength == null;
    case "shipping":
      return deliveryDays(product) === null;
    default:
      return false;
  }
}

function evaluateCheck(
  product: EnrichedProduct,
  key: AutoPublishRequirementKey,
  passed: boolean
): AutoPublishCheckItem {
  const meta = CHECK_META[key];
  const pending = !passed && needsEnrichmentForKey(product, key);
  const pendingMsg = PENDING_ENRICHMENT_MESSAGES[key];

  let tooltip = passed ? meta.passTip : meta.failTip;
  if (pending && pendingMsg) {
    tooltip = `${pendingMsg} — enrichment in progress`;
  }

  return {
    key,
    emoji: meta.emoji,
    label: meta.label,
    passed,
    tooltip,
    pendingEnrichment: pending,
  };
}

function buildChecks(p: EnrichedProduct): AutoPublishCheckItem[] {
  return [
    evaluateCheck(p, "video", hasValidVideo(p)),
    evaluateCheck(p, "verified", isSupplierVerified(p)),
    evaluateCheck(p, "trending", isTrendingOrBestSelling(p)),
    evaluateCheck(p, "stock", hasStockAvailable(p)),
    evaluateCheck(p, "variants", hasProductVariants(p)),
    evaluateCheck(p, "images", hasEnoughImages(p)),
    evaluateCheck(p, "description", isDescriptionComplete(p)),
    evaluateCheck(p, "shipping", hasFastShipping(p)),
  ];
}

function computeReady(checks: AutoPublishCheckItem[]): boolean {
  return (
    checks.find((c) => c.key === "video")?.passed === true &&
    checks.find((c) => c.key === "verified")?.passed === true &&
    checks.find((c) => c.key === "trending")?.passed === true &&
    checks.find((c) => c.key === "stock")?.passed === true &&
    checks.find((c) => c.key === "variants")?.passed === true &&
    checks.find((c) => c.key === "images")?.passed === true &&
    checks.find((c) => c.key === "description")?.passed === true &&
    checks.find((c) => c.key === "shipping")?.passed === true
  );
}

function orderedFailures(checks: AutoPublishCheckItem[]): string[] {
  return FAILURE_PRIORITY.filter((key) => {
    const check = checks.find((c) => c.key === key);
    return check && !check.passed && !check.pendingEnrichment;
  }).map((key) => AUTO_PUBLISH_FAILURE_MESSAGES[key]);
}

function pendingEnrichmentReasons(checks: AutoPublishCheckItem[]): string[] {
  const reasons: string[] = [];
  for (const key of FAILURE_PRIORITY) {
    const check = checks.find((c) => c.key === key);
    if (check?.pendingEnrichment) {
      const msg = PENDING_ENRICHMENT_MESSAGES[key];
      if (msg) reasons.push(msg);
    }
  }
  return reasons;
}

function resolveStatus(
  ready: boolean,
  pending: string[],
  adminOverride?: boolean
): AutoPublishStatus {
  if (adminOverride) return "PUBLISHED_BY_ADMIN";
  if (ready) return "READY";
  if (pending.length > 0) return "PENDING_ENRICHMENT";
  return "REQUIREMENTS_MISSING";
}

function buildDecision(
  status: AutoPublishStatus,
  ready: boolean
): AutoPublishDecision {
  if (status === "PUBLISHED_BY_ADMIN" || ready) {
    return { status: "ACTIVE", visibility: "PUBLIC", published: true };
  }
  if (status === "PENDING_ENRICHMENT") {
    return { status: "PENDING_ENRICHMENT", visibility: "PRIVATE", published: false };
  }
  return { status: "DRAFT", visibility: "PRIVATE", published: false };
}

export function evaluateAutoPublish(
  product: EnrichedProduct,
  options?: { adminOverride?: boolean }
): AutoPublishResult {
  const checks = buildChecks(product);
  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round(passedCount * AUTO_PUBLISH_SCORE_PER_REQUIREMENT);
  const ready = computeReady(checks);
  const pending = pendingEnrichmentReasons(checks);
  const failures = orderedFailures(checks);
  const status = resolveStatus(ready, pending, options?.adminOverride);

  return {
    ready,
    score,
    status,
    failures,
    pendingEnrichment: pending,
    checks,
    decision: buildDecision(status, ready),
  };
}

export function attachAutoPublish(
  product: EnrichedProduct,
  options?: { adminOverride?: boolean }
): EnrichedProduct {
  const result = evaluateAutoPublish(product, options);
  return {
    ...product,
    intelligence: {
      ...product.intelligence,
      autoPublish: {
        ready: result.ready,
        score: result.score,
        status: result.status,
        failures: result.failures,
        pendingEnrichment: result.pendingEnrichment,
        checks: result.checks,
        decision: result.decision,
        lastCheck: new Date().toISOString(),
      },
    },
  };
}

export function attachAutoPublishBatch(products: EnrichedProduct[]): EnrichedProduct[] {
  return products.map((p) => attachAutoPublish(p));
}

export function toAutoPublishDbPayload(result: AutoPublishResult) {
  return {
    auto_publish_ready: result.ready,
    auto_publish_score: result.score,
    auto_publish_status: result.status,
    auto_publish_failures: result.failures,
    pending_enrichment_reasons: result.pendingEnrichment,
    last_auto_publish_check: new Date().toISOString(),
  };
}
