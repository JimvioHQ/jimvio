"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketplaceCollection } from "@/lib/marketplace/collections";

const prefetchedHrefs = new Set<string>();

export function CollectionsSection({
  collections,
  className,
  /** `row` = marketplace home (1 desktop row / 2 mobile rows). `grid` = View all page. */
  variant = "row",
}: {
  collections: MarketplaceCollection[];
  className?: string;
  variant?: "row" | "grid";
}) {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement | null>(null);

  const prefetchCollection = useCallback(
    (slug: string) => {
      const href = `/marketplace/collections/${slug}`;
      if (prefetchedHrefs.has(href)) return;
      prefetchedHrefs.add(href);
      try {
        router.prefetch(href);
      } catch {
        /* prefetch is best-effort */
      }
    },
    [router],
  );

  // Prefetch visible collection destinations as soon as the section enters view.
  useEffect(() => {
    if (!collections.length || typeof IntersectionObserver === "undefined") return;
    const root = sectionRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        for (const c of collections) prefetchCollection(c.slug);
        observer.disconnect();
      },
      { rootMargin: "200px 0px", threshold: 0.05 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [collections, prefetchCollection]);

  if (!collections?.length) return null;

  const isRow = variant === "row";

  return (
    <section ref={sectionRef} className={cn("space-y-3", className)}>
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
          prefetch
          onMouseEnter={() => {
            try {
              router.prefetch("/marketplace/collections");
            } catch {
              /* ignore */
            }
          }}
          className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div
        className={cn(
          isRow
            ? // Mobile/tablet: exactly 2 rows (4×2 for 8). Laptop/desktop: single non-wrapping row.
              "grid grid-cols-4 gap-2 overflow-hidden lg:flex lg:flex-nowrap lg:gap-2.5"
            : "grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
        )}
      >
        {collections.map((c, index) => {
          const cover = c.cover_image_url || c.preview_images?.[0];
          const countLabel =
            typeof c.product_count === "number" && c.product_count > 0
              ? `${c.product_count}+`
              : null;
          const href = `/marketplace/collections/${c.slug}`;
          const eager = isRow ? index < 8 : index < 6;
          return (
            <Link
              key={c.id}
              href={href}
              prefetch
              onMouseEnter={() => prefetchCollection(c.slug)}
              onFocus={() => prefetchCollection(c.slug)}
              onTouchStart={() => prefetchCollection(c.slug)}
              className={cn(
                "group relative min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:border-[var(--color-accent)]/40 hover:shadow-md",
                isRow && "lg:min-w-0 lg:flex-1",
              )}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-secondary)] sm:aspect-[5/3]">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={c.title}
                    width={320}
                    height={240}
                    loading={eager ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                {c.badge && (
                  <span className="absolute left-1 top-1 rounded bg-white/95 px-1 py-px text-[8px] font-bold text-[var(--color-accent)] sm:left-1.5 sm:top-1.5 sm:text-[9px]">
                    {c.badge}
                  </span>
                )}
              </div>
              <div className="px-1.5 py-1.5 sm:px-2 sm:py-1.5">
                <p className="truncate text-[11px] font-semibold text-[var(--color-text-primary)] sm:text-[12px]">
                  {c.title}
                </p>
                {countLabel ? (
                  <p className="mt-0.5 truncate text-[10px] text-[var(--color-text-muted)]">
                    {countLabel} products
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
