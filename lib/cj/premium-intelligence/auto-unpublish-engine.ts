/**
 * Auto Unpublish Engine — safe unpublish only for hard failures.
 */

import type { EnrichedProduct } from "../import-intelligence/types";
import { hasStockAvailable } from "../import-intelligence/auto-publish-engine";

export type UnpublishReason =
  | "Stock became zero"
  | "Product removed from CJ"
  | "Supplier blacklisted";

export interface UnpublishEvaluation {
  shouldUnpublish: boolean;
  reasons: UnpublishReason[];
}

/**
 * Only unpublish when ALL hard criteria apply:
 * - CJ confirms removal, OR stock = 0, OR supplier blacklisted
 *
 * Never unpublish for missing video, trending, images, description, or enrichment.
 */
export function evaluateUnpublishConditions(
  product: EnrichedProduct,
  options?: {
    rawProductExists?: boolean;
    supplierBlacklisted?: boolean;
  }
): UnpublishEvaluation {
  const reasons: UnpublishReason[] = [];

  if (options?.rawProductExists === false) {
    reasons.push("Product removed from CJ");
  }

  if (!hasStockAvailable(product)) {
    reasons.push("Stock became zero");
  }

  if (options?.supplierBlacklisted) {
    reasons.push("Supplier blacklisted");
  }

  return {
    shouldUnpublish: reasons.length > 0,
    reasons,
  };
}
