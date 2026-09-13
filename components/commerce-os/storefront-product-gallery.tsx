"use client";

import { useState } from "react";

export function StorefrontProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [index, setIndex] = useState(0);
  const current = images[index] || images[0] || null;

  return (
    <div className="space-y-3">
      <div
        className="overflow-hidden rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.06))] bg-[var(--store-surface,#fff)]"
        style={{ aspectRatio: "var(--store-image-ratio, 1 / 1)" }}
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-[var(--store-muted,#6B7280)]">
            No image
          </div>
        )}
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
          {images.slice(0, 8).map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === index}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border object-cover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-primary,#FF5A1F)] sm:h-auto sm:w-auto sm:aspect-square ${
                i === index
                  ? "border-[var(--store-primary,#FF5A1F)] ring-2 ring-[var(--store-primary,#FF5A1F)]/30"
                  : "border-[var(--store-border,rgba(0,0,0,0.06))]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
