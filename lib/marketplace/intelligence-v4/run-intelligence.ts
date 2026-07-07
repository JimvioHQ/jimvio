/**
 * Marketplace Intelligence Engine v4 — main computation runner.
 * Read-only on products — only writes to intelligence tables.
 */

import {
  countActiveProducts,
  fetchActiveProductBatch,
  fetchCjIntelligenceMap,
  fetchRevenue7d,
  fetchVideoProductIds,
  fetchWishlistCounts,
  rawToSignals,
} from "./aggregate-signals";
import { INTELLIGENCE_BATCH_SIZE } from "./db";
import { assignMarketplaceRanks, computeMarketplaceRank } from "./product-ranking";
import { computeTrendingBatch, extractTrendingSignals } from "./jimvio-trending";
import { computeJimvioQualityScore, qualityLabelFromScore } from "./quality-score";
import { recommendPrice } from "./price-optimizer";
import { recommendShipping } from "./shipping-engine";
import { matchProductToSeasons } from "./season-engine";
import { generateProductRecommendations, aggregateRecommendations } from "./ai-recommendations";
import {
  resolveMarketplaceDuplicates,
  signalsToDuplicateCandidate,
} from "./duplicate-protection";
import { computeAffiliateScore } from "./affiliate-intelligence";
import { applyLearningToRank, extractLearningSignals } from "./marketplace-learning";
import { computeMarketplaceHealth, type HealthInputRow } from "./marketplace-health";
import {
  insertHealthSnapshot,
  insertTrendingHourly,
  logIntelligenceEvent,
  rankResultToPayload,
  upsertProductIntelligence,
  type ProductIntelligencePayload,
} from "./persist";
import { getActiveSeasons, SEASON_DEFINITIONS } from "./season-engine";
import { getIntelligenceDB } from "./db";
import type { MarketplaceProductSignals } from "./types";

export interface IntelligenceRunResult {
  processed: number;
  upserted: number;
  duplicatesHidden: number;
  trendingInserted: number;
  healthSnapshot: boolean;
  durationMs: number;
}

async function syncSeasons(): Promise<void> {
  const db = getIntelligenceDB();
  const ctx = getActiveSeasons();

  for (const def of SEASON_DEFINITIONS) {
    await db.from("marketplace_seasons").upsert({
      season_key: def.key,
      label: def.label,
      active: ctx.activeSeasons.includes(def.key),
      keywords: def.keywords,
      updated_at: new Date().toISOString(),
    }, { onConflict: "season_key" });
  }
}

