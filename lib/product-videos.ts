import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeProductVideoUrls, getProductVideoUrls } from "@/lib/cj/product-videos";

type SupabaseLike = SupabaseClient<any, any, any>;

export type ProductVideoRow = {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
  created_at?: string;
  thumbnail_url?: string | null;
  platform?: string | null;
  is_primary?: boolean | null;
};

export type ProductVideoRef = {
  url?: string | null;
  video_url?: string | null;
  sort_order?: number | null;
};

/** Read URL from row whether DB uses legacy `video_url` or migration 063 `url`. */
export function productVideoUrl(
  row: ProductVideoRef | null | undefined,
): string {
  const value = row?.url ?? row?.video_url;
  return typeof value === "string" ? value : "";
}

/** Parse deprecated `products.videos` JSONB into URL list. */
export function normalizeLegacyProductVideosJson(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    let url = "";
    if (typeof item === "string") {
      url = item.trim();
    } else if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      url = String(obj.url ?? "").trim();
    }
    if (!url.startsWith("http") || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }

  return out;
}

export function sortProductVideoRows(
  rows: ProductVideoRef[] | null | undefined,
): string[] {
  if (!rows?.length) return [];
  return [...rows]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((r) => productVideoUrl(r))
    .filter((url) => url.startsWith("http"));
}

/**
 * Single resolver for storefront/admin: product_videos table → legacy JSONB → CJ metadata.
 */
export function resolveProductVideoUrls(product: {
  product_videos?: ProductVideoRef[] | null;
  videos?: unknown;
  source?: string | null;
  description?: string | null;
  source_metadata?: unknown;
} | null | undefined): string[] {
  if (!product) return [];

  const fromTable = sortProductVideoRows(product.product_videos);
  if (fromTable.length > 0) return fromTable;

  const fromLegacy = normalizeLegacyProductVideosJson(product.videos);
  if (fromLegacy.length > 0) return fromLegacy;

  return getProductVideoUrls(product);
}

export function productHasStoredVideos(
  product: { product_videos?: ProductVideoRef[] | null } | null | undefined,
): boolean {
  return (product?.product_videos?.length ?? 0) > 0;
}

export function productHasVideos(
  product: Parameters<typeof resolveProductVideoUrls>[0],
): boolean {
  return resolveProductVideoUrls(product).length > 0;
}

/** Batch-fetch videos for product cards and listings. */
export async function fetchProductVideosMap(
  supabase: SupabaseLike,
  productIds: string[],
): Promise<Map<string, ProductVideoRef[]>> {
  const map = new Map<string, ProductVideoRef[]>();
  if (productIds.length === 0) return map;

  const { data, error } = await supabase
    .from("product_videos")
    .select("id, url, sort_order, product_id, is_active")
    .in("product_id", productIds)
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.warn("[fetchProductVideosMap]:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const list = map.get(row.product_id) ?? [];
    list.push(row);
    map.set(row.product_id, list);
  }
  return map;
}

export function attachProductVideos<T extends { id: string }>(
  products: T[],
  videoMap: Map<string, ProductVideoRef[]>,
): Array<T & { product_videos: ProductVideoRef[] }> {
  return products.map((p) => ({
    ...p,
    product_videos: videoMap.get(p.id) ?? [],
  }));
}

/** Replace all videos for a product with the given URLs (ordered). */
export async function syncProductVideos(
  supabase: SupabaseLike,
  productId: string,
  videoUrls: string[],
): Promise<{ error?: string }> {
  const urls = mergeProductVideoUrls(videoUrls);

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("vendor_id")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    return { error: productError.message };
  }
  if (!product?.vendor_id) {
    return { error: "Product has no vendor — cannot save videos" };
  }

  const { error: deleteError } = await supabase
    .from("product_videos")
    .delete()
    .eq("product_id", productId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (urls.length === 0) {
    return {};
  }

  const rows = urls.map((url, sort_order) => ({
    product_id: productId,
    vendor_id: product.vendor_id,
    url,
    sort_order,
    is_primary: sort_order === 0,
    platform: "upload" as const,
  }));

  const { error: insertError } = await supabase.from("product_videos").insert(rows);

  if (insertError) {
    return { error: insertError.message };
  }

  return {};
}
