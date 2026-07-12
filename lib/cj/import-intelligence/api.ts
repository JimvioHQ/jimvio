import type { CJApiFilters, CJProduct, CatalogTier } from "./types";
import { intelligenceFiltersToCatalogIndex } from "@/lib/cj/premium-intelligence/catalog-filter-index";
import type { IntelligenceFilters } from "./types";

const CATALOG_CACHE_TTL_MS = 30_000;
const META_CACHE_TTL_MS = 45_000;
const cache = new Map<string, { data: unknown; ts: number }>();

async function cachedFetch<T>(url: string, ttl = CATALOG_CACHE_TTL_MS): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < ttl) {
    return hit.data as T;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = await res.json();
  cache.set(url, { data, ts: Date.now() });
  return data as T;
}

export function invalidateCJCache(): void {
  cache.clear();
}

export interface FetchCatalogOptions {
  tiers?: CatalogTier[];
  sort?: string;
  cursor?: string | null;
  intelFilters?: IntelligenceFilters;
}

function appendIntelFilterParams(
  params: URLSearchParams,
  intel?: IntelligenceFilters
): void {
  if (!intel) return;
  const index = intelligenceFiltersToCatalogIndex(intel);
  const map: Record<string, boolean | number | undefined> = {
    hasVideo: index.hasVideo,
    verifiedSupplier: index.verifiedSupplier,
    trending: index.trending,
    fastShipping: index.fastShipping,
    usWarehouse: index.usWarehouse,
    euWarehouse: index.euWarehouse,
    ukWarehouse: index.ukWarehouse,
    highQualityImages: index.minImages === 5,
    hasDescription: index.hasDescription,
    autoPublishReady: index.autoPublishReady,
    autoPublishPending: index.autoPublishPending,
    autoPublishRequirementsMissing: index.autoPublishRequirementsMissing,
    autoPublishAdminOverride: index.autoPublishAdminOverride,
    isPublished: index.isPublished,
    missingVideo: index.missingVideo,
    missingSupplier: index.missingSupplier,
    missingShipping: index.missingShipping,
    missingImages: index.missingImages,
    missingDescription: index.missingDescription,
    missingVariants: index.missingVariants,
    missingStock: index.missingStock,
    missingTrending: index.missingTrending,
    hideImported: index.hideImported,
    isDraft: index.isDraft,
    isHidden: index.isHidden,
  };
  if (index.minHealthScore) params.set("minHealthScore", String(index.minHealthScore));
  if (index.minMargin) params.set("minMargin", String(index.minMargin));
  if (index.publishQueueStatus) {
    params.set("publishQueueStatus", index.publishQueueStatus);
  }
  for (const [key, val] of Object.entries(map)) {
    if (val) params.set(key, "1");
  }
}

export async function fetchCJProducts(
  filters: CJApiFilters,
  page: number,
  pageSize: number,
  options?: FetchCatalogOptions
): Promise<{
  products: CJProduct[];
  total: number;
  needsSync?: boolean;
  tierCounts?: Record<string, number>;
  lastSyncAt?: string | null;
  nextCursor?: string | null;
}> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters.keyWord) params.set("search", filters.keyWord);
  if (options?.sort) params.set("sort", options.sort);
  else if (filters.sort) {
    params.set("sort", filters.orderBy === "createAt" ? "newest" : "curated");
  }
  if (options?.tiers?.length) {
    params.set("tiers", options.tiers.join(","));
  }
  if (options?.cursor) {
    params.set("cursor", options.cursor);
  }
  appendIntelFilterParams(params, options?.intelFilters);

  const json = await cachedFetch<{
    success: boolean;
    products: CJProduct[];
    total: number;
    catalogTotal?: number;
    needsSync?: boolean;
    tierCounts?: Record<string, number>;
    lastSyncAt?: string | null;
    nextCursor?: string | null;
    error?: string;
  }>(`/api/admin/cj/catalog?${params.toString()}`);

  if (!json.success) throw new Error(json.error || "Could not load catalog");
  return {
    products: json.products as unknown as CJProduct[],
    total: json.catalogTotal ?? json.total,
    needsSync: json.needsSync,
    tierCounts: json.tierCounts,
    lastSyncAt: json.lastSyncAt ?? null,
    nextCursor: json.nextCursor ?? null,
  };
}

