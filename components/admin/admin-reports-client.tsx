"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { AdminReportsData } from "@/services/admin/getAdminReports";
import { ADMIN_RANGES } from "@/lib/admin/ranges";
import { adminBtnPrimary, adminBtnSecondary } from "@/lib/admin/ui";
import { cn } from "@/lib/utils";
import { AdminExportMenu } from "@/components/admin/admin-export-menu";

type Props = {
  data: AdminReportsData;
};

export function AdminReportsClient({ data }: Props) {
  const rangeLabel = ADMIN_RANGES[data.range].label;
  const exportQuery = data.range !== "mtd" ? `range=${data.range}` : "";

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
          <AdminExportMenu resource="reports" query={exportQuery} />
          <Link href="/admin/system-analysis" className={adminBtnSecondary}>
            System analysis
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

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
                  <tr key={v.id} className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-secondary)]/40">
                    <td className="px-3 py-2.5 font-medium text-[var(--color-text-primary)]">{v.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-text-secondary)]">{v.orders}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {v.revenueDisplay}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link href={`/admin/vendors/${v.id}`} className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]">
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
