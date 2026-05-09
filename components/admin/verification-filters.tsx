// components/admin/verification-filters.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

const SORT_OPTIONS = [
    { value: "oldest", label: "Oldest first" },
    { value: "newest", label: "Newest first" },
    { value: "name", label: "Name A–Z" },
];

const AGE_OPTIONS = [
    { value: "", label: "All ages" },
    { value: "3", label: "3+ days" },
    { value: "7", label: "7+ days" },
    { value: "14", label: "14+ days" },
];

// Common business countries — extend as needed, or fetch from server later
const COUNTRY_OPTIONS = [
    { value: "", label: "All countries" },
    { value: "RW", label: "Rwanda" },
    { value: "KE", label: "Kenya" },
    { value: "UG", label: "Uganda" },
    { value: "TZ", label: "Tanzania" },
    { value: "NG", label: "Nigeria" },
    { value: "GH", label: "Ghana" },
    { value: "ZA", label: "South Africa" },
    { value: "US", label: "United States" },
    { value: "GB", label: "United Kingdom" },
];

export function VerificationFilters({
    q: initialQ,
    country,
    sort,
    age,
    countries = [],
}: {
    q: string;
    country: string;
    sort: string;
    age: string;
    countries?: string[];
}) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();

    const [q, setQ] = useState(initialQ);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function pushParams(updates: Record<string, string>) {
        const params = new URLSearchParams(sp);
        for (const [k, v] of Object.entries(updates)) {
            if (v) params.set(k, v);
            else params.delete(k);
        }
        router.push(`${pathname}?${params.toString()}`);
    }

    // Debounce search input
    useEffect(() => {
        if (q === initialQ) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => pushParams({ q }), 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    const hasFilters = !!(q || country || age) || sort !== "oldest";

    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
            }}
        >
            {/* Search */}
            <div
                style={{
                    position: "relative",
                    flex: "1 1 240px",
                    minWidth: 200,
                    maxWidth: 360,
                }}
            >
                <Search
                    size={13}
                    style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--color-text-muted, #888)",
                        pointerEvents: "none",
                    }}
                />
                <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by name or email…"
                    style={{
                        width: "100%",
                        height: 32,
                        padding: "0 30px 0 30px",
                        fontSize: 13,
                        borderRadius: 6,
                        border: "0.5px solid var(--color-border)",
                        background: "var(--color-surface, #fafaf9)",
                        color: "var(--color-text-primary)",
                        outline: "none",
                        transition: "border-color 120ms",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent, #fd5000)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                />
                {q && (
                    <button
                        onClick={() => {
                            setQ("");
                            pushParams({ q: "" });
                        }}
                        aria-label="Clear search"
                        style={{
                            position: "absolute",
                            right: 8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--color-text-muted, #888)",
                        }}
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Country */}
            <Select
                value={country}
                onChange={(v) => pushParams({ country: v })}
                options={[
                    { value: "", label: "All countries" },
                    ...(countries.length > 0
                        ? countries.map((c) => ({ value: c, label: c }))
                        : COUNTRY_OPTIONS.slice(1)),
                ]}
            />

            {/* Age */}
            <Select
                value={age}
                onChange={(v) => pushParams({ age: v })}
                options={AGE_OPTIONS}
            />

            {/* Sort */}
            <Select
                value={sort}
                onChange={(v) => pushParams({ sort: v === "oldest" ? "" : v })}
                options={SORT_OPTIONS}
            />

            {hasFilters && (
                <button
                    onClick={() => {
                        setQ("");
                        router.push(pathname + (sp.get("tab") ? `?tab=${sp.get("tab")}` : ""));
                    }}
                    style={{
                        height: 32,
                        padding: "0 10px",
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        color: "var(--color-text-muted, #888)",
                        cursor: "pointer",
                    }}
                >
                    Clear
                </button>
            )}
        </div>
    );
}

function Select({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
                height: 32,
                padding: "0 28px 0 10px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: "0.5px solid var(--color-border)",
                background: `var(--color-surface, #fafaf9) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.2' fill='none' stroke-linecap='round'/></svg>") no-repeat right 10px center`,
                color: "var(--color-text-primary)",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                outline: "none",
            }}
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}