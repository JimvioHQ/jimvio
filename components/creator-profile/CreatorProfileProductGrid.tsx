"use client";

import { useMemo } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { normalizeImages } from "@/lib/utils";
import type { CreatorProduct } from "@/lib/creator-profile/types";

function useColumnCount() {
  if (typeof window === "undefined") return 2;
  const w = window.innerWidth;
  if (w >= 1280) return 4;
  if (w >= 1024) return 3;
  if (w >= 640) return 2;
  return 2;
}

type CreatorProfileProductGridProps = {
  products: CreatorProduct[];
  cartProductIds: Set<string>;
};

export function CreatorProfileProductGrid({
  products,
  cartProductIds,
}: CreatorProfileProductGridProps) {
  const columnCount = useColumnCount();
  const rowCount = Math.ceil(products.length / columnCount);

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 320,
    overscan: 2,
    scrollMargin: 0,
  });

  const rows = useMemo(() => {
    const result: CreatorProduct[][] = [];
    for (let i = 0; i < rowCount; i++) {
      result.push(products.slice(i * columnCount, i * columnCount + columnCount));
    }
    return result;
  }, [products, rowCount, columnCount]);

  if (!products.length) {
    return (
      <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">No products yet.</p>
    );
  }

  return (
    <div
      className="relative w-full"
      style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const rowProducts = rows[virtualRow.index] ?? [];
        return (
          <div
            key={virtualRow.key}
            className="absolute left-0 top-0 grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
            style={{
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
              willChange: "transform",
            }}
          >
            {rowProducts.map((p) => (
              <ProductCardClient
                key={p.id}
                p={{
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  price: p.price,
                  compare_at_price: p.compareAtPrice,
                  images: normalizeImages(p.images),
                  product_type: p.productType,
                  currency: p.currency,
                  rating: p.rating ?? 0,
                  review_count: p.reviewCount ?? 0,
                  sale_count: p.saleCount ?? 0,
                  pricing_type: p.pricingType,
                  billing_period: p.billingPeriod,
                }}
                compact
                initialInCart={cartProductIds.has(p.id)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function CreatorProfileProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={`prod-skel-${i}`} className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          <div className="aspect-square animate-pulse bg-[var(--color-surface-secondary)]" />
          <div className="space-y-2 p-2.5">
            <div className="h-3 w-full animate-pulse rounded bg-[var(--color-surface-secondary)]" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
