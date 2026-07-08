import type { EnrichedProduct, IntelligenceFilters } from "./types";
import { evaluateAutoPublish } from "./auto-publish-engine";

function getAutoState(product: EnrichedProduct) {
  return product.intelligence.autoPublish ?? evaluateAutoPublish(product);
}

export function passesAutoPublishFilters(
  product: EnrichedProduct,
  filters: IntelligenceFilters
): boolean {
  const auto = getAutoState(product);

  if (filters.autoPublishReady && !auto.ready) return false;
  if (filters.autoPublishPending && auto.status !== "PENDING_ENRICHMENT") return false;
  if (filters.autoPublishRequirementsMissing && auto.status !== "REQUIREMENTS_MISSING") {
    return false;
  }
  if (filters.autoPublishAdminOverride && auto.status !== "PUBLISHED_BY_ADMIN") {
    return false;
  }
  if (filters.isPublished && !product.intelligence.isImported) return false;

  if (filters.missingVideo && auto.checks.find((c) => c.key === "video")?.passed) {
    return false;
  }
  if (filters.missingSupplier && auto.checks.find((c) => c.key === "verified")?.passed) {
    return false;
  }
  if (filters.missingImages && auto.checks.find((c) => c.key === "images")?.passed) {
    return false;
  }
  if (
    filters.missingDescription &&
    auto.checks.find((c) => c.key === "description")?.passed
  ) {
    return false;
  }
  if (filters.missingShipping && auto.checks.find((c) => c.key === "shipping")?.passed) {
    return false;
  }
  if (filters.missingVariants && auto.checks.find((c) => c.key === "variants")?.passed) {
    return false;
  }
  if (filters.missingStock && auto.checks.find((c) => c.key === "stock")?.passed) {
    return false;
  }
  if (filters.missingTrending && auto.checks.find((c) => c.key === "trending")?.passed) {
    return false;
  }

  return true;
}

export function countAutoPublishFilters(filters: IntelligenceFilters): number {
  let count = 0;
  if (filters.autoPublishReady) count++;
  if (filters.autoPublishPending) count++;
  if (filters.autoPublishRequirementsMissing) count++;
  if (filters.autoPublishAdminOverride) count++;
  if (filters.isPublished) count++;
  if (filters.missingVideo) count++;
  if (filters.missingSupplier) count++;
  if (filters.missingImages) count++;
  if (filters.missingDescription) count++;
  if (filters.missingShipping) count++;
  if (filters.missingVariants) count++;
  if (filters.missingStock) count++;
  if (filters.missingTrending) count++;
  return count;
}
