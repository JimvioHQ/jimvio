"use client";

import React, { useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageGalleryProps {
  images: string[];
  productName: string;
  isFeatured?: boolean;
  savings?: number | null;
}

export function ImageGallery({ images, productName, isFeatured, savings }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const mainImage = images[activeIndex] ?? null;

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="relative aspect-square bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden group cursor-zoom-in">
        {mainImage ? (
          <img
            src={mainImage}
            alt={productName}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl font-black text-zinc-200 dark:text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 uppercase select-none">
            {productName[0]}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {savings && savings > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow">
              −{savings}%
            </span>
          )}
          {isFeatured && (
            <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow flex items-center gap-1">
              <Zap className="h-2.5 w-2.5" /> Hot
            </span>
          )}
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "h-14 w-14 shrink-0 rounded-lg border-2 overflow-hidden bg-white dark:bg-zinc-900 p-1 cursor-pointer transition-all",
                i === activeIndex
                  ? "border-[var(--color-accent)] shadow-sm ring-2 ring-[var(--color-accent)]/20"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 opacity-70 hover:opacity-100"
              )}
            >
              <img src={img} alt="" className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
