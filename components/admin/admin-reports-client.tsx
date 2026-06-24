"use client";

import Link from "next/link";
import { ArrowUpRight, DollarSign, ShoppingCart, Wallet, BarChart3 } from "lucide-react";
import type { AdminReportsData } from "@/services/admin/getAdminReports";
import { ADMIN_RANGES } from "@/lib/admin/ranges";
import { adminBtnPrimary, adminBtnSecondary } from "@/lib/admin/ui";
import { ADMIN_PRIMARY_CURRENCY, formatAdminAmount } from "@/lib/admin/format-money";
import { cn } from "@/lib/utils";
import { AdminExportMenu } from "@/components/admin/admin-export-menu";
import { GrossNetRevenueChart } from "@/components/admin/gross-net-revenue-chart";
import { AdminDonutChart } from "@/components/charts/admin-donut-chart";
import type { ChartSlice } from "@/lib/admin/chart-slices";

type Props = {
  data: AdminReportsData;
};

function KpiCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "blue" | "purple" | "pink" | "green";
}) {
  const iconBg = {
    default: "bg-[var(--color-surface-secondary)]",
    blue: "bg-blue-500/10 text-blue-600",
    purple: "bg-violet-500/10 text-violet-600",
    pink: "bg-pink-500/10 text-pink-600",
    green: "bg-emerald-500/10 text-emerald-600",
  }[tone];

  return (
    <div className="rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</p>
          <p className="mt-1.5 text-[22px] font-bold tabular-nums tracking-tight text-[var(--color-text-primary)]">
            {value}
          </p>
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-xl", iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function AdminReportsClient({ data }: Props) {
  const rangeLabel = ADMIN_RANGES[data.range].label;
  const exportQuery = data.range !== "mtd" ? `range=${data.range}` : "";

  const categoryChart: ChartSlice[] = data.revenueByCategory.map((c) => ({
    name: c.name,
    value: c.revenue,
    color: c.color,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-0.5 rounded-md bg-[var(--color-surface-secondary)] p-[3px] ring-[0.5px] ring-[var(--color-border)]">
          {(Object.keys(ADMIN_RANGES) as Array<keyof typeof ADMIN_RANGES>)
            .filter((k) => k !== "all")
            .map((k) => (
              <Link
                key={k}
                href={`/admin/reports?range=${k}`}
                scroll={false}
                className={cn(
                  "h-[30px] rounded-md px-3 text-[12px] font-medium transition-colors",
                  data.range === k
                    ? "bg-[var(--color-text-primary)] font-semibold text-[var(--color-surface)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
                )}
              >
                {ADMIN_RANGES[k].label}
              </Link>
            ))}
        </div>
        <div className="flex items-center gap-2">
          <AdminExportMenu resource="reports" query={exportQuery} label="Export CSV" />
          <Link href="/admin/system-analysis" className={adminBtnSecondary}>
            System analysis
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total revenue"
          value={data.summary.grossRevenueDisplay}
          icon={<DollarSign className="size-5" />}
          tone="blue"
        />
        <KpiCard
          label="Net revenue"
          value={data.summary.netRevenueDisplay}
          icon={<Wallet className="size-5" />}
          tone="purple"
        />
        <KpiCard
          label="Average order value"
          value={data.summary.averageOrderValueDisplay}
          icon={<ShoppingCart className="size-5" />}
          tone="pink"
        />
        <KpiCard
          label="Orders completed"
          value={data.summary.completedOrders.toLocaleString()}
          icon={<BarChart3 className="size-5" />}
          tone="green"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl bg-[var(--color-surface)] p-4 sm:p-5 ring-1 ring-[var(--color-border)]">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">Revenue graphs</h2>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
              Gross vs net · {rangeLabel}
            </p>
          </div>
          <GrossNetRevenueChart data={data.revenueTrend} height={300} />
        </section>

        <section className="rounded-2xl bg-[var(--color-surface)] p-4 sm:p-5 ring-1 ring-[var(--color-border)]">
          <div className="mb-2">
            <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">Revenue by category</h2>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">Paid order line items</p>
          </div>
          <AdminDonutChart
            data={categoryChart}
            height={200}
            emptyLabel="No category data"
            formatValue={(v) => formatAdminAmount(v, ADMIN_PRIMARY_CURRENCY, ADMIN_PRIMARY_CURRENCY)}
          />
          <ul className="mt-3 space-y-2">
            {data.revenueByCategory.length === 0 ? (
              <li className="text-[12px] text-[var(--color-text-muted)]">No sales by category yet.</li>
            ) : (
              data.revenueByCategory.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: c.color }}
                    />
                    <span className="truncate capitalize text-[var(--color-text-secondary)]">{c.name}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--color-text-primary)] shrink-0">
                    {c.revenueDisplay}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
              Revenue breakdown table
            </h2>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              Daily totals · {rangeLabel}
            </p>
          </div>
          <Link href="/admin/orders" className="text-[12px] font-medium text-[var(--color-accent)] hover:underline">
            See all orders
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-[var(--color-surface-secondary)]/50 text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium text-right">Orders</th>
                <th className="px-3 py-2.5 font-medium text-right">Gross revenue</th>
                <th className="px-3 py-2.5 font-medium text-right">Discounts</th>
                <th className="px-3 py-2.5 font-medium text-right">Refunds</th>
                <th className="px-4 py-2.5 font-medium text-right">Net revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.dailyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[var(--color-text-muted)]">
                    No paid revenue in this period.
                  </td>
                </tr>
              ) : (
                data.dailyBreakdown.map((row) => (
                  <tr
                    key={row.dateKey}
                    className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-secondary)]/40"
                  >
                    <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">
                      {row.dateLabel}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-text-secondary)]">
                      {row.orders}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-text-primary)]">
                      {row.grossDisplay}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">
                      {row.discountsDisplay}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rose-600">
                      {row.refundsDisplay}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {row.netDisplay}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border)]">
          <h2 className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
            Orders by fulfillment status
          </h2>
          <ul className="space-y-2">
            {data.ordersByStatus.length === 0 ? (
              <li className="text-[12px] text-[var(--color-text-muted)]">No orders in this period.</li>
            ) : (
              data.ordersByStatus.map((row) => (
                <li key={row.key} className="flex items-center justify-between text-[12px]">
                  <span className="capitalize text-[var(--color-text-secondary)]">{row.label}</span>
                  <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{row.count}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border)]">
          <h2 className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
            Orders by payment status
          </h2>
          <ul className="space-y-2">
            {data.ordersByPayment.length === 0 ? (
              <li className="text-[12px] text-[var(--color-text-muted)]">No payment activity recorded.</li>
            ) : (
              data.ordersByPayment.map((row) => (
                <li key={row.key} className="flex items-center justify-between text-[12px]">
                  <span className="capitalize text-[var(--color-text-secondary)]">{row.label}</span>
                  <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{row.count}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Top vendors by revenue</h2>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{rangeLabel} · paid orders only</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-[var(--color-surface-secondary)]/50 text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="px-3 py-2.5 font-medium">Vendor</th>
                <th className="px-3 py-2.5 font-medium text-right">Orders</th>
                <th className="px-3 py-2.5 font-medium text-right">Revenue</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {data.topVendors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[12px] text-[var(--color-text-muted)]">
                    No vendor revenue in this window yet.
                  </td>
                </tr>
              ) : (
                data.topVendors.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-secondary)]/40"
                  >
                    <td className="px-3 py-2.5 font-medium text-[var(--color-text-primary)]">{v.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-text-secondary)]">
                      {v.orders}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {v.revenueDisplay}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={`/admin/vendors/${v.id}`}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                      >
                        <ArrowUpRight className="inline h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {data.summary.pendingUgcReports > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/25 bg-amber-500/5 px-4 py-3">
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-text-primary)]">{data.summary.pendingUgcReports}</span>{" "}
            UGC content reports need review.
          </p>
          <Link href="/admin/verifications?tab=reports" className={adminBtnPrimary}>
            Open moderation queue
          </Link>
        </div>
      )}
    </div>
  );
}
