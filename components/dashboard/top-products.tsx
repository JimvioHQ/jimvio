"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {  ArrowUpDown, ArrowUpRight, Package, Plus  } from "lucide-react"
import { VscPackage } from "react-icons/vsc";
import type { Product } from "@/types/dashboard";

interface TopProductsProps {
    products: Product[];
    className?: string;
}

type SortKey = "name" | "sold" | "price";

function SortHeader({
    label,
    sort: sortFor,
    currentKey,
    onToggle,
}: {
    label: string;
    sort: SortKey;
    currentKey: SortKey;
    onToggle: (key: SortKey) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onToggle(sortFor)}
            className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
        >
            {label}
            <ArrowUpDown className={cn("size-3", currentKey === sortFor ? "text-[var(--color-accent)]" : "opacity-40")} />
        </button>
    );
}

const RANK_COLORS = ["var(--color-accent)", "#8b5cf6", "#3b82f6", "#22c55e"];

export function TopProducts({ products, className }: TopProductsProps) {
    const [sortKey, setSortKey] = useState<SortKey>("sold");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const sorted = useMemo(() => {
        const list = [...products];
        list.sort((a, b) => {
            let cmp = 0;
            if (sortKey === "name") cmp = a.name.localeCompare(b.name);
            else if (sortKey === "sold") cmp = (a.saleCount ?? 0) - (b.saleCount ?? 0);
            else if (sortKey === "price") cmp = (a.priceValue ?? 0) - (b.priceValue ?? 0);
            return sortDir === "desc" ? -cmp : cmp;
        });
        return list;
    }, [products, sortKey, sortDir]);

    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        else { setSortKey(key); setSortDir("desc"); }
    }

    const maxSales = Math.max(...products.map((p) => p.saleCount ?? 0), 1);

    return (
        <div
            className={cn(
                "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
                className,
            )}
        >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                    <ArrowUpRight className="size-4 text-[var(--color-accent)]" />
                    <div>
                        <p className="text-sm font-bold text-[var(--color-text-primary)]">
                            Top Products
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            Best performing items
                        </p>
                    </div>
                </div>
                <Link
                    href="/dashboard/products"
                    className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
                >
                    View all
                </Link>
            </div>

            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                    <div className="size-10 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center mb-3">
                        <VscPackage className="size-5 text-[var(--color-text-muted)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                        No products yet
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-[200px]">
                        Start listing products to see them here.
                    </p>
                    <Link
                        href="/dashboard/products/add"
                        className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3.5 text-xs font-bold text-white transition-all hover:bg-orange-500 active:scale-95"
                    >
                        <Plus className="size-3.5" />
                        Add your first product
                    </Link>
                </div>
            ) : (
                <div>
                    <div className="flex items-center gap-3 px-5 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/30">
                        <span className="text-xs font-bold text-[var(--color-text-muted)] w-4 shrink-0">#</span>
                        <span className="w-9 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <SortHeader label="Product" sort="name" currentKey={sortKey} onToggle={toggleSort} />
                        </div>
                        <div className="shrink-0 text-right w-12">
                            <SortHeader label="Sales" sort="sold" currentKey={sortKey} onToggle={toggleSort} />
                        </div>
                        <div className="w-[60px] shrink-0 text-right">
                            <SortHeader label="Price" sort="price" currentKey={sortKey} onToggle={toggleSort} />
                        </div>
                    </div>

                    <div className="divide-y divide-[var(--color-border)]">
                        {sorted.map((product, i) => {
                            const barWidth = ((product.saleCount ?? 0) / maxSales) * 100;
                            const rankColor = RANK_COLORS[i] ?? "#666";
                            return (
                                <Link
                                    key={product.id}
                                    href={product.slug ? `/products/${product.slug}` : "#"}
                                    className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-surface-secondary)]/40 transition-colors group relative"
                                >
                                    {/* Sales bar background */}
                                    <span
                                        className="absolute left-0 top-0 h-full rounded-l-xl opacity-[0.06] dark:opacity-[0.1] pointer-events-none"
                                        style={{ width: `${barWidth}%`, background: rankColor }}
                                    />

                                    <span className="relative text-xs font-bold tabular-nums shrink-0 w-4 text-center"
                                        style={{ color: rankColor }}
                                    >
                                        {i + 1}
                                    </span>

                                    <div
                                        className="relative size-9 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                                        style={{ background: product.imageColor }}
                                    >
                                        {product.name[0]?.toUpperCase() ?? "P"}
                                    </div>

                                    <div className="relative min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-accent)] transition-colors">
                                            {product.name}
                                        </p>
                                        <p className="text-xs text-[var(--color-text-muted)]">
                                            {product.sold}
                                        </p>
                                    </div>

                                    <div className="relative shrink-0 text-right w-12">
                                        <p className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                                            {product.price}
                                        </p>
                                        <span className="text-xs font-semibold text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors">
                                            View
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
