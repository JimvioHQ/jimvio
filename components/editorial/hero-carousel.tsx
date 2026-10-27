"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OverlayCard } from "@/components/editorial/presentation";
import type { StoryCardModel } from "@/lib/editorial/types";

export function HeroCarousel({ slides }: { slides: StoryCardModel[] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  if (count === 0) return null;
  const safeIndex = index % count;
  const slide = slides[safeIndex];

  function move(step: number) {
    setIndex((current) => (current + step + count) % count);
  }

  return (
    <div
      className="relative min-h-[420px] rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000] lg:min-h-[468px]"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured stories"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") move(1);
        if (event.key === "ArrowLeft") move(-1);
      }}
    >
      <OverlayCard
        card={slide}
        priority={safeIndex === 0}
        sizes="(min-width: 1024px) 62vw, 100vw"
        className="h-full min-h-[420px] lg:min-h-[468px]"
        contentClassName="px-5 pb-16 pt-5"
        scrim="hero"
        titleClassName="max-w-xl text-[28px] sm:text-[34px]"
      />
      {count > 1 ? (
        <>
          <div className="pointer-events-none absolute bottom-5 left-5 flex items-center gap-1.5">
            {slides.map((item, dot) => (
              <button
                key={item.href}
                type="button"
                aria-label={`Show story ${dot + 1}`}
                aria-current={dot === safeIndex}
                onClick={() => setIndex(dot)}
                className={`pointer-events-auto h-1 rounded-full ${dot === safeIndex ? "w-6 bg-[#fd5000]" : "w-3 bg-white/70"}`}
              />
            ))}
          </div>
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              type="button"
              aria-label="Previous story"
              onClick={() => move(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next story"
              onClick={() => move(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
