/**
 * Marketplace Intelligence v4 — persistence layer.
 */

import { getIntelligenceDB } from "./db";
import type {
  IntelligenceEventType,
  MarketplaceHealthSnapshot,
  MarketplaceRankResult,
} from "./types";
import type { PriceRecommendation } from "./types";
import type { ShippingRecommendation } from "./types";

export interface ProductIntelligencePayload {
  productId: string;
  marketplaceRank?: number;
  rankScore: number;
  jimvioTrendingScore: number;
  jimvioQualityScore: number;
  qualityLabel: string;
  qualityConfidence?: string | null;
  recommendedPrice?: number | null;
  recommendedWarehouse?: string | null;
  conversionRate: number;
  ctr: number;
  refundRate: number;
  affiliateScore: number;
  communityScore: number;
  duplicateHidden: boolean;
  duplicateOfProductId?: string | null;
  duplicateSimilarity?: number | null;
  seasonTags: string[];
  rankFactors: Record<string, number>;
  priceRecommendation: PriceRecommendation | Record<string, unknown>;
  shippingRecommendation: ShippingRecommendation | Record<string, unknown>;
  aiRecommendations: unknown[];
}

export async function upsertProductIntelligence(
  payloads: ProductIntelligencePayload[]
): Promise<number> {
  if (payloads.length === 0) return 0;
  const db = getIntelligenceDB();
  const now = new Date().toISOString();

  const rows = payloads.map((p) => ({
    product_id: p.productId,
    marketplace_rank: p.marketplaceRank ?? null,
    rank_score: p.rankScore,
    jimvio_trending_score: p.jimvioTrendingScore,
    jimvio_quality_score: p.jimvioQualityScore,
    quality_label: p.qualityLabel,
    quality_confidence: p.qualityConfidence ?? null,
    recommended_price: p.recommendedPrice ?? null,
    recommended_warehouse: p.recommendedWarehouse ?? null,
    conversion_rate: p.conversionRate,
    ctr: p.ctr,
    refund_rate: p.refundRate,
    affiliate_score: p.affiliateScore,
    community_score: p.communityScore,
    duplicate_hidden: p.duplicateHidden,
    duplicate_of_product_id: p.duplicateOfProductId ?? null,
    duplicate_similarity: p.duplicateSimilarity ?? null,
    season_tags: p.seasonTags,
    rank_factors: p.rankFactors,
    price_recommendation: p.priceRecommendation,
    shipping_recommendation: p.shippingRecommendation,
    ai_recommendations: p.aiRecommendations,
    computed_at: now,
    updated_at: now,
  }));

  const { error } = await db
    .from("marketplace_product_intelligence")
    .upsert(rows, { onConflict: "product_id" });

  if (error) throw new Error(error.message);
  return rows.length;
}

export async function insertTrendingHourly(
  entries: Array<{ productId: string; trendingScore: number; signals: Record<string, unknown> }>
): Promise<number> {
  if (entries.length === 0) return 0;
  const db = getIntelligenceDB();

  const rows = entries.map((e) => ({
    product_id: e.productId,
    trending_score: e.trendingScore,
    signals: e.signals,
  }));

  const { error } = await db.from("marketplace_trending_hourly").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function insertHealthSnapshot(
  snapshot: MarketplaceHealthSnapshot
): Promise<void> {
  const db = getIntelligenceDB();
  const { error } = await db.from("marketplace_intelligence_analytics").insert({
    snapshot_at: snapshot.snapshotAt,
    health_percent: snapshot.healthPercent,
    health_label: snapshot.healthLabel,
    avg_quality: snapshot.avgQuality,
    avg_shipping_days: snapshot.avgShippingDays,
    conversion_rate: snapshot.conversionRate,
    refund_prediction: snapshot.refundPrediction,
    supplier_health: snapshot.supplierHealth,
    video_percent: snapshot.videoPercent,
    duplicate_percent: snapshot.duplicatePercent,
    trending_percent: snapshot.trendingPercent,
    fast_shipping_percent: snapshot.fastShippingPercent,
    total_products: snapshot.totalProducts,
    active_products: snapshot.activeProducts,
    revenue_7d: snapshot.revenue7d,
    orders_7d: snapshot.orders7d,
    ctr_avg: snapshot.ctrAvg,
  });
  if (error) throw new Error(error.message);
}

export async function logIntelligenceEvent(
  eventType: IntelligenceEventType,
  payload: Record<string, unknown>,
  productId?: string
): Promise<void> {
  const db = getIntelligenceDB();
  await db.from("marketplace_intelligence_events").insert({
    product_id: productId ?? null,
    event_type: eventType,
    payload,
  });
}

export async function getLatestHealthSnapshot(): Promise<MarketplaceHealthSnapshot | null> {
  const db = getIntelligenceDB();
  const { data } = await db
    .from("marketplace_intelligence_analytics")
    .select("*")
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    healthPercent: Number(data.health_percent),
    healthLabel: data.health_label as string,
    avgQuality: Number(data.avg_quality),
    avgShippingDays: data.avg_shipping_days !== null ? Number(data.avg_shipping_days) : null,
    conversionRate: Number(data.conversion_rate),
    refundPrediction: Number(data.refund_prediction),
    supplierHealth: Number(data.supplier_health),
    videoPercent: Number(data.video_percent),
    duplicatePercent: Number(data.duplicate_percent),
    trendingPercent: Number(data.trending_percent),
    fastShippingPercent: Number(data.fast_shipping_percent),
    totalProducts: Number(data.total_products),
    activeProducts: Number(data.active_products),
    revenue7d: Number(data.revenue_7d),
    orders7d: Number(data.orders_7d),
    ctrAvg: Number(data.ctr_avg),
    snapshotAt: data.snapshot_at as string,
  };
}

export async function getTopRankedProducts(limit = 50): Promise<
  Array<{
    productId: string;
    rankScore: number;
    marketplaceRank: number | null;
    trendingScore: number;
    qualityScore: number;
    qualityLabel: string;
  }>
> {
  const db = getIntelligenceDB();
  const { data } = await db
    .from("marketplace_product_intelligence")
    .select("product_id, rank_score, marketplace_rank, jimvio_trending_score, jimvio_quality_score, quality_label")
    .eq("duplicate_hidden", false)
    .order("rank_score", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    productId: r.product_id as string,
    rankScore: Number(r.rank_score),
    marketplaceRank: r.marketplace_rank !== null ? Number(r.marketplace_rank) : null,
    trendingScore: Number(r.jimvio_trending_score),
    qualityScore: Number(r.jimvio_quality_score),
    qualityLabel: r.quality_label as string,
  }));
}

export async function getProductIntelligence(productId: string) {
  const db = getIntelligenceDB();
  const { data } = await db
    .from("marketplace_product_intelligence")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();
  return data;
}

export function rankResultToPayload(
  result: MarketplaceRankResult,
  extras: Omit<ProductIntelligencePayload, "productId" | "rankScore" | "jimvioTrendingScore" | "jimvioQualityScore" | "qualityLabel" | "rankFactors">
): ProductIntelligencePayload {
  return {
    productId: result.productId,
    marketplaceRank: result.marketplaceRank,
    rankScore: result.rankScore,
    jimvioTrendingScore: result.jimvioTrendingScore,
    jimvioQualityScore: result.qualityScore,
    qualityLabel: result.qualityLabel,
    rankFactors: result.factors as unknown as Record<string, number>,
    ...extras,
  };
}
