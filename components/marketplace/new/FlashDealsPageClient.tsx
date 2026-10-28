"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Zap, ChevronLeft, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FlashDealCard } from "./FlashDealsClient";
import { FlashDealsCountdown } from "./FlashDealsCountdown";
import type { DbProduct } from "@/lib/utils";
import { getEffectiveCompareAtPrice } from "@/lib/utils";
import { canonicalMarketplacePath, type MarketplaceProductType } from "@/lib/marketplace/experience";
import { getMarketplaceTypeFilter } from "@/lib/marketplace/fetch-page-data";

type FlashDealProduct = DbProduct & { currency?: string | null };

type SortKey = "discount" | "price_asc" | "price_desc" | "newest";

const PAGE_SIZE = 24;

function discountPercent(p: FlashDealProduct): number {
  const compare = getEffectiveCompareAtPrice(p);
  if (!compare || compare <= p.price) return 0;
  return Math.round(((compare - p.price) / compare) * 100);
}

export function FlashDealsPageClient({
  initialDeals,
  productType = null,
}: {
  initialDeals: FlashDealProduct[];
  productType?: MarketplaceProductType | null;
}) {
  const supabase = useRef(createClient());
  const [deals, setDeals] = useState<FlashDealProduct[]>(initialDeals);
  const [sort, setSort] = useState<SortKey>("discount");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialDeals.length >= PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let list = [...deals];
    if (productType === "physical") {
      list = list.filter((p) => p.product_type === "physical");
    } else if (productType === "digital") {
      const allowed = new Set<string>(getMarketplaceTypeFilter("digital"));
      list = list.filter((p) => p.product_type != null && allowed.has(p.product_type));
    }

    switch (sort) {
      case "price_asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        list.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
        break;
      case "discount":
      default:
        list.sort((a, b) => discountPercent(b) - discountPercent(a));
        break;
    }
    return list;
  }, [deals, sort, productType]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const offset = page * PAGE_SIZE;
    let query = supabase.current
      .from("products")
      .select(`
        id, name, slug, price, compare_at_price, currency, images, product_type,
        status, is_flash_deal, discount_label, shipping_from,
        delivery_time, affiliate_commission_rate, view_count, sale_count,
        sold_count, claimed_pct, rating, review_count, is_free_shipping, vendor_id, category_id
      `)
      .eq("is_flash_deal", true)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null);
    if (productType) {
      query = query.in("product_type", [...getMarketplaceTypeFilter(productType)]);
    }
    const { data } = await query
      .order("view_count", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const rows = (data ?? []) as FlashDealProduct[];
    if (rows.length < PAGE_SIZE) setHasMore(false);
    if (rows.length > 0) {
      setDeals((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...rows.filter((p) => !seen.has(p.id))];
      });
      setPage((p) => p + 1);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [hasMore, loadingMore, page, productType]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="min-w-0">
      <section
        className="overflow-hidden rounded-2xl"
        style={{
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-white"
          style={{
            background: "linear-gradient(90deg, var(--color-accent) 0%, #ff8c00 100%)",
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={productType ? canonicalMarketplacePath(productType) : "/marketplace/physical"}
              className="flex items-center gap-1 rounded-lg bg-black/20 px-2 py-1 text-xs font-semibold text-white/90 transition-colors hover:bg-black/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <ChevronLeft className="size-3.5" />
              Marketplace
            </Link>
            <div className="flex items-center gap-2">
              <Zap className="size-4 fill-current" />
              <span className="font-bold">All Flash Deals</span>
            </div>
          </div>
          <FlashDealsCountdown />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-3 py-2 sm:px-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-text-muted)]">
            <SlidersHorizontal className="size-3.5" />
            Filter
          </div>
          {([
            { id: "all", label: "All", href: "/marketplace/flash-deals" },
            { id: "physical", label: "Physical", href: "/marketplace/flash-deals?type=physical" },
            { id: "digital", label: "Digital", href: "/marketplace/flash-deals?type=digital" },
          ] as const).map((item) => {
            const selected = item.id === "all" ? productType == null : productType === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className="rounded-full px-3 py-1 text-[11px] font-bold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                style={{
                  background: selected ? "var(--color-accent)" : "var(--color-surface-secondary)",
                  color: selected ? "white" : "var(--color-text-muted)",
                }}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="flash-sort" className="text-[11px] font-semibold text-[var(--color-text-muted)]">
              Sort
            </label>
            <select
              id="flash-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] outline-none"
            >
              <option value="discount">Biggest discount</option>
              <option value="price_asc">Price: Low to high</option>
              <option value="price_desc">Price: High to low</option>
              <option value="newest">Most viewed</option>
            </select>
          </div>
        </div>

        <div className="p-2 sm:p-3">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              No flash deals match your filters right now.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((d) => (
                <FlashDealCard key={d.id} d={d} />
              ))}
            </div>
          )}

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                {loadingMore ? "Loading more deals..." : "Scroll for more"}
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
