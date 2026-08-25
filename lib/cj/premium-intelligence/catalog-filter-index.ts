/**
 * Server-side catalog filter index — maps UI filters to database queries.
 */

import { getCatalogDB } from "./db";
import type { CatalogTier } from "./types";
import { getCached, setCached } from "./catalog-cache";
import type { CatalogFilterIndex } from "./catalog-filter-shared";

export type { CatalogFilterIndex } from "./catalog-filter-shared";
export { intelligenceFiltersToCatalogIndex } from "./catalog-filter-shared";

const FILTER_COUNTS_CACHE_KEY = "catalog-filter-counts";
const FILTER_COUNTS_TTL_MS = 120_000;


export const FAILURE_LABELS = {
  missingVideo: "Missing Product Video",
  missingSupplier: "Supplier Not Verified",
  missingShipping: "Fast Shipping Missing",
  missingImages: "Insufficient Images",
  missingDescription: "Incomplete Description",
  missingVariants: "Missing Variants",
  missingStock: "Out of Stock",
  missingTrending: "Product Not Trending",
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CatalogQuery = any;

const MIN_DESCRIPTION_LENGTH = 80;
const MIN_IMAGE_COUNT = 5;
const FAST_SHIPPING_DAYS = 7;

/**
 * Apply intelligence filters on cj_product_intelligence directly (no join prefix).
 * Uses indexed columns — never JSON contains (causes invalid json errors on joins).
 */
export function applyIntelFiltersStandalone(
  query: CatalogQuery,
  filters: CatalogFilterIndex
): CatalogQuery {
  let q = query;

  if (filters.hasVideo) q = q.eq("has_video", true);
  if (filters.verifiedSupplier) q = q.eq("supplier_verified", true);
  if (filters.trending) q = q.eq("trending", true);
  if (filters.fastShipping) {
    q = q.not("delivery_days", "is", null).lte("delivery_days", FAST_SHIPPING_DAYS);
  }
  if (filters.minImages != null && filters.minImages > 0) {
    q = q.gte("image_count", filters.minImages);
  }
  if (filters.hasDescription) {
    q = q.gte("description_length", MIN_DESCRIPTION_LENGTH);
  }
  if (filters.minHealthScore != null && filters.minHealthScore > 0) {
    q = q.gte("health_score", filters.minHealthScore);
  }
  if (filters.minMargin != null && filters.minMargin > 0) {
    q = q.gte("margin_percent", filters.minMargin);
  }

  if (filters.autoPublishReady) {
    q = q.eq("auto_publish_ready", true).eq("auto_publish_status", "READY");
  }
  if (filters.autoPublishPending) {
    q = q.eq("auto_publish_status", "PENDING_ENRICHMENT");
  }
  if (filters.autoPublishRequirementsMissing) {
    q = q.eq("auto_publish_status", "REQUIREMENTS_MISSING");
  }
  if (filters.autoPublishAdminOverride) {
    q = q.eq("is_admin_override", true);
  }
  if (filters.isPublished) {
    q = q.eq("is_published_active", true);
  }
  if (filters.hideImported) {
    q = q.is("linked_product_id", null);
  }
  if (filters.isHidden) {
    q = q.eq("catalog_tier", "HIDDEN");
  }
  if (filters.isDraft) {
    q = q.not("linked_product_id", "is", null).eq("is_published_active", false);
  }

  if (filters.missingVideo) q = q.eq("has_video", false);
  if (filters.missingSupplier) q = q.eq("supplier_verified", false);
  if (filters.missingShipping) {
    q = q.or(`delivery_days.gt.${FAST_SHIPPING_DAYS},delivery_days.is.null`);
  }
  if (filters.missingImages) q = q.lt("image_count", MIN_IMAGE_COUNT);
  if (filters.missingDescription) q = q.lt("description_length", MIN_DESCRIPTION_LENGTH);
  if (filters.missingTrending) q = q.eq("trending", false);
  if (filters.missingStock) {
    q = q.filter("auto_publish_failures", "cs", JSON.stringify([FAILURE_LABELS.missingStock]));
  }
  if (filters.missingVariants) {
    q = q.filter("auto_publish_failures", "cs", JSON.stringify([FAILURE_LABELS.missingVariants]));
  }

  return q;
}

/** @deprecated Use applyIntelFiltersStandalone — kept for compatibility */
export function applyIntelFiltersToQuery(
  query: CatalogQuery,
  filters: CatalogFilterIndex
): CatalogQuery {
  return applyIntelFiltersStandalone(query, filters);
}

/** Apply raw-product warehouse filters (standalone cj_raw_products query). */
export function applyRawFiltersStandalone(
  query: CatalogQuery,
  filters: CatalogFilterIndex
): CatalogQuery {
  let q = query;

  if (filters.usWarehouse) {
    q = q.or("country_code.eq.US,warehouse.ilike.%US%");
  }
  if (filters.euWarehouse) {
    q = q.or("country_code.in.(DE,FR,EU),warehouse.ilike.%EU%");
  }
  if (filters.ukWarehouse) {
    q = q.or("country_code.eq.GB,warehouse.ilike.%UK%");
  }

  return q;
}

/** @deprecated Use applyRawFiltersStandalone */
export function applyRawFiltersToQuery(
  query: CatalogQuery,
  filters: CatalogFilterIndex
): CatalogQuery {
  return applyRawFiltersStandalone(query, filters);
}

/** Search raw products by pid, sku, title, supplier, warehouse. */
export function applyRawSearchStandalone(query: CatalogQuery, search: string): CatalogQuery {
  const q = search.trim();
  if (!q) return query;

  const escaped = q.replace(/[%_\\]/g, "\\$&");
  const pattern = `%${escaped}%`;

  return query.or(
    [
      `title.ilike.${pattern}`,
      `pid.ilike.${pattern}`,
      `sku.ilike.${pattern}`,
      `supplier.ilike.${pattern}`,
      `warehouse.ilike.${pattern}`,
    ].join(",")
  );
}

/** @deprecated Use applyRawSearchStandalone */
export function applyGlobalSearch(query: CatalogQuery, search: string): CatalogQuery {
  return applyRawSearchStandalone(query, search);
}

export function parseCatalogFiltersFromParams(
  sp: URLSearchParams
): CatalogFilterIndex {
  const bool = (key: string) => sp.get(key) === "1" || sp.get(key) === "true";

  const queueStatus = sp.get("publishQueueStatus");
  const publishQueueStatus =
    queueStatus === "pending" || queueStatus === "processing" || queueStatus === "failed"
      ? queueStatus
      : undefined;

  return {
    hasVideo: bool("hasVideo"),
    verifiedSupplier: bool("verifiedSupplier"),
    trending: bool("trending"),
    fastShipping: bool("fastShipping"),
    usWarehouse: bool("usWarehouse"),
    euWarehouse: bool("euWarehouse"),
    ukWarehouse: bool("ukWarehouse"),
    minImages: sp.has("minImages")
      ? parseInt(sp.get("minImages") ?? "0", 10)
      : bool("highQualityImages")
        ? 5
        : undefined,
    hasDescription: bool("hasDescription"),
    autoPublishReady: bool("autoPublishReady"),
    autoPublishPending: bool("autoPublishPending"),
    autoPublishRequirementsMissing: bool("autoPublishRequirementsMissing"),
    autoPublishAdminOverride: bool("autoPublishAdminOverride"),
    isPublished: bool("isPublished"),
    missingVideo: bool("missingVideo"),
    missingSupplier: bool("missingSupplier"),
    missingShipping: bool("missingShipping"),
    missingImages: bool("missingImages"),
    missingDescription: bool("missingDescription"),
    missingVariants: bool("missingVariants"),
    missingStock: bool("missingStock"),
    missingTrending: bool("missingTrending"),
    hideImported: bool("hideImported"),
    isDraft: bool("isDraft"),
    isHidden: bool("isHidden"),
    publishQueueStatus,
    minHealthScore: sp.has("minHealthScore")
      ? parseInt(sp.get("minHealthScore") ?? "0", 10)
      : undefined,
    minMargin: sp.has("minMargin")
      ? parseFloat(sp.get("minMargin") ?? "0")
      : undefined,
  };
}

/** PIDs in auto-publish queue by status */
export async function getAutoPublishQueuePids(
  status: "pending" | "processing" | "failed"
): Promise<string[]> {
  const db = getCatalogDB();
  const statuses =
    status === "failed" ? (["failed", "dead_letter"] as const) : ([status] as const);
  const { data } = await db
    .from("cj_auto_publish_queue")
    .select("pid")
    .in("status", [...statuses])
    .limit(5000);
  return (data ?? []).map((r) => r.pid as string);
}

/** Resolve PIDs matching warehouse filters from raw table. */
export async function getWarehouseFilterPids(
  filters: CatalogFilterIndex,
  limit = 5000
): Promise<string[]> {
  const db = getCatalogDB();
  let q = db.from("cj_raw_products").select("pid").limit(limit);
  q = applyRawFiltersStandalone(q, filters);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.pid as string);
}

