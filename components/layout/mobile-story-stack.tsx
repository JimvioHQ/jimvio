"use client";

import { Children, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type MobileStoryStackProps = {
  children: ReactNode;
  className?: string;
  /** Desktop/tablet layout classes applied to the outer wrapper. */
  desktopClassName?: string;
};

/**
 * Mobile: CSS sticky stacked “story pages”.
 * Desktop: normal flow / grid via desktopClassName.
 * Prefer sticky + optional scroll-driven view timelines — no per-frame JS.
 */
export function MobileStoryStack({
  children,
  className,
  desktopClassName,
}: MobileStoryStackProps) {
  const items = Children.toArray(children);

  return (
    <div className={cn("jimvio-story-stack flex flex-col gap-5 max-md:gap-0", desktopClassName, className)}>
      {items.map((child, index) => (
        <div
          key={index}
          className="jimvio-story-card relative h-full max-md:sticky max-md:top-[calc(var(--navbar-height,68px)+10px)] max-md:mb-4 max-md:pb-1"
          style={
            {
              zIndex: index + 1,
              ["--story-i" as string]: index,
            } as CSSProperties
          }
        >
          {child}
        </div>
      ))}
      <style>{MOBILE_STORY_CSS}</style>
    </div>
  );
}

const MOBILE_STORY_CSS = `
@media (max-width: 767px) {
  .jimvio-story-stack {
    isolation: isolate;
  }
  .jimvio-story-card {
    will-change: transform, opacity;
  }
  @supports (animation-timeline: view()) {
    .jimvio-story-card {
      animation: jimvio-story-recede linear both;
      animation-timeline: view();
      animation-range: exit -10% exit 55%;
    }
    @keyframes jimvio-story-recede {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      100% {
        transform: scale(0.98);
        opacity: 0.92;
      }
    }
  }
}
@media (min-width: 768px) {
  .jimvio-story-card {
    position: relative !important;
    top: auto !important;
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
    will-change: auto;
  }
}
@media (prefers-reduced-motion: reduce) {
  .jimvio-story-card {
    position: relative !important;
    top: auto !important;
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
    will-change: auto;
  }
}
`;
