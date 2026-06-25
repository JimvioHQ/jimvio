import { cjFetch } from "@/lib/cj/client";
import {
  extractVideosFromHtml,
  mergeProductVideoUrls,
  normalizeCjVideoUrls,
} from "@/lib/cj/product-videos";

type CJVideoQueryRow = {
  videoUrl?: string;
  coverURL?: string;
};

export type CjProductVideoDetail = {
  productVideo?: unknown;
  videoList?: unknown;
  description?: string | null;
  bigImage?: string | null;
};

/**
 * Resolve all CJ video URLs for a product (detail fields, description HTML, queryVideosByProductId).
 * Used by import and admin preview so both paths see the same videos.
 */
export async function fetchCjProductVideoUrls(
  token: string,
  pid: string,
  detail?: CjProductVideoDetail,
): Promise<{ videos: string[]; poster: string | null }> {
  const fromDetail = mergeProductVideoUrls(
    normalizeCjVideoUrls(detail?.productVideo),
    normalizeCjVideoUrls(detail?.videoList),
    detail?.description ? extractVideosFromHtml(detail.description) : [],
  );

  let fromQuery: string[] = [];
  let poster: string | null = null;

  try {
    const videoRes = await cjFetch<{ data: CJVideoQueryRow[] }>(
      "/product/queryVideosByProductId",
      token,
      { method: "POST", body: JSON.stringify({ productId: pid }) },
    );
    const queryRows = Array.isArray(videoRes.data) ? videoRes.data : [];
    fromQuery = queryRows
      .map((row) => normalizeCjVideoUrls(row.videoUrl))
      .flat();
    poster =
      queryRows.find((row) => row.coverURL?.startsWith("http"))?.coverURL?.trim()
      ?? null;
  } catch (err) {
    console.warn(`[CJ videos] queryVideosByProductId failed for ${pid}:`, err);
  }

  const videos = mergeProductVideoUrls(fromDetail, fromQuery);

  if (!poster && detail?.bigImage?.startsWith("http")) {
    poster = detail.bigImage;
  }

  return { videos, poster };
}
