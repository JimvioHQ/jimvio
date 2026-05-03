// "use client";

// import React, { useState } from "react";
// import { Zap } from "lucide-react";
// import { cn } from "@/lib/utils";

// interface ImageGalleryProps {
//   images: string[];
//   productName: string;
//   isFeatured?: boolean;
//   savings?: number | null;
//   className?: string;
// }

// export function ImageGallery({ images, productName, isFeatured, savings, className }: ImageGalleryProps) {
//   const [activeIndex, setActiveIndex] = useState(0);
//   const mainImage = images[activeIndex] ?? null;

//   return (
//     <div className={cn("space-y-3", className)}>
//       {/* Main Image */}
//       <div className="relative aspect-square bg-white dark:bg-surface rounded-sm border border-zinc-200 dark:border-border overflow-hidden group cursor-zoom-in">
//         {mainImage ? (
//           <img
//             src={mainImage}
//             alt={productName}
//             className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 ease-out"
//           />
//         ) : (
//           <div className="w-full h-full flex items-center justify-center text-6xl font-black text-zinc-200 dark:text-zinc-800 dark:text-text-secondary bg-zinc-50 dark:bg-surface/50 uppercase select-none">
//             {productName[0]}
//           </div>
//         )}

//         {/* Badges */}
//         <div className="absolute top-3 left-3 flex gap-2">
//           {savings && savings > 0 && (
//             <span className="bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-sm shadow">
//               {savings}%
//             </span>
//           )}
//           {isFeatured && (
//             <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-sm shadow flex items-center gap-1">
//               <Zap className="h-2.5 w-2.5" /> Hot
//             </span>
//           )}
//         </div>
//       </div>

//       {/* Thumbnails */}
//       {images.length > 1 && (
//         <div className="flex gap-2 overflow-x-auto pb-1">
//           {images.map((img, i) => (
//             <button
//               key={i}
//               onClick={() => setActiveIndex(i)}
//               className={cn(
//                 "h-14 w-14 shrink-0 rounded-sm border-2 overflow-hidden bg-white dark:bg-surface p-1 cursor-pointer transition-all",
//                 i === activeIndex
//                   ? "border-[var(--color-accent)] shadow-none ring-2 ring-[var(--color-accent)]/20"
//                   : "border-zinc-200 dark:border-border-strong hover:border-zinc-400 dark:hover:border-zinc-500 opacity-70 hover:opacity-100"
//               )}
//             >
//               <img src={img} alt="" className="w-full h-full object-contain" />
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Zap, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageGalleryProps {
  images: string[];
  productName: string;
  isFeatured?: boolean;
  savings?: number | null;
  className?: string;
}

/* ─── Zoom lens hook ─────────────────────────────────────────────────── */
function useZoom() {
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ active: true, x, y });
  }, []);

  const onLeave = useCallback(() => {
    setZoom(z => ({ ...z, active: false }));
  }, []);

  return { zoom, onMove, onLeave };
}

