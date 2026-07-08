/**
 * Progressive Auto Publish — relaxed Premium / Standard / Draft tiers.
 * Video and Trending boost ranking but do NOT block publishing.
 */

import type { EnrichedProduct } from "./types";
import {
  evaluateAutoPublish,
  type AutoPublishResult,
  hasStockAvailable,
  isSupplierVerified,
  hasFastShipping,
} from "./auto-publish-engine";
import { getDescriptionLength } from "./quality-engine";

export type PublishTier = "premium" | "standard" | "draft";

const MIN_STANDARD_DESCRIPTION = 40;

export interface ProgressivePublishResult {
  tier: PublishTier;
  publishReady: boolean;
  autoPublish: AutoPublishResult;
  relaxedFailures: string[];
}

function hasMinimumDescription(product: EnrichedProduct): boolean {
  return getDescriptionLength(product) >= MIN_STANDARD_DESCRIPTION;
}

/** Premium: stock + verified supplier + shipping + description */
function premiumEligible(product: EnrichedProduct): boolean {
  return (
    hasStockAvailable(product) &&
    isSupplierVerified(product) &&
    hasFastShipping(product) &&
    hasMinimumDescription(product)
  );
}

/** Standard: stock + shipping + description (supplier preferred, not required) */
function standardEligible(product: EnrichedProduct): boolean {
  return (
    hasStockAvailable(product) &&
    hasFastShipping(product) &&
    hasMinimumDescription(product)
  );
}

export function evaluateProgressivePublish(
  product: EnrichedProduct,
  options?: { adminOverride?: boolean }
): ProgressivePublishResult {
  const autoPublish = evaluateAutoPublish(product, options);

  if (options?.adminOverride) {
    return {
      tier: "premium",
      publishReady: true,
      autoPublish: { ...autoPublish, ready: true, status: "READY" },
      relaxedFailures: [],
    };
  }

  if (premiumEligible(product)) {
    return {
      tier: "premium",
      publishReady: true,
      autoPublish: {
        ...autoPublish,
        ready: true,
        status: "READY",
      },
      relaxedFailures: autoPublish.failures.filter(
        (f) => f.includes("Trending") || f.includes("Video") || f.includes("Images")
      ),
    };
  }

  if (standardEligible(product)) {
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

/** Hard blocks that justify unpublishing — nothing else. */
export const PERMANENT_UNPUBLISH_REASONS = new Set([
  "Product removed from CJ",
  "Stock became zero",
  "Supplier blacklisted",
]);

export function isPermanentUnpublishReason(reason: string | null | undefined): boolean {
  if (!reason) return false;
  return PERMANENT_UNPUBLISH_REASONS.has(reason);
}
