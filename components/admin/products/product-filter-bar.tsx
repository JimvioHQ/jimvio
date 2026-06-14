"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { SelectInput } from "@/components/admin/form-primitive";

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

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] max-w-md">
                <Input
                    ref={inputRef}
                    inputSize="sm"
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
                    icon={<Search className="h-3.5 w-3.5" />}
                    iconRight={
                        searchValue ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchValue("");
                                    if (initialSearch) navigate({ q: "" });
                                    inputRef.current?.focus();
                                }}
                                className="flex h-5 w-5 items-center justify-center rounded-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                                aria-label="Clear search"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        ) : (
                            <kbd className="hidden h-5 items-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-1.5 text-[10.5px] font-mono font-medium text-[var(--color-text-muted)] sm:inline-flex pointer-events-none">
                                /
                            </kbd>
                        )
                    }
                    className={cn(
                        "h-9",
                        searchValue && "border-orange-500/50 ring-1 ring-orange-500/20"
                    )}
                />
            </div>

            <div className={cn("min-w-[140px]", status !== "all" && "ring-1 ring-orange-500/30 rounded-sm")}>
                <SelectInput
                    value={status}
                    onChange={(v) => navigate({ status: v })}
                    options={STATUS_OPTIONS}
                />
            </div>

            <div className={cn("min-w-[130px]", source !== "all" && "ring-1 ring-orange-500/30 rounded-sm")}>
                <SelectInput
                    value={source}
                    onChange={(v) => navigate({ source: v })}
                    options={SOURCE_OPTIONS}
                />
            </div>

            <button
                type="button"
                onClick={() => navigate({ featured: featured === "1" ? "all" : "1" })}
                className={cn(
                    "h-9 px-3 rounded-md border text-[13px] font-medium transition-colors",
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