export async function fetchCatalogIntelligenceBatch(
  pids: string[]
): Promise<Record<string, Record<string, unknown>>> {
  if (pids.length === 0) return {};
  const unique = [...new Set(pids)].slice(0, 60);
  const res = await fetch(
    `/api/admin/cj/catalog/intelligence?pids=${encodeURIComponent(unique.join(","))}`
  );
  const json = await res.json();
  if (!json.success) return {};
  return json.items ?? {};
}

export async function fetchCatalogMeta(): Promise<{
  needsSync: boolean;
  tierCounts?: Record<string, number>;
  lastSyncAt?: string | null;
}> {
  const json = await cachedFetch<{
    success: boolean;
    needsSync?: boolean;
    tierCounts?: Record<string, number>;
    lastSyncAt?: string | null;
  }>("/api/admin/cj/catalog?page=1&pageSize=1", META_CACHE_TTL_MS);
  return {
    needsSync: Boolean(json.needsSync),
    tierCounts: json.tierCounts,
    lastSyncAt: json.lastSyncAt,
  };
}

export async function triggerCatalogSync(): Promise<void> {
  const res = await fetch("/api/admin/cj/catalog/sync", { method: "POST" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Catalog sync failed");
  }
  invalidateCJCache();
}

export interface CJCategory {
  categoryId: string;
  categoryName: string;
}

export async function fetchCatalogFilterCounts(): Promise<{
  counts: Record<string, number>;
  scanner: Record<string, unknown>;
}> {
  const res = await fetch("/api/admin/cj/catalog/filter-counts");
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Could not load filter counts");
  return { counts: json.counts, scanner: json.scanner };
}

export async function fetchCJCategories(): Promise<CJCategory[]> {
  const json = await cachedFetch<{ categories?: CJCategory[] }>(
    "/api/cj/categories",
    META_CACHE_TTL_MS
  );
  return json.categories || [];
}

export interface ProductPreviewDetail {
  success: boolean;
  videos: string[];
  poster?: string;
  images: string[];
  hasVideo: boolean;
  description?: string;
  variants?: Array<{
    vid: string;
    name: string;
    sku: string;
    price: number;
    image?: string;
    stock?: number;
  }>;
  specifications?: Array<{ key: string; value: string }>;
  shippingOptions?: Array<{
    country: string;
    days: string;
    cost: string;
  }>;
  supplier?: {
    name: string;
    verified: boolean;
    score: number;
  };
  reviews?: Array<{ rating: number; text: string }>;
  profit?: {
    cjCost: number;
    shippingCost: number;
    suggestedSelling: number;
    estimatedProfit: number;
    marginPercent: number;
    roi: number;
  };
  error?: string;
}

export async function fetchProductPreview(pid: string): Promise<ProductPreviewDetail> {
  return cachedFetch<ProductPreviewDetail>(
    `/api/cj/products/${encodeURIComponent(pid)}?detail=1`
  );
}

export async function fetchImportedMap(): Promise<
  Record<string, { productId: string; name?: string; sku?: string }>
> {
  const json = await cachedFetch<{
    map?: Record<string, string | { productId: string; name?: string; sku?: string }>;
  }>("/api/admin/cj/imported", META_CACHE_TTL_MS);
  const map = json.map ?? {};
  const result: Record<string, { productId: string; name?: string; sku?: string }> = {};
  for (const [pid, val] of Object.entries(map)) {
    if (typeof val === "string") {
      result[pid] = { productId: val };
    } else {
      result[pid] = val;
    }
  }
  return result;
}

export function cjVideoPreviewSrc(url: string) {
  return `/api/cj/video-proxy?url=${encodeURIComponent(url)}`;
}
