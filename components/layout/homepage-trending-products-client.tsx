"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchProductVideosMap, attachProductVideos } from "@/lib/product-videos";
import {
  MarketplaceTrendingProductCard,
  type TrendingProductCardProduct,
} from "@/components/marketplace/new/TrendingProductsClient";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
/** ~25px/s at 60fps — premium, non-distracting marquee speed */
const SCROLL_SPEED = 0.42;
const INTERACTION_RESUME_MS = 3500;

const PRODUCT_SELECT = `
  id, name, slug, price, currency, compare_at_price, images, product_type,
  status, is_flash_deal, discount_label, shipping_from,
  delivery_time, affiliate_commission_rate, sale_count,
  rating, review_count, is_free_shipping, vendor_id, category_id,
  vendors(id, verification_status)
`;

type ProductPair = {
  top: TrendingProductCardProduct;
  bottom: TrendingProductCardProduct | null;
  key: string;
};

function pairProducts(products: TrendingProductCardProduct[]): ProductPair[] {
  const pairs: ProductPair[] = [];
  for (let i = 0; i < products.length; i += 2) {
    pairs.push({
      top: products[i],
      bottom: products[i + 1] ?? null,
      key: products[i].id,
    });
  }
  return pairs;
}

const CARD_SLOT_MIN = "min-h-[276px] sm:min-h-[296px]";

const TrendingColumn = memo(function TrendingColumn({
  top,
  bottom,
}: {
  top: TrendingProductCardProduct;
  bottom: TrendingProductCardProduct | null;
}) {
  return (
    <div className="flex w-[148px] shrink-0 flex-col gap-3.5 sm:w-[168px]">
      <div className="shrink-0">
        <MarketplaceTrendingProductCard p={top} />
      </div>
      <div className="shrink-0">
        {bottom ? (
          <MarketplaceTrendingProductCard p={bottom} />
        ) : (
          <div className={cn("w-full", CARD_SLOT_MIN)} aria-hidden />
        )}
      </div>
    </div>
  );
});

type HomepageTrendingProductsClientProps = {
  initialProducts: TrendingProductCardProduct[];
  initialTotal: number;
};

