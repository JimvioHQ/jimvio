"use client";

import { useMemo } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import type { EarningsDataset } from "@/types/dashboard";

interface RevenueChartProps {
    labels: string[];
    datasets: EarningsDataset[];
    className?: string;
}

export function RevenueChart({ labels, datasets, className }: RevenueChartProps) {
    const { formatMoney } = useCurrency();

    const chartData = useMemo(() => {
        if (!labels.length) return [];
        return labels.map((label, i) => {
            const point: Record<string, string | number> = { label };
            for (const ds of datasets) {
                point[ds.label] = ds.data[i] ?? 0;
            }
            return point;
        });
    }, [labels, datasets]);

    const hasData = chartData.length > 0 && datasets.some((ds) => ds.data.some((v) => v > 0));

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
                        Revenue Overview
                    </p>
                    {datasets.length > 0 && (
                        <div className="flex items-center gap-3 mt-2">
                            {datasets.map((ds) => (
                                <div key={ds.label} className="flex items-center gap-1.5">
                                    <span
                                        className="size-2 rounded-full"
                                        style={{ background: ds.color }}
                                    />
                                    <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                                        {ds.label}
                                    </span>
                                    <span className="text-xs font-bold text-[var(--color-text-primary)] tabular-nums">
                                        {ds.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="px-2 pb-4">
                {hasData ? (
                    <div className="h-[240px] sm:h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                <defs>
                                    {datasets.map((ds) => (
                                        <linearGradient
                                            key={ds.label}
                                            id={`gradient-${ds.label.replace(/\s+/g, "-")}`}
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop offset="0%" stopColor={ds.color} stopOpacity={0.2} />
                                            <stop offset="100%" stopColor={ds.color} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="var(--color-border)"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                                    tickMargin={6}
                                    minTickGap={20}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                                    tickMargin={6}
                                    tickFormatter={(v: number) =>
                                        v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                                    }
                                    width={50}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--color-surface)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                    }}
                                    labelStyle={{
                                        fontWeight: 600,
                                        color: "var(--color-text-primary)",
                                        marginBottom: 4,
                                    }}
                                    formatter={(value: number, name: string) => [
                                        formatMoney(value, "USD"),
                                        name,
                                    ]}
                                />
                                {datasets.map((ds) => (
                                    <Area
                                        key={ds.label}
                                        type="monotone"
                                        dataKey={ds.label}
                                        stroke={ds.color}
                                        strokeWidth={2}
                                        fill={`url(#gradient-${ds.label.replace(/\s+/g, "-")})`}
                                        dot={false}
                                        activeDot={{ r: 4, strokeWidth: 0, fill: ds.color }}
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="relative flex flex-col items-center justify-center h-[240px] text-center overflow-hidden">
                        {/* Decorative grid pattern */}
                        <svg
                            className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.05]"
                            viewBox="0 0 400 200"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {Array.from({ length: 10 }).map((_, i) => (
                                <line
                                    key={`h-${i}`}
                                    x1="0"
                                    y1={i * 20}
                                    x2="400"
                                    y2={i * 20}
                                    stroke="currentColor"
                                    strokeWidth="0.5"
                                />
                            ))}
                            {Array.from({ length: 20 }).map((_, i) => (
                                <line
                                    key={`v-${i}`}
                                    x1={i * 20}
                                    y1="0"
                                    x2={i * 20}
                                    y2="200"
                                    stroke="currentColor"
                                    strokeWidth="0.5"
                                />
                            ))}
                            {/* Decorative wave */}
                            <path
                                d="M0 180 Q50 160 100 170 T200 160 T300 165 T400 170"
                                stroke="var(--color-accent)"
                                strokeWidth="1"
                                fill="none"
                                opacity="0.15"
                            />
                        </svg>
                        <div className="relative size-10 rounded-lg bg-[var(--color-surface-secondary)] flex items-center justify-center mb-3">
                            <svg
                                className="size-5 text-[var(--color-text-muted)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                                />
                            </svg>
                        </div>
                        <p className="relative text-sm font-medium text-[var(--color-text-secondary)]">
                            No revenue data yet
                        </p>
                        <p className="relative text-xs text-[var(--color-text-muted)] mt-1">
                            Earnings will appear here as you make sales.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
