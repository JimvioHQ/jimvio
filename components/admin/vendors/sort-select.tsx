"use client";

// components/admin/vendors/sort-select.tsx
// Tiny client component just for the sort <select>.
// Kept isolated so the rest of the vendors page stays a Server Component.

import { useRouter } from "next/navigation";

interface Props {
    current: string;
    q?: string;
    status?: string;
}

export function SortSelect({ current, q, status }: Props) {
    const router = useRouter();

    function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (status) params.set("status", status);
        params.set("sort", e.target.value);
        router.push(`/admin/vendors?${params.toString()}`);
    }

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 12, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                Sort by
            </label>
            <select
                value={current}
                onChange={handleChange}
                style={{
                    height: 34, padding: "0 10px", borderRadius: 7, fontSize: 12,
                    border: "0.5px solid var(--color-border)",
                    background: "var(--color-surface)", color: "var(--color-text-primary)",
                    cursor: "pointer", outline: "none",
                }}
            >
                <option value="created_at">Newest first</option>
                <option value="revenue">Revenue ↓</option>
                <option value="sales">Sales ↓</option>
                <option value="rating">Rating ↓</option>
                <option value="followers">Followers ↓</option>
                <option value="products">Products ↓</option>
            </select>
        </div>
    );
}