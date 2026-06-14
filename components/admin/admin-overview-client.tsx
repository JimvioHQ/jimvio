"use client";

import React from "react";
import Link from "next/link";
import {
    UsersRound,
    Store,
    Boxes,
    ClipboardList,
    TrendingUp,
    Package,
    ArrowRight,
    Activity,
    Mail,
    MailX,
} from "lucide-react";
import { PageHeader, StatusPill, RowArrow, Th, EmptyState } from "@/components/ui/admin";
import { Tile } from "@/components/ui/admin-tile";
import { AdminDonutChart, DonutLegend } from "@/components/charts/admin-donut-chart";
import { PaidRevenueChartSection } from "@/components/admin/paid-revenue-chart-section";
import { cn, relativeTime } from "@/lib/utils";
import { formatAdminMoney } from "@/lib/admin/format-money";
import { displayFulfillmentStatus } from "@/lib/payments/order-payment-utils";
import type { AdminDashboardData, DashboardAttentionItem } from "@/services/admin/getAdminDashboard";

function HealthPill({ score, label }: { score: number; label: AdminDashboardData["healthLabel"] }) {
    const styles = {
        healthy: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        degraded: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
        critical: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
    };

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ring-1 ring-inset capitalize",
            styles[label]
        )}>
            <Activity className="h-3 w-3" />
            {label} · {score}
        </span>
    );
}

function AttentionRow({ item }: { item: DashboardAttentionItem }) {
    const border =
        item.severity === "critical"
            ? "border-rose-500/25 bg-rose-500/[0.04]"
            : item.severity === "warn"
                ? "border-amber-500/25 bg-amber-500/[0.04]"
                : "border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40";

    return (
        <Link
            href={item.href}
            className={cn(
                "flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
                "hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)]/60",
                border
            )}
        >
            <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-md bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] text-[12px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                {item.count}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{item.label}</p>
                <p className="text-[11.5px] text-[var(--color-text-muted)] truncate">{item.detail}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
        </Link>
    );
}

function OpsRow({ label, value, href, highlight }: { label: string; value: number; href: string; highlight?: boolean }) {
    return (
        <Link
            href={href}
            className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-[var(--color-border)]/60 first:border-t-0 hover:bg-[var(--color-surface-secondary)]/40 transition-colors"
        >
            <span className="text-[12.5px] text-[var(--color-text-secondary)]">{label}</span>
            <span className={cn(
                "text-[13px] font-semibold tabular-nums",
                highlight && value > 0 ? "text-amber-600" : "text-[var(--color-text-primary)]"
            )}>
                {value.toLocaleString()}
            </span>
        </Link>
    );
}

function ShortcutsPanel() {
    const links = [
        { label: "Orders", href: "/admin/orders" },
        { label: "Products", href: "/admin/products" },
        { label: "Users", href: "/admin/users" },
        { label: "Vendors", href: "/admin/vendors" },
        { label: "Payments", href: "/admin/payments" },
        { label: "Verifications", href: "/admin/verifications" },
        { label: "Reports", href: "/admin/reports" },
        { label: "Settings", href: "/admin/settings" },
    ];

    return (
        <SectionShell title="Shortcuts">
            <div className="px-4 py-3 flex flex-wrap gap-x-3 gap-y-2">
                {links.map(({ label, href }) => (
                    <Link
                        key={href}
                        href={href}
                        className="text-[12.5px] text-[var(--color-text-secondary)] hover:text-orange-500 transition-colors"
                    >
                        {label}
                    </Link>
                ))}
            </div>
        </SectionShell>
    );
}

function SectionShell({
    title,
    action,
    children,
    className,
}: {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden", className)}>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)]/60">
                <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
                {action}
            </div>
            {children}
        </div>
    );
}

function DonutPanel({
    title,
    data,
    compact = false,
}: {
    title: string;
    data: AdminDashboardData["paymentStatusChart"];
    subtitle?: string;
    compact?: boolean;
}) {
    const total = data.reduce((s, d) => s + d.value, 0);

    if (compact) {
        return (
            <div className="px-3 py-3 min-w-0">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{title}</p>
                    {total > 0 && (
                        <span className="text-[10px] tabular-nums text-[var(--color-text-muted)] shrink-0">{total}</span>
                    )}
                </div>
                <div className="mx-auto w-full max-w-[120px]">
                    <AdminDonutChart data={data} height={88} emptyLabel="No data" />
                </div>
                <DonutLegend data={data} compact />
            </div>
        );
    }

    return (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</h3>
                {total > 0 && (
                    <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">{total} total</span>
                )}
            </div>
            <AdminDonutChart data={data} height={168} />
            <DonutLegend data={data} />
        </div>
    );
}

