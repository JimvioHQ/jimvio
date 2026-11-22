import { getServiceClient, getCJToken, cjFetch } from "@/lib/cj/client";
import { enrichProduct } from "../import-intelligence/filters";
import { attachAutoPublish, evaluateAutoPublish } from "../import-intelligence/auto-publish-engine";
import { calculateOpportunityScore } from "../import-intelligence/opportunity-score";
import {
  classifyCatalogTier,
  computeCatalogBadges,
  computeConfidenceScore,
  computeQualityScores,
} from "../import-intelligence/quality-engine";
import type { EnrichedProduct } from "../import-intelligence/types";
import {
  ensureIntelligenceRows,
  enqueueEnrichment,
  finishSyncRun,
  makePendingIntelligence,
  startSyncRun,
  upsertRawProducts,
} from "./catalog-repository";
import { listV2RowToRaw, rawRowToCJProduct } from "./map-to-cj-product";
import { getListSyncPage, saveListSyncPage } from "./worker-coordinator";
import { filterLiveMappedCjRows } from "./catalog-retention";
import type { SyncListResult } from "./types";

const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const MAX_DURATION_MS = 160_000;

interface ListV2Response {
  data: {
    totalRecords: number;
    content: Array<{ productList: Array<Record<string, unknown>> }>;
  };
}

export async function syncCjListCatalog(options?: {
  maxPages?: number;
  maxDurationMs?: number;
  startPage?: number;
}): Promise<SyncListResult> {
  const runId = await startSyncRun("list_sync");
  const supabase = getServiceClient();
  const token = await getCJToken(supabase);

  let fetched = 0;
  let saved = 0;
  let enqueued = 0;
  let marketplaceEligible = 0;
  let errors = 0;
  const maxPages = options?.maxPages ?? MAX_PAGES;
  const budgetMs = options?.maxDurationMs ?? MAX_DURATION_MS;
  const startedAt = Date.now();
  let page = options?.startPage ?? (await getListSyncPage());
  let pagesThisRun = 0;
  let catalogComplete = false;

  try {
    while (pagesThisRun < maxPages) {
      if (Date.now() - startedAt >= budgetMs) break;

      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
        features: "enable_category,enable_video",
      });

      const json = await cjFetch<ListV2Response>(
        `/product/listV2?${params.toString()}`,
        token
      );

      const records = json.data?.content?.[0]?.productList ?? [];
      pagesThisRun += 1;
      if (records.length === 0) {
        catalogComplete = true;
        break;
      }

      fetched += records.length;
      const rawRows = records.map(listV2RowToRaw).filter((r) => r.pid);

      try {
        const pids = rawRows.map((row) => row.pid);
        const { data: mappings, error: mappingError } = await supabase
          .from("cj_product_map")
          .select("cj_pid, product_id")
          .in("cj_pid", pids);
        if (mappingError) throw new Error(mappingError.message);

        const productIds = [...new Set((mappings ?? []).map((row) => String(row.product_id)).filter(Boolean))];
        const { data: linkedProducts, error: productsError } = productIds.length
          ? await supabase
              .from("products")
              .select("id, status, is_active, deleted_at")
              .in("id", productIds)
          : { data: [], error: null };
        if (productsError) throw new Error(productsError.message);

        const marketplaceRows = filterLiveMappedCjRows(
          rawRows,
          (mappings ?? []).map((row) => ({
            cj_pid: String(row.cj_pid),
            product_id: String(row.product_id),
          })),
          (linkedProducts ?? []).map((product) => ({
            id: String(product.id),
            status: product.status == null ? null : String(product.status),
            is_active: typeof product.is_active === "boolean" ? product.is_active : null,
            deleted_at: product.deleted_at == null ? null : String(product.deleted_at),
          })),
        );

        marketplaceEligible += marketplaceRows.length;
        if (marketplaceRows.length > 0) {
          const n = await upsertRawProducts(marketplaceRows);
          saved += n;
          const marketplacePids = marketplaceRows.map((row) => row.pid);
          await ensureIntelligenceRows(marketplacePids);
          enqueued += await enqueueEnrichment(marketplacePids, 0);
        }
      } catch {
        errors += records.length;
      }

      const total = json.data?.totalRecords ?? 0;
      const reachedEnd = records.length < PAGE_SIZE || (total > 0 && page * PAGE_SIZE >= total);
      if (reachedEnd) {
        catalogComplete = true;
        break;
      }

      page += 1;
      await saveListSyncPage(page);
      await sleep(300);
    }

    const nextPage = catalogComplete ? 1 : page;
    await saveListSyncPage(nextPage);

    if (marketplaceEligible > 0 && saved === 0) {
      throw new Error(
        "Could not save catalog rows. Apply database/migrations/065_cj_premium_intelligence.sql and reload Supabase schema cache (Settings → API)."
      );
    }

    await finishSyncRun(runId, {
      status: errors > 0 || !catalogComplete ? "partial" : "success",
      total_fetched: fetched,
      total_saved: saved,
      total_errors: errors,
      metadata: { enqueued, pagesThisRun, nextPage, catalogComplete, marketplaceEligible },
    });
  } catch (err) {
    await finishSyncRun(runId, {
      status: "failed",
      total_fetched: fetched,
      total_saved: saved,
      total_errors: errors + 1,
      error_message: err instanceof Error ? err.message : "sync failed",
    });
    throw err;
  }

  return { fetched, saved, enqueued, errors };
}

