"use client";

import { memo, useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { BusinessNode } from "@/lib/business-graph/types";
import { BusinessGraphNodeCard, BusinessGraphNodeSkeleton } from "./BusinessGraphNodeCard";

const CARD_WIDTH = 168;
const CARD_GAP = 12;
const ESTIMATED = CARD_WIDTH + CARD_GAP;

export const BusinessGraphRail = memo(function BusinessGraphRail({
  nodes,
  sectionId,
  loading = false,
}: {
  nodes: BusinessNode[];
  sectionId: string;
  loading?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: nodes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED,
    horizontal: true,
    gap: CARD_GAP,
    overscan: 3,
  });

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = ESTIMATED * 2;
    if (e.key === "ArrowRight") { e.preventDefault(); el.scrollBy({ left: step, behavior: "smooth" }); }
    if (e.key === "ArrowLeft") { e.preventDefault(); el.scrollBy({ left: -step, behavior: "smooth" }); }
  }, []);

  useEffect(() => { virtualizer.measure(); }, [nodes.length, virtualizer]);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-[168px] shrink-0"><BusinessGraphNodeSkeleton /></div>
        ))}
      </div>
    );
  }
  if (!nodes.length) return null;

  return (
    <div
      ref={scrollRef}
      role="list"
      aria-label={`${sectionId} business graph rail`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="relative min-w-0 w-full overflow-x-auto overflow-y-hidden pb-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
      style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", contentVisibility: "auto", containIntrinsicSize: "auto 260px" }}
    >
      <div className="relative min-h-[260px]" style={{ width: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const node = nodes[vi.index];
          if (!node) return null;
          return (
            <div
              key={node.id}
              role="listitem"
              className="absolute top-0 snap-start"
              style={{ width: CARD_WIDTH, transform: `translateX(${vi.start}px)`, willChange: "transform" }}
            >
              <div className="w-[148px] sm:w-[168px]">
                <BusinessGraphNodeCard node={node} compact />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