export function AdminOverviewClient({ data }: { data: AdminDashboardData }) {
    const revDeltaPositive = data.revenue30dDeltaPositive;
    const revDeltaLabel = data.revenue30dDeltaLabel;

    const updated = new Date(data.generatedAt).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className="space-y-6 pb-4">
            <PageHeader
                eyebrow="Admin · Overview"
                title="Dashboard"
                subtitle={`Last refreshed ${updated} · ${data.orders30d.toLocaleString()} orders in the last 30 days`}
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
                        <HealthPill score={data.healthScore} label={data.healthLabel} />
                        <Link
                            href="/admin/system-analysis"
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                        >
                            System analysis
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                }
            />

            {data.attentionItems.length > 0 && (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                            Needs attention
                        </p>
                        <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                            {data.attentionItems.length} item{data.attentionItems.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {data.attentionItems.slice(0, 6).map((item) => (
                            <AttentionRow key={item.id} item={item} />
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Tile
                    label="Revenue (30d)"
                    value={data.revenue30dDisplay}
                    sublabel={revDeltaLabel}
                    icon={TrendingUp}
                    tone={revDeltaPositive === false ? "warn" : revDeltaPositive === true ? "success" : "default"}
                />
                <Tile
                    label="Orders (30d)"
                    value={data.orders30d.toLocaleString()}
                    sublabel="All sources"
                    icon={ClipboardList}
                />
                <Tile
                    label="Users"
                    value={data.totalUsers.toLocaleString()}
                    sublabel={`+${data.newUsers7d} this week`}
                    icon={UsersRound}
                />
                <Tile
                    label="Vendors"
                    value={data.totalVendors.toLocaleString()}
                    sublabel={`${data.verifiedVendors} verified`}
                    icon={Store}
                />
                <Tile
                    label="Products"
                    value={data.totalProducts.toLocaleString()}
                    sublabel={`${data.activeProducts} active`}
                    icon={Boxes}
                />
                <Tile
                    label="To fulfill"
                    value={data.toFulfill.toLocaleString()}
                    sublabel="Paid · not shipped"
                    icon={Package}
                    tone={data.toFulfill > 0 ? "warn" : "default"}
                />
            </div>

            <PaidRevenueChartSection data={data.revenueChart} />

            <SectionShell title="Order breakdown (30d)">
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]/60">
                    <DonutPanel title="Payment status" data={data.paymentStatusChart} compact />
                    <DonutPanel title="Fulfillment" data={data.fulfillmentStatusChart} compact />
                    <DonutPanel title="Order source" data={data.orderSourceChart} compact />
                </div>
            </SectionShell>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:items-start">
                <SectionShell className="xl:col-span-2" title="Operations">
                    <div>
                        <OpsRow
                            label="Awaiting payment"
                            value={data.awaitingPayment}
                            href="/admin/orders?payment=pending"
                            highlight
                        />
                        <OpsRow
                            label="Paid · not shipped"
                            value={data.toFulfill}
                            href="/admin/orders?status=confirmed"
                            highlight
                        />
                        <OpsRow
                            label="Vendor reviews"
                            value={data.pendingVerifications}
                            href="/admin/verifications?tab=vendors"
                            highlight
                        />
                        <OpsRow
                            label="Pending payouts"
                            value={data.pendingPayouts}
                            href="/admin/payments"
                            highlight
                        />
                        <OpsRow
                            label="Failed payments (30d)"
                            value={data.failedPayments30d}
                            href="/admin/orders?payment=failed"
                        />
                        <OpsRow
                            label="Low stock SKUs"
                            value={data.lowStockProducts}
                            href="/admin/products"
                        />
                        <OpsRow
                            label="Webhooks failed (24h)"
                            value={data.webhookFailures24h}
                            href="/admin/payments/webhooks"
                            highlight
                        />
                    </div>
                </SectionShell>

                <div className="flex flex-col gap-4">
                    <SectionShell title="Email & webhooks">
                        <div className="divide-y divide-[var(--color-border)]/60">
                            <div className="px-4 py-3 flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
                                {data.emailEnabled ? (
                                    <>
                                        <Mail className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                        Transactional email is active
                                    </>
                                ) : (
                                    <>
                                        <MailX className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                        Email not configured
                                    </>
                                )}
                            </div>
                            <div className="px-4 py-2.5 flex items-center justify-between gap-3 border-t border-[var(--color-border)]/60 text-[12.5px]">
                                <span className="text-[var(--color-text-secondary)]">Webhook success (24h)</span>
                                <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                                    {data.webhookSuccess24h.toFixed(0)}%
                                </span>
                            </div>
                            <OpsRow
                                label="Webhook failures (24h)"
                                value={data.webhookFailures24h}
                                href="/admin/payments/webhooks"
                                highlight
                            />
                        </div>
                    </SectionShell>

                    <ShortcutsPanel />
                </div>
            </div>

            <div className={cn(
                "grid grid-cols-1 gap-4 lg:items-start",
                data.pendingVendors.length > 0 ? "lg:grid-cols-3" : "lg:grid-cols-1"
            )}>
                <SectionShell
                    className={data.pendingVendors.length > 0 ? "lg:col-span-2" : undefined}
                    title="Recent orders"
                    action={
                        <Link href="/admin/orders" className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
                            All orders →
                        </Link>
                    }
                >
                    {data.recentOrders.length === 0 ? (
                        <EmptyState
                            icon={<ClipboardList className="h-5 w-5 text-[var(--color-text-muted)]" />}
                            title="No orders yet"
                            message="New checkout activity will show up here."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12.5px]">
                                <thead className="bg-[var(--color-surface-secondary)]/50">
                                    <tr>
                                        <Th>Order</Th>
                                        <Th>Buyer</Th>
                                        <Th>Vendor</Th>
                                        <Th align="right">Total</Th>
                                        <Th>Payment</Th>
                                        <Th>Fulfillment</Th>
                                        <Th>When</Th>
                                        <Th>{""}</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.recentOrders.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-secondary)]/40 transition-colors"
                                        >
                                            <td className="px-3 py-3 pl-5">
                                                <Link
                                                    href={`/admin/orders/${order.id}`}
                                                    className="font-mono text-[11px] text-[var(--color-text-primary)] hover:text-orange-500 transition-colors"
                                                >
                                                    {order.order_number}
                                                </Link>
                                            </td>
                                            <td className="px-3 py-3 min-w-0">
                                                <p className="truncate max-w-[140px] text-[var(--color-text-primary)]">{order.buyer_name}</p>
                                            </td>
                                            <td className="px-3 py-3 text-[var(--color-text-secondary)] truncate max-w-[120px]">
                                                {order.vendor_name ?? "—"}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums font-semibold text-[var(--color-text-primary)]">
                                                {formatAdminMoney(order.total_amount, order.currency)}
                                            </td>
                                            <td className="px-3 py-3">
                                                <StatusPill status={order.payment_status} />
                                            </td>
                                            <td className="px-3 py-3">
                                                <StatusPill status={displayFulfillmentStatus(order.status, order.payment_status)} />
                                            </td>
                                            <td className="px-3 py-3 text-[var(--color-text-muted)] whitespace-nowrap" title={order.created_at}>
                                                {relativeTime(order.created_at)}
                                            </td>
                                            <td className="px-3 py-3 pr-5 text-right">
                                                <RowArrow href={`/admin/orders/${order.id}`} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionShell>

                {data.pendingVendors.length > 0 && (
                    <div className="flex flex-col gap-4">
                        <SectionShell
                            title="Vendor queue"
                            action={
                                <Link href="/admin/verifications?tab=vendors" className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
                                    Review →
                                </Link>
                            }
                        >
                            <div className="divide-y divide-[var(--color-border)]/60">
                                {data.pendingVendors.map((v) => (
                                    <Link
                                        key={v.id}
                                        href={`/admin/vendors/${v.id}`}
                                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-surface-secondary)]/40 transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{v.business_name}</p>
                                            <p className="text-[11px] text-[var(--color-text-muted)]">
                                                {[v.business_country, v.created_at ? relativeTime(v.created_at) : null].filter(Boolean).join(" · ")}
                                            </p>
                                        </div>
                                        <StatusPill status="pending" />
                                    </Link>
                                ))}
                            </div>
                        </SectionShell>
                    </div>
                )}
            </div>
        </div>
    );
}
