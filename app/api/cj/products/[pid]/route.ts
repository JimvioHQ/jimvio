import { getServiceClient, getCJToken, cjFetch } from "@/lib/cj/client";
import { requireAdmin } from "@/lib/auth/api-helpers";
import {
  extractVideosFromHtml,
  mergeProductVideoUrls,
  normalizeCjVideoUrls,
} from "@/lib/cj/product-videos";

export const runtime = "nodejs";

interface CJDetailData {
  pid: string;
  bigImage?: string;
  productImageSet?: string[];
  description?: string;
  productVideo?: string[];
  videoList?: string[];
}

interface CJVideoRow {
  videoUrl?: string;
  coverURL?: string;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ pid: string }> },
): Promise<Response> {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { pid } = await context.params;
  if (!pid?.trim()) {
    return Response.json({ success: false, error: "Missing product id" }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    const token = await getCJToken(supabase);

    const detailRes = await cjFetch<{ data: CJDetailData }>(
      `/product/query?pid=${encodeURIComponent(pid)}&features=enable_video`,
      token,
    );
    const detail = detailRes.data;
    if (!detail?.pid) {
      return Response.json({ success: false, error: "Product not found on CJ" }, { status: 404 });
    }

    let queryRows: CJVideoRow[] = [];
    try {
      const videoRes = await cjFetch<{ data: CJVideoRow[] }>(
        "/product/queryVideosByProductId",
        token,
        { method: "POST", body: JSON.stringify({ productId: pid }) },
      );
      queryRows = Array.isArray(videoRes.data) ? videoRes.data : [];
    } catch {
      // queryVideosByProductId is best-effort; detail + description may still have URLs
    }

    const fromDetail = mergeProductVideoUrls(
      normalizeCjVideoUrls(detail.productVideo),
      normalizeCjVideoUrls(detail.videoList),
      extractVideosFromHtml(detail.description ?? ""),
    );
    const fromQuery = queryRows
      .map((row) => row.videoUrl?.trim())
      .filter((url): url is string => Boolean(url && url.startsWith("http")));

    const videos = mergeProductVideoUrls(fromDetail, fromQuery);
    const poster =
      queryRows.find((row) => row.coverURL?.startsWith("http"))?.coverURL
      ?? detail.bigImage
      ?? null;

    const images = [
      ...(Array.isArray(detail.productImageSet) ? detail.productImageSet : []),
      ...(detail.bigImage ? [detail.bigImage] : []),
    ].filter((url, i, arr) => typeof url === "string" && url.startsWith("http") && arr.indexOf(url) === i);

    return Response.json({
      success: true,
      videos,
      poster,
      images,
      hasVideo: videos.length > 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
