"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import type { EarningsDataset } from "@/components/dashboard/EarningsOverview";

interface DashboardInsightsProps {
  labels: string[];
  datasets: EarningsDataset[];
  earnedToday?: number;
  earnedTrend?: string;
}

export function DashboardInsights({
  labels,
  datasets,
  earnedToday = 0,
  earnedTrend,
}: DashboardInsightsProps) {
  const { formatMoney } = useCurrency();

  const trendData = useMemo(
    () =>
      labels.map((label, i) => {
        const row: Record<string, string | number> = {
          label,
          total: datasets.reduce((sum, d) => sum + (d.data[i] ?? 0), 0),
        };
        for (const d of datasets) row[d.label] = d.data[i] ?? 0;
        return row;
      }),
    [labels, datasets]
  );

  const channelData = useMemo(
    () =>
      datasets
        .map((d) => ({
          name: d.label,
          value: d.data.reduce((sum, v) => sum + v, 0),
          color: d.color,
        }))
        .filter((d) => d.value > 0),
    [datasets]
  );

  const periodTotal = useMemo(
    () => trendData.reduce((sum, row) => sum + Number(row.total), 0),
    [trendData]
  );

  const hasTrend = trendData.some((row) => Number(row.total) > 0);
  const hasChannels = channelData.length > 0;
  const channelTotal = useMemo(
    () => channelData.reduce((sum, d) => sum + d.value, 0),
    [channelData]
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-[#fd5000]" />
              <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">
                Earnings trend
              </h3>
            </div>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Last {labels.length} days · {formatMoney(periodTotal, "USD")} total
            </p>
          </div>
          {earnedToday > 0 && (
            <div className="text-right">
              <p className="text-[11px] text-[var(--color-text-muted)]">Today</p>
              <p className="text-[14px] font-bold tabular-nums text-[#30a46c]">
                {formatMoney(earnedToday, "USD")}
              </p>
              {earnedTrend && (
                <p className="text-[10px] text-[var(--color-text-muted)]">{earnedTrend}</p>
              )}
            </div>
          )}
        </div>

        <div className="h-[200px] sm:h-[220px]">
          {hasTrend ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fd5000" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#fd5000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  formatter={(value: number) => formatMoney(value, "USD")}
                  labelFormatter={(label) => label}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#fd5000"
                  strokeWidth={2}
                  fill="url(#earnFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">
                No earnings in this period yet
              </p>
              <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                Share affiliate links or join a campaign to see your chart grow.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <PieChartIcon className="size-4 text-[#8b5cf6]" />
          <div>
            <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">
              Revenue by channel
            </h3>
            <p className="text-[12px] text-[var(--color-text-muted)]">
              Where your money is coming from
            </p>
          </div>
        </div>

        <div className="h-[200px] sm:h-[220px]">
          {hasChannels ? (
            <div className="grid h-full grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={2}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  >
                    {channelData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatMoney(value, "USD")}
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2 px-1 sm:px-0">
                {channelData.map((entry) => {
                  const pct = channelTotal > 0 ? Math.round((entry.value / channelTotal) * 100) : 0;
                  return (
                    <div key={entry.name} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex min-w-0 items-center gap-1.5 text-[var(--color-text-muted)]">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: entry.color }}
                        />
                        <span className="truncate">{entry.name}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-[var(--color-text-primary)]">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
                <p className="border-t border-[var(--color-border)] pt-2 text-[11px] font-bold text-[var(--color-text-primary)]">
                  {formatMoney(channelTotal, "USD")}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              {datasets.map((d) => (
                <div key={d.label} className="flex w-full max-w-xs items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <span className="size-2.5 rounded-sm" style={{ background: d.color }} />
                    {d.label}
                  </span>
                  <span className="font-medium text-[var(--color-text-primary)]">{d.amount}</span>
                </div>
              ))}
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Start earning to populate this breakdown.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
