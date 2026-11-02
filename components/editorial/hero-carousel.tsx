"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OverlayCard } from "@/components/editorial/presentation";
import { editorialPhotoSrc } from "@/lib/editorial/image-display";
import type { StoryCardModel } from "@/lib/editorial/types";

export function HeroCarousel({ slides }: { slides: StoryCardModel[] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  if (count === 0) return null;
  const safeIndex = index % count;
  const slide = slides[safeIndex];
  const photo = editorialPhotoSrc(slide.imageUrl);

  function move(step: number) {
    setIndex((current) => (current + step + count) % count);
  }

  return (
    <div
      className={`relative rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000] ${photo ? "min-h-[360px] lg:min-h-[420px]" : ""}`}
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
        className={photo ? "h-full min-h-[360px] lg:min-h-[420px]" : ""}
        contentClassName="px-6 pb-14 pt-6 sm:px-8 sm:pb-16"
        scrim="hero"
        titleClassName="max-w-[18ch] text-[24px] leading-[1.14] sm:text-[29px] lg:text-[32px]"
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
                className={`pointer-events-auto h-1 rounded-full ${dot === safeIndex ? "w-6 bg-[#fd5000]" : photo ? "w-3 bg-white/70" : "w-3 bg-[#d0d5dd]"}`}
              />
            ))}
          </div>
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              type="button"
              aria-label="Previous story"
              onClick={() => move(-1)}
              className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm focus-visible:outline focus-visible:outline-2 ${photo ? "bg-white/20 text-white hover:bg-white/35 focus-visible:outline-white" : "border border-[#eceff3] bg-white text-[#172033] hover:bg-[#fafbfc] focus-visible:outline-[#fd5000]"}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next story"
              onClick={() => move(1)}
              className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm focus-visible:outline focus-visible:outline-2 ${photo ? "bg-white/20 text-white hover:bg-white/35 focus-visible:outline-white" : "border border-[#eceff3] bg-white text-[#172033] hover:bg-[#fafbfc] focus-visible:outline-[#fd5000]"}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
