"use client";

import { memo, useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ProductCardClient, type ProductCardClientProps } from "@/components/marketplace/product-card-client";
import { normalizeImages } from "@/lib/utils";
import type { FeedProduct } from "@/lib/marketplace/personalization";

const CARD_WIDTH = 168;
const CARD_GAP = 12;
const ESTIMATED_SIZE = CARD_WIDTH + CARD_GAP;

function toCardProduct(p: FeedProduct) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    price_usd: p.price_usd,
    compare_at_price: p.compare_at_price,
    discount_label: p.discount_label,
    is_flash_deal: p.is_flash_deal,
    images: normalizeImages(p.images),
    rating: p.rating ?? 0,
    review_count: p.review_count ?? 0,
    product_type: p.product_type,
    affiliate_commission_rate: p.affiliate_commission_rate,
    sale_count: p.sale_count ?? 0,
    view_count: p.view_count ?? 0,
    vendors: p.vendors ?? undefined,
    product_videos: p.product_videos,
    currency: p.currency,
  };
}

type PersonalizedProductRailProps = {
  products: FeedProduct[];
  sectionId: string;
  loading?: boolean;
};

function RailSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden px-0.5" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`rail-skeleton-${i}`}
          className="w-[148px] shrink-0 snap-start sm:w-[168px]"
        >
          <div
            className="overflow-hidden rounded-xl border border-[var(--color-border)]"
            style={{ background: "var(--color-surface)" }}
          >
            <div
              className="aspect-square animate-pulse"
              style={{ background: "var(--color-surface-secondary)" }}
            />
            <div className="space-y-2 p-2.5">
              <div
                className="h-3 w-full animate-pulse rounded"
                style={{ background: "var(--color-surface-secondary)" }}
              />
              <div
                className="h-4 w-1/2 animate-pulse rounded"
                style={{ background: "var(--color-surface-secondary)" }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export const PersonalizedProductRail = memo(function PersonalizedProductRail({
  products,
  sectionId,
  loading = false,
}: PersonalizedProductRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardProducts = useMemo(() => products.map(toCardProduct), [products]);

  const virtualizer = useVirtualizer({
    count: cardProducts.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_SIZE,
    horizontal: true,
    gap: CARD_GAP,
    overscan: 3,
  });

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = ESTIMATED_SIZE * 2;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      el.scrollBy({ left: step, behavior: "smooth" });
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      el.scrollBy({ left: -step, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    virtualizer.measure();
  }, [cardProducts.length, virtualizer]);

  if (loading) return <RailSkeleton />;
  if (!cardProducts.length) return null;

  const totalWidth = virtualizer.getTotalSize();

  return (
    <div
      ref={scrollRef}
      role="list"
      aria-label={`${sectionId} products`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="relative w-full overflow-x-auto overflow-y-hidden pb-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
      style={{
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "thin",
      }}
    >
      <div
        className="relative h-[min(100%,420px)] min-h-[260px]"
        style={{ width: totalWidth }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const product = cardProducts[virtualItem.index];
          if (!product) return null;
          return (
            <div
              key={product.id}
              role="listitem"
              data-index={virtualItem.index}
              className="absolute top-0 snap-start"
              style={{
                width: CARD_WIDTH,
                transform: `translateX(${virtualItem.start}px)`,
                willChange: "transform",
              }}
            >
              <div className="w-[148px] sm:w-[168px]">
                <ProductCardClient p={product as ProductCardClientProps["p"]} compact />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
