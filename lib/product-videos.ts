import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeProductVideoUrls } from "@/lib/cj/product-videos";

type SupabaseLike = SupabaseClient<any, any, any>;

export type ProductVideoRow = {
  id: string;
  product_id: string;
  video_url: string;
  sort_order: number;
  created_at: string;
};

/** Replace all videos for a product with the given URLs (ordered). */
export async function syncProductVideos(
  supabase: SupabaseLike,
  productId: string,
  videoUrls: string[],
): Promise<{ error?: string }> {
  const urls = mergeProductVideoUrls(videoUrls);

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

  const rows = urls.map((video_url, sort_order) => ({
    product_id: productId,
    video_url,
    sort_order,
  }));

  const { error: insertError } = await supabase.from("product_videos").insert(rows);

  if (insertError) {
    return { error: insertError.message };
  }

  return {};
}

export function sortProductVideoRows(
  rows: Array<{ video_url: string; sort_order?: number | null }> | null | undefined,
): string[] {
  if (!rows?.length) return [];
  return [...rows]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((r) => r.video_url)
    .filter((url) => typeof url === "string" && url.startsWith("http"));
}

export function productHasStoredVideos(
  product: { product_videos?: Array<{ video_url: string }> | null } | null | undefined,
): boolean {
  return (product?.product_videos?.length ?? 0) > 0;
}
