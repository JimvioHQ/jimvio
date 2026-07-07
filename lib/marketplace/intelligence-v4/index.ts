/**
 * Marketplace Intelligence Engine v4 — public API surface.
 */

export * from "./types";
export * from "./product-ranking";
export * from "./jimvio-trending";
export * from "./customer-match";
export * from "./price-optimizer";
export * from "./shipping-engine";
export * from "./season-engine";
export * from "./duplicate-protection";
export * from "./quality-score";
export * from "./marketplace-learning";
export * from "./marketplace-health";
export * from "./ai-recommendations";
export * from "./category-intelligence";
export * from "./affiliate-intelligence";
export * from "./community-intelligence";
export * from "./search-intelligence";
export * from "./homepage-sections";
export * from "./run-intelligence";
export * from "./persist";
export * from "./schema-health";
export * from "./aggregate-signals";

import { getLatestHealthSnapshot, getTopRankedProducts, getProductIntelligence } from "./persist";
import { buildHomepageSections } from "./homepage-sections";
import { rankByCustomerMatch } from "./customer-match";
import type { CustomerMatchInput } from "./types";
import { getIntelligenceDB } from "./db";

export async function getMarketplaceHealth() {
  return getLatestHealthSnapshot();
}

export async function getMarketplaceRankings(limit = 50) {
  return getTopRankedProducts(limit);
}

export async function getIntelligenceForProduct(productId: string) {
  return getProductIntelligence(productId);
}

export async function getCustomerRecommendations(
  customer: CustomerMatchInput,
  limit = 20
) {
  const db = getIntelligenceDB();
  const { data: intelRows } = await db
    .from("marketplace_product_intelligence")
    .select("product_id, rank_score, jimvio_quality_score")
    .eq("duplicate_hidden", false)
    .order("rank_score", { ascending: false })
    .limit(200);

  if (!intelRows?.length) return [];

  const productIds = intelRows.map((r) => r.product_id as string);
  const { data: products } = await db
    .from("products")
    .select("id, name, price, view_count, sale_count, rating, review_count, category_id, shipping_from, delivery_time, is_free_shipping, affiliate_commission_rate, source, source_metadata")
    .in("id", productIds);

  const signals = (products ?? []).map((p) => ({
    productId: p.id as string,
    name: p.name as string,
    price: Number(p.price) || 0,
    viewCount: Number(p.view_count) || 0,
    saleCount: Number(p.sale_count) || 0,
    wishlistCount: 0,
    reviewCount: Number(p.review_count) || 0,
    rating: Number(p.rating) || 0,
    categoryId: p.category_id as string | null,
    shippingFrom: p.shipping_from as string | null,
    deliveryTime: p.delivery_time as string | null,
    hasVideo: false,
    isFreeShipping: Boolean(p.is_free_shipping),
    affiliateCommissionRate: p.affiliate_commission_rate as number | null,
    source: p.source as string | null,
  }));

  return rankByCustomerMatch(signals, customer).slice(0, limit);
}

export async function getHomepageIntelligenceFeed(options: {
  customer?: CustomerMatchInput;
  recentlyViewedIds?: string[];
  cartProductIds?: string[];
  newProductIds?: string[];
}) {
  const db = getIntelligenceDB();
  const { data: intelRows } = await db
    .from("marketplace_product_intelligence")
    .select("*")
    .eq("duplicate_hidden", false)
    .order("rank_score", { ascending: false })
    .limit(500);

  if (!intelRows?.length) return [];

  const productIds = intelRows.map((r) => r.product_id as string);
  const { data: products } = await db
    .from("products")
    .select("id, name, price, view_count, sale_count, rating, review_count, category_id, shipping_from, delivery_time, is_free_shipping, affiliate_commission_rate, source, source_metadata, created_at")
    .in("id", productIds);

  const rankScores = new Map(intelRows.map((r) => [r.product_id as string, Number(r.rank_score)]));
  const trendingScores = new Map(intelRows.map((r) => [r.product_id as string, Number(r.jimvio_trending_score)]));
  const qualityScores = new Map(intelRows.map((r) => [r.product_id as string, Number(r.jimvio_quality_score)]));
  const duplicateHidden = new Set(
    intelRows.filter((r) => r.duplicate_hidden).map((r) => r.product_id as string)
  );

  const signalsList = (products ?? []).map((p) => ({
    productId: p.id as string,
    name: p.name as string,
    price: Number(p.price) || 0,
    viewCount: Number(p.view_count) || 0,
    saleCount: Number(p.sale_count) || 0,
    wishlistCount: 0,
    reviewCount: Number(p.review_count) || 0,
    rating: Number(p.rating) || 0,
    categoryId: p.category_id as string | null,
    shippingFrom: p.shipping_from as string | null,
    deliveryTime: p.delivery_time as string | null,
    hasVideo: false,
    isFreeShipping: Boolean(p.is_free_shipping),
    affiliateCommissionRate: p.affiliate_commission_rate as number | null,
    source: p.source as string | null,
  }));

  return buildHomepageSections({
    products: signalsList,
    rankScores,
    trendingScores,
    qualityScores,
    duplicateHidden,
    customer: options.customer,
    recentlyViewedIds: options.recentlyViewedIds ?? [],
    cartProductIds: options.cartProductIds ?? [],
    newProductIds: options.newProductIds ?? [],
    communityPicks: [],
  });
}
