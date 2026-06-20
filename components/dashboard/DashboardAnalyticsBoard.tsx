"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  HeartHandshake,
  LineChart,
  MessageSquare,
  MoreVertical,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCurrency } from "@/context/CurrencyContext";
import type { EarningsDataset } from "@/components/dashboard/EarningsOverview";
import type { Product } from "@/types/dashboard";
import { cn } from "@/lib/utils";

function MessageAvatar({
  name,
  avatarUrl,
  initials,
  color,
}: {
  name: string;
  avatarUrl?: string | null;
  initials: string;
  color: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="size-9 shrink-0 rounded-full object-cover ring-1 ring-[var(--color-border)]"
      />
    );
  }
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-1 ring-[var(--color-border)]"
      style={{ background: color }}
    >
      {initials}
    </span>
  );
}

export interface DashboardMessagePreview {
  id: string;
  name: string;
  preview: string;
  time: string;
  avatarUrl?: string | null;
  initials: string;
  color: string;
  href?: string;
}

interface KpiMetric {
  label: string;
  value: string;
  change: string;
  up: boolean;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

interface DashboardAnalyticsBoardProps {
  wallet?: {
    available_balance: number;
    pending_balance: number;
    total_earned: number;
  } | null;
  labels: string[];
  datasets: EarningsDataset[];
  products: Product[];
  messages: DashboardMessagePreview[];
}

function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function PanelHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
      <h3 className="text-[13px] font-bold text-[var(--color-text-primary)]">{title}</h3>
      {action}
    </div>
  );
}

function PeriodSelect({ label = "This year" }: { label?: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)]"
    >
      {label}
      <ChevronDown className="size-3" />
    </button>
  );
}

function KpiCard({ metric }: { metric: KpiMetric }) {
  const Icon = metric.icon;
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-[var(--color-text-muted)]">{metric.label}</p>
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: metric.iconBg, color: metric.iconColor }}
        >
          <Icon className="size-4" strokeWidth={2} />
        </div>
      </div>
      <p className="mt-2 text-[22px] font-bold tabular-nums tracking-tight text-[var(--color-text-primary)] sm:text-[24px]">
        {metric.value}
      </p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1 text-[11px] font-semibold",
          metric.up ? "text-[#30a46c]" : "text-red-500"
        )}
      >
        {metric.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
        {metric.change}
      </p>
    </Panel>
  );
}

