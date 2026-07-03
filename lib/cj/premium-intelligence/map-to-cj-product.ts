import type { CJProduct } from "../import-intelligence/types";
import type { CjProductIntelligenceRow, CjRawProductRow } from "./types";

export function rawRowToCJProduct(
  raw: CjRawProductRow,
  intel?: CjProductIntelligenceRow | null
): CJProduct {
  const payload = raw.raw_payload ?? {};
  const p = payload as Record<string, unknown>;

  return {
    pid: raw.pid,
    productNameEn: raw.title,
    productSku: raw.sku ?? String(p.productSku ?? ""),
    bigImage: raw.image ?? "",
    sellPrice: String(raw.sell_price ?? p.sellPrice ?? "0"),
    nowPrice: String(raw.sell_price ?? p.nowPrice ?? p.sellPrice ?? "0"),
    discountPrice: String(raw.cost ?? p.discountPrice ?? p.nowPrice ?? "0"),
    categoryName: typeof p.categoryName === "string" ? p.categoryName : undefined,
    threeCategoryName:
      typeof p.threeCategoryName === "string" ? p.threeCategoryName : undefined,
    addMarkStatus: Number(p.addMarkStatus ?? 0),
    isFreeShipping: Boolean(p.isFreeShipping ?? p.addMarkStatus === 1),
    listedNum: raw.orders,
    warehouseInventoryNum: raw.stock,
    verifiedWarehouse: intel?.verified_warehouse ?? (p.verifiedWarehouse as number | undefined),
    deliveryCycle:
      intel?.delivery_days != null
        ? String(intel.delivery_days)
        : (p.deliveryCycle as string | undefined),
    countryCode: raw.country_code ?? (p.countryCode as string | undefined),
    isVideo: intel?.has_video ? 1 : (p.isVideo as number | undefined),
    videoList: Array.isArray(p.videoList) ? (p.videoList as string[]) : undefined,
    videoUrl: typeof p.videoUrl === "string" ? p.videoUrl : undefined,
    videoCount: intel?.video_count ?? (p.videoCount as number | undefined),
    productWeight: p.productWeight as number | undefined,
    productType: p.productType as string | undefined,
    createAt: p.createAt as number | undefined,
    supplierName: raw.supplier ?? (p.supplierName as string | undefined),
    supplierId: p.supplierId as string | undefined,
    variantCount: p.variantCount as number | undefined,
    rating: intel?.rating ?? (p.rating as number | undefined),
    reviewCount: intel?.review_count ?? (p.reviewCount as number | undefined),
    favoriteCount: p.favoriteCount as number | undefined,
    warehouseName: raw.warehouse ?? (p.warehouseName as string | undefined),
    supplierVerified: intel?.supplier_verified ?? false,
    intelligenceEnriched: intel?.enrichment_status === "complete",
    imageCount: intel?.image_count,
    descriptionLength: intel?.description_length,
  };
}

export function listV2RowToRaw(row: Record<string, unknown>) {
  const cost =
    parseFloat(String(row.discountPrice ?? row.nowPrice ?? row.sellPrice ?? "0")) || 0;
  const sell =
    parseFloat(String(row.sellPrice ?? row.nowPrice ?? "0")) || 0;

  return {
    pid: String(row.id ?? ""),
    title: String(row.nameEn ?? ""),
    image: String(row.bigImage ?? "") || null,
    supplier: (row.supplierName as string) ?? null,
    cost,
    sell_price: sell,
    stock: Number(row.warehouseInventoryNum ?? 0),
    orders: Number(row.listedNum ?? 0),
    warehouse: (row.warehouseName as string) ?? (row.countryCode as string) ?? null,
    country_code: (row.countryCode as string) ?? null,
    sku: (row.sku as string) ?? null,
    raw_payload: row,
  };
}
