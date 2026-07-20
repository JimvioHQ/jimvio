"use client";

import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketplaceCollection } from "@/lib/marketplace/collections";

export function CollectionsSection({
  collections,
  className,
}: {
  collections: MarketplaceCollection[];
  className?: string;
}) {
  if (!collections?.length) return null;

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-stone-600 dark:border-white/8 dark:bg-white/5 dark:text-stone-400">
            <Layers className="h-3 w-3" />
            Collections
          </span>
          <h2 className="mt-1 text-[20px] font-bold tracking-tight text-[#11181c] dark:text-[#ededed] sm:text-[22px]">
            Shop by collection
          </h2>
          <p className="text-[12px] font-medium text-[#889096]">
            Curated drops for creators and buyers.
          </p>
        </div>
        <Link
          href="/marketplace/collections"
          className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-stone-500 transition-colors hover:text-[#fd5000]"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {collections.map((c, i) => {
          const cover = c.cover_image_url || c.preview_images?.[0];
          return (
            <Link
              key={c.id}
              href={`/marketplace/collections/${c.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:border-[#fd5000]/40 hover:shadow-md"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#fd5000]/15 via-stone-100 to-stone-200 dark:from-[#fd5000]/20 dark:via-stone-900 dark:to-stone-800">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                {c.badge && (
                  <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-[#fd5000]">
                    {c.badge}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-[13px] font-bold text-[var(--color-text-primary)]">
                  {c.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--color-text-muted)]">
                  {c.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
