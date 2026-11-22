import type { CJProduct as ActionCJProduct } from "@/lib/actions/cj_product";
import type { CJProduct } from "../import-intelligence/types";
import type { CjProductIntelligenceRow, CjRawProductRow } from "./types";

function httpUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (url): url is string => typeof url === "string" && url.startsWith("http")
  );
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

/** Collect publishable image URLs from list row + optional CJ detail payload. */
export function collectCjImageUrls(
  raw: CjRawProductRow,
  detail?: Record<string, unknown> | null
): string[] {
  const payload = raw.raw_payload ?? {};
  const seen = new Set<string>();
  const images: string[] = [];
  const add = (url: unknown) => {
    if (typeof url !== "string" || !url.startsWith("http") || seen.has(url)) return;
    seen.add(url);
    images.push(url);
  };

  for (const url of httpUrls(detail?.productImageSet)) add(url);
  for (const url of httpUrls(payload.productImageSet)) add(url);
  add(detail?.bigImage);
  add(raw.image);
  add(payload.bigImage);
  add(payload.productImage);

  return images;
}

export function mergeDetailIntoRawPayload(
  raw: CjRawProductRow,
  detail?: Record<string, unknown> | null,
  extra?: { images?: string[]; videos?: string[] }
): Record<string, unknown> {
  const images = extra?.images?.length ? extra.images : collectCjImageUrls(raw, detail);
  const payload: Record<string, unknown> = {
    ...(raw.raw_payload ?? {}),
    ...(detail ?? {}),
  };
  if (images.length > 0) payload.productImageSet = images;
  if (extra?.videos && extra.videos.length > 0) {
    payload.productVideo = extra.videos;
  }
  return payload;
}

/**
 * Map catalog/detail rows onto the Action CJProduct shape used by upsertCJProduct.
 * Intelligence scoring uses bigImage; product insert uses productImage / productImageSet.
 */
export function toActionCJProduct(
  raw: CjRawProductRow,
  intel?: CjProductIntelligenceRow | null,
  detail?: Record<string, unknown> | null
): ActionCJProduct {
  const payload: Record<string, unknown> = {
    ...(raw.raw_payload ?? {}),
    ...(detail ?? {}),
  };
  const images = collectCjImageUrls(raw, detail);
  const videos = [
    ...httpUrls(payload.productVideo),
    ...httpUrls(payload.videoList),
  ];
  const categoryName =
    asString(payload.categoryName) ??
    [payload.oneCategoryName, payload.twoCategoryName, payload.threeCategoryName]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join(" > ");

  return {
    pid: raw.pid,
    productName: asString(payload.productName) ?? raw.title,
    productNameEn: raw.title,
    productSku: raw.sku ?? asString(payload.productSku) ?? raw.pid,
    productImage: images[0] ?? raw.image ?? "",
    productWeight: String(payload.productWeight ?? payload.packageWeight ?? "0"),
    productType: asString(payload.productType) ?? "",
    categoryId: asString(payload.categoryId) ?? "",
    categoryName,
    listingCount: Number(payload.listedNum ?? raw.orders ?? 0),
    sellPrice: String(raw.sell_price ?? payload.sellPrice ?? "0"),
    remark: asString(payload.description) ?? "",
    addMarkStatus: String(payload.addMarkStatus ?? ""),
    isFreeShipping: Boolean(payload.isFreeShipping ?? Number(payload.addMarkStatus ?? 0) === 1),
    createTime: Number(payload.createAt ?? 0),
    saleStatus: parseInt(String(payload.status ?? payload.saleStatus ?? "0"), 10) || 0,
    listedNum: Number(raw.orders ?? payload.listedNum ?? 0),
    shippingCountryCodes: Array.isArray(payload.shippingCountryCodes)
      ? payload.shippingCountryCodes.filter((code): code is string => typeof code === "string")
      : [],
    sourceFrom: "cj",
    deliveryCycle:
      intel?.delivery_days ??
      (typeof payload.deliveryCycle === "string" || typeof payload.deliveryCycle === "number"
        ? payload.deliveryCycle
        : undefined),
    verifiedWarehouse:
      intel?.verified_warehouse ??
      (typeof payload.verifiedWarehouse === "number" ? payload.verifiedWarehouse : undefined),
    customizationVersion: 0,
    isTestProduct: false,
    productVideos: videos,
    productImageSet: images,
  };
}

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
    isVideo:
      intel?.has_video === true
        ? 1
        : Number(p.isVideo ?? p.is_video ?? 0) === 1
          ? 1
          : (p.isVideo as number | undefined),
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
    supplierVerified:
      intel != null
        ? Boolean(intel.supplier_verified)
        : Boolean(
            p.supplierVerified === true ||
              Number(p.verifiedSupplier ?? p.verified_supplier ?? 0) === 1 ||
              Number(p.verifiedWarehouse ?? 0) === 1
          ),
    intelligenceEnriched: intel?.enrichment_status === "complete",
    imageCount: intel?.image_count ?? Number(p.imageCount ?? 0),
    descriptionLength: intel?.description_length ?? (typeof p.description === "string" ? p.description.length : undefined),
  };
}

