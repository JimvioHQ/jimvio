"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X, Loader2 } from "lucide-react";
import {
  STORE_PRODUCT_SORT_LABELS,
  STORE_PRODUCT_SORTS,
  buildStoreProductsHref,
  type StoreProductSort,
} from "@/lib/marketplace/store-product-query";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  initialQuery: string;
  initialSort: StoreProductSort;
  resultCount: number;
  totalCount: number;
};

export function StoreProductControls({
  slug,
  initialQuery,
  initialSort,
  resultCount,
  totalCount,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Keyed remount from the server page keeps draft input aligned with URL state.
  const [query, setQuery] = useState(initialQuery);

  function navigate(next: { q?: string; sort?: StoreProductSort; page?: number }) {
    const href = buildStoreProductsHref({
      slug,
      q: next.q ?? query,
      sort: next.sort ?? initialSort,
      page: next.page ?? 1,
    });
    startTransition(() => {
      router.push(href);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q: query.trim(), page: 1 });
  }

  function onClear() {
    setQuery("");
    navigate({ q: "", page: 1 });
  }

  function onSortChange(value: string) {
    const nextSort = (STORE_PRODUCT_SORTS as readonly string[]).includes(value)
      ? (value as StoreProductSort)
      : "newest";
    navigate({ sort: nextSort, page: 1 });
  }

  return (
    <div className="mb-8 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={onSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in this store..."
            aria-label="Search products in this store"
            className={cn(
              "h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
              "pl-10 pr-20 text-sm outline-none focus:border-[var(--color-accent)]",
            )}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {pending && (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-muted)]" />
            )}
            {query ? (
              <button
                type="button"
                onClick={onClear}
                aria-label="Clear search"
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </form>

        <select
          value={initialSort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Sort store products"
          className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-bold"
        >
          {STORE_PRODUCT_SORTS.map((key) => (
            <option key={key} value={key}>
              {STORE_PRODUCT_SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
        {initialQuery ? (
          <p>
            {resultCount.toLocaleString()} result{resultCount === 1 ? "" : "s"} for
            {" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              “{initialQuery}”
            </span>
          </p>
        ) : (
          <p>
            {totalCount.toLocaleString()} product{totalCount === 1 ? "" : "s"}
          </p>
        )}
        {pending && <span className="text-[var(--color-accent)]">Updating…</span>}
      </div>
    </div>
  );
}
