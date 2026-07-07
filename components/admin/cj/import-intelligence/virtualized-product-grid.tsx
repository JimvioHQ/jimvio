"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { EnrichedProduct } from "@/lib/cj/import-intelligence/types";
import {
  CARD_HEIGHT,
  GRID_GAP,
  IntelligenceProductCard,
} from "./intelligence-product-card";
import { useColumnCount } from "./use-column-count";
import { cn } from "@/lib/utils";

function ProductCardSkeleton() {
  return (
    <div className="mx-auto h-[368px] w-full max-w-[210px] animate-pulse overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white">
      <div className="h-[192px] bg-[#F3F4F6]" />
      <div className="space-y-2 p-2.5">
        <div className="h-3 rounded bg-[#F3F4F6]" />
        <div className="h-3 w-2/3 rounded bg-[#F3F4F6]" />
        <div className="h-12 rounded bg-[#F3F4F6]" />
        <div className="h-[30px] rounded-[10px] bg-[#F3F4F6]" />
      </div>
    </div>
  );
}

export function VirtualizedProductGrid({
  products,
  loading,
  loadingMore,
  importingPid,
  selectedPids,
  onToggleSelect,
  onPreview,
  onPublish,
  onResync,
  onLoadMore,
  hasMore,
  onVisiblePidsChange,
  className,
}: {
  products: EnrichedProduct[];
  loading: boolean;
  loadingMore?: boolean;
  importingPid: string | null;
  selectedPids: Set<string>;
  onToggleSelect: (pid: string) => void;
  onPreview: (p: EnrichedProduct) => void;
  onPublish: (p: EnrichedProduct) => void;
  onResync: (p: EnrichedProduct) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onVisiblePidsChange?: (pids: string[]) => void;
  className?: string;
}) {
  const columnCount = useColumnCount();
  const anchorRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const onVisibleRef = useRef(onVisiblePidsChange);
  onVisibleRef.current = onVisiblePidsChange;
  const productsRef = useRef(products);
  productsRef.current = products;

  const rowCount = Math.ceil(products.length / columnCount);
  const rowHeight = CARD_HEIGHT + GRID_GAP;

  const updateScrollMargin = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setScrollMargin(rect.top + window.scrollY);
  }, []);

  useEffect(() => {
    updateScrollMargin();
    window.addEventListener("resize", updateScrollMargin);
    window.addEventListener("scroll", updateScrollMargin, { passive: true });
    return () => {
      window.removeEventListener("resize", updateScrollMargin);
      window.removeEventListener("scroll", updateScrollMargin);
    };
  }, [updateScrollMargin, products.length, columnCount]);

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeight,
    overscan: 3,
    scrollMargin,
    onChange: (instance) => {
      const cb = onVisibleRef.current;
      const list = productsRef.current;
      if (!cb || list.length === 0) return;
      const items = instance.getVirtualItems();
      if (items.length === 0) return;
      const firstRow = items[0].index;
      const lastRow = items[items.length - 1].index;
      const visibleStart = firstRow * columnCount;
      const visibleEnd = Math.min(list.length, (lastRow + 1) * columnCount);
      const prefetchEnd = Math.min(list.length, visibleEnd + 12);
      cb(list.slice(visibleStart, prefetchEnd).map((p) => p.pid));
    },
  });

  useEffect(() => {
    if (!onLoadMore || !hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root: null, rootMargin: "1000px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loading, loadingMore, products.length]);

  if (loading && products.length === 0) {
    return (
      <div
        className={cn("grid w-full gap-3", className)}
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columnCount * 2 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!loading && products.length === 0) {
    return (
      <div className="w-full rounded-[14px] border border-dashed border-[#E5E7EB] bg-white py-16 text-center">
        <p className="text-[13px] font-medium text-[#111827]">No products match</p>
        <p className="mt-1 text-[12px] text-[#9CA3AF]">
          Adjust filters or try a different search.
        </p>
      </div>
    );
  }

  return (
    <div ref={anchorRef} className={cn("relative w-full min-w-0", className)}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * columnCount;
          const rowProducts = products.slice(startIdx, startIdx + columnCount);
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              }}
            >
              <div
                className="grid w-full"
                style={{
                  gap: GRID_GAP,
                  gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                }}
              >
                {rowProducts.map((product, colIdx) => (
                  <IntelligenceProductCard
                    key={`${product.pid}-${virtualRow.index}-${colIdx}`}
                    product={product}
                    importing={importingPid === product.pid}
                    selected={selectedPids.has(product.pid)}
                    onToggleSelect={() => onToggleSelect(product.pid)}
                    onPreview={() => onPreview(product)}
                    onPublish={() => onPublish(product)}
                    onResync={() => onResync(product)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div
        ref={sentinelRef}
        className="flex min-h-10 items-center justify-center py-3"
      >
        {loadingMore && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FF5A1F] border-t-transparent" />
        )}
        {!hasMore && products.length > 0 && !loadingMore && (
          <p className="text-[11px] text-[#9CA3AF]">End of catalog</p>
        )}
      </div>
    </div>
  );
}
