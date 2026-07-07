/**
 * Smart Publish Queue Priority v3
 * Priority: Elite > Trending > Video > Verified > Fast Shipping > Orders > New Arrival
 */

import type { EnrichedProduct } from "../import-intelligence/types";
import { hasFastShipping, hasValidVideo, isSupplierVerified, isTrendingOrBestSelling } from "../import-intelligence/auto-publish-engine";

export function computePublishPriority(product: EnrichedProduct): number {
  let priority = 0;
  const tier = product.intelligence.catalogTier;

  if (tier === "ELITE") priority += 10_000;
  else if (tier === "PREMIUM") priority += 5_000;
  else if (tier === "STANDARD") priority += 1_000;

  if (isTrendingOrBestSelling(product)) priority += 2_500;
  if (hasValidVideo(product)) priority += 1_000;
  if (isSupplierVerified(product)) priority += 750;
  if (hasFastShipping(product)) priority += 500;

  priority += Math.min(product.listedNum ?? 0, 500);

  if (product.createAt) {
    const ageDays = (Date.now() - product.createAt) / 86_400_000;
    if (ageDays <= 30) priority += Math.round(200 - ageDays * 5);
  }

  return priority;
}

export function sortByPublishPriority(products: EnrichedProduct[]): EnrichedProduct[] {
  return [...products].sort(
    (a, b) => computePublishPriority(b) - computePublishPriority(a)
  );
}
