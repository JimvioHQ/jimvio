/**
 * Server-side catalog filter index — maps UI filters to database queries.
 */

import { getCatalogDB } from "./db";
import type { CatalogTier } from "./types";
import type { IntelligenceFilters } from "../import-intelligence/types";

/** Serializable filter params from API / UI */
export interface CatalogFilterIndex {
  hasVideo?: boolean;
  verifiedSupplier?: boolean;
  trending?: boolean;
  fastShipping?: boolean;
  usWarehouse?: boolean;
  euWarehouse?: boolean;
  ukWarehouse?: boolean;
  minImages?: number;
  hasDescription?: boolean;
  autoPublishReady?: boolean;
  autoPublishPending?: boolean;
  autoPublishRequirementsMissing?: boolean;
  autoPublishAdminOverride?: boolean;
  isPublished?: boolean;
  missingVideo?: boolean;
  missingSupplier?: boolean;
  missingShipping?: boolean;
  missingImages?: boolean;
  missingDescription?: boolean;
  missingVariants?: boolean;
  missingStock?: boolean;
  missingTrending?: boolean;
  hideImported?: boolean;
  minHealthScore?: number;
  minMargin?: number;
}

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

/** Apply intelligence-table filters to a joined Supabase query. */
export function applyIntelFiltersToQuery(
  query: CatalogQuery,
  filters: CatalogFilterIndex
): CatalogQuery {
  let q = query;

  if (filters.hasVideo) {
    q = q.eq("cj_product_intelligence.has_video", true);
  }
  if (filters.verifiedSupplier) {
    q = q.eq("cj_product_intelligence.supplier_verified", true);
  }
  if (filters.trending) {
    q = q.eq("cj_product_intelligence.trending", true);
  }
  if (filters.fastShipping) {
    q = q.lte("cj_product_intelligence.delivery_days", 7);
  }
  if (filters.minImages != null && filters.minImages > 0) {
    q = q.gte("cj_product_intelligence.image_count", filters.minImages);
  }
  if (filters.hasDescription) {
    q = q.gte("cj_product_intelligence.description_length", 100);
  }
  if (filters.minHealthScore != null && filters.minHealthScore > 0) {
    q = q.gte("cj_product_intelligence.health_score", filters.minHealthScore);
  }
  if (filters.minMargin != null && filters.minMargin > 0) {
    q = q.gte("cj_product_intelligence.margin_percent", filters.minMargin);
  }

  if (filters.autoPublishReady) {
    q = q
      .eq("cj_product_intelligence.auto_publish_ready", true)
      .eq("cj_product_intelligence.auto_publish_status", "READY");
  }
  if (filters.autoPublishPending) {
    q = q.eq("cj_product_intelligence.auto_publish_status", "PENDING_ENRICHMENT");
  }
  if (filters.autoPublishRequirementsMissing) {
    q = q.eq("cj_product_intelligence.auto_publish_status", "REQUIREMENTS_MISSING");
  }
  if (filters.autoPublishAdminOverride) {
    q = q.eq("cj_product_intelligence.is_admin_override", true);
  }
  if (filters.isPublished) {
    q = q.eq("cj_product_intelligence.is_published_active", true);
  }
  if (filters.hideImported) {
    q = q.is("cj_product_intelligence.linked_product_id", null);
  }

  for (const [key, label] of Object.entries(FAILURE_LABELS)) {
    const filterKey = key as keyof typeof FAILURE_LABELS;
    if (filters[filterKey as keyof CatalogFilterIndex]) {
      q = q.contains("cj_product_intelligence.auto_publish_failures", [label]);
    }
  }

  return q;
}

/** Apply raw-product warehouse filters. */
export function applyRawFiltersToQuery(
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

/** Global search across pid, sku, title, supplier, warehouse, product id. */
export function applyGlobalSearch(query: CatalogQuery, search: string): CatalogQuery {
  const q = search.trim();
  if (!q) return query;

  const escaped = q.replace(/[%_\\]/g, "\\$&");
  const pattern = `%${escaped}%`;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

  const parts = [
    `title.ilike.${pattern}`,
    `pid.ilike.${pattern}`,
    `sku.ilike.${pattern}`,
    `supplier.ilike.${pattern}`,
    `warehouse.ilike.${pattern}`,
  ];

  if (isUuid) {
    parts.push(`cj_product_intelligence.linked_product_id.eq.${q}`);
  }

  return query.or(parts.join(","));
}

export function parseCatalogFiltersFromParams(
  sp: URLSearchParams
): CatalogFilterIndex {
  const bool = (key: string) => sp.get(key) === "1" || sp.get(key) === "true";

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
    minHealthScore: sp.has("minHealthScore")
      ? parseInt(sp.get("minHealthScore") ?? "0", 10)
      : undefined,
    minMargin: sp.has("minMargin")
      ? parseFloat(sp.get("minMargin") ?? "0")
      : undefined,
  };
}

