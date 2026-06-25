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

const CJ_VIDEO_HOSTS = [
  "download-only-api.cjdropshipping.com",
  "video-cf.cjdropshipping.com",
  "cf.cjdropshipping.com",
];

export type VideoPlayback =
  | { kind: "direct"; src: string }
  | { kind: "proxy"; src: string }
  | { kind: "youtube-embed"; src: string };

/** Normalize protocol-relative and trimmed video URLs. */
export function normalizeVideoUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

export function isPlayableVideoUrl(url: string): boolean {
  return /^https?:\/\//i.test(normalizeVideoUrl(url));
}

export function isCjVideoUrl(url: string): boolean {
  try {
    const host = new URL(normalizeVideoUrl(url)).hostname;
    return CJ_VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function toYouTubeEmbed(url: string): string {
  const normalized = normalizeVideoUrl(url);
  try {
    const parsed = new URL(normalized);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    const id = parsed.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}`;
    if (parsed.pathname.startsWith("/embed/")) {
      return `https://www.youtube.com${parsed.pathname}`;
    }
  } catch {
    /* fall through */
  }
  return normalized.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/");
}

/** Resolve how a product video URL should be played in the storefront gallery. */
export function resolveVideoPlayback(url: string): VideoPlayback {
  const normalized = normalizeVideoUrl(url);
  if (/youtube\.com|youtu\.be/i.test(normalized)) {
    return { kind: "youtube-embed", src: toYouTubeEmbed(normalized) };
  }
  if (isCjVideoUrl(normalized)) {
    return {
      kind: "proxy",
      src: `/api/products/video-proxy?url=${encodeURIComponent(normalized)}`,
    };
  }
  return { kind: "direct", src: normalized };
}

/** Read URL from row whether DB uses legacy `video_url` or migration 063 `url`. */
export function productVideoUrl(
  row: ProductVideoRef | null | undefined,
): string {
  const value = row?.url ?? row?.video_url;
  return typeof value === "string" ? normalizeVideoUrl(value) : "";
}

/** Parse deprecated `products.videos` JSONB into URL list. */
export function normalizeLegacyProductVideosJson(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    let url = "";
    if (typeof item === "string") {
      url = normalizeVideoUrl(item);
    } else if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      url = normalizeVideoUrl(String(obj.url ?? ""));
    }
    if (!isPlayableVideoUrl(url) || seen.has(url)) continue;
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
    .filter((url) => isPlayableVideoUrl(url));
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

  return mergeProductVideoUrls(
    sortProductVideoRows(product.product_videos),
    normalizeLegacyProductVideosJson(product.videos),
    getProductVideoUrls(product),
  );
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

  const isMissingColumn = (message: string) => /does not exist/i.test(message);

  const attempts: Array<{ select: string; activeOnly: boolean }> = [
    { select: "id, url, sort_order, product_id, is_active", activeOnly: true },
    { select: "id, url, sort_order, product_id", activeOnly: false },
    { select: "id, video_url, sort_order, product_id", activeOnly: false },
  ];

  let rows: ProductVideoRef[] = [];

  for (const attempt of attempts) {
    let query = supabase
      .from("product_videos")
      .select(attempt.select)
      .in("product_id", productIds)
      .order("sort_order");

    if (attempt.activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingColumn(error.message)) continue;
      console.warn("[fetchProductVideosMap]:", error.message);
      return map;
    }

    rows = (data ?? []) as ProductVideoRef[];
    break;
  }

  for (const row of rows) {
    const productId = (row as ProductVideoRef & { product_id?: string }).product_id;
    if (!productId) continue;
    const list = map.get(productId) ?? [];
    list.push(row);
    map.set(productId, list);
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
    platform: isCjVideoUrl(url) ? ("other" as const) : ("upload" as const),
  }));

  const { error: insertError } = await supabase.from("product_videos").insert(rows);

  if (insertError) {
    return { error: insertError.message };
  }

  return {};
}
