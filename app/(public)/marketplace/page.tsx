import React from "react";
import {
  getMarketplaceCategories,
  getProducts,
  getViralClips,
  getTopCreators,
  getTopVendors,
  countActiveShopifyProducts,
  countActiveVendors,
  countActiveListedProducts,
  type ProductQuery,
} from "@/services/db";
import { formatNumber } from "@/lib/utils";
import { MarketplaceClient } from "@/components/marketplace/marketplace-client";

interface PageProps {
  searchParams: Promise<{
    cat?: string;
    type?: string;
    catalog?: string;
    q?: string;
    sort?: string;
    page?: string;
    affiliate?: string;
  }>;
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1"));
  const limit = 24;
  const offset = (currentPage - 1) * limit;
  const isShopifyOnly = params.catalog === "shopify";

  const query: ProductQuery = {
    limit,
    offset,
    search: params.q,
    category: params.cat,
    sort: (params.sort as ProductQuery["sort"]) ?? "trending",
    affiliate: params.affiliate === "1" ? true : undefined,
    type: params.type,
    catalog: isShopifyOnly ? "shopify" : undefined,
  };

  const [categories, coreProductsResult, shopifyCount, viralClips, topCreators, vendors, vendorCount, listingCount] =
    await Promise.all([
      getMarketplaceCategories().catch(() => []),
      getProducts(query).catch(() => ({ products: [], total: 0 })),
      countActiveShopifyProducts().catch(() => 0),
      getViralClips(8).catch(() => []),
      getTopCreators(6).catch(() => []),
      getTopVendors(6).catch(() => []),
      countActiveVendors().catch(() => 0),
      countActiveListedProducts().catch(() => 0),
    ]);

  const { products: rawProducts, total } = coreProductsResult;

  const products = (rawProducts ?? []).map((p: any) => ({
    ...p,
    vendors: Array.isArray(p.vendors) ? p.vendors[0] ?? null : p.vendors,
    product_categories: Array.isArray(p.product_categories) ? p.product_categories[0] ?? null : p.product_categories,
    source: p.source || "jimvio",
  }));

  const vendorList = vendors ?? [];
  const storesWithProducts = await Promise.all(
    vendorList.map(async (v: any) => {
      const store = {
        id: v.id,
        business_name: v.business_name,
        business_slug: v.business_slug,
        business_logo: v.business_logo ?? v.logo_url,
        rating: v.rating,
        total_sales: v.total_sales,
      };
      const { products: storeProducts } = await getProducts({
        vendorId: v.id,
        limit: 5,
        sort: "newest",
      }).catch(() => ({ products: [] }));
      const normalized = (storeProducts ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        images: p.images,
        price: p.price,
      }));
      return { ...store, products: normalized };
    })
  );
  const stores = storesWithProducts;

  return (
    <MarketplaceClient
      initialProducts={products}
      categories={categories}
      total={total}
      currentPage={currentPage}
      limit={limit}
      params={params}
      viralClips={viralClips as any}
      topCreators={topCreators as any}
      popularStores={stores}
      hasShopifyProducts={shopifyCount > 0}
      marketplaceStats={{
        activeVendors: vendorCount,
        activeListings: listingCount,
        activeVendorsLabel: formatNumber(vendorCount),
        activeListingsLabel: formatNumber(listingCount),
      }}
    />
  );
}
