import React from "react";
import Link from "next/link";
import { getAdminDB } from "@/services/db";
import { absoluteTime, cn, formatCurrency, relativeTime } from "@/lib/utils";
import {
    AlertTriangle, CheckCircle2, Wallet, XCircle,
} from "lucide-react";
import {
    PageHeader, EmptyState, FilterChip,
} from "@/components/ui/admin";
import { resolveFailedCreditAction } from "@/lib/actions/orders";
// import { resolveFailedCreditAction } from "./actions";

export const dynamic = "force-dynamic";

type FilterType = "unresolved" | "resolved" | "all";

export default async function FailedCreditsPage({
    searchParams,
}: {
    searchParams: Promise<{ filter?: FilterType; page?: string }>;
}) {
    const params = await searchParams;
    const filter = params.filter ?? "unresolved";
    const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
    const pageSize = 30;

    const admin = getAdminDB();

    // Auto-resolve invalid $0 / vendor-less failed credit rows (legacy CJ noise)
    await admin
        .from("failed_wallet_credits")
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq("resolved", false)
        .or("amount.eq.0,vendor_id.is.null");

    let query = admin
        .from("failed_wallet_credits")
        .select(
            `id, order_id, vendor_id, amount, currency, reason,
       resolved, resolved_at, created_at,
       vendors(business_name, business_slug),
       orders(order_number, total_amount, currency, payment_status)`,
            { count: "exact" }
        )
        .gt("amount", 0)
        .not("vendor_id", "is", null)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

    if (filter === "unresolved") query = query.eq("resolved", false);
    if (filter === "resolved") query = query.eq("resolved", true);

    const [{ data: rows, count }, { data: stats }] = await Promise.all([
        query,
        admin.from("failed_wallet_credits").select("resolved, amount, currency"),
    ]);

    const list = (rows ?? []) as any[];
    const statsList = (stats ?? []) as any[];

    const unresolvedCount = statsList.filter((s) => !s.resolved).length;
    const unresolvedTotal = statsList
        .filter((s) => !s.resolved)
        .reduce((sum, s) => sum + Number(s.amount ?? 0), 0);

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return (
        <div className="space-y-6">
            <Link
                href="/admin/payments"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
                ← Back to payments
            </Link>

            <PageHeader
                eyebrow="Admin · Payments"
                title="Failed vendor credits"
                subtitle="Orders paid by buyer, but vendor wallet wasn't credited automatically"
            />

            {/* Stat banner */}
            {unresolvedCount > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 ring-1 ring-rose-500/20">
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-[14px] font-semibold text-rose-700 dark:text-rose-300">
                            {unresolvedCount} unresolved · {formatCurrency(unresolvedTotal)} pending
                        </p>
                        <p className="text-[12px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                            Each row represents money the platform received but didn't pass to the vendor's wallet.
                            Resolve manually after confirming or move it via wallet adjustment.
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <FilterChip label={`Unresolved (${unresolvedCount})`} href="?filter=unresolved" active={filter === "unresolved"} />
                <FilterChip label="Resolved" href="?filter=resolved" active={filter === "resolved"} />
                <FilterChip label="All" href="?filter=all" active={filter === "all"} />
            </div>

            {/* Table */}
            <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden">
                {list.length === 0 ? (
                    <EmptyState
                        icon={filter === "unresolved" ? <Wallet /> : <XCircle />}
                        title="Nothing to fix"
                        message={filter === "unresolved" ? "All vendor credits have been processed." : "No records match this filter."}
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12.5px]">
                                <thead className="bg-[var(--color-surface-secondary)]/50">
                                    <tr>
                                        <Th>When</Th>
                                        <Th>Order</Th>
                                        <Th>Vendor</Th>
                                        <Th align="right">Amount</Th>
                                        <Th>Reason</Th>
                                        <Th>Status</Th>
                                        <Th>{""}</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.map((r: any) => {
                                        const vendor = Array.isArray(r.vendors) ? r.vendors[0] : r.vendors;
                                        const order = Array.isArray(r.orders) ? r.orders[0] : r.orders;
                                        return (
                                            <tr key={r.id} className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-secondary)]/40 transition-colors">
                                                <td className="px-3 py-3 pl-5 text-[var(--color-text-muted)] whitespace-nowrap" title={r.created_at}>
                                                    {relativeTime(r.created_at)}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {order ? (
                                                        <Link href={`/admin/orders/${r.order_id}`} className="font-mono text-[11px] text-[var(--color-text-primary)] hover:text-orange-500 transition-colors">
                                                            {order.order_number}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-[var(--color-text-muted)] text-[11px]">order deleted</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-[var(--color-text-secondary)] truncate max-w-[180px]">
                                                    {vendor?.business_name ?? "—"}
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                    <p className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                                                        {Number(r.amount).toLocaleString()} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">{r.currency}</span>
                                                    </p>
                                                </td>
                                                <td className="px-3 py-3 text-[11.5px] text-[var(--color-text-muted)] max-w-[300px]" title={r.reason ?? ""}>
                                                    {r.reason ?? "Unknown"}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {r.resolved ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Resolved
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-600">
                                                            <XCircle className="h-3 w-3" />
                                                            Unresolved
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 pr-5 text-right">
                                                    {!r.resolved && (
                                                        <form action={resolveFailedCreditAction}>
                                                            <input type="hidden" name="id" value={r.id} />
                                                            <button
                                                                type="submit"
                                                                className="text-[11px] font-medium text-orange-500 hover:text-orange-600 transition-colors"
                                                            >
                                                                Mark resolved
                                                            </button>
                                                        </form>
                                                    )}
                                                    {r.resolved && r.resolved_at && (
                                                        <span className="text-[10.5px] text-[var(--color-text-muted)]" title={absoluteTime(r.resolved_at)}>
                                                            {relativeTime(r.resolved_at)}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
                                <p className="text-[11.5px] text-[var(--color-text-muted)] tabular-nums">
                                    Page {page} of {totalPages}
                                </p>
                                <div className="flex items-center gap-1">
                                    {page > 1 && (
                                        <Link
                                            href={`?filter=${filter}&page=${page - 1}`}
                                            className="h-8 px-3 rounded-md text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                                        >
                                            Previous
                                        </Link>
                                    )}
                                    {page < totalPages && (
                                        <Link
                                            href={`?filter=${filter}&page=${page + 1}`}
                                            className="h-8 px-3 rounded-md text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                                        >
                                            Next
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
    return (
        <th className={cn(
            "font-medium text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] px-3 py-3",
            align === "right" ? "text-right" : "text-left",
        )}>{children}</th>
    );
}