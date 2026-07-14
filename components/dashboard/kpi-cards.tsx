"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";
import type { StatCard } from "@/types/dashboard";

interface KpiCardsProps {
    cards: StatCard[];
    className?: string;
}

const CARD_LINKS: Record<string, string> = {
    Revenue: "/dashboard/payments",
    Orders: "/dashboard/orders",
    Products: "/dashboard/products",
    Customers: "/dashboard/analytics",
};

const CARD_ACCENTS: Record<string, string> = {
    Revenue: "#3b82f6",
    Orders: "var(--color-accent)",
    Products: "#8b5cf6",
    Customers: "#22c55e",
};

export function KpiCards({ cards, className }: KpiCardsProps) {
    return (
        <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
            {cards.map((card) => (
                <KpiCard key={card.label} card={card} />
            ))}
        </div>
    );
}

function KpiCard({ card }: { card: StatCard }) {
    const href = CARD_LINKS[card.label] ?? "#";
    const accent = CARD_ACCENTS[card.label] ?? card.chartColor;

    return (
        <Link
            href={href}
            className={cn(
                "relative overflow-hidden rounded-xl",
                "border border-[var(--color-border)] bg-[var(--color-surface)]",
                "p-4 sm:p-5",
                "transition-all duration-200",
                "hover:border-[var(--color-border-strong)] hover:shadow-md hover:-translate-y-0.5",
                "group cursor-pointer",
            )}
        >
            <div className="absolute right-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:to-current transition-colors duration-300 opacity-30"
                style={{ color: accent }}
            />
            <div className="flex items-start justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors">
                        {card.label}
                    </p>
                    <p className="mt-1.5 text-2xl font-black tabular-nums text-[var(--color-text-primary)] leading-none">
                        {card.value}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                card.up
                                    ? "text-[var(--color-success)] bg-[var(--color-success)]/8"
                                    : "text-[var(--color-danger)] bg-[var(--color-danger)]/8",
                            )}
                        >
                            <svg className="size-2.5" fill="currentColor" viewBox="0 0 16 16">
                                <path d={card.up ? "M8 2l6 10H2z" : "M8 14L2 4h12z"} />
                            </svg>
                            {card.change}
                        </span>
                    </div>
                </div>
                {card.data.length > 1 && (
                    <div className="shrink-0 -mr-1 -mt-1 opacity-60 group-hover:opacity-100 transition-all duration-300">
                        <Sparkline
                            data={card.data}
                            color={accent}
                            width={80}
                            height={32}
                        />
                    </div>
                )}
            </div>
        </Link>
    );
}
