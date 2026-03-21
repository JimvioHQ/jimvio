import React from "react";
import { getCategories, getProducts, getTopVendors, type ProductQuery } from "@/services/db";
import { DashboardMarketplaceClient } from "@/components/dashboard/dashboard-marketplace-client";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    sort?: string;
    type?: string;
    catalog?: string;
    min?: string;
    max?: string;
    country?: string;
    page?: string;
  }>;
}

export default async function DashboardMarketplacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const limit = 24;
  const offset = (page - 1) * limit;
  const isShopifyOnly = params.catalog === "shopify";

  const query: ProductQuery = {
    limit,
    offset,
    search: params.q,
    category: params.cat,
    type: isShopifyOnly ? undefined : params.type,
    sort: (params.sort as ProductQuery["sort"]) ?? "trending",
    minPrice: params.min ? Number(params.min) : undefined,
    maxPrice: params.max ? Number(params.max) : undefined,
    catalog: isShopifyOnly ? "shopify" : undefined,
  };

  const [categories, coreResult, vendors] = await Promise.all([
    getCategories().catch(() => []),
    getProducts(query).catch(() => ({ products: [], total: 0 })),
    getTopVendors(6).catch(() => []),
  ]);

  const rawProducts = coreResult.products;

  const products = (rawProducts ?? []).map((p: any) => ({
    ...p,
    vendors: Array.isArray(p.vendors) ? p.vendors[0] ?? null : p.vendors,
    product_categories: Array.isArray(p.product_categories) ? p.product_categories[0] ?? null : p.product_categories,
    source: p.source || "jimvio",
  }));

  const vendorList = vendors ?? [];
  const popularStores = await Promise.all(
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

  return (
    <DashboardMarketplaceClient
      initialProducts={products}
      categories={categories}
      total={coreResult.total ?? 0}
      currentPage={page}
      limit={limit}
      params={params}
      popularStores={popularStores}
    />
  );
}
