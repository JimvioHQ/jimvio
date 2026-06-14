import React from "react";
import Link from "next/link";
import {
    getAdminVendors,
    type AdminVendorSort,
    type AdminVendorStatus,
} from "@/services/db";
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

const PAGE_SIZE = 30;

function resolveStatus(input: string | undefined): AdminVendorStatus {
    if (input === "pending" || input === "verified" || input === "rejected" || input === "suspended") {
        return input;
    }
    return "all";
}

function resolveSort(input: string | undefined): AdminVendorSort {
    const allowed: AdminVendorSort[] = [
        "created_at",
        "revenue",
        "sales",
        "rating",
        "followers",
        "products",
    ];
    return allowed.includes(input as AdminVendorSort) ? (input as AdminVendorSort) : "created_at";
}

export default async function AdminVendorsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string }>;
}) {
    const params = await searchParams;
    const q = (params.q ?? "").trim();
    const statusFilter = resolveStatus(params.status);
    const sortKey = resolveSort(params.sort);
    const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

    const qs = (over: Record<string, string> = {}) => {
        const u = new URLSearchParams();
        if (q) u.set("q", q);
        if (statusFilter !== "all") u.set("status", statusFilter);
        if (sortKey !== "created_at") u.set("sort", sortKey);
        if (page > 1) u.set("page", String(page));
        Object.entries(over).forEach(([key, value]) => {
            if (
                !value ||
                (key === "status" && value === "all") ||
                (key === "sort" && value === "created_at") ||
                (key === "page" && value === "1")
            ) {
                u.delete(key);
            } else {
                u.set(key, value);
            }
        });
        const s = u.toString();
        return s ? `?${s}` : "";
    };

    const { vendors, total, statusCounts, platformStats } = await getAdminVendors({
        query: q || undefined,
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter,
        sort: sortKey,
    });

    const totalPages = total ? Math.ceil(total / PAGE_SIZE) : 0;
    const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);

    return (
        <div className="space-y-6">

            <PageHeader
                eyebrow="Platform"
                title="Vendors"
                subtitle={`${total.toLocaleString()} store${total !== 1 ? "s" : ""} registered`}
                actions={
                    <>
                        <button className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-sm text-[12px] font-medium border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
                            <Download className="h-3.5 w-3.5" />
                            Export
                        </button>
                        <Link
                            href="/admin/verifications?tab=vendors"
                            className="h-9 px-4 inline-flex items-center gap-1.5 rounded-sm text-[12px] font-semibold bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
                        >
                            Review queue
                            {statusCounts.pending > 0 && (
                                <span className="bg-white/25 rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
                                    {statusCounts.pending}
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
                    value={statusCounts.all.toLocaleString()}
                    sublabel={`${statusCounts.verified} verified`}
                    icon={Store}
                />
                <Tile
                    label="Total revenue"
                    value={formatAdminWalletMoney(platformStats.totalRevenue)}
                    sublabel="Paid orders · RWF"
                    icon={DollarSign}
                    tone="success"
                />
                <Tile
                    label="Total sales"
                    value={platformStats.totalSales.toLocaleString()}
                    sublabel="Completed orders"
                    icon={TrendingUp}
                />
                <Tile
                    label="Avg rating"
                    value={platformStats.avgRating.toFixed(2)}
                    sublabel={`${platformStats.featuredCount} featured`}
                    icon={Star}
                    tone={platformStats.avgRating >= 4 ? "success" : "default"}
                />
                <Tile
                    label="Pending review"
                    value={statusCounts.pending.toLocaleString()}
                    sublabel="Awaiting verification"
                    icon={Clock}
                    tone={statusCounts.pending > 0 ? "warn" : "default"}
                />
            </div>

            <VendorsToolbar
                initialQ={q}
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
                            href={`/admin/vendors${qs({ status: s === "all" ? "" : s, page: "" })}`}
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
                                {statusCounts[s]}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {(q || statusFilter !== "all") && vendors.length > 0 && (
                <p className="text-[12px] text-[var(--color-text-muted)]">
                    Showing{" "}
                    <strong className="text-[var(--color-text-primary)] font-semibold">
                        {from.toLocaleString()}–{to.toLocaleString()}
                    </strong>{" "}
                    of{" "}
                    <strong className="text-[var(--color-text-primary)] font-semibold">{total.toLocaleString()}</strong>
                    {q && (
                        <> for{" "}
                            <strong className="text-[var(--color-text-primary)] font-semibold">&ldquo;{q}&rdquo;</strong>
                        </>
                    )}
                </p>
            )}

            <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden">
                {vendors.length === 0 ? (
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
                                    {vendors.map((v) => (
                                        <VendorRow key={v.id} v={v} last={false} />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
                            <p className="text-[11.5px] text-[var(--color-text-muted)] tabular-nums">
                                {totalPages > 1
                                    ? `Page ${page} of ${totalPages} · ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} vendors`
                                    : `${total.toLocaleString()} vendor${total !== 1 ? "s" : ""}`}
                                . Approve or reject from the{" "}
                                <Link
                                    href="/admin/verifications?tab=vendors"
                                    className="text-[var(--color-accent)] hover:underline"
                                >
                                    verification queue
                                </Link>.
                            </p>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    {page > 1 && (
                                        <Link
                                            href={`/admin/vendors${qs({ page: String(page - 1) })}`}
                                            className="h-8 px-3 rounded-md text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                                        >
                                            Previous
                                        </Link>
                                    )}
                                    {page < totalPages && (
                                        <Link
                                            href={`/admin/vendors${qs({ page: String(page + 1) })}`}
                                            className="h-8 px-3 rounded-md text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                                        >
                                            Next
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
