import React from "react";
import { getMarketplaceCategories, getProducts, type ProductQuery } from "@/services/db";
import { getCartProductIds } from "@/lib/actions/marketplace";
import { ProductsCatalogClient } from "./products-catalog-client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const query: ProductQuery = { limit: 200, offset: 0, sort: "newest" };
  const [categories, { products: raw }, cartProductIds] = await Promise.all([
    getMarketplaceCategories().catch(() => []),
    getProducts(query).catch(() => ({ products: [] })),
    getCartProductIds().catch(() => []),
  ]);

  const products = (raw ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    vendors: Array.isArray(p.vendors) ? p.vendors[0] ?? null : p.vendors,
    product_categories: Array.isArray(p.product_categories) ? p.product_categories[0] ?? null : p.product_categories,
    source: p.source || "jimvio",
  }));

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-28 pb-20">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[var(--color-text-primary)]">Products</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Browse every active listing on Jimvio</p>
        </div>
        <ProductsCatalogClient initialProducts={products as never} categories={categories as never} cartProductIds={cartProductIds} />
      </div>
    </div>
  );
}
