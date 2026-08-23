"use client";

import { memo, useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { GraphNode } from "@/lib/commerce-graph/types";
import { CommerceGraphNodeCard, CommerceGraphNodeSkeleton } from "./CommerceGraphNodeCard";

const CARD_WIDTH = 168;
const CARD_GAP = 12;
const ESTIMATED_SIZE = CARD_WIDTH + CARD_GAP;

type CommerceGraphRailProps = {
  nodes: GraphNode[];
  sectionId: string;
  loading?: boolean;
  compact?: boolean;
};

function RailSkeleton() {
  return (
    <div className="flex min-w-0 gap-3 overflow-x-auto overflow-y-hidden px-0.5" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={`graph-rail-skel-${i}`} className="w-[148px] shrink-0 sm:w-[168px]">
          <CommerceGraphNodeSkeleton />
        </div>
      ))}
    </div>
  );
}

export const CommerceGraphRail = memo(function CommerceGraphRail({
  nodes,
  sectionId,
  loading = false,
  compact = false,
}: CommerceGraphRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: nodes.length,
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
  }, [nodes.length, virtualizer]);

  if (loading) return <RailSkeleton />;
  if (!nodes.length) return null;

  const totalWidth = virtualizer.getTotalSize();

  return (
    <div
      ref={scrollRef}
      role="list"
      aria-label={`${sectionId} discovery rail`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="relative min-w-0 w-full overflow-x-auto overflow-y-hidden pb-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
      style={{
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "thin",
        containIntrinsicSize: "auto 260px",
        contentVisibility: "auto",
      }}
    >
      <div className="relative min-h-[260px]" style={{ width: totalWidth }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const node = nodes[virtualItem.index];
          if (!node) return null;
          return (
            <div
              key={node.id}
              role="listitem"
              className="absolute top-0 snap-start"
              style={{
                width: CARD_WIDTH,
                transform: `translateX(${virtualItem.start}px)`,
                willChange: "transform",
              }}
            >
              <div className="w-[148px] sm:w-[168px]">
                <CommerceGraphNodeCard node={node} compact={compact} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
