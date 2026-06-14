import React from "react";
import Link from "next/link";
import { getAdminVendors } from "@/services/db";
import { formatAdminWalletMoney } from "@/lib/admin/format-money";
import {
    Store, ArrowUpRight, TrendingUp, DollarSign,
    Star, Clock, Download,
} from "lucide-react";
import { VendorRow } from "@/components/admin/vendors/vendor-data";
import { VendorsToolbar } from "@/components/admin/vendors/vendors-toolbar";
import { PageHeader, EmptyState, Th } from "@/components/ui/admin";
import { Tile } from "@/components/ui/admin-server";

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
            case "rating":    return Number(b.rating)         - Number(b.rating);
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

    return (
        <div className="space-y-6">

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

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Tile
                    label="Total vendors"
                    value={counts.all.toLocaleString()}
                    sublabel={`${counts.verified} verified`}
                    icon={Store}
                />
                <Tile
                    label="Total revenue"
                    value={formatAdminWalletMoney(totalRevenue)}
                    sublabel="Across all vendors"
                    icon={DollarSign}
                    tone="success"
                />
                <Tile
                    label="Total sales"
                    value={totalSales.toLocaleString()}
                    sublabel="Completed orders"
                    icon={TrendingUp}
                />
                <Tile
                    label="Avg rating"
                    value={avgRating.toFixed(2)}
                    sublabel={`${featuredCount} featured`}
                    icon={Star}
                    tone={avgRating >= 4 ? "success" : "default"}
                />
                <Tile
                    label="Pending review"
                    value={counts.pending.toLocaleString()}
                    sublabel="Awaiting verification"
                    icon={Clock}
                    tone={counts.pending > 0 ? "warn" : "default"}
                />
            </div>

            <VendorsToolbar
                initialQ={q ?? ""}
                initialSort={sortKey}
                status={statusFilter}
            />

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

            {(q || statusFilter !== "all") && filtered.length > 0 && (
                <p className="text-[12px] text-[var(--color-text-muted)]">
                    Showing{" "}
                    <strong className="text-[var(--color-text-primary)] font-semibold">{filtered.length}</strong>{" "}
                    result{filtered.length !== 1 ? "s" : ""}
                    {q && (
                        <> for{" "}
                            <strong className="text-[var(--color-text-primary)] font-semibold">&ldquo;{q}&rdquo;</strong>
                        </>
                    )}
                </p>
            )}

            <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden">
                {filtered.length === 0 ? (
                    <EmptyState
                        icon={<Store className="h-5 w-5 text-[var(--color-text-muted)]" />}
                        title={q ? `No vendors matching "${q}"` : "No vendors in this category"}
                        message="Try adjusting your search or filter."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12.5px]">
                                <thead className="bg-[var(--color-surface-secondary)]/50">
                                    <tr>
                                        <Th>Store</Th>
                                        <Th>Owner</Th>
                                        <Th>Products</Th>
                                        <Th>Revenue</Th>
                                        <Th>Sales</Th>
                                        <Th>Rating</Th>
                                        <Th>Status</Th>
                                        <Th>Joined</Th>
                                        <Th>{""}</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((v: any) => (
                                        <VendorRow key={v.id} v={v} last={false} />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-5 py-3 border-t border-[var(--color-border)]">
                            <p className="text-[11.5px] text-[var(--color-text-muted)]">
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
                    </>
                )}
            </div>
        </div>
    );
}
