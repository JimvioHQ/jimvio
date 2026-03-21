"use client";

import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line
} from "recharts";

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

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-glass">
        <p className="text-white/60 text-xs mb-2">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.name === "orders"
              ? entry.value
              : `RWF ${entry.value.toLocaleString()}`
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface RevenueChartProps {
  data?: ChartDataPoint[];
  type?: "area" | "bar" | "line";
  dataKey?: string;
  labelKey?: string;
  height?: number;
}

export function RevenueChart({ data = defaultData, type = "area", dataKey = "revenue", labelKey = "month", height = 300 }: RevenueChartProps) {
  const color = "#6366f1";
  const colorSecondary = "#d946ef";

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "bar" ? (
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={labelKey} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey={dataKey} fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={colorSecondary} />
            </linearGradient>
          </defs>
        </BarChart>
      ) : type === "line" ? (
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={labelKey} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ fill: color, strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: colorSecondary }} />
        </LineChart>
      ) : (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={labelKey} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill="url(#areaGradient)" />
          {dataKey === "revenue" && (
            <Area type="monotone" dataKey="affiliate" stroke={colorSecondary} strokeWidth={2} fill="url(#areaGradient2)" />
          )}
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