export function HomepageTrendingProductsClient({
  initialProducts,
  initialTotal,
}: HomepageTrendingProductsClientProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [paused, setPaused] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const singleWidthRef = useRef(0);
  const pausedRef = useRef(false);
  const loadingRef = useRef(false);
  const productsRef = useRef(initialProducts);
  const totalRef = useRef(initialTotal);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const programmaticScrollRef = useRef(false);

  const pairs = useMemo(() => pairProducts(products), [products]);
  const loopPairs = useMemo(() => [...pairs, ...pairs], [pairs]);
  const autoScroll = !reducedMotion && pairs.length >= 2;

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    pausedRef.current = paused || reducedMotion;
  }, [paused, reducedMotion]);

  const scheduleResume = useCallback(() => {
    setPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setPaused(false);
    }, INTERACTION_RESUME_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
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
        .is("deleted_at", null)
        .order("view_count", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      const batch = (data ?? []) as TrendingProductCardProduct[];
      if (!batch.length) return;

      const videoMap = await fetchProductVideosMap(
        supabase,
        batch.map((p) => p.id),
      );
      const enriched = attachProductVideos(batch, videoMap);

      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...enriched.filter((p) => !seen.has(p.id))];
      });
      if (count != null) setTotal(count);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const measureLoopWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    singleWidthRef.current = track.scrollWidth / (autoScroll ? 2 : 1);
  }, [autoScroll]);

  useEffect(() => {
    measureLoopWidth();
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(measureLoopWidth);
    ro.observe(track);
    return () => ro.disconnect();
  }, [autoScroll, loopPairs.length, pairs.length, measureLoopWidth]);

  const wrapScrollPosition = useCallback(() => {
    const scroller = scrollerRef.current;
    const loopWidth = singleWidthRef.current;
    if (!scroller || loopWidth <= 0) return;

    if (scroller.scrollLeft >= loopWidth) {
      programmaticScrollRef.current = true;
      scroller.scrollLeft -= loopWidth;
      programmaticScrollRef.current = false;

      const offset = productsRef.current.length;
      if (!loadingRef.current && offset < totalRef.current) {
        void loadMore();
      }
    } else if (scroller.scrollLeft < 0) {
      programmaticScrollRef.current = true;
      scroller.scrollLeft += loopWidth;
      programmaticScrollRef.current = false;
    }
  }, [loadMore]);

  useEffect(() => {
    if (!autoScroll) return;

    const scroller = scrollerRef.current;
    if (!scroller || pairs.length < 2) return;

    let raf = 0;

    const tick = () => {
      if (!pausedRef.current && singleWidthRef.current > 0) {
        programmaticScrollRef.current = true;
        scroller.scrollLeft += SCROLL_SPEED;
        programmaticScrollRef.current = false;
        wrapScrollPosition();
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoScroll, pairs.length, wrapScrollPosition]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      scroller.scrollLeft += e.deltaY;
      wrapScrollPosition();
      scheduleResume();
    };

    const onScroll = () => {
      if (programmaticScrollRef.current || isDraggingRef.current) return;
      wrapScrollPosition();
      scheduleResume();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      isDraggingRef.current = true;
      dragStartXRef.current = e.clientX;
      dragScrollLeftRef.current = scroller.scrollLeft;
      scroller.setPointerCapture(e.pointerId);
      scheduleResume();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - dragStartXRef.current;
      scroller.scrollLeft = dragScrollLeftRef.current - delta;
      wrapScrollPosition();
    };

    const endDrag = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (scroller.hasPointerCapture(e.pointerId)) {
        scroller.releasePointerCapture(e.pointerId);
      }
      scheduleResume();
    };

    scroller.addEventListener("wheel", onWheel, { passive: false });
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("pointerdown", onPointerDown);
    scroller.addEventListener("pointermove", onPointerMove);
    scroller.addEventListener("pointerup", endDrag);
    scroller.addEventListener("pointercancel", endDrag);
    scroller.addEventListener("touchstart", scheduleResume, { passive: true });

    return () => {
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("pointerdown", onPointerDown);
      scroller.removeEventListener("pointermove", onPointerMove);
      scroller.removeEventListener("pointerup", endDrag);
      scroller.removeEventListener("pointercancel", endDrag);
      scroller.removeEventListener("touchstart", scheduleResume);
    };
  }, [autoScroll, scheduleResume, wrapScrollPosition]);

  if (!products.length) return null;

  const columns = autoScroll ? loopPairs : pairs;

  return (
    <div
      className={cn(
        "relative h-[570px] sm:h-[610px] -mx-4 sm:-mx-6",
        autoScroll ? "overflow-hidden" : "px-4 sm:px-6",
      )}
      role="region"
      aria-label="Trending products — two-row horizontal browse"
    >
      {autoScroll && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[var(--color-surface-secondary)] to-transparent sm:w-12"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[var(--color-surface-secondary)] to-transparent sm:w-12"
            aria-hidden
          />
        </>
      )}

      <div
        ref={scrollerRef}
        className={cn(
          "h-full overscroll-x-contain",
          autoScroll
            ? "overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            : "overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--color-border)]",
        )}
        style={autoScroll ? { WebkitOverflowScrolling: "touch", touchAction: "pan-x" } : undefined}
      >
        <div
          ref={trackRef}
          className={cn(
            "flex w-max gap-3.5 px-4 sm:px-6",
            autoScroll && "will-change-scroll",
          )}
        >
          {columns.map((col, index) => (
            <TrendingColumn
              key={autoScroll ? `${col.key}-${index}` : col.key}
              top={col.top}
              bottom={col.bottom}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
