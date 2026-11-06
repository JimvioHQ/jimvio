/**
 * Strategy import: brings new CJ products into the Marketplace only when they fit the
 * 2026–2030 strategy AND are trending AND come from a verified supplier AND have a
 * genuine product video AND are in stock. Every product still passes the existing
 * import (Jimvio pricing formula, variants, stock) and publish gates; this job only
 * chooses which CJ products are worth trying. Runs in small batches so it stays well
 * inside the CJ API points budget, and stops when the quota circuit is open.
 */
import { STRATEGY_CATEGORIES, type StrategyCategoryId } from "@/lib/marketplace/catalog-strategy";
import { getCJToken, getServiceClient, cjFetchWithRetry } from "@/lib/cj/client";
import { listV2RowToRaw, rawRowToCJProduct } from "./map-to-cj-product";
import { upsertRawProducts } from "./catalog-repository";
import { calculateSupplierScore, calculateTrendScore } from "@/lib/cj/import-intelligence/product-utils";
import { evaluateStrategyRow, keywordsForRun, titleMatchesKeyword } from "./strategy-select";
import {
  importAndPublishStrategyCandidate,
  strategyCandidateFromRaw,
  withCjVideos,
} from "./publish-qualified-catalog";
import type { CjRawProductRow } from "./types";

export {
  STRATEGY_MIN_STOCK,
  STRATEGY_MIN_COST_USD,
  STRATEGY_MAX_COST_USD,
  strategyKeywords,
  keywordsForRun,
  titleMatchesKeyword,
  evaluateStrategyRow,
} from "./strategy-select";
export type { StrategyKeyword, StrategyEvaluation } from "./strategy-select";

export type StrategyImportResult = {
  keywords: string[];
  searched: number;
  qualified: number;
  published: number;
  skipped: number;
  failed: number;
  categoriesFull: string[];
  rejected: Record<string, number>;
  publishedPids: string[];
};

async function liveCountsByCategory(): Promise<Map<StrategyCategoryId, number>> {
  const db = getServiceClient();
  const { data } = await db
    .from("products")
    .select("name")
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .limit(5000);
  const counts = new Map<StrategyCategoryId, number>();
  for (const c of STRATEGY_CATEGORIES) {
    counts.set(c.id, (data ?? []).filter((row) => c.keywords.some((k) => titleMatchesKeyword(String(row.name ?? ""), k))).length);
  }
  return counts;
}

export async function runStrategyImport(options: { keywordsPerRun?: number; maxPublish?: number; now?: Date } = {}): Promise<StrategyImportResult> {
  const keywords = keywordsForRun(options.now ?? new Date(), options.keywordsPerRun ?? 2);
  const maxPublish = options.maxPublish ?? 6;
  const result: StrategyImportResult = {
    keywords: keywords.map((k) => k.keyword),
    searched: 0,
    qualified: 0,
    published: 0,
    skipped: 0,
    failed: 0,
    categoriesFull: [],
    rejected: {},
    publishedPids: [],
  };

  const counts = await liveCountsByCategory();
  const token = await getCJToken(getServiceClient());

  for (const kw of keywords) {
    if (result.published >= maxPublish) break;
    if ((counts.get(kw.category) ?? 0) >= kw.target) {
      result.categoriesFull.push(kw.category);
      continue;
    }

    const params = new URLSearchParams({ page: "1", size: "40", keyWord: kw.keyword, features: "enable_category,enable_video" });
    const json = await cjFetchWithRetry<{ data?: { content?: Array<{ productList?: Record<string, unknown>[] }> } }>(
      `/product/listV2?${params.toString()}`,
      token,
      {},
      { maxRetries: 2 },
    );
    const rows = (json.data?.content?.[0]?.productList ?? []).map(listV2RowToRaw).filter((r) => r.pid);
    result.searched += rows.length;
    if (rows.length === 0) continue;
    await upsertRawProducts(rows);

    for (const row of rows) {
      if (result.published >= maxPublish) break;
      if ((counts.get(kw.category) ?? 0) >= kw.target) break;
      const cj = rawRowToCJProduct(row as unknown as CjRawProductRow);
      const evaluation = evaluateStrategyRow({
        title: row.title,
        keyword: kw.keyword,
        stock: Number(row.stock ?? 0),
        costUsd: Number(row.cost ?? 0),
        trendScore: calculateTrendScore(cj),
        supplierScore: calculateSupplierScore(cj),
        verifiedWarehouse: cj.verifiedWarehouse ?? null,
        supplierVerifiedFlag: cj.supplierVerified === true,
      });
      if (!evaluation.qualified) {
        for (const reason of evaluation.reasons) result.rejected[reason] = (result.rejected[reason] ?? 0) + 1;
        continue;
      }
      result.qualified += 1;

      const base = strategyCandidateFromRaw(
        {
          pid: row.pid,
          title: row.title,
          image: row.image,
          sku: row.sku,
          stock: Number(row.stock ?? 0),
          sell_price: Number(row.sell_price ?? 0),
          orders: Number(row.orders ?? 0),
          raw_payload: row.raw_payload as Record<string, unknown>,
        },
        {
          trending: evaluation.trending,
          supplierVerified: evaluation.supplierVerified,
          verifiedWarehouse: cj.verifiedWarehouse ?? null,
          imageCount: 0,
          descriptionLength: 0,
        },
      );
      const candidate = await withCjVideos(base);
      if (candidate.payload_videos.length === 0) {
        result.rejected.no_video = (result.rejected.no_video ?? 0) + 1;
        continue;
      }

      try {
        const { outcome } = await importAndPublishStrategyCandidate(candidate);
        if (outcome === "published") {
          result.published += 1;
          result.publishedPids.push(row.pid);
          counts.set(kw.category, (counts.get(kw.category) ?? 0) + 1);
        } else if (outcome === "skipped") result.skipped += 1;
        else result.failed += 1;
      } catch {
        result.failed += 1;
      }
    }
  }

  return result;
}