export function DashboardAnalyticsBoard({
  wallet,
  labels,
  datasets,
  products,
  messages,
}: DashboardAnalyticsBoardProps) {
  const { formatMoney } = useCurrency();

  const affiliateData = datasets.find((d) => d.label === "Affiliate")?.data ?? [];
  const marketplaceData = datasets.find((d) => d.label === "Marketplace")?.data ?? [];
  const ugcData = datasets.find((d) => d.label === "UGC")?.data ?? [];

  const periodTotal = useMemo(
    () => datasets.reduce((sum, d) => sum + d.data.reduce((a, b) => a + b, 0), 0),
    [datasets]
  );

  const prevHalf = useMemo(() => {
    const mid = Math.floor(labels.length / 2);
    return datasets.reduce(
      (sum, d) => sum + d.data.slice(0, mid).reduce((a, b) => a + b, 0),
      0
    );
  }, [datasets, labels.length]);

  const recentHalf = useMemo(() => {
    const mid = Math.floor(labels.length / 2);
    return datasets.reduce(
      (sum, d) => sum + d.data.slice(mid).reduce((a, b) => a + b, 0),
      0
    );
  }, [datasets, labels.length]);

  const pctChange = useMemo(() => {
    if (prevHalf <= 0) return recentHalf > 0 ? 100 : 0;
    return ((recentHalf - prevHalf) / prevHalf) * 100;
  }, [prevHalf, recentHalf]);

  const pctLabel = `${Math.abs(Math.round(pctChange))}% this period`;
  const pctUp = pctChange >= 0;

  const marketplaceTotal = marketplaceData.reduce((a, b) => a + b, 0);
  const affiliateTotal = affiliateData.reduce((a, b) => a + b, 0);

  const kpis: KpiMetric[] = [
    {
      label: "Net earnings",
      value: formatMoney(wallet?.total_earned ?? periodTotal, "USD"),
      change: `${pctUp ? "+" : "−"}${pctLabel}`,
      up: pctUp,
      icon: HeartHandshake,
      iconBg: "#ede9ff",
      iconColor: "#7c3aed",
    },
    {
      label: "Pending payouts",
      value: formatMoney(wallet?.pending_balance ?? 0, "USD"),
      change: wallet?.pending_balance ? "Clearing within 24h" : "Nothing queued",
      up: true,
      icon: Wallet,
      iconBg: "#e0f2fe",
      iconColor: "#0284c7",
    },
    {
      label: "Store revenue",
      value: formatMoney(marketplaceTotal, "USD"),
      change: `${formatMoney(affiliateTotal, "USD")} from affiliates`,
      up: marketplaceTotal >= affiliateTotal,
      icon: ShoppingCart,
      iconBg: "#fef9c3",
      iconColor: "#ca8a04",
    },
  ];

  const trafficData = useMemo(
    () =>
      labels.map((label, i) => ({
        label: label.replace(/\s\d{4}$/, "").slice(0, 6),
        sales: marketplaceData[i] ?? 0,
        visits: (affiliateData[i] ?? 0) + (ugcData[i] ?? 0) * 0.4,
      })),
    [labels, marketplaceData, affiliateData, ugcData]
  );

  const hasTraffic = trafficData.some((r) => r.sales > 0 || r.visits > 0);

  const barData = useMemo(
    () =>
      labels.slice(-8).map((label, i) => {
        const idx = labels.length - 8 + i;
        const profit =
          (marketplaceData[idx] ?? 0) + (affiliateData[idx] ?? 0) + (ugcData[idx] ?? 0);
        const revenue = profit * 1.12;
        return {
          label: label.replace(/\s\d{4}$/, "").slice(0, 5),
          profit: Math.round(profit),
          revenue: Math.round(revenue),
        };
      }),
    [labels, marketplaceData, affiliateData, ugcData]
  );

  const hasBar = barData.some((r) => r.profit > 0 || r.revenue > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} metric={kpi} />
        ))}
      </div>

      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="min-w-0 lg:col-span-2">
          <PanelHeader
            title="Traffic"
            action={<PeriodSelect label="This year" />}
          />
          <div className="px-4 pb-2 pt-3">
            <div className="mb-3 flex items-center gap-4 text-[11px] font-medium text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#7c3aed]" />
                Sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full border-2 border-[#38bdf8] bg-transparent" />
                Affiliate activity
              </span>
            </div>
            <div className="h-[220px] sm:h-[240px]">
              {hasTraffic ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={trafficData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
                      tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatMoney(value, "USD"),
                        name === "sales" ? "Sales" : "Affiliate activity",
                      ]}
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="visits"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                    />
                  </ReLineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <LineChart className="size-8 text-[var(--color-text-muted)]" />
                  <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">
                    Traffic data builds as you sell and promote
                  </p>
                </div>
              )}
            </div>
          </div>
        </Panel>

        <Panel className="min-w-0 lg:col-span-1">
          <PanelHeader
            title="My messages"
            action={
              <Link
                href="/dashboard/messages"
                className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
              >
                Open inbox
              </Link>
            }
          />
          <div className="divide-y divide-[var(--color-border)]">
            {messages.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <MessageSquare className="mx-auto size-7 text-[var(--color-text-muted)]" />
                <p className="mt-2 text-[12px] font-medium text-[var(--color-text-secondary)]">
                  No conversations yet
                </p>
                <Link
                  href="/marketplace"
                  className="mt-1 inline-block text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
                >
                  Message a vendor →
                </Link>
              </div>
            ) : (
              messages.slice(0, 4).map((msg) => (
                <Link
                  key={msg.id}
                  href={msg.href ?? "/dashboard/messages"}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-secondary)]/60"
                >
                  <MessageAvatar
                    name={msg.name}
                    avatarUrl={msg.avatarUrl}
                    initials={msg.initials}
                    color={msg.color}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                        {msg.name}
                      </p>
                      <span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">
                        {msg.time}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-[var(--color-text-muted)]">{msg.preview}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Panel>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="min-w-0 lg:col-span-1">
          <PanelHeader
            title="Top selling products"
            action={
              <button type="button" className="text-[var(--color-text-muted)]" aria-label="More options">
                <MoreVertical className="size-4" />
              </button>
            }
          />
          <div className="divide-y divide-[var(--color-border)]">
            {products.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-[var(--color-text-muted)]">
                No product sales yet
              </div>
            ) : (
              products.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  href={`/marketplace/${p.slug ?? p.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-secondary)]/60"
                >
                  <div
                    className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-[var(--color-border)]"
                    style={!p.imageUrl ? { background: p.imageColor } : undefined}
                  >
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="text-[11px] font-bold text-white">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{p.sold}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-bold tabular-nums text-[var(--color-text-primary)]">
                    {p.price}
                  </span>
                </Link>
              ))
            )}
          </div>
        </Panel>

        <Panel className="min-w-0 lg:col-span-2">
          <PanelHeader
            title="Product sales"
            action={<PeriodSelect label="This year" />}
          />
          <div className="px-4 pb-2 pt-3">
            <div className="mb-3 flex items-center gap-4 text-[11px] font-medium text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-[#7c3aed]" />
                Net profit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-[#e5e7eb]" />
                Revenue
              </span>
            </div>
            <div className="h-[220px] sm:h-[240px]">
              {hasBar ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatMoney(value, "USD"),
                        name === "profit" ? "Net profit" : "Revenue",
                      ]}
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="profit" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="revenue" fill="#e5e7eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center">
                  <LineChart className="size-7 text-[var(--color-text-muted)]" />
                  <p className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                    Sales chart appears once orders start coming in
                  </p>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
