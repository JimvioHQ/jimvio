"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ClipboardList, CreditCard } from "lucide-react";
import { SECTION_LINKS } from "./dashboard-sections";
import type { ReactNode } from "react";
import type { ActivityItem } from "@/types/dashboard";

interface ActivityFeedProps {
    items: ActivityItem[];
    className?: string;
}

const ICON_COLOR = "var(--color-accent)";

const ICON_MAP: Record<string, { icon: ReactNode; color: string }> = {
    sale: { icon: <CreditCard className="size-3.5" />, color: ICON_COLOR },
    check: { icon: <ClipboardList className="size-3.5" />, color: ICON_COLOR },
    payout: { icon: <span>↓</span>, color: ICON_COLOR },
    member: { icon: <span>●</span>, color: ICON_COLOR },
};

const TYPE_LABELS: Record<string, string> = {
    sale: "Sale",
    check: "Order",
    payout: "Payout",
    member: "Member",
};

export function ActivityFeed({ items, className }: ActivityFeedProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
                className,
            )}
        >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">
                        Recent Activity
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Live updates from your workspace
                    </p>
                </div>
                <Link
                    href={SECTION_LINKS.notifications}
                    className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
                >
                    View all
                </Link>
            </div>

            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="size-10 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center mb-3">
                        <svg className="size-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                        No recent activity
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        Orders, messages, and updates will appear here.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-[var(--color-border)]">
                    {items.map((item, i) => {
                        const iconDef = ICON_MAP[item.icon] ?? { icon: "•", color: "#666" };
                        const typeLabel = TYPE_LABELS[item.icon] ?? "Event";
                        return (
                            <div
                                key={`${item.title}-${i}`}
                                className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--color-surface-secondary)]/40 transition-colors cursor-default"
                            >
                                <span
                                    className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold text-white"
                                    style={{ background: iconDef.color }}
                                >
                                    {iconDef.icon}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                                            {item.title}
                                        </p>
                                        <span
                                            className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
                                            style={{ background: iconDef.color }}
                                        >
                                            {typeLabel}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                                        {item.sub}
                                    </p>
                                </div>

                                <div className="shrink-0 text-right">
                                    <span className="text-xs text-[var(--color-text-muted)] font-medium">
                                        {item.time}
                                    </span>
                                    {item.amount && (
                                        <p
                                            className={cn(
                                                "text-xs font-bold tabular-nums mt-0.5",
                                                item.positive
                                                    ? "text-[var(--color-success)]"
                                                    : item.positive === false
                                                        ? "text-[var(--color-danger)]"
                                                        : "text-[var(--color-text-primary)]",
                                            )}
                                        >
                                            {item.positive ? "+" : ""}{item.amount}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
