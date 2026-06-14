"use client";

import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface ChartDataPoint {
  [key: string]: string | number | undefined;
}

const defaultData: ChartDataPoint[] = [
  { month: "Jan", revenue: 420000, orders: 42, affiliate: 85000 },
  { month: "Feb", revenue: 380000, orders: 38, affiliate: 72000 },
  { month: "Mar", revenue: 590000, orders: 61, affiliate: 115000 },
  { month: "Apr", revenue: 710000, orders: 74, affiliate: 138000 },
  { month: "May", revenue: 650000, orders: 68, affiliate: 122000 },
  { month: "Jun", revenue: 880000, orders: 91, affiliate: 170000 },
  { month: "Jul", revenue: 760000, orders: 82, affiliate: 148000 },
  { month: "Aug", revenue: 920000, orders: 97, affiliate: 184000 },
  { month: "Sep", revenue: 1050000, orders: 108, affiliate: 210000 },
  { month: "Oct", revenue: 980000, orders: 104, affiliate: 195000 },
  { month: "Nov", revenue: 1240000, orders: 128, affiliate: 248000 },
  { month: "Dec", revenue: 1480000, orders: 156, affiliate: 296000 },
];

function pctChange(current: number, prev: number): number | null {
  if (!prev) return null;
  return ((current - prev) / prev) * 100;
}

function AdminRevenueTooltip({
  active,
  payload,
  label,
  theme,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number; dataKey: string; payload: ChartDataPoint }>;
  label?: string;
  theme: "light" | "dark";
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  const revenue = Number(row?.revenue ?? 0);
  const orders = Number(row?.orders ?? 0);
  const prevRevenue = Number(row?.prevRevenue ?? 0);
  const prevOrders = Number(row?.prevOrders ?? 0);
  const revDelta = pctChange(revenue, prevRevenue);
  const year = row?.year ? ` ${row.year}` : "";

  const shell =
    theme === "light"
      ? "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] shadow-md"
      : "bg-slate-900/90 border-white/10 text-white shadow-none";

  return (
    <div className={`rounded-md border p-3 min-w-[180px] ${shell}`}>
      <p className={`text-xs mb-2 ${theme === "light" ? "text-[var(--color-text-muted)]" : "text-white/60"}`}>
        {label}{year}
      </p>
      <p className="text-sm font-semibold tabular-nums">{formatCurrency(revenue)}</p>
      <p className={`text-[11px] mt-1 tabular-nums ${theme === "light" ? "text-[var(--color-text-secondary)]" : "text-white/80"}`}>
        {orders.toLocaleString()} paid orders
      </p>
      {prevRevenue > 0 && revDelta != null && (
        <p
          className={`text-[11px] mt-1.5 font-medium tabular-nums ${
            revDelta >= 0 ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {revDelta >= 0 ? "+" : ""}
          {revDelta.toFixed(1)}% vs prior month ({formatCurrency(prevRevenue)})
        </p>
      )}
      {prevOrders > 0 && (
        <p className={`text-[10.5px] mt-0.5 tabular-nums ${theme === "light" ? "text-[var(--color-text-muted)]" : "text-white/50"}`}>
          Prior month orders: {prevOrders}
        </p>
      )}
    </div>
  );
}

interface RevenueChartProps {
  data?: ChartDataPoint[];
  type?: "area" | "bar" | "line";
  dataKey?: string;
  labelKey?: string;
  comparisonKey?: string;
  height?: number;
  theme?: "light" | "dark";
  showAffiliate?: boolean;
  showComparison?: boolean;
  onActivePointChange?: (point: ChartDataPoint | null) => void;
}

export function RevenueChart({
  data = defaultData,
  type = "area",
  dataKey = "revenue",
  labelKey = "month",
  comparisonKey = "prevRevenue",
  height = 300,
  theme = "light",
  showAffiliate,
  showComparison = false,
  onActivePointChange,
}: RevenueChartProps) {
  const color = theme === "light" ? "#ea580c" : "#6366f1";
  const colorSecondary = theme === "light" ? "#f97316" : "#d946ef";
  const compareColor = theme === "light" ? "#94a3b8" : "rgba(255,255,255,0.35)";
  const gridStroke = theme === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";
  const tickFill = theme === "light" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.4)";
  const hasAffiliate = showAffiliate ?? data.some((d) => typeof d.affiliate === "number" && d.affiliate > 0);
  const hasComparison =
    showComparison && data.some((d) => Number(d[comparisonKey] ?? 0) > 0);

  function handleMouseMove(state: { activePayload?: Array<{ payload: ChartDataPoint }> }) {
    const point = state?.activePayload?.[0]?.payload ?? null;
    onActivePointChange?.(point);
  }

  function handleMouseLeave() {
    onActivePointChange?.(null);
  }

  const tooltip = <AdminRevenueTooltip theme={theme} />;

  return (
    <div className="w-full" style={{ height, minHeight: height }}>
      <ResponsiveContainer width="100%" height="100%">
      {type === "bar" ? (
        <BarChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey={labelKey} tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
          <Tooltip content={tooltip} />
          <Bar dataKey={dataKey} fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={colorSecondary} />
            </linearGradient>
          </defs>
        </BarChart>
      ) : type === "line" ? (
        <LineChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey={labelKey} tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={tooltip} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ fill: color, strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: colorSecondary }} />
          {hasComparison && (
            <Line type="monotone" dataKey={comparisonKey} stroke={compareColor} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          )}
        </LineChart>
      ) : (
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="areaGradient2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorSecondary} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colorSecondary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey={labelKey} tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
          <Tooltip content={tooltip} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill="url(#areaGradient)" />
          {hasComparison && (
            <Area
              type="monotone"
              dataKey={comparisonKey}
              stroke={compareColor}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="transparent"
              activeDot={{ r: 4, fill: compareColor }}
            />
          )}
          {hasAffiliate && (
            <Area type="monotone" dataKey="affiliate" stroke={colorSecondary} strokeWidth={2} fill="url(#areaGradient2)" />
          )}
        </AreaChart>
      )}
      </ResponsiveContainer>
    </div>
  );
}
