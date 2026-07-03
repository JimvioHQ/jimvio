import type { CJProduct, EnrichedProduct, ImportedMap } from "./types";
import type { CJIntelligencePayload } from "./enrichment-types";
import { enrichProductBatch } from "./filters";

/** Merge detail intelligence into list catalog product fields */
export function patchProductWithIntelligence(
  product: EnrichedProduct,
  intel: CJIntelligencePayload
): CJProduct {
  return {
    ...product,
    rating: intel.rating ?? product.rating,
    reviewCount: intel.reviewCount ?? product.reviewCount,
    favoriteCount: intel.favoriteCount ?? product.favoriteCount,
    deliveryCycle: intel.deliveryCycle ?? product.deliveryCycle,
    countryCode: intel.countryCode ?? product.countryCode,
    warehouseName: intel.warehouseName ?? product.warehouseName,
    warehouseInventoryNum:
      intel.warehouseInventoryNum ?? product.warehouseInventoryNum,
    verifiedWarehouse: intel.verifiedWarehouse ?? product.verifiedWarehouse,
    supplierName: intel.supplierName ?? product.supplierName,
    supplierVerified: intel.supplierVerified,
    listedNum: intel.listedNum ?? product.listedNum,
    variantCount: intel.variantCount ?? product.variantCount,
    isFreeShipping: intel.isFreeShipping ?? product.isFreeShipping,
    isVideo: intel.hasVideo ? 1 : product.isVideo,
    videoList:
      intel.videoUrls.length > 0 ? intel.videoUrls : product.videoList,
    videoUrl: intel.videoUrls[0] ?? product.videoUrl,
    videoCount: intel.videoCount > 0 ? intel.videoCount : product.videoCount,
    imageCount: intel.imageCount ?? product.imageCount,
    descriptionLength: intel.descriptionLength ?? product.descriptionLength,
    intelligenceEnriched: true,
  };
}

export function mergeIntelligenceIntoProducts(
  products: EnrichedProduct[],
  enrichmentMap: Record<string, CJIntelligencePayload>,
  importedMap: ImportedMap
): EnrichedProduct[] {
  if (Object.keys(enrichmentMap).length === 0) return products;

  const patched = products.map((p) => {
    const intel = enrichmentMap[p.pid];
    if (!intel) return p;
    return patchProductWithIntelligence(p, intel) as EnrichedProduct;
  });

  return enrichProductBatch(
    patched.map((p) => ({
      pid: p.pid,
      productNameEn: p.productNameEn,
      productSku: p.productSku,
      bigImage: p.bigImage,
      sellPrice: p.sellPrice,
      nowPrice: p.nowPrice,
      discountPrice: p.discountPrice,
      categoryName: p.categoryName,
      threeCategoryName: p.threeCategoryName,
      addMarkStatus: p.addMarkStatus,
      isFreeShipping: p.isFreeShipping,
      listedNum: p.listedNum,
      warehouseInventoryNum: p.warehouseInventoryNum,
      verifiedWarehouse: p.verifiedWarehouse,
      deliveryCycle: p.deliveryCycle,
      countryCode: p.countryCode,
      isVideo: p.isVideo,
      videoList: p.videoList,
      productWeight: p.productWeight,
      productType: p.productType,
      createAt: p.createAt,
      supplierName: p.supplierName,
      supplierId: p.supplierId,
      variantCount: p.variantCount,
      rating: p.rating,
      reviewCount: p.reviewCount,
      favoriteCount: p.favoriteCount,
      videoUrl: p.videoUrl,
      videoCount: p.videoCount,
      warehouseName: p.warehouseName,
      supplierVerified: p.supplierVerified,
      intelligenceEnriched: p.intelligenceEnriched,
      imageCount: p.imageCount,
      descriptionLength: p.descriptionLength,
    })),
    importedMap
  );
}
