import React from "react";
import {
  getMarketplaceCategories,
  getProducts,
  countActiveShopifyProducts,
  countActiveListedProducts,
  type ProductQuery,
} from "@/services/db";
import { formatNumber } from "@/lib/utils";
import { getCartProductIds, getFollowedVendorIds } from "@/lib/actions/marketplace";
import { MarketplaceClient } from "@/components/marketplace/marketplace-client";

interface PageProps {
  searchParams: Promise<{
    cat?: string;
    catalog?: string;
    q?: string;
    sort?: string;
    page?: string;
    affiliate?: string;
  }>;
}

export default async function MarketplaceDigitalPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1"));
  const limit = 24;
  const offset = (currentPage - 1) * limit;

  const query: ProductQuery = {
    limit,
    offset,
    search: params.q,
    category: params.cat,
    sort: (params.sort as ProductQuery["sort"]) ?? "trending",
    affiliate: params.affiliate === "1" ? true : undefined,
    type: "digital",
  };

  const [categories, coreProductsResult, listingCount, cartProductIds, followedVendorIds] =
    await Promise.all([
      getMarketplaceCategories().catch(() => []),
      getProducts(query).catch(() => ({ products: [], total: 0 })),
      countActiveListedProducts().catch(() => 0),
      getCartProductIds().catch(() => []),
      getFollowedVendorIds().catch(() => []),
    ]);

  const { products: rawProducts, total } = coreProductsResult;

  const products = (rawProducts ?? []).map((p: any) => ({
    ...p,
    vendors: Array.isArray(p.vendors) ? p.vendors[0] ?? null : p.vendors,
    product_categories: Array.isArray(p.product_categories) ? p.product_categories[0] ?? null : p.product_categories,
    source: p.source || "jimvio",
  }));

  // Create combined params object injecting type='digital'
  const combinedParams = { ...params, type: "digital" };

  return (
    <MarketplaceClient
      initialProducts={products}
      categories={categories}
      total={total}
      currentPage={currentPage}
      limit={limit}
      params={combinedParams}
      uiVariant="digital"
      basePath="/marketplace/digital"
      cartProductIds={cartProductIds}
      followedVendorIds={followedVendorIds}
      marketplaceStats={{
        activeVendors: 0,
        activeListings: listingCount,
        activeVendorsLabel: "0",
        activeListingsLabel: formatNumber(listingCount),
      }}
    />
  );
}

