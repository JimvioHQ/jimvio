import { NextRequest } from "next/server";
import { getServiceClient, getCJToken, cjFetch } from "@/lib/cj/client";
import { requireAdmin } from "@/lib/auth/api-helpers";
import { fetchCjProductVideoUrls } from "@/lib/cj/fetch-product-videos";
import { calculateProfitMetrics } from "@/lib/cj/import-intelligence/product-utils";
import { mapDetailToIntelligence } from "@/lib/cj/import-intelligence/intelligence-mapper";

export const runtime = "nodejs";

interface CJDetailVariant {
  vid: string;
  variantNameEn?: string;
  variantName?: string;
  variantSku: string;
  variantImage?: string;
  variantSellPrice?: number | string;
}

interface CJDetailData {
  pid: string;
  productNameEn?: string;
  productSku?: string;
  bigImage?: string;
  productImageSet?: string[];
  description?: string;
  productVideo?: string[];
  videoList?: string[];
  productProEnSet?: string[];
  productKeyEnSet?: string[];
  productKeySet?: string[];
  sellPrice?: number | string;
  discountPrice?: number | string;
  nowPrice?: number | string;
  listedNum?: number;
  verifiedWarehouse?: number;
  deliveryCycle?: string;
  countryCode?: string;
  isFreeShipping?: boolean;
  addMarkStatus?: number;
  warehouseInventoryNum?: number;
  variants?: CJDetailVariant[];
  supplierName?: string;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ pid: string }> },
): Promise<Response> {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { pid } = await context.params;
  if (!pid?.trim()) {
    return Response.json({ success: false, error: "Missing product id" }, { status: 400 });
  }

  const detailMode = req.nextUrl.searchParams.get("detail") === "1";
  const intelligenceMode = req.nextUrl.searchParams.get("intelligence") === "1";

  try {
    const supabase = getServiceClient();
    const token = await getCJToken(supabase);

    const features =
      detailMode || intelligenceMode
        ? "enable_video,enable_inventory"
        : "enable_video";

    const detailRes = await cjFetch<{ data: CJDetailData }>(
      `/product/query?pid=${encodeURIComponent(pid)}&features=${features}`,
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

    if (intelligenceMode) {
      const intelligence = mapDetailToIntelligence(detail, videos);
      return Response.json({ success: true, intelligence });
    }

    const images = [
      ...(Array.isArray(detail.productImageSet) ? detail.productImageSet : []),
      ...(detail.bigImage ? [detail.bigImage] : []),
    ].filter((url, i, arr) => typeof url === "string" && url.startsWith("http") && arr.indexOf(url) === i);

    const base = {
      success: true,
      videos,
      poster,
      images,
      hasVideo: videos.length > 0,
    };

    if (!detailMode) {
      return Response.json(base);
    }

    const keys = detail.productKeyEnSet ?? detail.productKeySet ?? [];
    const values = detail.productProEnSet ?? [];
    const specifications = keys
      .map((key, i) => ({ key, value: values[i] ?? "" }))
      .filter((s) => s.key && s.value);

    const variants = (detail.variants ?? []).map((v) => ({
      vid: v.vid,
      name: v.variantNameEn || v.variantName || v.variantSku,
      sku: v.variantSku,
      price: parseFloat(String(v.variantSellPrice ?? "0")) || 0,
      image: v.variantImage,
    }));

    const costStr = String(
      detail.discountPrice ?? detail.nowPrice ?? detail.sellPrice ?? "0"
    );
    const profitProduct = {
      pid: detail.pid,
      productNameEn: detail.productNameEn ?? "",
      productSku: detail.productSku ?? "",
      bigImage: detail.bigImage ?? "",
      sellPrice: costStr,
      nowPrice: costStr,
      discountPrice: costStr,
      addMarkStatus: detail.addMarkStatus ?? 0,
      isFreeShipping: detail.isFreeShipping,
      listedNum: detail.listedNum ?? 0,
      warehouseInventoryNum: detail.warehouseInventoryNum,
      verifiedWarehouse: detail.verifiedWarehouse,
      deliveryCycle: detail.deliveryCycle,
      countryCode: detail.countryCode,
      variantCount: variants.length,
    };

    return Response.json({
      ...base,
      description: detail.description ?? "",
      variants,
      specifications,
      supplier: {
        name: detail.supplierName ?? "CJ Supplier",
        verified: detail.verifiedWarehouse === 1,
        score: detail.verifiedWarehouse === 1 ? 85 : 55,
      },
      shippingOptions: detail.countryCode
        ? [
            {
              country: detail.countryCode,
              days: detail.deliveryCycle ?? "—",
              cost: detail.isFreeShipping ? "Free" : "Est. $3–6",
            },
          ]
        : [],
      profit: calculateProfitMetrics(profitProduct),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
