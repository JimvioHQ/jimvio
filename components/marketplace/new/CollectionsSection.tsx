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
    <section className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[var(--color-text-muted)]">
            <Layers className="h-3 w-3" />
            Collections
          </span>
          <h2 className="mt-1 text-[18px] font-bold tracking-tight text-[var(--color-text-primary)] sm:text-[20px]">
            Shop by collection
          </h2>
          <p className="text-[12px] font-medium text-[var(--color-text-muted)]">
            Curated picks from the live Jimvio catalog.
          </p>
        </div>
        <Link
          href="/marketplace/collections"
          className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Compact horizontal scroll on mobile; tidy row on desktop */}
      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 scrollbar-thin sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-4 xl:grid-cols-6 sm:gap-3">
        {collections.map((c) => {
          const cover = c.cover_image_url || c.preview_images?.[0];
          const countLabel =
            typeof c.product_count === "number" && c.product_count > 0
              ? `${c.product_count}+ products`
              : c.description;
          return (
            <Link
              key={c.id}
              href={`/marketplace/collections/${c.slug}`}
              className="group relative w-[132px] shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:border-[var(--color-accent)]/40 hover:shadow-md sm:w-auto"
            >
              <div className="relative aspect-[5/4] overflow-hidden bg-[var(--color-surface-secondary)]">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                {c.badge && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-accent)]">
                    {c.badge}
                  </span>
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="truncate text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                  {c.title}
                </p>
                {countLabel ? (
                  <p className="mt-0.5 truncate text-[10.5px] text-[var(--color-text-muted)]">
                    {countLabel}
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
