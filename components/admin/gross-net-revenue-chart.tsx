"use client";

import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAdminAmount } from "@/lib/admin/format-money";
import { ADMIN_PRIMARY_CURRENCY } from "@/lib/admin/format-money";
import type { RevenueTrendPoint } from "@/lib/admin/build-revenue-report";

function ChartTooltip({
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
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-md">
      <p className="text-[11px] font-medium text-[var(--color-text-muted)] mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-[12px] tabular-nums" style={{ color: p.color }}>
          {p.name}: {formatAdminAmount(p.value, ADMIN_PRIMARY_CURRENCY, ADMIN_PRIMARY_CURRENCY)}
        </p>
      ))}
    </div>
  );
}

export function GrossNetRevenueChart({
  data,
  height = 280,
}: {
  data: RevenueTrendPoint[];
  height?: number;
}) {
  const hasData = data.some((d) => d.gross > 0 || d.net > 0);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center text-[13px] text-[var(--color-text-muted)]"
        style={{ height }}
      >
        No revenue in this period
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "rgba(0,0,0,0.45)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(0,0,0,0.45)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => (
              <span className="text-[var(--color-text-secondary)]">{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="gross"
            name="Gross revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: "#3b82f6" }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="net"
            name="Net revenue"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 3, fill: "#22c55e" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