export async function runMarketplaceIntelligence(options?: {
  maxProducts?: number;
  skipHealth?: boolean;
  trendingOnly?: boolean;
}): Promise<IntelligenceRunResult> {
  const start = Date.now();
  const maxProducts = options?.maxProducts ?? Infinity;
  const total = Math.min(await countActiveProducts(), maxProducts);

  let processed = 0;
  let upserted = 0;
  let duplicatesHidden = 0;
  let trendingInserted = 0;
  const healthRows: HealthInputRow[] = [];
  const allRankResults: ReturnType<typeof computeMarketplaceRank>[] = [];
  const allSignals: MarketplaceProductSignals[] = [];
  const allRecs: Array<{ signals: MarketplaceProductSignals; recs: ReturnType<typeof generateProductRecommendations> }> = [];

  await syncSeasons();

  for (let offset = 0; offset < total; offset += INTELLIGENCE_BATCH_SIZE) {
    const batch = await fetchActiveProductBatch(offset, INTELLIGENCE_BATCH_SIZE);
    if (batch.length === 0) break;

    const productIds = batch.map((r) => r.id);
    const cjPids = batch
      .map((r) => {
        const meta = r.source_metadata ?? {};
        return typeof meta.cj_pid === "string" ? meta.cj_pid : null;
      })
      .filter((p): p is string => Boolean(p));

    const [wishlistCounts, videoIds, cjIntelMap] = await Promise.all([
      fetchWishlistCounts(productIds),
      fetchVideoProductIds(productIds),
      fetchCjIntelligenceMap(cjPids),
    ]);

    const signalsList = batch.map((row) => {
      const meta = row.source_metadata ?? {};
      const cjPid = typeof meta.cj_pid === "string" ? meta.cj_pid : null;
      return rawToSignals(row, {
        wishlistCount: wishlistCounts.get(row.id) ?? 0,
        hasVideo: videoIds.has(row.id),
        cjIntel: cjPid ? cjIntelMap.get(cjPid) : undefined,
      });
    });

    const trendingScores = computeTrendingBatch(signalsList);
    const qualityMap = new Map(
      signalsList.map((s) => [s.productId, computeJimvioQualityScore(s)])
    );

    const dupCandidates = signalsList.map((s, i) =>
      signalsToDuplicateCandidate(
        s,
        qualityMap.get(s.productId) ?? 0,
        batch[i]?.images?.[0],
        undefined
      )
    );
    const dupResults = resolveMarketplaceDuplicates(dupCandidates);
    const dupMap = new Map(dupResults.map((d) => [d.productId, d]));

    const rankResults = signalsList.map((signals) => {
      const base = computeMarketplaceRank(signals);
      const learning = extractLearningSignals(signals);
      const boosted = applyLearningToRank(base.rankScore, learning);
      return { ...base, rankScore: boosted };
    });

    allRankResults.push(...rankResults);
    allSignals.push(...signalsList);

    const ranked = assignMarketplaceRanks(rankResults);
    const payloads: ProductIntelligencePayload[] = [];

    for (const result of ranked) {
      const signals = signalsList.find((s) => s.productId === result.productId)!;
      const dup = dupMap.get(result.productId);
      const qualityScore = qualityMap.get(result.productId) ?? result.qualityScore;
      const qualityLabel = qualityLabelFromScore(qualityScore);
      const views = Math.max(1, signals.viewCount);
      const priceRec = recommendPrice(signals);
      const shipRec = recommendShipping(signals);
      const seasons = matchProductToSeasons(signals.name);
      const recs = generateProductRecommendations(signals);
      allRecs.push({ signals, recs });

      if (dup?.hidden) duplicatesHidden++;

      healthRows.push({
        rankScore: result.rankScore,
        qualityScore,
        deliveryDays: signals.deliveryTime ? parseInt(signals.deliveryTime, 10) : null,
        conversionRate: signals.saleCount / views,
        refundRate: signals.reviewCount > 0 ? Math.max(0, 1 - signals.rating / 5) * 0.3 : 0.05,
        supplierReputation: signals.supplierReputation ?? 50,
        hasVideo: signals.hasVideo,
        duplicateHidden: dup?.hidden ?? false,
        trendingScore: trendingScores.get(signals.productId) ?? 0,
        fastShipping: signals.deliveryTime ? parseInt(signals.deliveryTime, 10) <= 7 : false,
      });

      payloads.push(
        rankResultToPayload(
          { ...result, qualityScore, qualityLabel },
          {
            qualityConfidence: signals.qualityConfidence ?? null,
            recommendedPrice: priceRec.recommendedPrice,
            recommendedWarehouse: shipRec.recommendedWarehouse,
            conversionRate: signals.saleCount / views,
            ctr: signals.saleCount / views,
            refundRate: healthRows[healthRows.length - 1].refundRate,
            affiliateScore: computeAffiliateScore(signals),
            communityScore: 0,
            duplicateHidden: dup?.hidden ?? false,
            duplicateOfProductId: dup?.duplicateOfProductId ?? null,
            duplicateSimilarity: dup?.similarity ?? null,
            seasonTags: seasons,
            priceRecommendation: priceRec,
            shippingRecommendation: shipRec,
            aiRecommendations: recs,
          }
        )
      );
    }

    if (!options?.trendingOnly) {
      upserted += await upsertProductIntelligence(payloads);
    }

    const trendingEntries = signalsList.map((s) => ({
      productId: s.productId,
      trendingScore: trendingScores.get(s.productId) ?? 0,
      signals: extractTrendingSignals(s) as unknown as Record<string, unknown>,
    }));
    trendingInserted += await insertTrendingHourly(trendingEntries);

    processed += batch.length;
  }

  let healthSnapshot = false;
  if (!options?.skipHealth && !options?.trendingOnly) {
    const { revenue, orders } = await fetchRevenue7d();
    const health = computeMarketplaceHealth(healthRows, revenue, orders);
    await insertHealthSnapshot(health);
    healthSnapshot = true;

    const aggRecs = aggregateRecommendations(allRecs);
    await logIntelligenceEvent("health_snapshot", {
      health,
      topRecommendations: aggRecs.slice(0, 10),
      processed,
    });
  }

  await logIntelligenceEvent("rank_update", { processed, upserted });

  return {
    processed,
    upserted,
    duplicatesHidden,
    trendingInserted,
    healthSnapshot,
    durationMs: Date.now() - start,
  };
}

export async function runTrendingUpdate(): Promise<{ processed: number; inserted: number }> {
  const result = await runMarketplaceIntelligence({
    trendingOnly: true,
    skipHealth: true,
  });
  return { processed: result.processed, inserted: result.trendingInserted };
}

export async function runDailyLearning(): Promise<IntelligenceRunResult> {
  return runMarketplaceIntelligence({ skipHealth: false });
}
