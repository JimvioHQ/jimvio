"use client";

import React from "react";
import Link from "next/link";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Circle,
    ExternalLink,
    Server,
    Webhook,
    Wallet,
    Package,
    XCircle,
} from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { formatAdminMoney } from "@/lib/admin/format-money";
import type { SystemAnalysisData } from "@/services/admin/getSystemAnalysis";

function HealthBadge({ score, label }: { score: number; label: SystemAnalysisData["healthLabel"] }) {
    const styles = {
        healthy: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
        degraded: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
        critical: "bg-rose-500/10 text-rose-700 ring-rose-500/20",
    };

    return (
        <div className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2 ring-1 ring-inset", styles[label])}>
            <Activity className="h-4 w-4" />
            <span className="text-[13px] font-semibold capitalize">{label}</span>
            <span className="text-[12px] tabular-nums opacity-80">· {score}/100</span>
        </div>
    );
}

function SectionCard({
    title,
    icon,
    children,
    action,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)]/60 bg-[var(--color-surface-secondary)]/40">
                <div className="flex items-center gap-2">
                    <span className="text-[var(--color-text-muted)]">{icon}</span>
                    <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                        {title}
                    </h2>
                </div>
                {action}
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

function MetricTile({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
    return (
        <div
            className={cn(
                "rounded-lg border p-3",
                alert
                    ? "border-rose-500/20 bg-rose-500/[0.03]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-secondary)]/30"
            )}
        >
            <p className="text-[22px] font-bold tabular-nums text-[var(--color-text-primary)] leading-none">{value}</p>
            <p className="mt-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">{label}</p>
            {sub && <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]/70">{sub}</p>}
        </div>
    );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
    const pct = max > 0 ? Math.round((count / max) * 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="capitalize text-[var(--color-text-secondary)]">{label.replace(/_/g, " ")}</span>
                <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-border)]/60 overflow-hidden">
                <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function IntegrationRow({
    label,
    status,
    detail,
    category,
}: {
    label: string;
    status: "ok" | "missing" | "partial";
    detail: string;
    category: string;
}) {
    const Icon = status === "ok" ? CheckCircle2 : status === "partial" ? AlertTriangle : XCircle;
    const color =
        status === "ok"
            ? "text-emerald-600"
            : status === "partial"
                ? "text-amber-600"
                : "text-rose-500";

    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-[var(--color-border)]/50 last:border-0">
            <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", color)} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-[var(--color-text-primary)]">{label}</span>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{category}</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 truncate">{detail}</p>
            </div>
        </div>
    );
}