/**
 * Persist only the compact fields needed to browse and filter a supplier catalog.
 * Full descriptions, image galleries and variant records are fetched from CJ on
 * demand when an admin explicitly imports a product. This keeps an unimported
 * catalog row small without sacrificing the ability to import it later.
 */
export function compactCjListPayload(row: Record<string, unknown>): Record<string, unknown> {
  const keys = [
    "productName",
    "productNameEn",
    "productSku",
    "sellPrice",
    "nowPrice",
    "discountPrice",
    "productType",
    "productWeight",
    "categoryId",
    "categoryName",
    "threeCategoryName",
    "oneCategoryName",
    "twoCategoryName",
    "createAt",
    "status",
    "listedNum",
    "addMarkStatus",
    "isFreeShipping",
    "shippingCountryCodes",
    "verifiedWarehouse",
    "deliveryCycle",
    "countryCode",
    "warehouseCountryCode",
    "supplierId",
    "supplierName",
    "supplierVerified",
    "verifiedSupplier",
    "warehouseName",
    "warehouse",
    "rating",
    "reviewCount",
    "commentNum",
    "reviewNum",
    "favoriteNum",
    "favoriteCount",
    "isVideo",
    "is_video",
    "videoUrl",
    "tags",
    "productTags",
    "productKeyEnSet",
    "productKeySet",
  ] as const;

  const compact: Record<string, unknown> = {};
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    if (key === "tags" || key === "productTags") {
      compact[key] = Array.isArray(value) ? value.slice(0, 20) : value;
      continue;
    }
    if (key === "shippingCountryCodes" || key === "productKeyEnSet" || key === "productKeySet") {
      compact[key] = Array.isArray(value) ? value.slice(0, 20) : value;
      continue;
    }
    compact[key] = value;
  }

  const description = asString(row.description);
  if (description) {
    compact.description = description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
  }

  const variants = Array.isArray(row.variants) ? row.variants.length : Number(row.variantCount ?? 0);
  if (Number.isFinite(variants) && variants > 0) compact.variantCount = variants;

  const images = Array.isArray(row.productImageSet) ? row.productImageSet.length : Number(row.imageCount ?? 0);
  if (Number.isFinite(images) && images > 0) compact.imageCount = images;

  const videos = [
    ...(Array.isArray(row.productVideo) ? row.productVideo : []),
    ...(Array.isArray(row.videoList) ? row.videoList : []),
  ].filter((url) => typeof url === "string" && url.startsWith("http"));
  if (videos.length > 0) {
    compact.isVideo = 1;
    compact.videoCount = videos.length;
  }

  // Deliberately exclude variants, productImageSet, productImage, productNameSet
  // and productProEnSet. Their full payload is fetched when a product is imported.
  return compact;
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
    raw_payload: compactCjListPayload(row),
  };
}
