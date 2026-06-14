"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
    { value: "all", label: "Status: any" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "paused", label: "Paused" },
    { value: "archived", label: "Archived" },
    { value: "inactive", label: "Inactive" },
];

const SOURCE_OPTIONS = [
    { value: "all", label: "Source: any" },
    { value: "vendor", label: "Vendor" },
    { value: "cj", label: "CJ" },
    { value: "shopify", label: "Shopify" },
];

interface ProductFilterBarProps {
    status: string;
    source: string;
    featured: string;
    search: string;
}

export function ProductFilterBar({
    status,
    source,
    featured,
    search: initialSearch,
}: ProductFilterBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [searchValue, setSearchValue] = useState(initialSearch);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (
                e.key === "/" &&
                document.activeElement?.tagName !== "INPUT" &&
                document.activeElement?.tagName !== "TEXTAREA"
            ) {
                e.preventDefault();
                inputRef.current?.focus();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const navigate = useCallback(
        (overrides: Record<string, string>) => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("page", "1");
            const merged = { status, source, featured, q: initialSearch, ...overrides };
            Object.entries(merged).forEach(([k, v]) => {
                if (!v || v === "all") next.delete(k);
                else next.set(k, v);
            });
            const qs = next.toString();
            router.push(`${pathname}${qs ? `?${qs}` : ""}`);
        },
        [router, pathname, searchParams, status, source, featured, initialSearch]
    );

    const activeCount = [
        status !== "all",
        source !== "all",
        featured === "1",
        !!initialSearch,
    ].filter(Boolean).length;

    const selectClass = cn(
        "h-9 pl-3 pr-8 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]",
        "text-[13px] text-[var(--color-text-primary)] cursor-pointer transition-colors",
        "hover:border-[var(--color-border-strong)]",
        "focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
        "appearance-none"
    );

    const activeSelectClass =
        "ring-1 ring-orange-500/30 border-orange-500/50 bg-orange-50/30 dark:bg-orange-950/10";

    function SelectWrap({ children, active }: { children: React.ReactNode; active: boolean }) {
        return (
            <div className="relative inline-flex items-center">
                {children}
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 4.5 6 8l3-3.5" />
                    </svg>
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            navigate({ q: searchValue });
                        }
                        if (e.key === "Escape") {
                            setSearchValue("");
                            if (initialSearch) navigate({ q: "" });
                        }
                    }}
                    placeholder="Search products"
                    className={cn(
                        "w-full h-9 pl-9 pr-16 rounded-sm border bg-[var(--color-surface)]",
                        "text-[13px] text-[var(--color-text-primary)]",
                        "placeholder:text-[var(--color-text-muted)]",
                        "transition-colors focus:outline-none",
                        searchValue
                            ? "border-orange-500/50 ring-1 ring-orange-500/20"
                            : "border-[var(--color-border)] focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    )}
                />
                {searchValue ? (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchValue("");
                            if (initialSearch) navigate({ q: "" });
                            inputRef.current?.focus();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                        aria-label="Clear search"
                    >
                        <X className="h-3 w-3" />
                    </button>
                ) : (
                    <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 px-1.5 rounded text-[10.5px] font-mono font-medium text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] hidden sm:inline-flex items-center pointer-events-none">
                        /
                    </kbd>
                )}
            </div>

            <SelectWrap active={status !== "all"}>
                <select
                    value={status}
                    onChange={(e) => navigate({ status: e.target.value })}
                    className={cn(selectClass, status !== "all" && activeSelectClass)}
                    aria-label="Product status"
                >
                    {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </SelectWrap>

            <SelectWrap active={source !== "all"}>
                <select
                    value={source}
                    onChange={(e) => navigate({ source: e.target.value })}
                    className={cn(selectClass, source !== "all" && activeSelectClass)}
                    aria-label="Product source"
                >
                    {SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </SelectWrap>

            <button
                type="button"
                onClick={() => navigate({ featured: featured === "1" ? "all" : "1" })}
                className={cn(
                    "h-9 px-3 rounded-sm border text-[13px] font-medium transition-colors",
                    featured === "1"
                        ? "border-orange-500/50 ring-1 ring-orange-500/20 bg-orange-50/30 dark:bg-orange-950/10 text-[var(--color-text-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                )}
            >
                Featured
            </button>

            {activeCount > 0 && (
                <button
                    type="button"
                    onClick={() => {
                        setSearchValue("");
                        navigate({ status: "all", source: "all", featured: "all", q: "" });
                    }}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12.5px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                >
                    <X className="h-3 w-3" />
                    Clear{activeCount > 1 && ` ${activeCount}`}
                </button>
            )}
        </div>
    );
}
