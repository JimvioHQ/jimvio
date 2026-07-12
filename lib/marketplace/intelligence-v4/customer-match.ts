/**
 * Customer Match Engine v4 — personal match score per product.
 */

import type {
  CustomerMatchInput,
  CustomerMatchResult,
  MarketplaceProductSignals,
} from "./types";

export function computeCustomerMatch(
  product: MarketplaceProductSignals,
  customer: CustomerMatchInput
): CustomerMatchResult {
  const reasons: string[] = [];
  let score = 50;

  if (customer.viewedProductIds.includes(product.productId)) {
    score += 15;
    reasons.push("Recently viewed");
  }

  if (customer.wishlistProductIds.includes(product.productId)) {
    score += 20;
    reasons.push("In your wishlist");
  }

  if (customer.cartProductIds.includes(product.productId)) {
    score += 25;
    reasons.push("In your cart");
  }

  if (
    product.categoryId &&
    customer.categoryPreferences.includes(product.categoryId)
  ) {
    score += 12;
    reasons.push("Matches your category preference");
  }

  const nameLower = product.name.toLowerCase();
  for (const term of customer.searchTerms) {
    if (nameLower.includes(term.toLowerCase())) {
      score += 8;
      reasons.push(`Matches search: "${term}"`);
      break;
    }
  }

  for (const tag of customer.communityInterests) {
    if (nameLower.includes(tag.toLowerCase())) {
      score += 6;
      reasons.push(`Community interest: ${tag}`);
      break;
    }
  }

  const region = (product.shippingFrom ?? "").toUpperCase();
  if (region && customer.countryCode) {
    const cc = customer.countryCode.toUpperCase();
    if (region.includes(cc) || (cc === "US" && region.includes("US"))) {
      score += 10;
      reasons.push("Ships to your region");
    }
  }

  if (product.rating >= 4.5) {
    score += 5;
    reasons.push("Highly rated");
  }

  if (product.hasVideo) {
    score += 4;
    reasons.push("Has product video");
  }

  return {
    productId: product.productId,
    matchScore: Math.max(0, Math.min(100, Math.round(score))),
    reasons: reasons.slice(0, 4),
  };
}

export function rankByCustomerMatch(
  products: MarketplaceProductSignals[],
  customer: CustomerMatchInput
): CustomerMatchResult[] {
  return products
    .map((p) => computeCustomerMatch(p, customer))
    .sort((a, b) => b.matchScore - a.matchScore);
}
