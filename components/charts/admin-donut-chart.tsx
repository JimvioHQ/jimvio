"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { ChartSlice } from "@/lib/admin/chart-slices";
import { cn } from "@/lib/utils";

export type DonutSlice = ChartSlice;

export { buildChartSlices, colorForSlice } from "@/lib/admin/chart-slices";

function DonutTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: DonutSlice }>;
}) {
    if (!active || !payload?.length) return null;
    const row = payload[0];
    return (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 shadow-sm">
            <p className="text-[11px] text-[var(--color-text-muted)] capitalize">{row.name}</p>
            <p className="text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                {row.value.toLocaleString()} orders
            </p>
        </div>
    );
}

export function AdminDonutChart({
    data,
    height = 200,
    emptyLabel = "No data",
}: {
    data: DonutSlice[];
    height?: number;
    emptyLabel?: string;
}) {
    const total = data.reduce((s, d) => s + d.value, 0);

    if (total === 0) {
        return (
            <div
                className="flex items-center justify-center text-[12px] text-[var(--color-text-muted)]"
                style={{ height }}
            >
                {emptyLabel}
            </div>
        );
    }

    return (
        <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="58%"
                        outerRadius="82%"
                        paddingAngle={2}
                        strokeWidth={0}
                    >
                        {data.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function DonutLegend({ data, compact = false }: { data: DonutSlice[]; compact?: boolean }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (!total) {
        return (
            <p className={cn("text-[var(--color-text-muted)]", compact ? "mt-2 text-[10px]" : "mt-2 text-[11px]")}>
                No orders
            </p>
        );
    }

    return (
        <ul className={cn(compact ? "mt-2 space-y-1" : "mt-2 space-y-1.5")}>
            {data.map((slice) => {
                const pct = Math.round((slice.value / total) * 100);
                return (
                    <li
                        key={slice.name}
                        className={cn(
                            "flex items-center justify-between gap-2",
                            compact ? "text-[10px]" : "text-[11.5px]"
                        )}
                    >
                        <span className="flex items-center gap-1.5 min-w-0 capitalize text-[var(--color-text-secondary)]">
                            <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: slice.color }}
                            />
                            <span className="truncate">{slice.name.replace(/_/g, " ")}</span>
                        </span>
                        <span className="tabular-nums text-[var(--color-text-muted)] shrink-0">
                            {slice.value} · {pct}%
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}