export function scoreEnrichedProduct(
  product: EnrichedProduct,
  enrichmentStatus: "pending" | "processing" | "complete" | "failed"
): {
  qualityScores: ReturnType<typeof computeQualityScores>;
  catalogTier: ReturnType<typeof classifyCatalogTier>;
  badges: ReturnType<typeof computeCatalogBadges>;
  confidenceScore: number;
  opportunityScore: number;
  trending: boolean;
} {
  const opportunity = calculateOpportunityScore(product);
  product.intelligence.opportunityScore = opportunity.score;
  product.intelligence.opportunityLevel = opportunity.level;
  product.intelligence.opportunityReasons = opportunity.reasons;

  const ctx = { enrichmentStatus };
  const qualityScores = computeQualityScores(product, opportunity.score, ctx);
  product.intelligence.qualityScores = qualityScores;
  product.intelligence.healthScore = qualityScores.healthScore;
  product.intelligence.enrichmentStatus = enrichmentStatus;
  product.intelligence.confidenceScore = computeConfidenceScore(
    product,
    enrichmentStatus === "complete"
  );

  const catalogTier = classifyCatalogTier(product, qualityScores, ctx);
  product.intelligence.catalogTier = catalogTier;
  product.intelligence.catalogBadges = computeCatalogBadges(product);

  return {
    qualityScores,
    catalogTier,
    badges: product.intelligence.catalogBadges,
    confidenceScore: product.intelligence.confidenceScore ?? 50,
    opportunityScore: opportunity.score,
    trending: product.intelligence.trending,
  };
}

/** Fast path for catalog API — uses DB scores when complete, skips re-scoring pending rows. */
export function buildLiteEnrichedFromRaw(
  raw: Parameters<typeof rawRowToCJProduct>[0],
  intel: Parameters<typeof rawRowToCJProduct>[1],
  importedMap: Record<string, { productId: string }> = {}
): EnrichedProduct {
  const intelRow =
    intel && intel.enrichment_status !== undefined
      ? intel
      : makePendingIntelligence(raw.pid);

  const cj = rawRowToCJProduct(raw, intelRow);
  const enriched = enrichProduct(cj, importedMap);
  const status = intelRow.enrichment_status;

  enriched.intelligence.catalogTier = intelRow.catalog_tier;
  enriched.intelligence.enrichmentStatus = status;
  enriched.intelligence.healthScore = intelRow.health_score;
  enriched.intelligence.confidenceScore = intelRow.confidence_score;
  enriched.intelligence.trending = intelRow.trending;
  enriched.intelligence.opportunityScore = intelRow.opportunity_score;

  if (status === "complete") {
    enriched.intelligence.qualityScores =
      intelRow.quality_scores as unknown as EnrichedProduct["intelligence"]["qualityScores"];
    enriched.intelligence.catalogBadges =
      (intelRow.badges as EnrichedProduct["intelligence"]["catalogBadges"]) ?? [];
    if (intelRow.margin_percent != null) {
      enriched.intelligence.profit.marginPercent = intelRow.margin_percent;
    }
    if (intelRow.last_auto_publish_check) {
      const live = evaluateAutoPublish(enriched);
      enriched.intelligence.autoPublish = {
        ready: intelRow.auto_publish_ready,
        score: intelRow.auto_publish_score,
        status: (intelRow.auto_publish_status as typeof live.status) ?? live.status,
        failures: intelRow.auto_publish_failures ?? [],
        pendingEnrichment: intelRow.pending_enrichment_reasons ?? [],
        checks: live.checks,
        decision: live.decision,
        lastCheck: intelRow.last_auto_publish_check,
      };
    }
    return attachAutoPublish(enriched);
  }

  return enriched;
}

export function buildEnrichedFromRaw(
  raw: Parameters<typeof rawRowToCJProduct>[0],
  intel: Parameters<typeof rawRowToCJProduct>[1],
  importedMap: Record<string, { productId: string }> = {}
): EnrichedProduct {
  const cj = rawRowToCJProduct(raw, intel);
  const enriched = enrichProduct(cj, importedMap);
  const status = intel?.enrichment_status ?? "pending";

  const intelRow =
    intel && intel.enrichment_status !== undefined
      ? intel
      : makePendingIntelligence(raw.pid);

  if (status === "complete" && intelRow.enrichment_status === "complete") {
    enriched.intelligence.catalogTier = intelRow.catalog_tier;
    enriched.intelligence.healthScore = intelRow.health_score;
    enriched.intelligence.qualityScores =
      intelRow.quality_scores as unknown as EnrichedProduct["intelligence"]["qualityScores"];
    enriched.intelligence.catalogBadges =
      (intelRow.badges as EnrichedProduct["intelligence"]["catalogBadges"]) ?? [];
    enriched.intelligence.enrichmentStatus = "complete";
    enriched.intelligence.confidenceScore = intelRow.confidence_score;
    enriched.intelligence.trending = intelRow.trending;
    enriched.intelligence.opportunityScore = intelRow.opportunity_score;
    if (intelRow.margin_percent != null) {
      enriched.intelligence.profit.marginPercent = intelRow.margin_percent;
    }
    return attachAutoPublish(enriched);
  }

  enriched.intelligence.catalogTier = intelRow.catalog_tier;
  enriched.intelligence.enrichmentStatus = intelRow.enrichment_status;
  scoreEnrichedProduct(enriched, status === "dead_letter" ? "failed" : status);
  return attachAutoPublish(enriched);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
