import React from "react";
import Link from "next/link";
import { getAdminVendors } from "@/services/db";
import {
    Store, ArrowUpRight, TrendingUp, DollarSign,
    Users, Star, Clock, Download,
} from "lucide-react";
import { VendorRow } from "@/components/admin/vendors/vendor-data";
import { VendorsToolbar } from "@/components/admin/vendors/vendors-toolbar";
import { PageHeader, EmptyState, Th } from "@/components/ui/admin";

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
    const { q, status, sort } = await searchParams;
    const { vendors, total } = await getAdminVendors(q, 200);

    const statusFilter = status ?? "all";
    const sortKey = sort ?? "created_at";

    const filtered = (
        statusFilter === "all"
            ? vendors
            : vendors.filter((v: any) => v.verification_status === statusFilter)
    ).sort((a: any, b: any) => {
        switch (sortKey) {
            case "revenue":   return Number(b.total_revenue)  - Number(a.total_revenue);
            case "sales":     return Number(b.total_sales)    - Number(a.total_sales);
            case "rating":    return Number(b.rating)         - Number(a.rating);
            case "followers": return Number(b.follower_count) - Number(a.follower_count);
            case "products":  return Number(b.products_count) - Number(a.products_count);
            default:          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
    });

    const counts = {
        all:       vendors.length,
        pending:   vendors.filter((v: any) => v.verification_status === "pending").length,
        verified:  vendors.filter((v: any) => v.verification_status === "verified").length,
        rejected:  vendors.filter((v: any) => v.verification_status === "rejected").length,
        suspended: vendors.filter((v: any) => v.verification_status === "suspended").length,
    };

    const totalRevenue  = vendors.reduce((s: number, v: any) => s + Number(v.total_revenue  ?? 0), 0);
    const totalSales    = vendors.reduce((s: number, v: any) => s + Number(v.total_sales    ?? 0), 0);
    const featuredCount = vendors.filter((v: any) => v.is_featured).length;
    const avgRating     = vendors.length
        ? vendors.reduce((s: number, v: any) => s + Number(v.rating ?? 0), 0) / vendors.length
        : 0;

    function fmt(n: number) {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
        return String(n);
    }

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <PageHeader
                eyebrow="Platform"
                title="Vendors"
                subtitle={`${total} store${total !== 1 ? "s" : ""} registered`}
                actions={
                    <>
                        <button className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg text-[12px] font-medium border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
                            <Download className="h-3.5 w-3.5" />
                            Export
                        </button>
                        <Link
                            href="/admin/verifications?tab=vendors"
                            className="h-9 px-4 inline-flex items-center gap-1.5 rounded-lg text-[12px] font-semibold bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
                        >
                            Review queue
                            {counts.pending > 0 && (
                                <span className="bg-white/25 rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
                                    {counts.pending}
                                </span>
                            )}
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </>
                }
            />

            {/* ── Metric cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <MetricCard
                    icon={Store}
                    label="Total vendors"
                    value={fmt(counts.all)}
                    sub={`${counts.verified} verified`}
                    color="default"
                />
                <MetricCard
                    icon={DollarSign}
                    label="Total revenue"
                    value={`${fmt(totalRevenue)} RWF`}
                    sub="across all vendors"
                    color="success"
                />
                <MetricCard
                    icon={TrendingUp}
                    label="Total sales"
                    value={fmt(totalSales)}
                    sub="completed orders"
                    color="info"
                />
                <MetricCard
                    icon={Star}
                    label="Avg rating"
                    value={avgRating.toFixed(2)}
                    sub={`${featuredCount} featured`}
                    color="warning"
                />
                <MetricCard
                    icon={Clock}
                    label="Pending review"
                    value={String(counts.pending)}
                    sub="awaiting verification"
                    color="pending"
                />
            </div>

            {/* ── Toolbar (search + sort) — client component ── */}
            <VendorsToolbar
                initialQ={q ?? ""}
                initialSort={sortKey}
                status={statusFilter}
            />

            {/* ── Status tabs ── */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {(["all", "verified", "pending", "rejected", "suspended"] as const).map((s) => {
                    const active = statusFilter === s;
                    const label  = s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1);
                    return (
                        <Link
                            key={s}
                            href={`/admin/vendors?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}${sort ? `&sort=${sort}` : ""}`}
                            className={[
                                "h-7 px-3 inline-flex items-center gap-1.5 rounded-full text-[12px] font-medium transition-all select-none",
                                active
                                    ? "bg-[var(--color-text-primary)] text-[var(--color-surface)] ring-0"
                                    : "bg-[var(--color-surface)] ring-[0.5px] ring-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:ring-[var(--color-border-strong)]",
                            ].join(" ")}
                        >
                            {label}
                            <span className={[
                                "inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold tabular-nums",
                                active
                                    ? "bg-white/20 text-white"
                                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
                            ].join(" ")}>
                                {counts[s]}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {/* ── Results label ── */}
            {(q || statusFilter !== "all") && filtered.length > 0 && (
                <p className="text-[12px] text-[var(--color-text-muted)]">
                    Showing{" "}
                    <strong className="text-[var(--color-text-primary)] font-semibold">{filtered.length}</strong>{" "}
                    result{filtered.length !== 1 ? "s" : ""}
                    {q && (
                        <> for{" "}
                            <strong className="text-[var(--color-text-primary)] font-semibold">"{q}"</strong>
                        </>
                    )}
                </p>
            )}

            {/* ── Table ── */}
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
                {filtered.length === 0 ? (
                    <EmptyState
                        icon={<Store className="h-5 w-5 text-[var(--color-text-muted)]" />}
                        title={q ? `No vendors matching "${q}"` : "No vendors in this category"}
                        message="Try adjusting your search or filter."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60">
                                    <Th>Store</Th>
                                    <Th>Owner</Th>
                                    <Th>Products</Th>
                                    <Th>Revenue</Th>
                                    <Th>Sales</Th>
                                    <Th>Rating</Th>
                                    <Th>Status</Th>
                                    <Th>Joined</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]/60">
                                {filtered.map((v: any) => (
                                    <VendorRow key={v.id} v={v} last={false} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer */}
                {filtered.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                            Showing {filtered.length} of {total} vendor{total !== 1 ? "s" : ""}.{" "}
                            Approve or reject from the{" "}
                            <Link
                                href="/admin/verifications?tab=vendors"
                                className="text-[var(--color-accent)] hover:underline"
                            >
                                verification queue
                            </Link>.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

const METRIC_PALETTE = {
    default: {
        bg:     "bg-[var(--color-surface-secondary)]",
        border: "border-[var(--color-border)]",
        fg:     "text-[var(--color-text-primary)]",
        icon:   "text-[var(--color-text-muted)]",
    },
    success: {
        bg:     "bg-emerald-500/[0.06]",
        border: "border-emerald-500/20",
        fg:     "text-emerald-600 dark:text-emerald-400",
        icon:   "text-emerald-500",
    },
    info: {
        bg:     "bg-sky-500/[0.06]",
        border: "border-sky-500/20",
        fg:     "text-sky-600 dark:text-sky-400",
        icon:   "text-sky-500",
    },
    warning: {
        bg:     "bg-amber-500/[0.06]",
        border: "border-amber-500/25",
        fg:     "text-amber-700 dark:text-amber-400",
        icon:   "text-amber-500",
    },
    pending: {
        bg:     "bg-orange-500/[0.05]",
        border: "border-orange-500/20",
        fg:     "text-orange-600 dark:text-orange-400",
        icon:   "text-orange-500",
    },
} as const;

function MetricCard({
    icon: Icon, label, value, sub, color,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub: string;
    color: keyof typeof METRIC_PALETTE;
}) {
    const p = METRIC_PALETTE[color];
    return (
        <div className={`flex flex-col gap-2 p-3.5 rounded-xl border ${p.bg} ${p.border}`}>
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--color-text-muted)] font-medium">{label}</span>
                <Icon className={`h-3.5 w-3.5 shrink-0 ${p.icon}`} />
            </div>
            <p className={`text-[20px] font-bold tracking-tight leading-none tabular-nums ${p.fg}`}>
                {value}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)]">{sub}</p>
        </div>
    );
}