"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Package, Search, Star } from "lucide-react";

export type SupplierRecord = {
  id: string;
  business_name: string | null;
  business_slug: string | null;
  business_logo: string | null;
  rating: number | string | null;
  total_sales: number | null;
  business_country: string | null;
  created_at: string | null;
  verification_status: string | null;
  products?: Array<{ name?: string | null; slug?: string | null } | null> | null;
};

type SortKey = "sales" | "rating" | "newest";

function ratingValue(rating: number | string | null) {
  const value = typeof rating === "string" ? Number(rating) : rating;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function SupplierDirectory({ suppliers }: { suppliers: SupplierRecord[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("sales");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = suppliers.filter((supplier) => {
      if (!q) return true;
      const name = supplier.business_name?.toLowerCase() ?? "";
      const country = supplier.business_country?.toLowerCase() ?? "";
      return name.includes(q) || country.includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (sort === "rating") {
        return (ratingValue(b.rating) ?? -1) - (ratingValue(a.rating) ?? -1);
      }
      if (sort === "newest") {
        return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
      }
      return Number(b.total_sales ?? 0) - Number(a.total_sales ?? 0);
    });
  }, [query, sort, suppliers]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <section className="border-b border-border bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-[var(--container-max)] px-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Suppliers
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Suppliers with active listings
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-text-secondary">
            These stores currently have at least one active product. Sales counts and ratings come
            from the store record. A store is marked verified only when its verification status says so.
          </p>

          <form
            className="mt-8 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => event.preventDefault()}
            role="search"
          >
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search suppliers</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by supplier or country"
                className="h-12 w-full rounded-md border border-border bg-[var(--color-bg)] pl-10 pr-3 text-sm text-text-primary outline-none focus:border-[var(--color-accent)]"
              />
            </label>
            <button
              type="submit"
              className="h-12 rounded-md bg-[var(--color-accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
            >
              Search suppliers
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-[var(--container-max)] px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            {visible.length} {visible.length === 1 ? "supplier" : "suppliers"}
          </h2>
          <label className="text-sm text-text-secondary">
            <span className="mr-2">Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm font-medium text-text-primary"
            >
              <option value="sales">Top sales</option>
              <option value="rating">Highest rated</option>
              <option value="newest">Newest</option>
            </select>
          </label>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <p className="text-sm text-text-secondary">
              {suppliers.length === 0
                ? "No suppliers with active listings are available right now."
                : "No suppliers match that search."}
            </p>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-4 text-sm font-semibold text-[var(--color-accent)]"
              >
                Clear search
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visible.map((supplier) => {
              const name = supplier.business_name?.trim() || "Supplier";
              const href = supplier.business_slug ? `/vendors/${supplier.business_slug}` : null;
              const rating = ratingValue(supplier.rating);
              const products = (Array.isArray(supplier.products) ? supplier.products : []).filter(
                (product): product is { name?: string | null; slug?: string | null } =>
                  Boolean(product?.name && product.slug),
              );
              return (
                <li key={supplier.id} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface-secondary)] text-lg font-semibold text-text-primary">
                      {supplier.business_logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={supplier.business_logo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-text-primary">
                          {href ? (
                            <Link href={href} className="hover:text-[var(--color-accent)]">
                              {name}
                            </Link>
                          ) : (
                            name
                          )}
                        </h3>
                        {supplier.verification_status === "verified" ? (
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                            Verified
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5" aria-hidden />
                          {rating !== null ? rating.toFixed(1) : "No rating"}
                        </span>
                        {supplier.business_country ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" aria-hidden />
                            {supplier.business_country}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1">
                          <Package className="h-3.5 w-3.5" aria-hidden />
                          {Number(supplier.total_sales ?? 0).toLocaleString()} sales
                        </span>
                      </div>
                      {products.length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {products.slice(0, 3).map((product) => (
                            <li key={product.slug}>
                              <Link
                                href={`/marketplace/${product.slug}`}
                                className="inline-block rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary"
                              >
                                {product.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {href ? (
                        <Link
                          href={href}
                          className="mt-4 inline-flex h-10 items-center rounded-md bg-[var(--color-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
                        >
                          View supplier
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