/** Resolve PIDs from raw search fallback. */
export async function getRawSearchPids(search: string, limit = 1000): Promise<string[]> {
  const db = getCatalogDB();
  let q = db.from("cj_raw_products").select("pid").limit(limit);
  q = applyRawSearchStandalone(q, search);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.pid as string);
}

export interface CatalogFilterCounts {
  hasVideo: number;
  verifiedSupplier: number;
  trending: number;
  fastShipping: number;
  usWarehouse: number;
  euWarehouse: number;
  ukWarehouse: number;
  highQualityImages: number;
  ready: number;
  published: number;
  pending: number;
  requirementsMissing: number;
  adminOverride: number;
  missingVideo: number;
  missingSupplier: number;
  missingShipping: number;
  missingImages: number;
  missingDescription: number;
  missingVariants: number;
  missingStock: number;
  missingTrending: number;
  tierCounts: Record<CatalogTier, number>;
  totalProducts: number;
  computedAt: string;
}

async function countIntel(
  apply: (q: CatalogQuery) => CatalogQuery,
  exact = false
): Promise<number> {
  const db = getCatalogDB();
  let q = db
    .from("cj_product_intelligence")
    .select("pid", { count: exact ? "exact" : "estimated", head: true });
  q = apply(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function countIntelSafe(
  apply: (q: CatalogQuery) => CatalogQuery,
  exact = false
): Promise<number> {
  try {
    return await countIntel(apply, exact);
  } catch {
    return 0;
  }
}

function countIntelWithFailureLabel(label: string): (q: CatalogQuery) => CatalogQuery {
  return (q) => q.filter("auto_publish_failures", "cs", JSON.stringify([label]));
}

async function countRaw(apply: (q: CatalogQuery) => CatalogQuery): Promise<number> {
  const db = getCatalogDB();
  let q = db.from("cj_raw_products").select("pid", { count: "estimated", head: true });
  q = apply(q);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

export async function computeCatalogFilterCounts(): Promise<CatalogFilterCounts> {
  const cached = getCached<CatalogFilterCounts>(FILTER_COUNTS_CACHE_KEY);
  if (cached) return cached;

  const db = getCatalogDB();
  const tiers: CatalogTier[] = ["ELITE", "PREMIUM", "STANDARD", "PENDING", "HIDDEN"];

  const [
    totalProducts,
    hasVideo,
    verifiedSupplier,
    trending,
    fastShipping,
    highQualityImages,
    ready,
    published,
    pending,
    requirementsMissing,
    adminOverride,
    missingVideo,
    missingSupplier,
    missingShipping,
    missingImages,
    missingDescription,
    missingVariants,
    missingStock,
    missingTrending,
    usWarehouse,
    euWarehouse,
    ukWarehouse,
    tierEntries,
  ] = await Promise.all([
    countIntelSafe((q) => q),
    countIntelSafe((q) => q.eq("has_video", true)),
    countIntelSafe((q) => q.eq("supplier_verified", true)),
    countIntelSafe((q) => q.eq("trending", true)),
    countIntelSafe((q) => q.not("delivery_days", "is", null).lte("delivery_days", FAST_SHIPPING_DAYS)),
    countIntelSafe((q) => q.gte("image_count", MIN_IMAGE_COUNT)),
    countIntelSafe((q) => q.eq("auto_publish_ready", true).eq("auto_publish_status", "READY"), true),
    countIntelSafe((q) => q.eq("is_published_active", true), true),
    countIntelSafe((q) => q.eq("auto_publish_status", "PENDING_ENRICHMENT"), true),
    countIntelSafe((q) => q.eq("auto_publish_status", "REQUIREMENTS_MISSING"), true),
    countIntelSafe((q) => q.eq("is_admin_override", true)),
    countIntelSafe((q) => q.eq("has_video", false)),
    countIntelSafe((q) => q.eq("supplier_verified", false)),
    countIntelSafe((q) => q.or(`delivery_days.gt.${FAST_SHIPPING_DAYS},delivery_days.is.null`)),
    countIntelSafe((q) => q.lt("image_count", MIN_IMAGE_COUNT)),
    countIntelSafe((q) => q.lt("description_length", MIN_DESCRIPTION_LENGTH)),
    countIntelSafe(countIntelWithFailureLabel(FAILURE_LABELS.missingVariants)),
    countIntelSafe(countIntelWithFailureLabel(FAILURE_LABELS.missingStock)),
    countIntelSafe((q) => q.eq("trending", false)),
    countRaw((q) => q.or("country_code.eq.US,warehouse.ilike.%US%")),
    countRaw((q) => q.or("country_code.in.(DE,FR,EU),warehouse.ilike.%EU%")),
    countRaw((q) => q.or("country_code.eq.GB,warehouse.ilike.%UK%")),
    Promise.all(
      tiers.map(async (tier) => {
        const { count } = await db
          .from("cj_product_intelligence")
          .select("pid", { count: "estimated", head: true })
          .eq("catalog_tier", tier);
        return [tier, count ?? 0] as const;
      })
    ),
  ]);

  const result = {
    hasVideo,
    verifiedSupplier,
    trending,
    fastShipping,
    usWarehouse,
    euWarehouse,
    ukWarehouse,
    highQualityImages,
    ready,
    published,
    pending,
    requirementsMissing,
    adminOverride,
    missingVideo,
    missingSupplier,
    missingShipping,
    missingImages,
    missingDescription,
    missingVariants,
    missingStock,
    missingTrending,
    tierCounts: Object.fromEntries(tierEntries) as Record<CatalogTier, number>,
    totalProducts,
    computedAt: new Date().toISOString(),
  };

  setCached(FILTER_COUNTS_CACHE_KEY, result, FILTER_COUNTS_TTL_MS);
  return result;
}

export function hasActiveServerFilters(filters: CatalogFilterIndex): boolean {
  return Object.entries(filters).some(([, v]) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v > 0;
    if (typeof v === "string") return v.length > 0;
    return false;
  });
}
