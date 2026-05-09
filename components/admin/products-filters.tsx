// components/admin/products-filters.tsx
"use client";

import Link from "next/link";
import React from "react";

function SearchIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}
function FilterIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1.5 3H12.5M3.5 7H10.5M5.5 11H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}
function StarIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="#f59e0b" aria-hidden="true">
            <path d="M6 1L7.5 4.5H11L8.5 6.5L9.5 10L6 8L2.5 10L3.5 6.5L1 4.5H4.5L6 1Z" />
        </svg>
    );
}
function ChevronIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
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

    return (
        <div style={{ background: "var(--color-surface, #f8f8f7)", border: "0.5px solid var(--color-border)", borderRadius: 12, padding: "14px 16px" }}>
            <form method="get" action="/admin/products" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                {sort && <input type="hidden" name="sort" value={sort} />}
                {order && <input type="hidden" name="order" value={order} />}

                {/* Search */}
                <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted, #aaa)", pointerEvents: "none" }}>
                        <SearchIcon />
                    </span>
                    <input
                        name="q"
                        defaultValue={q ?? ""}
                        placeholder="Search by name or slug…"
                        style={{
                            width: "100%", boxSizing: "border-box",
                            height: 36, paddingLeft: 32, paddingRight: 12,
                            border: "0.5px solid var(--color-border)", borderRadius: 8,
                            fontSize: 13, background: "var(--color-bg, #fff)",
                            color: "var(--color-text-primary)", outline: "none",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent, #fd5000)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                    />
                </div>

                {/* Status */}
                <div style={{ position: "relative" }}>
                    <select
                        name="status"
                        defaultValue={status ?? "all"}
                        style={{ height: 36, padding: "0 30px 0 10px", appearance: "none", border: "0.5px solid var(--color-border)", borderRadius: 8, fontSize: 13, background: "var(--color-bg, #fff)", color: "var(--color-text-primary)", cursor: "pointer", outline: "none" }}
                    >
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="inactive">Inactive</option>
                        <option value="banned">Banned</option>
                    </select>
                    <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--color-text-muted, #aaa)" }}>
                        <ChevronIcon />
                    </span>
                </div>

                {/* Featured */}
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px", border: "0.5px solid var(--color-border)", borderRadius: 8, cursor: "pointer", fontSize: 13, background: featured === "1" ? "rgba(245,158,11,0.08)" : "var(--color-bg, #fff)", color: featured === "1" ? "#d97706" : "var(--color-text-secondary)" }}>
                    <input type="checkbox" name="featured" value="1" defaultChecked={featured === "1"} style={{ display: "none" }} />
                    <StarIcon /> Featured only
                </label>

                {/* Submit */}
                <button
                    type="submit"
                    style={{ height: 36, padding: "0 14px", borderRadius: 8, background: "var(--color-accent, #fd5000)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                    <FilterIcon /> Apply
                </button>

                {/* Clear */}
                {hasFilters && (
                    <Link
                        href="/admin/products"
                        style={{ height: 36, padding: "0 12px", borderRadius: 8, display: "inline-flex", alignItems: "center", fontSize: 13, color: "var(--color-text-muted, #888)", border: "0.5px solid var(--color-border)", textDecoration: "none", background: "var(--color-bg, #fff)" }}
                    >
                        Clear
                    </Link>
                )}

                <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-muted, #888)", whiteSpace: "nowrap" }}>
                    {filtered} of {total} product{total !== 1 ? "s" : ""}
                </span>
            </form>
        </div >
    );
}