export function SystemAnalysisClient({ data }: { data: SystemAnalysisData }) {
    const maxOrderStatus = Math.max(...data.orderStatusCounts.map((r) => r.count), 1);
    const maxPaymentStatus = Math.max(...data.paymentStatusCounts.map((r) => r.count), 1);

    const alerts = [
        data.unresolvedFailedCredits > 0 && {
            title: `${data.unresolvedFailedCredits} unresolved vendor credit failures`,
            href: "/admin/payments/failed-credits",
        },
        data.stuckPendingPayments > 0 && {
            title: `${data.stuckPendingPayments} orders pending payment > 24h`,
            href: "/admin/orders?payment=pending",
        },
        data.webhooks24h.failed > 0 && {
            title: `${data.webhooks24h.failed} webhook failures in 24h`,
            href: "/admin/payments/webhooks?status=failed",
        },
        data.cjOrdersWithoutTracking > 0 && {
            title: `${data.cjOrdersWithoutTracking} CJ orders shipped/processing without tracking`,
            href: "/admin/orders",
        },
    ].filter(Boolean) as Array<{ title: string; href: string }>;

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1.5">
                        Admin · System
                    </p>
                    <h1 className="text-[22px] font-medium tracking-tight text-[var(--color-text-primary)]">
                        System analysis
                    </h1>
                    <p className="text-[13px] text-[var(--color-text-muted)] mt-1">
                        Platform health, integrations, and operational signals · updated {relativeTime(data.generatedAt)}
                    </p>
                </div>
                <HealthBadge score={data.healthScore} label={data.healthLabel} />
            </div>

            {alerts.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-[13px] font-semibold">Attention needed</span>
                    </div>
                    <ul className="space-y-1.5">
                        {alerts.map((a) => (
                            <li key={a.href}>
                                <Link
                                    href={a.href}
                                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
                                >
                                    {a.title}
                                    <ExternalLink className="h-3 w-3" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricTile label="Orders (30d)" value={String(data.orders30d)} />
                <MetricTile
                    label="Revenue (30d)"
                    value={data.revenue30dDisplay}
                />
                <MetricTile label="New users (7d)" value={String(data.newUsers7d)} />
                <MetricTile
                    label="Webhook success (24h)"
                    value={`${data.webhooks24h.successRate.toFixed(1)}%`}
                    sub={`${data.webhooks24h.completed}/${data.webhooks24h.total} completed`}
                    alert={data.webhooks24h.successRate < 90 && data.webhooks24h.total > 0}
                />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <SectionCard title="Order pipeline (30d)" icon={<Package className="h-4 w-4" />}>
                    {data.orderStatusCounts.length === 0 ? (
                        <p className="text-[13px] text-[var(--color-text-muted)]">No orders in the last 30 days.</p>
                    ) : (
                        <div className="space-y-3">
                            {data.orderStatusCounts.map((row) => (
                                <BarRow key={row.key} label={row.key} count={row.count} max={maxOrderStatus} />
                            ))}
                        </div>
                    )}
                </SectionCard>

                <SectionCard title="Payment status (30d)" icon={<Wallet className="h-4 w-4" />}>
                    {data.paymentStatusCounts.length === 0 ? (
                        <p className="text-[13px] text-[var(--color-text-muted)]">No payment activity in the last 30 days.</p>
                    ) : (
                        <div className="space-y-3">
                            {data.paymentStatusCounts.map((row) => (
                                <BarRow key={row.key} label={row.key} count={row.count} max={maxPaymentStatus} />
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
                <SectionCard
                    title="Integrations"
                    icon={<Server className="h-4 w-4" />}
                    action={
                        <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">
                            {data.integrationsOk}/{data.integrationsTotal} ok
                        </span>
                    }
                >
                    <div className="max-h-[320px] overflow-y-auto">
                        {data.integrations.map((item) => (
                            <IntegrationRow key={item.id} {...item} />
                        ))}
                    </div>
                </SectionCard>

                <SectionCard
                    title="Webhooks"
                    icon={<Webhook className="h-4 w-4" />}
                    action={
                        <Link href="/admin/payments/webhooks" className="text-[11px] font-medium text-[var(--color-accent)] hover:underline">
                            View all
                        </Link>
                    }
                >
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <MetricTile
                            label="24h failed"
                            value={String(data.webhooks24h.failed)}
                            alert={data.webhooks24h.failed > 0}
                        />
                        <MetricTile label="7d failed" value={String(data.webhooks7d.failed)} alert={data.webhooks7d.failed > 5} />
                    </div>
                    {Object.keys(data.webhooks7d.byProvider).length === 0 ? (
                        <p className="text-[12px] text-[var(--color-text-muted)]">No webhook events in 7 days.</p>
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(data.webhooks7d.byProvider)
                                .sort((a, b) => b[1].failed - a[1].failed)
                                .map(([provider, stats]) => (
                                    <div key={provider} className="flex items-center justify-between text-[12px]">
                                        <span className="capitalize text-[var(--color-text-secondary)]">{provider}</span>
                                        <span className="tabular-nums text-[var(--color-text-muted)]">
                                            {stats.failed}/{stats.total} failed
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </SectionCard>

                <SectionCard title="Fulfillment & ops" icon={<Circle className="h-4 w-4" />}>
                    <div className="grid grid-cols-2 gap-3">
                        <MetricTile
                            label="Paid, not shipped"
                            value={String(data.paidUnfulfilledOrders)}
                            alert={data.paidUnfulfilledOrders > 0}
                        />
                        <MetricTile
                            label="Stale checkout"
                            value={String(data.stuckPendingPayments)}
                            sub="Pending > 24h"
                            alert={data.stuckPendingPayments > 0}
                        />
                        <MetricTile label="Active CJ orders" value={String(data.cjOrdersActive)} />
                        <MetricTile
                            label="CJ no tracking"
                            value={String(data.cjOrdersWithoutTracking)}
                            alert={data.cjOrdersWithoutTracking > 0}
                        />
                        <MetricTile
                            label="Failed credits"
                            value={String(data.unresolvedFailedCredits)}
                            sub={data.unresolvedFailedCreditsAmount > 0 ? formatAdminMoney(data.unresolvedFailedCreditsAmount) : undefined}
                            alert={data.unresolvedFailedCredits > 0}
                        />
                        <MetricTile label="Total catalog" value={String(data.overview.totalProducts)} sub="All products" />
                    </div>
                </SectionCard>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <SectionCard title="Recent failed webhooks" icon={<XCircle className="h-4 w-4" />}>
                    {data.recentFailedWebhooks.length === 0 ? (
                        <p className="text-[13px] text-[var(--color-text-muted)]">No recent webhook failures.</p>
                    ) : (
                        <ul className="space-y-3">
                            {data.recentFailedWebhooks.map((row) => (
                                <li key={row.id} className="text-[12px] border-b border-[var(--color-border)]/50 last:border-0 pb-3 last:pb-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium capitalize text-[var(--color-text-primary)]">{row.provider}</span>
                                        <span className="text-[var(--color-text-muted)]">{relativeTime(row.created_at)}</span>
                                    </div>
                                    <p className="text-[var(--color-text-muted)] mt-1 line-clamp-2">{row.error ?? "Unknown error"}</p>
                                    {row.order_id && (
                                        <Link href={`/admin/orders/${row.order_id}`} className="text-[var(--color-accent)] hover:underline mt-1 inline-block">
                                            View order
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard
                    title="Unresolved vendor credits"
                    icon={<AlertTriangle className="h-4 w-4" />}
                    action={
                        <Link href="/admin/payments/failed-credits" className="text-[11px] font-medium text-[var(--color-accent)] hover:underline">
                            Resolve
                        </Link>
                    }
                >
                    {data.recentFailedCredits.length === 0 ? (
                        <p className="text-[13px] text-[var(--color-text-muted)]">All vendor wallet credits are healthy.</p>
                    ) : (
                        <ul className="space-y-3">
                            {data.recentFailedCredits.map((row) => (
                                <li key={row.id} className="flex items-start justify-between gap-3 text-[12px] border-b border-[var(--color-border)]/50 last:border-0 pb-3 last:pb-0">
                                    <div className="min-w-0">
                                        <Link href={`/admin/orders/${row.order_id}`} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)]">
                                            #{row.order_number ?? row.order_id.slice(0, 8)}
                                        </Link>
                                        <p className="text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{row.reason ?? "Wallet credit failed"}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-semibold tabular-nums">{formatAdminMoney(row.amount, row.currency)}</p>
                                        <p className="text-[var(--color-text-muted)]">{relativeTime(row.created_at)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>
            </div>

            <div className="rounded-lg border border-[var(--color-border)]/60 px-4 py-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--color-text-muted)]">
                <span>{data.overview.totalUsers.toLocaleString()} users</span>
                <span>{data.overview.totalVendors.toLocaleString()} vendors</span>
                <span>{data.overview.totalOrders.toLocaleString()} orders (all time)</span>
                <span>{formatAdminMoney(data.overview.totalRevenue)} lifetime revenue</span>
                <Link href="/admin/settings" className="ml-auto text-[var(--color-accent)] hover:underline">
                    Platform settings →
                </Link>
            </div>
        </div>
    );
}
