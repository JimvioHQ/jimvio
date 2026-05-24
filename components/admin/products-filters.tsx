// components/admin/products-filters.tsx
"use client";

import Link from "next/link";
import React from "react";
import { FilterChip } from "@/components/ui/admin";

function buildHref(params: { q?: string; status?: string; featured?: string; sort?: string; order?: string; override?: Record<string, string> }) {
    const u = new URLSearchParams();
    if (params.q) u.set("q", params.q);
    if (params.status && params.status !== "all") u.set("status", params.status);
    if (params.featured) u.set("featured", params.featured);
    if (params.sort) u.set("sort", params.sort);
    if (params.order) u.set("order", params.order);
    if (params.override) {
        Object.entries(params.override).forEach(([key, value]) => {
            if (value === "" || value === "all") {
                u.delete(key);
            } else {
                u.set(key, value);
            }
        });
    }
    const qs = u.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
}

export function ProductsFilters({ q, status, featured, sort, order, total, filtered }: {
    q?: string;
    status?: string;
    featured?: string;
    sort?: string;
    order?: string;
    total: number;
    filtered: number;
}) {
    const hasFilters = !!(q || status || featured);
    const featuredActive = featured === "1";

    return (
        <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
            <form method="get" action="/admin/products" className="space-y-4">
                {sort && <input type="hidden" name="sort" value={sort} />}
                {order && <input type="hidden" name="order" value={order} />}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 min-w-0">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </span>
                        <input
                            name="q"
                            defaultValue={q ?? ""}
                            placeholder="Search by name or slug…"
                            className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-3 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-orange-500 focus:ring-orange-500/20"
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="submit"
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-[var(--color-surface)] transition-colors hover:bg-orange-500"
                        >
                            Apply
                        </button>
                        {hasFilters && (
                            <Link
                                href="/admin/products"
                                className="inline-flex h-9 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[13px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                            >
                                Clear
                            </Link>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { label: "All statuses", value: "all" },
                        { label: "Active", value: "active" },
                        { label: "Draft", value: "draft" },
                        { label: "Inactive", value: "inactive" },
                        { label: "Banned", value: "banned" },
                    ].map((item) => (
                        <FilterChip
                            key={item.value}
                            label={item.label}
                            href={buildHref({ q, status: item.value, featured, sort, order })}
                            active={item.value === "all" ? !status || status === "all" : status === item.value}
                        />
                    ))}
                    <FilterChip
                        label="Featured"
                        href={buildHref({ q, status, featured: featuredActive ? "all" : "1", sort, order })}
                        active={featuredActive}
                    />
                </div>

                <p className="text-[12px] text-[var(--color-text-muted)]">
                    {filtered} of {total} product{total !== 1 ? "s" : ""}
                </p>
            </form>
        </div>
    );
}
