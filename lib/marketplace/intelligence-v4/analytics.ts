/**
 * Marketplace Intelligence v4 — analytics aggregation for admin dashboard.
 */

import { getIntelligenceDB } from "./db";
import { getLatestHealthSnapshot, getTopRankedProducts } from "./persist";
import { aggregateRecommendations, generateProductRecommendations } from "./ai-recommendations";
import type { AiRecommendation, MarketplaceHealthSnapshot } from "./types";

export interface MarketplaceIntelligenceAnalytics {
  health: MarketplaceHealthSnapshot | null;
  topRanked: Awaited<ReturnType<typeof getTopRankedProducts>>;
  recommendations: AiRecommendation[];
  totals: {
    intelligenceRows: number;
    duplicatesHidden: number;
    avgRankScore: number;
    avgTrendingScore: number;
    avgQualityScore: number;
  };
  computedAt: string;
}

export async function computeMarketplaceIntelligenceAnalytics(): Promise<MarketplaceIntelligenceAnalytics> {
  const db = getIntelligenceDB();

  const [health, topRanked, sampleRows, { count: totalRows }, { count: hiddenCount }] =
    await Promise.all([
      getLatestHealthSnapshot(),
      getTopRankedProducts(20),
      db
        .from("marketplace_product_intelligence")
        .select("rank_score, jimvio_trending_score, jimvio_quality_score, ai_recommendations")
        .limit(5000),
      db
        .from("marketplace_product_intelligence")
        .select("product_id", { count: "exact", head: true }),
      db
        .from("marketplace_product_intelligence")
        .select("product_id", { count: "exact", head: true })
        .eq("duplicate_hidden", true),
    ]);

  const rows = sampleRows.data ?? [];
  let rankSum = 0;
  let trendSum = 0;
  let qualitySum = 0;
  const allRecs: Array<{ signals: { productId: string; name: string }; recs: ReturnType<typeof generateProductRecommendations> }> = [];

  for (const row of rows) {
    rankSum += Number(row.rank_score ?? 0);
    trendSum += Number(row.jimvio_trending_score ?? 0);
    qualitySum += Number(row.jimvio_quality_score ?? 0);

    const recs = Array.isArray(row.ai_recommendations)
      ? (row.ai_recommendations as ReturnType<typeof generateProductRecommendations>)
      : [];
    if (recs.length > 0) {
      allRecs.push({
        signals: { productId: "", name: "" },
        recs,
      });
    }
  }

  const n = rows.length || 1;

  return {
    health,
    topRanked,
    recommendations: aggregateRecommendations(allRecs).slice(0, 15),
    totals: {
      intelligenceRows: totalRows ?? 0,
      duplicatesHidden: hiddenCount ?? 0,
      avgRankScore: Math.round(rankSum / n),
      avgTrendingScore: Math.round(trendSum / n),
      avgQualityScore: Math.round(qualitySum / n),
    },
    computedAt: new Date().toISOString(),
  };
}
