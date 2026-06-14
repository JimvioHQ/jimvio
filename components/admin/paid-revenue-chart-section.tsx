"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { cn } from "@/lib/utils";
import { formatAdminMoney } from "@/lib/admin/format-money";
import type { DashboardChartPoint } from "@/services/admin/getAdminDashboard";

function monthLabel(point: DashboardChartPoint) {
    return `${point.month} ${point.year}`;
}

function pctChange(current: number, prev: number): number | null {
    if (!prev) return null;
    return ((current - prev) / prev) * 100;
}

function formatDelta(current: number, prev: number): string {
    const diff = current - prev;
    if (diff === 0) return "No change";
    const sign = diff > 0 ? "+" : "−";
    return `${sign}${formatAdminMoney(Math.abs(diff))}`;
}

function SectionShell({
    title,
    action,
    children,
}: {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)]/60">
                <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
                {action}
            </div>
            {children}
        </div>
    );
}

function ComparisonBar({ current, prior }: { current: number; prior: number }) {
    const total = Math.max(current, prior, 1);
    const currentPct = Math.round((current / total) * 100);
    const priorPct = Math.round((prior / total) * 100);

    return (
        <div className="mt-3 space-y-1.5">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                <div
                    className="h-full rounded-l-full bg-orange-500 transition-all duration-300"
                    style={{ width: `${currentPct}%` }}
                />
                <div
                    className="h-full rounded-r-full bg-slate-300/80 dark:bg-slate-600/60 transition-all duration-300"
                    style={{ width: `${priorPct}%` }}
                />
            </div>
            <div className="flex items-center justify-between text-[10.5px] text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    This month
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full border border-dashed border-slate-400 bg-transparent" />
                    Prior month
                </span>
            </div>
        </div>
    );
}

function HoverStatCard({
    point,
    isHovering,
}: {
    point: DashboardChartPoint;
    isHovering: boolean;
}) {
    const revDelta = pctChange(point.revenue, point.prevRevenue);
    const ordersDelta = pctChange(point.orders, point.prevOrders);
    const hasPrior = point.prevRevenue > 0 || point.prevOrders > 0;
    const revDiffPositive = point.revenue >= point.prevRevenue;

    return (
        <div
            className={cn(
                "rounded-md border px-3.5 py-3 h-full transition-all duration-200",
                isHovering
                    ? "border-orange-500/40 bg-orange-50/50 shadow-sm dark:bg-orange-950/25"
                    : "border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40"
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    {isHovering ? monthLabel(point) : `${monthLabel(point)} · latest`}
                </p>
                {isHovering && (
                    <span className="shrink-0 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300">
                        Comparing
                    </span>
                )}
            </div>

            {hasPrior ? (
                <div className="mt-2.5 grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                            This month
                        </p>
                        <p className="mt-0.5 text-[20px] font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]">
                            {formatAdminMoney(point.revenue)}
                        </p>
                        <p className="mt-0.5 text-[11.5px] tabular-nums text-[var(--color-text-secondary)]">
                            {point.orders.toLocaleString()} paid order{point.orders !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <div className="border-l border-[var(--color-border)]/70 pl-3">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                            Prior month
                        </p>
                        <p className="mt-0.5 text-[20px] font-semibold tabular-nums tracking-tight text-[var(--color-text-secondary)]">
                            {formatAdminMoney(point.prevRevenue)}
                        </p>
                        <p className="mt-0.5 text-[11.5px] tabular-nums text-[var(--color-text-muted)]">
                            {point.prevOrders.toLocaleString()} order{point.prevOrders !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]">
                        {formatAdminMoney(point.revenue)}
                    </p>
                    <p className="mt-1 text-[12px] tabular-nums text-[var(--color-text-secondary)]">
                        {point.orders.toLocaleString()} paid order{point.orders !== 1 ? "s" : ""}
                    </p>
                </>
            )}

            {hasPrior && (
                <>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--color-border)]/50 pt-2.5 text-[12px]">
                        <span
                            className={cn(
                                "inline-flex items-center gap-0.5 font-medium tabular-nums",
                                revDiffPositive ? "text-emerald-600" : "text-rose-600"
                            )}
                        >
                            {revDiffPositive ? (
                                <TrendingUp className="h-3 w-3" />
                            ) : (
                                <TrendingDown className="h-3 w-3" />
                            )}
                            {formatDelta(point.revenue, point.prevRevenue)} revenue
                            {revDelta != null && (
                                <span className="text-[11px] font-normal opacity-90">
                                    ({revDelta >= 0 ? "+" : ""}
                                    {revDelta.toFixed(1)}%)
                                </span>
                            )}
                        </span>
                        {ordersDelta != null && (
                            <span
                                className={cn(
                                    "tabular-nums",
                                    point.orders >= point.prevOrders ? "text-emerald-600" : "text-rose-600"
                                )}
                            >
                                {point.orders - point.prevOrders >= 0 ? "+" : ""}
                                {point.orders - point.prevOrders} orders
                                <span className="text-[11px] opacity-90">
                                    {" "}
                                    ({ordersDelta >= 0 ? "+" : ""}
                                    {ordersDelta.toFixed(0)}%)
                                </span>
                            </span>
                        )}
                    </div>
                    <ComparisonBar current={point.revenue} prior={point.prevRevenue} />
                </>
            )}

            {!isHovering && (
                <p className="mt-2.5 text-[10.5px] text-[var(--color-text-muted)]">
                    Hover the chart to compare month-over-month
                </p>
            )}
        </div>
    );
}

export function PaidRevenueChartSection({ data }: { data: DashboardChartPoint[] }) {
    const latest = data[data.length - 1];
    const [hovered, setHovered] = useState<DashboardChartPoint | null>(null);
    const active = hovered ?? latest;

    if (!latest) {
        return (
            <SectionShell title="Paid revenue">
                <div className="px-4 py-8 text-center text-[13px] text-[var(--color-text-muted)]">
                    No paid revenue data yet
                </div>
            </SectionShell>
        );
    }

    return (
        <SectionShell
            title="Paid revenue"
            action={
                <Link
                    href="/admin/reports"
                    className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                    Reports →
                </Link>
            }
        >
            <div className="px-4 pb-4 pt-3">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px] gap-4 lg:gap-5 items-stretch">
                    <div className="min-w-0">
                        <p className="pb-2 text-[11.5px] text-[var(--color-text-muted)]">
                            Rolling 12 months · solid = this month · dashed = prior month
                        </p>
                        <RevenueChart
                            data={data}
                            height={220}
                            type="area"
                            theme="light"
                            showAffiliate={false}
                            showComparison
                            labelKey="month"
                            dataKey="revenue"
                            comparisonKey="prevRevenue"
                            onActivePointChange={(point) =>
                                setHovered(point ? (point as DashboardChartPoint) : null)
                            }
                        />
                    </div>

                    <div className="lg:border-l lg:border-[var(--color-border)]/60 lg:pl-5">
                        <HoverStatCard point={active} isHovering={hovered != null} />
                    </div>
                </div>
            </div>
        </SectionShell>
    );
}
