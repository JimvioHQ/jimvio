import type { CJIntelligencePayload } from "./enrichment-types";
import { calculateSupplierScore } from "./product-utils";
import type { CJProduct } from "./types";

function num(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = parseFloat(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** Normalize CJ rating fields (0–5 stars) from heterogeneous detail payloads */
export function parseCjRating(raw: Record<string, unknown>): number | undefined {
  const star =
    num(raw.star) ??
    num(raw.starRating) ??
    num(raw.productStar) ??
    num(raw.evaluateStar);
  if (star !== undefined && star >= 0 && star <= 5) return Math.round(star * 10) / 10;

  const score =
    num(raw.productScore) ??
    num(raw.evaluateScore) ??
    num(raw.sellScore) ??
    num(raw.score);
  if (score === undefined) return undefined;
  if (score >= 0 && score <= 5) return Math.round(score * 10) / 10;
  if (score > 5 && score <= 10) return Math.round((score / 2) * 10) / 10;
  if (score > 10 && score <= 100) return Math.round((score / 20) * 10) / 10;
  return undefined;
}

export interface DetailForIntelligence {
  pid: string;
  listedNum?: number;
  verifiedWarehouse?: number;
  deliveryCycle?: string;
  countryCode?: string;
  isFreeShipping?: boolean;
  addMarkStatus?: number;
  warehouseInventoryNum?: number;
  supplierName?: string;
  productVideo?: string[];
  videoList?: string[];
  variants?: unknown[];
}

export function mapDetailToIntelligence(
  detail: DetailForIntelligence,
  videoUrls: string[]
): CJIntelligencePayload {
  const raw = detail as unknown as Record<string, unknown>;
  const listVideos = [
    ...(Array.isArray(detail.productVideo) ? detail.productVideo : []),
    ...(Array.isArray(detail.videoList) ? detail.videoList : []),
    ...videoUrls,
  ].filter((u) => typeof u === "string" && u.startsWith("http"));
  const uniqueVideos = [...new Set(listVideos)];

  const reviewCount =
    num(raw.commentNum) ??
    num(raw.reviewNum) ??
    num(raw.evaluateCount) ??
    num(raw.commentCount);

  const favoriteCount =
    num(raw.favoriteNum) ??
    num(raw.collectNum) ??
    num(raw.favoritesNum) ??
    num(raw.wishNum);

  const partial: CJProduct = {
    pid: detail.pid,
    productNameEn: str(raw.productNameEn) ?? "",
    productSku: str(raw.productSku) ?? "",
    bigImage: str(raw.bigImage) ?? "",
    sellPrice: String(raw.sellPrice ?? raw.nowPrice ?? "0"),
    nowPrice: String(raw.nowPrice ?? raw.sellPrice ?? "0"),
    discountPrice: String(raw.discountPrice ?? raw.nowPrice ?? raw.sellPrice ?? "0"),
    addMarkStatus: num(raw.addMarkStatus) ?? 0,
    isFreeShipping: Boolean(detail.isFreeShipping),
    listedNum: detail.listedNum ?? 0,
    warehouseInventoryNum: detail.warehouseInventoryNum,
    verifiedWarehouse: detail.verifiedWarehouse,
    deliveryCycle: detail.deliveryCycle,
    countryCode: detail.countryCode ?? str(raw.warehouseCountryCode),
    variantCount: Array.isArray(detail.variants) ? detail.variants.length : undefined,
    reviewCount,
    favoriteCount,
    rating: parseCjRating(raw),
    warehouseName: str(raw.warehouseName) ?? str(raw.storageName),
  };

  const supplierVerified =
    detail.verifiedWarehouse === 1 ||
    raw.supplierVerified === true ||
    raw.verifiedSupplier === 1;

  return {
    pid: detail.pid,
    rating: partial.rating,
    reviewCount,
    favoriteCount,
    hasVideo: uniqueVideos.length > 0 || raw.isVideo === 1,
    videoCount: uniqueVideos.length,
    videoUrls: uniqueVideos,
    deliveryCycle: detail.deliveryCycle,
    countryCode: partial.countryCode,
    warehouseName: partial.warehouseName,
    warehouseInventoryNum: detail.warehouseInventoryNum,
    verifiedWarehouse: detail.verifiedWarehouse,
    supplierVerified,
    supplierName: detail.supplierName ?? str(raw.supplierName),
    supplierScore: calculateSupplierScore({
      ...partial,
      supplierVerified,
    }),
    listedNum: detail.listedNum,
    variantCount: partial.variantCount,
    isFreeShipping: detail.isFreeShipping,
    enrichedAt: Date.now(),
  };
}
