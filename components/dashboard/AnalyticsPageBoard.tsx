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
import { ProfileImage } from "@/components/ui/profile-image";
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
  trafficBars: { label: string; store: number; campaigns: number }[];
  followersBars: { month: string; orders: number }[];
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

function formatChartMoney(value: number): string {
  const n = Math.abs(Number(value));
  if (!Number.isFinite(n) || n === 0) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function formatChartCount(value: number): string {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}

function chartYDomain(max: number, floor = 5): [number, number] {
  const safe = Math.max(0, max);
  if (safe <= 0) return [0, floor];
  const padded = Math.ceil(safe * 1.15);
  const magnitude = Math.pow(10, Math.floor(Math.log10(padded)));
  const nice = Math.ceil(padded / magnitude) * magnitude;
  return [0, Math.max(floor, nice)];
}

type TooltipPayload = { name?: string; value?: number; color?: string; dataKey?: string };

function ChartMoneyTooltip({
  active,
  payload,
  label,
  formatValue,
  labels,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  formatValue: (n: number) => string;
  labels: Record<string, string>;
}) {
  if (!active || !label) return null;

  const items = Object.entries(labels).map(([key, name]) => {
    const entry = payload?.find((p) => p.dataKey === key || p.name === key);
    const val = Number(entry?.value ?? 0);
    const color =
      entry?.color ??
      (key === "store" ? "#7c3aed" : key === "campaigns" ? "#22d3ee" : "#7c3aed");
    return { key, name, val, color };
  });

  const hasActivity = items.some((item) => item.val > 0);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-md">
      <p className="mb-1.5 text-[12px] font-bold text-[var(--color-text-primary)]">{label}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
              <span className="size-2 rounded-sm" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
              {formatValue(item.val)}
            </span>
          </div>
        ))}
      </div>
      {!hasActivity && (
        <p className="mt-1.5 text-[10px] text-[var(--color-text-muted)]">No activity this period</p>
      )}
    </div>
  );
}

function ChartCountTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const val = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-md">
      <p className="text-[12px] font-bold text-[var(--color-text-primary)]">{label}</p>
      <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
        Orders: <span className="font-semibold text-[var(--color-text-primary)]">{formatChartCount(val)}</span>
      </p>
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center px-4 text-center">
      <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">{message}</p>
      <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
        Data appears once you start earning or receiving traffic.
      </p>
    </div>
  );
}

function PersonAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  initials: string;
  color: string;
  avatarUrl?: string | null;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "size-11" : "size-9";
  return (
    <ProfileImage
      src={avatarUrl}
      alt={name}
      className={cn(dim, "shrink-0 rounded-full ring-1 ring-[var(--color-border)]")}
    />
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

const CHART_MARGIN = { top: 8, right: 12, left: 0, bottom: 0 };

/** Disable Recharts' full-column gray hover block on bar charts */
const BAR_TOOLTIP_PROPS = {
  cursor: false as const,
  allowEscapeViewBox: { x: true, y: true },
  wrapperStyle: { outline: "none", zIndex: 20 },
};

const TRAFFIC_LABELS: Record<string, string> = {
  store: "Store sales",
  campaigns: "Campaigns",
};

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
  const { formatMoney, displayCurrency } = useCurrency();

  const formatChartValue = (n: number) => formatMoney(n, displayCurrency, displayCurrency);

  const mixTotal = useMemo(
    () => trafficMix.reduce((s, d) => s + d.value, 0),
    [trafficMix]
  );

  const trafficMax = useMemo(
    () => Math.max(0, ...trafficBars.map((r) => r.store + r.campaigns)),
    [trafficBars]
  );

  const ordersMax = useMemo(
    () => Math.max(0, ...followersBars.map((r) => r.orders)),
    [followersBars]
  );

  const digitalMax = useMemo(
    () => Math.max(0, ...digitalTrend.map((r) => r.value)),
    [digitalTrend]
  );

  const hasTrafficData = trafficBars.some((r) => r.store > 0 || r.campaigns > 0);
  const hasCustomerData = followersBars.some((r) => r.orders > 0);
  const hasDigitalData = digitalTrend.some((r) => r.value > 0);
  const hasVisitData = mixTotal > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rings.map((m) => (
          <RingCard key={m.label} metric={m} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">Traffic</h3>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-[#7c3aed]" />Store sales</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-[#22d3ee]" />Campaigns</span>
            </div>
          </div>
          <div className="h-[200px] sm:h-[240px]">
            {hasTrafficData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficBars} margin={CHART_MARGIN} barGap={6} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    width={48}
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatChartMoney}
                    domain={chartYDomain(trafficMax)}
                    tickCount={5}
                  />
                  <Tooltip
                    {...BAR_TOOLTIP_PROPS}
                    content={({ active, payload, label }) => (
                      <ChartMoneyTooltip
                        active={active}
                        payload={payload as TooltipPayload[] | undefined}
                        label={label}
                        formatValue={formatChartValue}
                        labels={TRAFFIC_LABELS}
                      />
                    )}
                  />
                  <Bar dataKey="store" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="campaigns" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty message="No traffic revenue in this period" />
            )}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">Customers</h3>
            <PeriodSelect />
          </div>
          <div className="h-[200px] sm:h-[240px]">
            {hasCustomerData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={followersBars} margin={CHART_MARGIN} barCategoryGap="24%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    width={36}
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatChartCount}
                    domain={chartYDomain(ordersMax, 4)}
                    tickCount={5}
                  />
                  <Tooltip
                    {...BAR_TOOLTIP_PROPS}
                    content={({ active, payload, label }) => (
                      <ChartCountTooltip
                        active={active}
                        payload={payload as TooltipPayload[] | undefined}
                        label={label}
                      />
                    )}
                  />
                  <Bar dataKey="orders" name="Orders" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty message="No customer orders yet" />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">Digital analytics</h3>
            <PeriodSelect label="Last 14 days" />
          </div>
          <div className="h-[240px]">
            {hasDigitalData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={digitalTrend} margin={CHART_MARGIN}>
                  <defs>
                    <linearGradient id="digitalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    width={48}
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatChartMoney}
                    domain={chartYDomain(digitalMax)}
                    tickCount={5}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--color-border)", strokeWidth: 1, strokeDasharray: "4 4" }}
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperStyle={{ outline: "none", zIndex: 20 }}
                    content={({ active, payload, label }) => (
                      <ChartMoneyTooltip
                        active={active}
                        payload={payload as TooltipPayload[] | undefined}
                        label={label}
                        formatValue={formatChartValue}
                        labels={{ value: "Earnings" }}
                      />
                    )}
                  />
                  <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} fill="url(#digitalFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty message="No earnings recorded in the last 14 days" />
            )}
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-4 text-[14px] font-bold text-[var(--color-text-primary)]">Traffic mix</h3>
          {hasVisitData ? (
            <>
              <div className="relative mx-auto h-[160px] w-full max-w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trafficMix}
                      dataKey="value"
                      innerRadius="58%"
                      outerRadius="82%"
                      paddingAngle={2}
                      stroke="var(--color-surface)"
                      strokeWidth={2}
                    >
                      {trafficMix.map((e) => (
                        <Cell key={e.name} fill={e.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] text-[var(--color-text-muted)]">Total visits</p>
                  <p className="text-[18px] font-bold tabular-nums text-[var(--color-text-primary)]">
                    {totalVisits.toLocaleString()}
                  </p>
                  {visitTrend && (
                    <p className="flex items-center gap-0.5 text-[10px] font-semibold text-[#30a46c]">
                      <ArrowUpRight className="size-3" />
                      {visitTrend}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {trafficMix.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {Math.round((s.value / mixTotal) * 100)}%
                      <span className="ml-1.5 text-[11px] font-normal text-[var(--color-text-muted)]">
                        ({s.value.toLocaleString()})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ChartEmpty message="No visit data yet" />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">Recent sales</h3>
            <Link href="/dashboard/orders" className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline">
              See all
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <ChartEmpty message="No sales yet" />
          ) : (
            <div className="space-y-1">
              {recentSales.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-[var(--color-surface-secondary)]/50"
                >
                  <PersonAvatar
                    name={s.name}
                    initials={s.initials}
                    color={s.color}
                    avatarUrl={s.avatarUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-snug text-[var(--color-text-primary)]">
                      {s.name}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{s.date}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-bold tabular-nums text-[var(--color-text-primary)]">{s.amount}</p>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        s.status === "success"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      )}
                    >
                      {s.status === "success" ? "Success" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">Top contributors</h3>
            <Link href="/ugc" className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline">
              Browse UGC
            </Link>
          </div>
          {topContributors.length === 0 ? (
            <ChartEmpty message="No contributors to show yet" />
          ) : (
            <div className="space-y-2">
              {topContributors.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  href={c.href ?? "#"}
                  className="flex items-center gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-[var(--color-surface-secondary)]/50"
                >
                  <PersonAvatar
                    name={c.name}
                    initials={c.initials}
                    color={c.color}
                    avatarUrl={c.avatarUrl}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold leading-snug text-[var(--color-text-primary)]">{c.name}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{c.metric}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-[var(--color-text-muted)]" />
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

export const RING_ICONS = { DollarSign, Eye, MousePointerClick, TrendingUp };
