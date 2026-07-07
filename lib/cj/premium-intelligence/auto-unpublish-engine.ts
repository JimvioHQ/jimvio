/**
 * Auto Unpublish Engine v3 — monitors published CJ products.
 */

import type { EnrichedProduct } from "../import-intelligence/types";
import {
  evaluateAutoPublish,
  hasFastShipping,
  hasStockAvailable,
  hasValidVideo,
  isSupplierVerified,
} from "../import-intelligence/auto-publish-engine";

export type UnpublishReason =
  | "Stock became zero"
  | "Supplier became unverified"
  | "Shipping became unavailable"
  | "Product removed from CJ"
  | "Product disabled by supplier"
  | "Product deleted"
  | "Video removed"
  | "Supplier blacklisted"
  | "Quality requirements no longer met";

export interface UnpublishEvaluation {
  shouldUnpublish: boolean;
  reasons: UnpublishReason[];
}

export function evaluateUnpublishConditions(
  product: EnrichedProduct,
  options?: {
    rawProductExists?: boolean;
    supplierBlacklisted?: boolean;
    previouslyHadVideo?: boolean;
  }
): UnpublishEvaluation {
  const reasons: UnpublishReason[] = [];

  if (options?.rawProductExists === false) {
    reasons.push("Product removed from CJ");
  }

  if (!hasStockAvailable(product)) {
    reasons.push("Stock became zero");
  }

  if (!isSupplierVerified(product)) {
    reasons.push("Supplier became unverified");
  }

  if (!hasFastShipping(product)) {
    reasons.push("Shipping became unavailable");
  }

  if (options?.previouslyHadVideo && !hasValidVideo(product)) {
    reasons.push("Video removed");
  }

  if (options?.supplierBlacklisted) {
    reasons.push("Supplier blacklisted");
  }

  const auto = evaluateAutoPublish(product);
  if (!auto.ready && auto.status === "REQUIREMENTS_MISSING") {
    reasons.push("Quality requirements no longer met");
  }

  return {
    shouldUnpublish: reasons.length > 0,
    reasons,
  };
}
