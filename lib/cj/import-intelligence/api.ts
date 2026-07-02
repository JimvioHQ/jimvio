import type { CJApiFilters, CJProduct } from "./types";

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { data: unknown; ts: number }>();

async function cachedFetch<T>(url: string): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
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

export async function fetchCJProducts(
  filters: CJApiFilters,
  page: number,
  pageSize: number
): Promise<{ products: CJProduct[]; total: number }> {
  const params = new URLSearchParams();
  params.set("pageNum", String(page));
  params.set("pageSize", String(pageSize));
  if (filters.keyWord) params.set("productNameEn", filters.keyWord);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.isFreeShipping) params.set("isFreeShipping", filters.isFreeShipping);
  if (filters.verifiedWarehouse)
    params.set("verifiedWarehouse", filters.verifiedWarehouse);
  if (filters.productFlag !== "") params.set("searchType", filters.productFlag);
  if (filters.hasVideo === "1") params.set("hasVideo", "1");
  if (filters.countryCode) params.set("countryCode", filters.countryCode);
  if (filters.deliveryTime) params.set("deliveryTime", filters.deliveryTime);
  if (filters.supplierId) params.set("supplierId", filters.supplierId);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.orderBy) params.set("orderBy", filters.orderBy);

  const json = await cachedFetch<{
    success: boolean;
    products: CJProduct[];
    total: number;
    error?: string;
  }>(`/api/cj/products?${params.toString()}`);

  if (!json.success) throw new Error(json.error || "Could not load CJ catalog");
  return { products: json.products, total: json.total };
}

export interface CJCategory {
  categoryId: string;
  categoryName: string;
}

export async function fetchCJCategories(): Promise<CJCategory[]> {
  const json = await cachedFetch<{ categories?: CJCategory[] }>(
    "/api/cj/categories"
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
  }>("/api/admin/cj/imported");
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
