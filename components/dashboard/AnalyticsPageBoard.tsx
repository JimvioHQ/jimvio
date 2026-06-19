"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Eye,
  MousePointerClick,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

export interface AnalyticsRingMetric {
  label: string;
  value: string;
  change: string;
  up: boolean;
  percent: number;
  ringColor: string;
  icon: typeof DollarSign;
}

export interface AnalyticsSaleRow {
  id: string;
  name: string;
  date: string;
  amount: string;
  status: "success" | "pending";
  avatarUrl?: string | null;
  initials: string;
  color: string;
}

export interface AnalyticsContributor {
  id: string;
  name: string;
  metric: string;
  avatarUrl?: string | null;
  initials: string;
  color: string;
  href?: string;
}

interface AnalyticsPageBoardProps {
  rings: AnalyticsRingMetric[];
  trafficBars: { label: string; profit: number; revenue: number; ads: number }[];
  followersBars: { month: string; followers: number; unfollows: number }[];
  digitalTrend: { label: string; value: number }[];
  trafficMix: { name: string; value: number; color: string }[];
  recentSales: AnalyticsSaleRow[];
  topContributors: AnalyticsContributor[];
  totalVisits?: number;
  visitTrend?: string;
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

function RingCard({ metric }: { metric: AnalyticsRingMetric }) {
  const Icon = metric.icon;
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (metric.percent / 100) * c;

  return (
    <Panel className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-[var(--color-text-muted)]">{metric.label}</p>
          <p className="mt-1 text-[20px] font-bold tabular-nums tracking-tight text-[var(--color-text-primary)] sm:text-[22px]">
            {metric.value}
          </p>
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-[11px] font-semibold",
              metric.up ? "text-[#30a46c]" : "text-red-500"
            )}
          >
            {metric.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {metric.change}
          </p>
        </div>
        <div className="relative size-16 shrink-0">
          <svg viewBox="0 0 72 72" className="size-full -rotate-90">
            <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
            <circle
              cx="36"
              cy="36"
              r={r}
              fill="none"
              stroke={metric.ringColor}
              strokeWidth="6"
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--color-text-muted)]">
            {metric.percent}%
          </span>
        </div>
      </div>
      <div
        className="flex size-8 items-center justify-center rounded-lg"
        style={{ background: `${metric.ringColor}18`, color: metric.ringColor }}
      >
        <Icon className="size-4" />
      </div>
    </Panel>
  );
}

function PeriodSelect({ label = "This year" }: { label?: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)]"
    >
      {label}
      <ChevronDown className="size-3" />
    </button>
  );
}

export function AnalyticsPageBoard({
  rings,
  trafficBars,
  followersBars,
  digitalTrend,
  trafficMix,
  recentSales,
  topContributors,
  totalVisits = 0,
  visitTrend,
}: AnalyticsPageBoardProps) {
  const { formatMoney } = useCurrency();

  const mixTotal = useMemo(
    () => trafficMix.reduce((s, d) => s + d.value, 0),
    [trafficMix]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rings.map((m) => (
          <RingCard key={m.label} metric={m} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">Traffic</h3>
            <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-[#7c3aed]" />Profit</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-[#facc15]" />Revenue</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-[#22d3ee]" />Ads</span>
            </div>
          </div>
          <div className="h-[200px] sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficBars} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number, n: string) => [
                    formatMoney(v, "USD"),
                    n === "profit" ? "Profit" : n === "revenue" ? "Revenue" : "Ads",
                  ]}
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="profit" stackId="a" fill="#7c3aed" radius={[0, 0, 0, 0]} maxBarSize={36} />
                <Bar dataKey="revenue" stackId="a" fill="#facc15" maxBarSize={36} />
                <Bar dataKey="ads" stackId="a" fill="#22d3ee" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">Customers</h3>
            <PeriodSelect />
          </div>
          <div className="h-[200px] sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={followersBars} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="followers" fill="#7c3aed" radius={[6, 6, 0, 0]} maxBarSize={14} />
                <Bar dataKey="unfollows" fill="#e5e7eb" radius={[6, 6, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">Digital analytics</h3>
            <PeriodSelect />
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={digitalTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="digitalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => formatMoney(v, "USD")} contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} fill="url(#digitalFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <Panel>
            <h3 className="mb-3 text-[14px] font-bold text-[var(--color-text-primary)]">Traffic mix</h3>
            <div className="relative mx-auto h-[140px] w-full max-w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={trafficMix} dataKey="value" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="var(--color-surface)" strokeWidth={2}>
                    {trafficMix.map((e) => (
                      <Cell key={e.name} fill={e.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] text-[var(--color-text-muted)]">Total visits</p>
                <p className="text-[15px] font-bold tabular-nums">{totalVisits.toLocaleString()}+</p>
                {visitTrend && (
                  <p className="flex items-center gap-0.5 text-[10px] font-semibold text-[#30a46c]">
                    <ArrowUpRight className="size-3" />
                    {visitTrend}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {trafficMix.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <span className="size-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {mixTotal > 0 ? Math.round((s.value / mixTotal) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="sm:col-span-2 xl:col-span-1">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">Recent sales</h3>
              <Link href="/dashboard/orders" className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline">
                See all
              </Link>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {recentSales.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-[var(--color-text-muted)]">No sales yet</p>
              ) : (
                recentSales.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} alt="" className="size-9 rounded-full object-cover ring-1 ring-[var(--color-border)]" />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: s.color }}>
                        {s.initials}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold">{s.name}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{s.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-bold tabular-nums">{s.amount}</p>
                      <span
                        className={cn(
                          "text-[10px] font-semibold",
                          s.status === "success" ? "text-[#30a46c]" : "text-red-500"
                        )}
                      >
                        {s.status === "success" ? "Success" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel className="sm:col-span-3 xl:col-span-1">
            <h3 className="mb-3 text-[14px] font-bold text-[var(--color-text-primary)]">Top contributors</h3>
            <div className="space-y-3">
              {topContributors.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-[var(--color-text-muted)]">No contributors yet</p>
              ) : (
                topContributors.slice(0, 3).map((c) => (
                  <Link
                    key={c.id}
                    href={c.href ?? "#"}
                    className="flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-[var(--color-surface-secondary)]/60"
                  >
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" className="size-11 rounded-full object-cover ring-1 ring-[var(--color-border)]" />
                    ) : (
                      <span className="flex size-11 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: c.color }}>
                        {c.initials}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold">{c.name}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{c.metric}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-[var(--color-text-muted)]" />
                  </Link>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export const RING_ICONS = { DollarSign, Eye, MousePointerClick, TrendingUp };