export function intelligenceFiltersToCatalogIndex(
  filters: IntelligenceFilters
): CatalogFilterIndex {
  return {
    hasVideo: Boolean(filters.hasVideo),
    verifiedSupplier: Boolean(filters.verifiedSupplier),
    trending: Boolean(filters.trending),
    fastShipping: Boolean(filters.fastShipping),
    usWarehouse: Boolean(filters.usWarehouse),
    euWarehouse: Boolean(filters.euWarehouse),
    ukWarehouse: Boolean(filters.ukWarehouse),
    minImages: filters.highQualityImages ? 5 : undefined,
    hasDescription: Boolean(filters.hasDescription),
    autoPublishReady: Boolean(filters.autoPublishReady),
    autoPublishPending: Boolean(filters.autoPublishPending),
    autoPublishRequirementsMissing: Boolean(filters.autoPublishRequirementsMissing),
    autoPublishAdminOverride: Boolean(filters.autoPublishAdminOverride),
    isPublished: Boolean(filters.isPublished),
    missingVideo: Boolean(filters.missingVideo),
    missingSupplier: Boolean(filters.missingSupplier),
    missingShipping: Boolean(filters.missingShipping),
    missingImages: Boolean(filters.missingImages),
    missingDescription: Boolean(filters.missingDescription),
    missingVariants: Boolean(filters.missingVariants),
    missingStock: Boolean(filters.missingStock),
    missingTrending: Boolean(filters.missingTrending),
    hideImported: Boolean(filters.hideImported),
    minHealthScore:
      typeof filters.minHealthScore === "number" && filters.minHealthScore > 0
        ? filters.minHealthScore
        : undefined,
    minMargin:
      typeof filters.minProfitPercent === "number" && filters.minProfitPercent > 0
        ? filters.minProfitPercent
        : undefined,
  };
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

async function countIntel(apply: (q: CatalogQuery) => CatalogQuery): Promise<number> {
  const db = getCatalogDB();
  let q = db
    .from("cj_product_intelligence")
    .select("pid", { count: "exact", head: true });
  q = apply(q);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

async function countRaw(apply: (q: CatalogQuery) => CatalogQuery): Promise<number> {
  const db = getCatalogDB();
  let q = db.from("cj_raw_products").select("pid", { count: "exact", head: true });
  q = apply(q);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

export async function computeCatalogFilterCounts(): Promise<CatalogFilterCounts> {
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
    countIntel((q) => q),
    countIntel((q) => q.eq("has_video", true)),
    countIntel((q) => q.eq("supplier_verified", true)),
    countIntel((q) => q.eq("trending", true)),
    countIntel((q) => q.lte("delivery_days", 7)),
    countIntel((q) => q.gte("image_count", 5)),
    countIntel((q) => q.eq("auto_publish_ready", true).eq("auto_publish_status", "READY")),
    countIntel((q) => q.eq("is_published_active", true)),
    countIntel((q) => q.eq("auto_publish_status", "PENDING_ENRICHMENT")),
    countIntel((q) => q.eq("auto_publish_status", "REQUIREMENTS_MISSING")),
    countIntel((q) => q.eq("is_admin_override", true)),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingVideo])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingSupplier])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingShipping])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingImages])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingDescription])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingVariants])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingStock])
    ),
    countIntel((q) =>
      q.contains("auto_publish_failures", [FAILURE_LABELS.missingTrending])
    ),
    countRaw((q) => q.or("country_code.eq.US,warehouse.ilike.%US%")),
    countRaw((q) => q.or("country_code.in.(DE,FR,EU),warehouse.ilike.%EU%")),
    countRaw((q) => q.or("country_code.eq.GB,warehouse.ilike.%UK%")),
    Promise.all(
      tiers.map(async (tier) => {
        const { count } = await db
          .from("cj_product_intelligence")
          .select("pid", { count: "exact", head: true })
          .eq("catalog_tier", tier);
        return [tier, count ?? 0] as const;
      })
    ),
  ]);

  return {
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
}

export function hasActiveServerFilters(filters: CatalogFilterIndex): boolean {
  return Object.entries(filters).some(([, v]) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v > 0;
    return false;
  });
}
