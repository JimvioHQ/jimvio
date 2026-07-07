import { getCatalogDB } from "./db";
import { syncCjListCatalog } from "./score-product";
import { processEnrichmentQueue } from "./process-enrichment-queue";
import { finishSyncRun, startSyncRun } from "./catalog-repository";
import { rawRowToCJProduct } from "./map-to-cj-product";
import { scoreEnrichedProduct } from "./score-product";
import { enrichProduct } from "../import-intelligence/filters";
import { attachAutoPublish, evaluateAutoPublish, toAutoPublishDbPayload } from "../import-intelligence/auto-publish-engine";
import type { EnrichedProduct } from "../import-intelligence/types";

/** 6-hour refresh: stock, shipping, price from list sync + re-enqueue stale */
export async function runSixHourRefresh(): Promise<{
  listSync: Awaited<ReturnType<typeof syncCjListCatalog>>;
  enrichment: Awaited<ReturnType<typeof processEnrichmentQueue>>;
}> {
  const listSync = await syncCjListCatalog({ maxPages: 120 });
  const enrichment = await processEnrichmentQueue(25);
  return { listSync, enrichment };
}

/** 24-hour recalculation: trend, health, supplier scores for enriched products */
export async function runDailyScoreRecalc(): Promise<{ rescored: number }> {
  const runId = await startSyncRun("score_recalc");
  const db = getCatalogDB();

  const { data: rows, error } = await db
    .from("cj_product_intelligence")
    .select("*, cj_raw_products(*)")
    .eq("enrichment_status", "complete")
    .limit(5000);

  if (error) throw new Error(error.message);

  let rescored = 0;
  for (const row of rows ?? []) {
    const raw = Array.isArray(row.cj_raw_products)
      ? row.cj_raw_products[0]
      : row.cj_raw_products;
    if (!raw) continue;

    const cj = rawRowToCJProduct(raw, row);
    const stub: EnrichedProduct = {
      ...cj,
      intelligence: {
        healthScore: row.health_score,
        healthLabel: "good",
        profit: {
          cjCost: Number(raw.cost ?? 0),
          shippingCost: 0,
          suggestedSelling: Number(raw.sell_price ?? 0),
          estimatedProfit: 0,
          marginPercent: row.margin_percent ?? 0,
          roi: 0,
        },
        isImported: false,
        marketFit: { us: false, eu: false, uk: false, worldwide: true },
        supplierScore: 0,
        trending: row.trending,
        hasVariants: false,
        stockStable: raw.stock >= 50,
        opportunityScore: row.opportunity_score,
        opportunityLevel: "skip",
        opportunityReasons: [],
        catalogTier: row.catalog_tier,
        catalogBadges: row.badges ?? [],
        qualityScores: row.quality_scores as EnrichedProduct["intelligence"]["qualityScores"],
      },
    };

    const enriched = enrichProduct(cj, {});
    enriched.intelligence.trending = row.trending;
    const scored = scoreEnrichedProduct(enriched, "complete");
    const withAutoPublish = attachAutoPublish(enriched);

    await db
      .from("cj_product_intelligence")
      .update({
        health_score: scored.qualityScores.healthScore,
        catalog_tier: scored.catalogTier,
        badges: scored.badges,
        margin_percent: enriched.intelligence.profit.marginPercent,
        quality_scores: scored.qualityScores,
        opportunity_score: scored.opportunityScore,
        trending: scored.trending,
        scored_at: new Date().toISOString(),
        ...toAutoPublishDbPayload(evaluateAutoPublish(withAutoPublish)),
      })
      .eq("pid", row.pid);

    rescored++;
  }

  await finishSyncRun(runId, {
    status: "success",
    total_saved: rescored,
    metadata: { rescored },
  });

  return { rescored };
}
