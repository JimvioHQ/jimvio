/**
 * Smart Publish Queue Priority v5
 * Ready+Trending+Verified+Video > Ready+Video > Ready+Verified > Ready > Pending > Requirements Missing
 */

import type { EnrichedProduct } from "../import-intelligence/types";
import {
  evaluateAutoPublish,
  hasFastShipping,
  hasValidVideo,
  isSupplierVerified,
  isTrendingOrBestSelling,
} from "../import-intelligence/auto-publish-engine";

export function computePublishPriority(product: EnrichedProduct): number {
  const auto = product.intelligence.autoPublish ?? evaluateAutoPublish(product);
  let priority = 0;

  if (auto.ready) {
    priority += 50_000;
    const trending = isTrendingOrBestSelling(product);
    const video = hasValidVideo(product);
    const verified = isSupplierVerified(product);

    if (trending && verified && video) priority += 50_000;
    else if (video) priority += 30_000;
    else if (verified) priority += 20_000;
  } else if (auto.status === "PENDING_ENRICHMENT") {
    priority += 5_000;
  } else if (auto.status === "REQUIREMENTS_MISSING") {
    priority += 1_000;
  }

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
