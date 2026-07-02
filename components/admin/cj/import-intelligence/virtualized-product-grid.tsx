"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { EnrichedProduct, ImportMode } from "@/lib/cj/import-intelligence/types";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  IntelligenceProductCard,
} from "./intelligence-product-card";
import { cn } from "@/lib/utils";

const GAP = 8;

function ProductCardSkeleton() {
  return (
    <div
      className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden animate-pulse"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      <div className="h-[145px] bg-[var(--color-surface-secondary)]" />
      <div className="p-1.5 space-y-1">
        <div className="h-2.5 bg-[var(--color-surface-secondary)] rounded-sm w-full" />
        <div className="h-8 bg-[var(--color-surface-secondary)] rounded-sm" />
        <div className="h-6 bg-[var(--color-surface-secondary)] rounded-sm" />
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
  importMode = "draft",
  onToggleSelect,
  onPreview,
  onImport,
  onImportAndPublish,
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
  importMode?: ImportMode;
  onToggleSelect: (pid: string) => void;
  onPreview: (p: EnrichedProduct) => void;
  onImport: (p: EnrichedProduct) => void;
  onImportAndPublish?: (p: EnrichedProduct) => void;
  onResync: (p: EnrichedProduct) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onVisiblePidsChange?: (pids: string[]) => void;
  className?: string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const onVisibleRef = useRef(onVisiblePidsChange);
  onVisibleRef.current = onVisiblePidsChange;
  const productsRef = useRef(products);
  productsRef.current = products;

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const columnCount = useMemo(
    () => Math.max(1, Math.floor((containerWidth + GAP) / (CARD_WIDTH + GAP))),
    [containerWidth]
  );

  const rowCount = Math.ceil(products.length / columnCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 4,
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
      const prefetchEnd = Math.min(list.length, visibleEnd + 10);
      cb(list.slice(visibleStart, prefetchEnd).map((p) => p.pid));
    },
  });

  useEffect(() => {
    const cb = onVisibleRef.current;
    if (!cb || products.length === 0) return;
    const items = rowVirtualizer.getVirtualItems();
    if (items.length === 0) return;
    const firstRow = items[0].index;
    const lastRow = items[items.length - 1].index;
    const visibleStart = firstRow * columnCount;
    const visibleEnd = Math.min(products.length, (lastRow + 1) * columnCount);
    const prefetchEnd = Math.min(products.length, visibleEnd + 10);
    cb(products.slice(visibleStart, prefetchEnd).map((p) => p.pid));
  }, [products, columnCount, rowVirtualizer]);

  useEffect(() => {
    if (!onLoadMore || !hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root: parentRef.current, rootMargin: "500px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loading, loadingMore, products.length]);

  const handleResize = useCallback(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  if (loading && products.length === 0) {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {Array.from({ length: 18 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!loading && products.length === 0) {
    return (
      <div className="py-12 text-center text-[12px] text-[var(--color-text-muted)] rounded-sm border border-dashed border-[var(--color-border)]">
        No products match. Adjust quick filters or presets.
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn("overflow-y-auto", className)}
      style={{ height: "calc(100vh - 340px)", minHeight: 360 }}
    >
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
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="flex flex-wrap gap-2">
                {rowProducts.map((product) => (
                  <IntelligenceProductCard
                    key={product.pid}
                    product={product}
                    importing={importingPid === product.pid}
                    selected={selectedPids.has(product.pid)}
                    importMode={importMode}
                    onToggleSelect={() => onToggleSelect(product.pid)}
                    onPreview={() => onPreview(product)}
                    onImport={() => onImport(product)}
                    onImportAndPublish={
                      onImportAndPublish
                        ? () => onImportAndPublish(product)
                        : undefined
                    }
                    onResync={() => onResync(product)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} className="h-6 flex items-center justify-center">
        {loadingMore && (
          <div className="h-4 w-4 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
        )}
      </div>
    </div>
  );
}
