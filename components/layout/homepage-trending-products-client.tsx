"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchProductVideosMap, attachProductVideos } from "@/lib/product-videos";
import { HomepageFlashDealCard } from "@/components/layout/homepage-flash-deal-card";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import { dedupeProductsByIdentity } from "@/lib/marketplace/homepage-ranking";
import type { TrendingProductCardProduct } from "@/components/marketplace/new/TrendingProductsClient";
import { getCartProductIds } from "@/lib/actions/marketplace-storefront";

const PAGE_SIZE = 12;
const GAP_PX = 14; // gap-3.5

const PRODUCT_SELECT = `
  id, name, slug, price, currency, compare_at_price, images, product_type,
  status, is_active, is_flash_deal, discount_label, shipping_from,
  delivery_time, affiliate_commission_rate, sale_count, view_count,
  rating, review_count, is_free_shipping, vendor_id, category_id,
  created_at, auto_unpublished, deleted_at, sku, source, source_metadata,
  vendors(id, verification_status)
`;

function getVisibleCount(width: number) {
  if (width >= 1280) return 6;
  if (width >= 1024) return 5;
  if (width >= 768) return 3;
  return 1.75;
}

type HomepageTrendingProductsClientProps = {
  initialProducts: TrendingProductCardProduct[];
  initialTotal: number;
};

/**
 * Manual horizontal rail — no perpetual RAF / continuous card animation.
 * Arrow + native touch scroll only (compositor-friendly, mobile-first).
 */
export function HomepageTrendingProductsClient({
  initialProducts,
  initialTotal,
}: HomepageTrendingProductsClientProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [products, setProducts] = useState(() =>
    dedupeProductsByIdentity(initialProducts),
  );
  const [total, setTotal] = useState(initialTotal);
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const [cartIds, setCartIds] = useState<Set<string>>(() => new Set());

  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const productsRef = useRef(initialProducts);
  const totalRef = useRef(initialTotal);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    let cancelled = false;
    void getCartProductIds().then((ids) => {
      if (!cancelled) setCartIds(new Set(ids));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const update = () => {
      const cols = getVisibleCount(el.clientWidth);
      const width = (el.clientWidth - GAP_PX * (cols - 1)) / cols;
      setCardWidth(width > 0 ? width : null);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const loadMore = useCallback(async () => {
    const offset = productsRef.current.length;
    if (loadingRef.current || offset >= totalRef.current) return;

    loadingRef.current = true;
    const supabase = createClient();

    try {
      const { data, count } = await supabase
        .from("products")
        .select(PRODUCT_SELECT, { count: "exact" })
        .eq("status", "active")
        .eq("is_active", true)
        .eq("product_type", "physical")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      const batch = (data ?? []) as TrendingProductCardProduct[];
      if (!batch.length) return;

      const videoMap = await fetchProductVideosMap(
        supabase,
        batch.map((p) => p.id),
      );
      const enriched = attachProductVideos(batch, videoMap);

      setProducts((prev) => dedupeProductsByIdentity([...prev, ...enriched]));
      if (count != null) setTotal(count);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const scrollByCard = useCallback(
    (direction: -1 | 1) => {
      const scroller = scrollerRef.current;
      if (!scroller || cardWidth == null) return;
      scroller.scrollBy({
        left: direction * (cardWidth + GAP_PX),
        behavior: reducedMotion ? "auto" : "smooth",
      });

      const nearEnd =
        scroller.scrollLeft + scroller.clientWidth >
        scroller.scrollWidth - cardWidth * 2;
      if (nearEnd) void loadMore();
    },
    [cardWidth, loadMore, reducedMotion],
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const onScroll = () => {
      if (cardWidth == null) return;
      const nearEnd =
        scroller.scrollLeft + scroller.clientWidth >
        scroller.scrollWidth - cardWidth * 2.5;
      if (nearEnd) void loadMore();
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [cardWidth, loadMore]);

  if (!products.length) return null;

  return (
    <div
      ref={viewportRef}
      className="relative -mx-4 overflow-hidden sm:-mx-6"
      role="region"
      aria-label="Trending products — horizontal browse"
    >
      <button
        type="button"
        onClick={() => scrollByCard(-1)}
        aria-label="Show previous products"
        className="absolute left-2 top-[38%] z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/95 text-[var(--color-text-primary)] shadow-[0_4px_16px_rgba(17,24,39,0.08)] transition-shadow duration-200 hover:shadow-[0_8px_20px_rgba(17,24,39,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 md:grid"
      >
        <ChevronLeft className="size-4" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        onClick={() => scrollByCard(1)}
        aria-label="Show next products"
        className="absolute right-2 top-[38%] z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/95 text-[var(--color-text-primary)] shadow-[0_4px_16px_rgba(17,24,39,0.08)] transition-shadow duration-200 hover:shadow-[0_8px_20px_rgba(17,24,39,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 md:grid"
      >
        <ChevronRight className="size-4" strokeWidth={2.2} />
      </button>

      <div
        ref={scrollerRef}
        className={cn(
          "overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1",
          "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--color-border)]",
          "[scrollbar-width:thin]",
        )}
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
      >
        <div
          className="flex w-max gap-3.5 px-4 sm:px-6"
          style={{ visibility: cardWidth == null ? "hidden" : "visible" }}
        >
          {products.map((product, index) => (
            <div
              key={product.id}
              className="shrink-0 snap-start"
              style={cardWidth != null ? { width: cardWidth } : undefined}
            >
              <HomepageFlashDealCard
                p={product}
                initiallyInCart={cartIds.has(product.id)}
                cartResolved
                priority={index < 2}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const HomepageFlashDealsClient = memo(HomepageTrendingProductsClient);
