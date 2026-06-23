"use client";

import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import type { WebhookDailyPoint } from "@/lib/admin/revenue-chart-data";

function WebhookTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
}) {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 shadow-sm">
            <p className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</p>
            {payload.map((row) => (
                <p key={row.name} className="text-[12px] tabular-nums text-[var(--color-text-primary)]">
                    <span className="capitalize">{row.name}</span>: {row.value.toLocaleString()}
                </p>
            ))}
        </div>
    );
}

export function WebhookActivityChart({
    data,
    height = 180,
}: {
    data: WebhookDailyPoint[];
    height?: number;
}) {
    const total = data.reduce((sum, row) => sum + row.completed + row.failed, 0);

    if (total === 0) {
        return (
            <div
                className="flex items-center justify-center text-[12px] text-[var(--color-text-muted)]"
                style={{ height }}
            >
                No webhook events in the last 7 days
            </div>
        );
    }

    return (
        <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<WebhookTooltip />} cursor={{ fill: "var(--color-surface-secondary)", opacity: 0.4 }} />
                    <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                        formatter={(value) => <span className="capitalize text-[var(--color-text-muted)]">{value}</span>}
                    />
                    <Bar dataKey="completed" name="Completed" fill="#16a34a" radius={[3, 3, 0, 0]} stackId="webhooks" />
                    <Bar dataKey="failed" name="Failed" fill="#dc2626" radius={[3, 3, 0, 0]} stackId="webhooks" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
