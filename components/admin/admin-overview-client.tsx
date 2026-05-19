"use client";

import React from "react";
import Link from "next/link";
import {
  UsersRound,
  Store,
  Boxes,
  ClipboardList,
  BadgeCheck,
  Landmark,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  CircleDollarSign,
  AlertCircle,
  Siren,
  Video,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type Stats = {
  totalUsers: number;
  totalVendors: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingVerifications: number;
  // Extended — pulled from schema
  pendingDisputes?: number;
  activeUgcCampaigns?: number;
  pendingPayouts?: number;
  totalTransactionsThisMonth?: number;
  newUsersThisMonth?: number;
  prevMonthRevenue?: number;
};

type ChartPoint = { month: string; revenue: number; orders?: number };

type RecentOrder = {
  id: string;
  order_number: string;
  buyer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
};

type PendingVerification = {
  id: string;
  business_name: string;
  business_country: string | null;
  created_at: string | null;
};

interface AdminOverviewClientProps {
  stats: Stats;
  chartData: ChartPoint[];
  recentOrders?: RecentOrder[];
  pendingVendors?: PendingVerification[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function pctChange(current: number, prev: number) {
  if (!prev) return null;
  return ((current - prev) / prev) * 100;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending:    "bg-amber-500/10 text-amber-600 border-amber-500/20",
  confirmed:  "bg-blue-500/10 text-blue-600 border-blue-500/20",
  processing: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  shipped:    "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  delivered:  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled:  "bg-red-500/10 text-red-600 border-red-500/20",
  completed:  "bg-green-500/10 text-green-600 border-green-500/20",
};

// ── Stat card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;        // Tailwind bg class for icon ring
  delta?: number | null; // % change vs prev period
  sub?: string;
  href?: string;
}

function KpiCard({ label, value, icon, accent, delta, sub, href }: KpiCardProps) {
  const inner = (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all duration-200 hover:border-[var(--color-border)]/80 hover:shadow-sm overflow-hidden">
      {/* faint top-left glow */}
      <div className={cn("absolute -top-6 -left-6 h-16 w-16 rounded-full opacity-10 blur-xl", accent)} />

      <div className="flex items-start justify-between gap-2">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white", accent)}>
          {icon}
        </div>
        {delta != null && (
          <span className={cn(
            "flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
            delta >= 0 ? "text-emerald-600" : "text-red-500"
          )}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>

      <div>
        <p className="text-[22px] font-bold leading-none tracking-tight text-[var(--color-text-primary)]">
          {value}
        </p>
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]/70">{sub}</p>}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
}

// ── Alert banner ───────────────────────────────────────────────────────────────

function AlertBanner({
  icon,
  title,
  description,
  href,
  cta,
  variant = "amber",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  cta: string;
  variant?: "amber" | "red";
}) {
  const styles = {
    amber: "border-amber-500/25 bg-amber-500/5",
    red:   "border-red-500/25 bg-red-500/5",
  };
  const iconStyles = {
    amber: "bg-amber-500/15 text-amber-600",
    red:   "bg-red-500/15 text-red-600",
  };

  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5", styles[variant])}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconStyles[variant])}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{title}</p>
          <p className="text-[12px] text-[var(--color-text-muted)] truncate">{description}</p>
        </div>
      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0 h-8 text-xs">
        <Link href={href}>{cta} <ArrowRight className="ml-1 h-3 w-3" /></Link>
      </Button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AdminOverviewClient({
  stats,
  chartData,
  recentOrders = [],
  pendingVendors = [],
}: AdminOverviewClientProps) {
  const revDelta = pctChange(stats.monthlyRevenue, stats.prevMonthRevenue ?? 0);
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-[var(--color-text-muted)]">
            {dateLabel}
          </p>
          <h1 className="mt-0.5 text-[26px] font-bold leading-tight tracking-tight text-[var(--color-text-primary)]">
            Platform Overview
          </h1>
        </div>
        <Badge className="self-start sm:self-auto bg-red-500/10 text-red-600 border-red-500/20 px-2.5 py-1 text-[11px] font-semibold">
          <ShieldAlert className="mr-1 h-3 w-3" /> Admin Console
        </Badge>
      </div>

      {/* ── Alert banners ── */}
      {(stats.pendingVerifications > 0 || (stats.pendingDisputes ?? 0) > 0) && (
        <div className="space-y-2">
          {stats.pendingVerifications > 0 && (
            <AlertBanner
              icon={<BadgeCheck className="h-4 w-4" />}
              title={`${stats.pendingVerifications} vendor verification${stats.pendingVerifications > 1 ? "s" : ""} pending`}
              description="Vendor applications awaiting review and approval"
              href="/admin/verifications"
              cta="Review"
              variant="amber"
            />
          )}
          {(stats.pendingDisputes ?? 0) > 0 && (
            <AlertBanner
              icon={<Siren className="h-4 w-4" />}
              title={`${stats.pendingDisputes} open dispute${stats.pendingDisputes! > 1 ? "s" : ""} require attention`}
              description="Buyer–vendor conflicts awaiting admin resolution"
              href="/admin/disputes"
              cta="Resolve"
              variant="red"
            />
          )}
        </div>
      )}

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total users"
          value={stats.totalUsers.toLocaleString()}
          icon={<UsersRound className="h-4 w-4" />}
          accent="bg-blue-600"
          sub={stats.newUsersThisMonth ? `+${stats.newUsersThisMonth} this month` : undefined}
          href="/admin/users"
        />
        <KpiCard
          label="Vendors"
          value={stats.totalVendors.toLocaleString()}
          icon={<Store className="h-4 w-4" />}
          accent="bg-teal-600"
          href="/admin/vendors"
        />
        <KpiCard
          label="Products"
          value={stats.totalProducts.toLocaleString()}
          icon={<Boxes className="h-4 w-4" />}
          accent="bg-violet-600"
          href="/admin/products"
        />
        <KpiCard
          label="Orders (30d)"
          value={stats.totalOrders.toLocaleString()}
          icon={<ClipboardList className="h-4 w-4" />}
          accent="bg-orange-500"
          href="/admin/orders"
        />
        <KpiCard
          label="Revenue (30d)"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          accent="bg-emerald-600"
          delta={revDelta}
          sub={stats.prevMonthRevenue ? `prev. ${formatCurrency(stats.prevMonthRevenue)}` : undefined}
        />
        <KpiCard
          label="UGC campaigns"
          value={(stats.activeUgcCampaigns ?? 0).toLocaleString()}
          icon={<Video className="h-4 w-4" />}
          accent="bg-pink-600"
          href="/admin/reports"
        />
      </div>

      {/* ── Revenue chart ── */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="flex flex-row items-center justify-between pb-0">
          <div>
            <CardTitle className="text-[15px] font-semibold">Revenue trend</CardTitle>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">Last 12 months · all vendors</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-[12px] text-[var(--color-text-muted)] h-7 px-2">
            <Link href="/admin/reports">Full report <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <RevenueChart data={chartData} height={260} type="area" />
        </CardContent>
      </Card>

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Recent orders */}
        <div className="lg:col-span-2">
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)] h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-[15px] font-semibold">Recent orders</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-[12px] text-[var(--color-text-muted)] h-7 px-2">
                <Link href="/admin/orders">All orders <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-muted)]">
                  <ClipboardList className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No recent orders</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {recentOrders.slice(0, 6).map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-[var(--color-surface-secondary)] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-surface-secondary)] text-[11px] font-bold text-[var(--color-text-muted)]">
                          #
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
                            {order.order_number}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                            {order.buyer_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <Badge className={cn("text-[10px] font-medium px-2 py-0.5 border", ORDER_STATUS_STYLES[order.status] ?? ORDER_STATUS_STYLES.pending)}>
                          {order.status}
                        </Badge>
                        <div className="text-right">
                          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                            {formatCurrency(order.total_amount)}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">
                            {timeAgo(order.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Platform summary */}
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold">Platform summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <dl className="divide-y divide-[var(--color-border)]">
                {[
                  { label: "All-time revenue", value: formatCurrency(stats.totalRevenue) },
                  { label: "Monthly revenue",  value: formatCurrency(stats.monthlyRevenue) },
                  { label: "Orders (30d)",      value: stats.totalOrders.toLocaleString() },
                  {
                    label: "Pending payouts",
                    value: stats.pendingPayouts != null ? stats.pendingPayouts.toLocaleString() : "—",
                    alert: (stats.pendingPayouts ?? 0) > 0,
                  },
                  {
                    label: "Pending verifs.",
                    value: stats.pendingVerifications.toLocaleString(),
                    alert: stats.pendingVerifications > 0,
                  },
                ].map(({ label, value, alert }) => (
                  <div key={label} className="flex items-center justify-between px-5 py-2.5">
                    <dt className="text-[12px] text-[var(--color-text-muted)]">{label}</dt>
                    <dd className={cn(
                      "text-[13px] font-semibold tabular-nums",
                      alert ? "text-amber-600" : "text-[var(--color-text-primary)]"
                    )}>
                      {alert && <AlertCircle className="inline h-3 w-3 mr-1 -mt-0.5" />}
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* Pending verifications */}
          {pendingVendors.length > 0 && (
            <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-[15px] font-semibold">Awaiting verification</CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-[12px] text-[var(--color-text-muted)] h-7 px-2">
                  <Link href="/admin/verifications">All <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[var(--color-border)]">
                  {pendingVendors.slice(0, 4).map((v) => (
                    <Link
                      key={v.id}
                      href={`/admin/verifications/${v.id}`}
                      className="flex items-center justify-between px-5 py-2.5 hover:bg-[var(--color-surface-secondary)] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{v.business_name}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          {v.business_country ?? "Unknown"} · {v.created_at ? timeAgo(v.created_at) : "—"}
                        </p>
                      </div>
                      <Badge className="shrink-0 ml-2 bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                        <Clock className="h-2.5 w-2.5 mr-1" /> Pending
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: "Users",         href: "/admin/users",         icon: <UsersRound className="h-3.5 w-3.5" /> },
                { label: "Vendors",       href: "/admin/vendors",       icon: <Store className="h-3.5 w-3.5" /> },
                { label: "Products",      href: "/admin/products",      icon: <Boxes className="h-3.5 w-3.5" /> },
                { label: "Payments",      href: "/admin/payments",      icon: <Landmark className="h-3.5 w-3.5" /> },
              ].map(({ label, href, icon }) => (
                <Button
                  key={href}
                  asChild
                  variant="outline"
                  size="sm"
                  className="justify-start gap-1.5 h-8 text-[12px] font-medium"
                >
                  <Link href={href}>{icon}{label}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}