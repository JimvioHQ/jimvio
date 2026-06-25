import { getServiceClient, getCJToken, cjFetch } from "@/lib/cj/client";
import { requireAdmin } from "@/lib/auth/api-helpers";
import { fetchCjProductVideoUrls } from "@/lib/cj/fetch-product-videos";

export const runtime = "nodejs";

interface CJDetailData {
  pid: string;
  bigImage?: string;
  productImageSet?: string[];
  description?: string;
  productVideo?: string[];
  videoList?: string[];
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

    const { videos, poster } = await fetchCjProductVideoUrls(token, pid, {
      productVideo: detail.productVideo,
      videoList: detail.videoList,
      description: detail.description,
      bigImage: detail.bigImage,
    });

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
