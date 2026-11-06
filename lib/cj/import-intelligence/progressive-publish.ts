/**
 * Progressive Auto Publish — score-based Premium / Standard / Draft tiers.
 *
 * Premium: score 100 (all requirements) → publish immediately
 * Standard: score 80–99 + critical requirements → publish at lower tier
 * Draft: below 80 → remain unpublished
 *
 * Critical (Standard): verified supplier, stock, shipping, description, images
 * Non-critical: trending, video, warehouse preference, opportunity score
 */

import type { EnrichedProduct } from "./types";
import {
  evaluateAutoPublish,
  type AutoPublishResult,
  type AutoPublishRequirementKey,
  hasStockAvailable,
  isSupplierVerified,
  hasFastShipping,
  isDescriptionComplete,
  hasEnoughImages,
  isEnrichmentComplete,
} from "./auto-publish-engine";

export type PublishTier = "premium" | "standard" | "draft";

const STANDARD_MIN_SCORE = 80;
const PREMIUM_MIN_SCORE = 100;

const CRITICAL_KEYS: AutoPublishRequirementKey[] = [
  "verified",
  "stock",
  "shipping",
  "description",
  "images",
];

export interface ProgressivePublishResult {
  tier: PublishTier;
  publishReady: boolean;
  autoPublish: AutoPublishResult;
  relaxedFailures: string[];
}

function criticalChecksPass(checks: AutoPublishResult["checks"]): boolean {
  return CRITICAL_KEYS.every((key) => {
    const check = checks.find((c) => c.key === key);
    return check?.passed === true;
  });
}

/** Hard blocks — never publish regardless of score */
function hasHardPublishBlocks(product: EnrichedProduct): boolean {
  if (!hasStockAvailable(product)) return true;
  if (!isSupplierVerified(product)) return true;
  return false;
}

function relaxedFailureMessages(auto: AutoPublishResult): string[] {
  const nonCritical: AutoPublishRequirementKey[] = [
    "video",
    "trending",
    "variants",
  ];
  return auto.checks
    .filter((c) => nonCritical.includes(c.key) && !c.passed && !c.pendingEnrichment)
    .map((c) => c.label);
}

export function evaluateProgressivePublish(
  product: EnrichedProduct,
  options?: { adminOverride?: boolean }
): ProgressivePublishResult {
  if (!isEnrichmentComplete(product)) {
    const autoPublish = evaluateAutoPublish(product, options);
    return {
      tier: "draft",
      publishReady: false,
      autoPublish: {
        ...autoPublish,
        ready: false,
        status: "PENDING_ENRICHMENT",
      },
      relaxedFailures: [],
    };
  }

  const autoPublish = evaluateAutoPublish(product, options);

  if (options?.adminOverride) {
    return {
      tier: "premium",
      publishReady: true,
      autoPublish: { ...autoPublish, ready: true, status: "READY" },
      relaxedFailures: [],
    };
  }

  if (hasHardPublishBlocks(product)) {
    return {
      tier: "draft",
      publishReady: false,
      autoPublish,
      relaxedFailures: [],
    };
  }

  const score = autoPublish.score;

  if (score >= PREMIUM_MIN_SCORE && autoPublish.ready) {
    return {
      tier: "premium",
      publishReady: true,
      autoPublish: {
        ...autoPublish,
        ready: true,
        status: "READY",
      },
      relaxedFailures: relaxedFailureMessages(autoPublish),
    };
  }

  if (
    score >= STANDARD_MIN_SCORE &&
    score < PREMIUM_MIN_SCORE &&
    criticalChecksPass(autoPublish.checks) &&
    hasFastShipping(product) &&
    isDescriptionComplete(product) &&
    hasEnoughImages(product)
  ) {
    return {
      tier: "standard",
      publishReady: true,
      autoPublish: {
        ...autoPublish,
        ready: true,
        status: "READY",
      },
      relaxedFailures: relaxedFailureMessages(autoPublish),
    };
  }

  return {
    tier: "draft",
    publishReady: false,
    autoPublish,
    relaxedFailures: [],
  };
}

export function publishTierCatalogMapping(tier: PublishTier): "PREMIUM" | "STANDARD" | "PENDING" {
  if (tier === "premium") return "PREMIUM";
  if (tier === "standard") return "STANDARD";
  return "PENDING";
}

/** Hard blocks that justify unpublishing — nothing else. */
/** Owner-approved catalog curation: never undone by automatic restore jobs (an admin can still republish by hand). */
export const CATALOG_REFRESH_UNPUBLISH_REASON = "Catalog refresh 2026–2030";

export const PERMANENT_UNPUBLISH_REASONS = new Set([
  "Product removed from CJ",
  "Stock became zero",
  "Supplier blacklisted",
  CATALOG_REFRESH_UNPUBLISH_REASON,
]);

export function isPermanentUnpublishReason(reason: string | null | undefined): boolean {
  if (!reason) return false;
  return PERMANENT_UNPUBLISH_REASONS.has(reason);
}