/* ─── Thumbnail strip ────────────────────────────────────────────────── */
function Thumbnail({
  src, index, active, onClick,
}: {
  src: string; index: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`View image ${index + 1}`}
      className={cn(
        "relative flex-shrink-0 w-[68px] h-[68px] overflow-hidden transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-foreground",
        active
          ? "ring-1 ring-foreground ring-offset-1 ring-offset-background opacity-100"
          : "opacity-40 hover:opacity-75"
      )}
    >
      <img
        src={src}
        alt=""
        className="w-full h-full object-contain bg-card p-1.5"
        draggable={false}
      />
      {/* Active indicator — bottom bar */}
      <span
        className={cn(
          "absolute bottom-0 inset-x-0 h-[2px] transition-all duration-300",
          active ? "bg-foreground" : "bg-transparent"
        )}
      />
    </button>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
export function ImageGallery({
  images,
  productName,
  isFeatured,
  savings,
  className,
}: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showZoomHint, setShowZoomHint] = useState(true);
  const stripRef = useRef<HTMLDivElement>(null);
  const { zoom, onMove, onLeave } = useZoom();

  const mainImage = images[activeIndex] ?? null;
  const hasMultiple = images.length > 1;

  // Hide zoom hint after first hover
  const handleFirstHover = useCallback(() => {
    setShowZoomHint(false);
  }, []);

  // Reset loaded state on image change
  useEffect(() => {
    setImageLoaded(false);
  }, [activeIndex]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!stripRef.current) return;
    const btn = stripRef.current.children[activeIndex] as HTMLElement;
    btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setActiveIndex(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setActiveIndex(i => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [images.length]);

  const prev = () => setActiveIndex(i => Math.max(0, i - 1));
  const next = () => setActiveIndex(i => Math.min(images.length - 1, i + 1));

  return (
    <div className={cn("flex flex-col gap-3", className)}>

      {/* ── Main image ─────────────────────────────────────────────── */}
      <div
        className="relative aspect-square bg-card overflow-hidden select-none cursor-none group"
        style={{ isolation: "isolate" }}
        onMouseMove={e => { onMove(e); handleFirstHover(); }}
        onMouseLeave={onLeave}
      >
        {/* Subtle grid texture on background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Image */}
        {mainImage ? (
          <>
            {/* Blurred placeholder until loaded */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}

            {/* Zoom viewport — magnified version underneath */}
            {zoom.active && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${mainImage})`,
                  backgroundSize: "250%",
                  backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                  backgroundRepeat: "no-repeat",
                  opacity: 1,
                  zIndex: 5,
                }}
              />
            )}

            <img
              key={mainImage}
              src={mainImage}
              alt={productName}
              onLoad={() => setImageLoaded(true)}
              className={cn(
                "absolute inset-0 w-full h-full object-contain p-6 transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0",
                zoom.active ? "opacity-0" : "opacity-100"
              )}
              draggable={false}
            />
          </>
        ) : (
          /* Fallback: first letter of product name */
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-[120px] font-black text-muted-foreground/10 uppercase leading-none select-none">
              {productName[0]}
            </span>
          </div>
        )}

        {/* Custom crosshair cursor */}
        {mainImage && (
          <div
            className="pointer-events-none absolute z-20 transition-opacity duration-150"
            style={{
              left: `${zoom.x}%`,
              top: `${zoom.y}%`,
              transform: "translate(-50%, -50%)",
              opacity: zoom.active ? 1 : 0,
            }}
          >
            <div className="relative w-8 h-8">
              <span className="absolute inset-0 m-auto w-[1px] h-full bg-foreground/60" />
              <span className="absolute inset-0 m-auto h-[1px] w-full bg-foreground/60" />
              <span className="absolute inset-0 rounded-full border border-foreground/30 scale-150" />
            </div>
          </div>
        )}

        {/* Badges — top left, flush to corner */}
        <div className="absolute top-0 left-0 flex flex-col gap-px z-10">
          {savings != null && savings > 0 && (
            <span className="bg-foreground text-background text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 leading-none">
              −{savings}%
            </span>
          )}
          {isFeatured && (
            <span className="bg-[#fd5000] text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 leading-none flex items-center gap-1.5">
              <Zap className="h-2.5 w-2.5 fill-white stroke-none" /> Hot
            </span>
          )}
        </div>

        {/* Zoom hint — fades out on first hover */}
        {mainImage && showZoomHint && (
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm border border-border px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground pointer-events-none">
            <ZoomIn className="h-3 w-3" />
            Hover to zoom
          </div>
        )}

        {/* Image counter pill — top right */}
        {hasMultiple && (
          <div className="absolute top-3 right-3 z-10 bg-background/80 backdrop-blur-sm border border-border px-2 py-1 text-[10px] font-mono font-medium text-muted-foreground tabular-nums">
            {activeIndex + 1}/{images.length}
          </div>
        )}
        {hasMultiple && (
          <>
            <button
              onClick={prev}
              disabled={activeIndex === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-background/90 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-0 hover:bg-background"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              disabled={activeIndex === images.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-background/90 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-0 hover:bg-background"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* ── Thumbnail strip ─────────────────────────────────────────── */}
      {hasMultiple && (
        <div
          ref={stripRef}
          className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5"
          style={{ scrollbarWidth: "none" }}
          role="tablist"
          aria-label="Product images"
        >
          {images.map((img, i) => (
            <Thumbnail
              key={i}
              src={img}
              index={i}
              active={i === activeIndex}
              onClick={() => setActiveIndex(i)}
            />
          ))}
        </div>
      )}

      {/* ── Dot indicators for mobile (hidden on md+) ────────────────── */}
      {hasMultiple && (
        <div className="flex justify-center gap-1.5 md:hidden">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "transition-all duration-300 rounded-full",
                i === activeIndex
                  ? "w-4 h-1.5 bg-foreground"
                  : "w-1.5 h-1.5 bg-foreground/20"
              )}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}