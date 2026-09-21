"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function StorefrontProductGallery({
  images,
  alt,
  activeSrc,
}: {
  images: string[];
  alt: string;
  /** When a variant image is selected, prefer it as the featured source. */
  activeSrc?: string | null;
}) {
  const list = images.length ? images : activeSrc ? [activeSrc] : [];
  const activeIndex =
    activeSrc && list.length ? list.indexOf(activeSrc) : -1;
  const [manualIndex, setManualIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const index =
    activeIndex >= 0
      ? activeIndex
      : Math.min(manualIndex, Math.max(0, list.length - 1));
  const count = list.length;
  const current = list[index] || list[0] || null;

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setManualIndex(() => {
        const base = activeIndex >= 0 ? activeIndex : index;
        return (base + delta + count) % count;
      });
    },
    [count, activeIndex, index],
  );

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, go]);

  return (
    <div className="space-y-3">
      <div
        className="group relative overflow-hidden rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-surface,#fff)]"
        style={{ aspectRatio: "var(--store-image-ratio, 1 / 1)" }}
      >
        {current ? (
          <button
            type="button"
            className="h-full w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-primary,#FF5A1F)]"
            onClick={() => setLightbox(true)}
            aria-label="View larger image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt={alt}
              className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.02] sm:p-4"
            />
          </button>
        ) : (
          <div className="grid h-full place-items-center text-sm text-[var(--store-muted,#6B7280)]">
            No image
          </div>
        )}
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)]/95 text-[var(--store-text)] opacity-0 shadow-sm transition group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)]/95 text-[var(--store-text)] opacity-0 shadow-sm transition group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
              {index + 1} / {count}
            </span>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible lg:grid-cols-6">
          {list.slice(0, 12).map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setManualIndex(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === index}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border object-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-primary,#FF5A1F)] sm:h-auto sm:w-auto sm:aspect-square ${
                i === index
                  ? "border-[var(--store-primary,#FF5A1F)] ring-2 ring-[var(--store-primary,#FF5A1F)]/30"
                  : "border-[var(--store-border,rgba(0,0,0,0.06))]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-contain p-1" />
            </button>
          ))}
        </div>
      ) : null}

      {lightbox && current ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Product image gallery"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
            onClick={() => setLightbox(false)}
          >
            <X className="h-5 w-5" />
          </button>
          {count > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={list[index] || current}
            alt={alt}
            className="max-h-[88vh] max-w-[min(960px,94vw)] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
