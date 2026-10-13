import type { SupabaseClient } from "@supabase/supabase-js";
import { isJimvioPriceLocked, pricesConflict, quoteJimvioBasePrice } from "@/lib/pricing/jimvio-base-price";
import { isPlayableVideoUrl, productHasPlayableVideo, videoCoverageRatio } from "@/lib/cj/video-coverage";

export type CjCatalogOperationsSnapshot = {
  scanned: number;
  eligiblePublished: number;
  withValidVideo: number;
  videoCoverage: number | null;
  videoTarget: 0.5;
  missingImages: number;
  missingSupplierCost: number;
  priceLocked: number;
  priceConflicts: number;
  flaggedForReview: number;
  partial: boolean;
};

const PAGE = 400;
const MAX_PAGES = 40;

function metaOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasImages(images: unknown): boolean {
  return Array.isArray(images) && images.some((url) => typeof url === "string" && url.startsWith("http"));
}

export async function loadCjCatalogOperations(
  db: SupabaseClient,
): Promise<CjCatalogOperationsSnapshot> {
  let scanned = 0;
  let eligiblePublished = 0;
  let withValidVideo = 0;
  let missingImages = 0;
  let missingSupplierCost = 0;
  let priceLocked = 0;
  let priceConflicts = 0;
  let flaggedForReview = 0;
  let partial = false;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE;
    const { data, error } = await db
      .from("products")
      .select("id, status, is_active, cost_price, price_usd, images, source_metadata")
      .eq("source", "cj")
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) break;

    const publishedIds = rows
      .filter((row) => row.status === "active" && row.is_active === true)
      .map((row) => row.id as string);

    const videoIds = new Set<string>();
    if (publishedIds.length > 0) {
      const { data: videos, error: videoError } = await db
        .from("product_videos")
        .select("product_id, url")
        .in("product_id", publishedIds);
      if (videoError) throw new Error(videoError.message);
      for (const video of videos ?? []) {
        if (isPlayableVideoUrl(video.url)) videoIds.add(String(video.product_id));
      }
    }

    for (const row of rows) {
      scanned += 1;
      const meta = metaOf(row.source_metadata);
      const cost = Number(row.cost_price ?? 0);
      const published = row.status === "active" && row.is_active === true;
      if (!hasImages(row.images)) missingImages += 1;
      if (!(cost > 0)) missingSupplierCost += 1;
      if (isJimvioPriceLocked(meta)) {
        priceLocked += 1;
        if (pricesConflict(Number(row.price_usd), cost)) priceConflicts += 1;
      }
      const review = meta.cj_catalog_review;
      if (review && typeof review === "object") flaggedForReview += 1;
      if (!published) continue;
      eligiblePublished += 1;
      const hasVideo =
        videoIds.has(String(row.id)) ||
        productHasPlayableVideo({ metadataVideos: meta.cj_videos });
      if (hasVideo) withValidVideo += 1;
    }

    if (rows.length < PAGE) break;
    if (page === MAX_PAGES - 1) partial = true;
  }

  return {
    scanned,
    eligiblePublished,
    withValidVideo,
    videoCoverage: videoCoverageRatio(withValidVideo, eligiblePublished),
    videoTarget: 0.5,
    missingImages,
    missingSupplierCost,
    priceLocked,
    priceConflicts,
    flaggedForReview,
    partial,
  };
}

export function reviewReasons(input: {
  supplierPid: string | null;
  costUsd: number;
  imageCount: number;
}): string[] {
  const reasons: string[] = [];
  if (!input.supplierPid) reasons.push("missing_supplier_product_id");
  const quote = quoteJimvioBasePrice(input.costUsd);
  if (!quote.ok) reasons.push("missing_supplier_cost");
  if (input.imageCount <= 0) reasons.push("missing_images");
  return reasons;
}
