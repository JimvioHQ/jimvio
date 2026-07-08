/**
 * Progressive Auto Publish — Premium / Standard / Draft tiers.
 * Additive layer on evaluateAutoPublish; does not replace v2 engine.
 */

import type { EnrichedProduct } from "./types";
import {
  evaluateAutoPublish,
  type AutoPublishRequirementKey,
  type AutoPublishResult,
  hasStockAvailable,
  isSupplierVerified,
  hasFastShipping,
  hasValidVideo,
  hasProductVariants,
} from "./auto-publish-engine";
import {
  getImageCount,
  getDescriptionLength,
} from "./quality-engine";

export type PublishTier = "premium" | "standard" | "draft";

/** Must never fail for Standard auto-publish */
const CRITICAL_KEYS: AutoPublishRequirementKey[] = [
  "stock",
  "verified",
  "shipping",
  "variants",
  "video",
];

/** May fail for Standard tier (score 80–99%) */
const NON_CRITICAL_KEYS: AutoPublishRequirementKey[] = [
  "trending",
  "images",
  "description",
];

export interface ProgressivePublishResult {
  tier: PublishTier;
  publishReady: boolean;
  autoPublish: AutoPublishResult;
  relaxedFailures: string[];
}

function criticalChecksPass(product: EnrichedProduct, checks: AutoPublishResult["checks"]): boolean {
  for (const key of CRITICAL_KEYS) {
    const check = checks.find((c) => c.key === key);
    if (!check?.passed) return false;
  }
  if (!hasStockAvailable(product)) return false;
  if (!isSupplierVerified(product)) return false;
  if (!hasFastShipping(product)) return false;
  if (!hasValidVideo(product)) return false;
  if (!hasProductVariants(product)) return false;
  return true;
}

function standardTierEligible(
  product: EnrichedProduct,
  auto: AutoPublishResult
): boolean {
  if (auto.score < 80 || auto.score >= 100) return false;
  if (!criticalChecksPass(product, auto.checks)) return false;

  const failedKeys = auto.checks.filter((c) => !c.passed).map((c) => c.key);
  const hasDisallowedFailure = failedKeys.some(
    (k) => !NON_CRITICAL_KEYS.includes(k)
  );
  if (hasDisallowedFailure) return false;

  if (getImageCount(product) < 3) return false;
  if (getDescriptionLength(product) < 40) return false;

  return true;
}

export function evaluateProgressivePublish(
  product: EnrichedProduct,
  options?: { adminOverride?: boolean }
): ProgressivePublishResult {
  const autoPublish = evaluateAutoPublish(product, options);

  if (autoPublish.ready) {
    return {
      tier: "premium",
      publishReady: true,
      autoPublish,
      relaxedFailures: [],
    };
  }

  if (standardTierEligible(product, autoPublish)) {
    return {
      tier: "standard",
      publishReady: true,
      autoPublish: {
        ...autoPublish,
        ready: true,
        status: "READY",
      },
      relaxedFailures: autoPublish.failures,
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
