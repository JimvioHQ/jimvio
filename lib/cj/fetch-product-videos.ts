import { cjFetchWithRetry } from "@/lib/cj/client";
import {
  extractVideosFromHtml,
  mergeProductVideoUrls,
  normalizeCjVideoUrls,
} from "@/lib/cj/product-videos";
import {
  getCachedCjVideos,
  setCachedCjVideos,
} from "@/lib/cj/cj-video-cache";
import {
  recordCj429,
  waitForCjVideoSlot,
} from "@/lib/cj/cj-rate-limiter";

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

export type FetchCjVideoOptions = {
  /** Skip POST queryVideosByProductId (detail/cache already sufficient). */
  skipVideoApi?: boolean;
};

/**
 * Resolve all CJ video URLs for a product (detail fields, description HTML, queryVideosByProductId).
 * Video API is rate-limited (≤2/sec), cached 24h, and skipped when detail already has videos.
 */
export async function fetchCjProductVideoUrls(
  token: string,
  pid: string,
  detail?: CjProductVideoDetail,
  options?: FetchCjVideoOptions,
): Promise<{ videos: string[]; poster: string | null; fromCache: boolean }> {
  const cached = getCachedCjVideos(pid);
  if (cached) {
    return { videos: cached.videos, poster: cached.poster, fromCache: true };
  }

  const fromDetail = mergeProductVideoUrls(
    normalizeCjVideoUrls(detail?.productVideo),
    normalizeCjVideoUrls(detail?.videoList),
    detail?.description ? extractVideosFromHtml(detail.description) : [],
  );

  let fromQuery: string[] = [];
  let poster: string | null = null;

  const shouldCallVideoApi =
    !options?.skipVideoApi && fromDetail.length === 0;

  if (shouldCallVideoApi) {
    try {
      await waitForCjVideoSlot();
      const videoRes = await cjFetchWithRetry<{ data: CJVideoQueryRow[] }>(
        "/product/queryVideosByProductId",
        token,
        { method: "POST", body: JSON.stringify({ productId: pid }) },
        { maxRetries: 4, baseDelayMs: 1500 },
      );
      const queryRows = Array.isArray(videoRes.data) ? videoRes.data : [];
      fromQuery = queryRows
        .map((row) => normalizeCjVideoUrls(row.videoUrl))
        .flat();
      poster =
        queryRows.find((row) => row.coverURL?.startsWith("http"))?.coverURL?.trim()
        ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) recordCj429();
      console.warn(`[CJ videos] queryVideosByProductId failed for ${pid}:`, err);
    }
  }

  const videos = mergeProductVideoUrls(fromDetail, fromQuery);

  if (!poster && detail?.bigImage?.startsWith("http")) {
    poster = detail.bigImage;
  }

  if (videos.length > 0 || fromQuery.length > 0) {
    setCachedCjVideos(pid, videos, poster);
  }

  return { videos, poster, fromCache: false };
}
