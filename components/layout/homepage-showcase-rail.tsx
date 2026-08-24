"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function defaultShowcaseVisibleCount(width: number) {
  if (width >= 1536) return 5;
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1.2;
}

export function ugcShowcaseVisibleCount(width: number) {
  if (width >= 1536) return 4;
  if (width >= 1280) return 3.4;
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1.25;
}

type HomepageShowcaseRailProps = {
  children: ReactNode[];
  ariaLabel: string;
  gapPx?: number;
  getVisibleCount?: (width: number) => number;
};

export function HomepageShowcaseRail({
  children,
  ariaLabel,
  gapPx = 14,
  getVisibleCount = defaultShowcaseVisibleCount,
}: HomepageShowcaseRailProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncArrows = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    setCanPrev(scroller.scrollLeft > 4);
    setCanNext(max > 4 && scroller.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;

    const update = () => {
      const cols = getVisibleCount(el.clientWidth);
      const width = (el.clientWidth - gapPx * (cols - 1)) / cols;
      setCardWidth(width > 0 ? width : null);
      requestAnimationFrame(syncArrows);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    scroller.addEventListener("scroll", syncArrows, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", syncArrows);
    };
  }, [gapPx, getVisibleCount, syncArrows, children.length]);

  const scrollByCard = useCallback(
    (direction: -1 | 1) => {
      const scroller = scrollerRef.current;
      if (!scroller || cardWidth == null) return;
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scroller.scrollBy({
        left: direction * (cardWidth + gapPx),
        behavior: reduced ? "auto" : "smooth",
      });
    },
    [cardWidth, gapPx],
  );

  if (!children.length) return null;

  const showArrows = canPrev || canNext;

  return (
    <div ref={viewportRef} className="relative">
      {showArrows ? (
        <>
          <RailArrow
            direction="prev"
            disabled={!canPrev}
            onClick={() => scrollByCard(-1)}
          />
          <RailArrow
            direction="next"
            disabled={!canNext}
            onClick={() => scrollByCard(1)}
          />
        </>
      ) : null}

      <div
        ref={scrollerRef}
        className="-mx-4 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6"
        style={{
          visibility: cardWidth == null ? "hidden" : "visible",
          WebkitOverflowScrolling: "touch",
        }}
        role="region"
        aria-label={ariaLabel}
      >
        <div className="flex w-max" style={{ gap: gapPx }}>
          {children.map((child, i) => (
            <div
              key={i}
              className="h-auto shrink-0 snap-start"
              style={cardWidth != null ? { width: cardWidth } : undefined}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RailArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Show previous cards" : "Show next cards"}
      className={cn(
        "absolute top-[42%] z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full md:grid",
        "border border-[var(--color-border)] bg-[var(--color-surface)]/95 text-[var(--color-text-primary)]",
        "shadow-[0_4px_16px_rgba(17,24,39,0.08)] backdrop-blur-sm",
        "transition-[opacity,transform,box-shadow,border-color] duration-200 ease-out",
        "hover:border-[var(--color-border-strong)] hover:shadow-[0_8px_20px_rgba(17,24,39,0.12)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-0",
        "motion-reduce:transition-none",
        direction === "prev" ? "left-0 lg:-left-2" : "right-0 lg:-right-2",
      )}
    >
      <Icon className="size-4" strokeWidth={2.2} />
    </button>
  );
}
