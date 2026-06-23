import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { getAdminDisputes, type AdminDisputeType } from "@/services/admin/getAdminDisputes";
import { AdminDisputesTable } from "@/components/admin/admin-disputes-table";
import { AdminDisputesToolbar } from "@/components/admin/admin-disputes-toolbar";
import { PageHeader, EmptyState, FilterSegmentBar } from "@/components/ui/admin";
import { Tile } from "@/components/ui/admin-server";
import { adminTableShell } from "@/lib/admin/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

function resolveType(v: string | undefined): AdminDisputeType {
  if (v === "cj" || v === "refund" || v === "cancelled") return v;
  return "all";
}

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const type = resolveType(params.type);
  const status = params.status === "resolved" || params.status === "open" ? params.status : "all";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const { rows, total, openCount, cjCount, refundCount } = await getAdminDisputes({
    type,
    status: status as "all" | "open" | "resolved",
    q: params.q,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const baseQs = () => {
    const u = new URLSearchParams();
    if (type !== "all") u.set("type", type);
    if (status !== "all") u.set("status", status);
    if (params.q) u.set("q", params.q);
    return u;
  };

  const hrefWith = (over: Record<string, string>) => {
    const u = baseQs();
    Object.entries(over).forEach(([k, v]) => {
      if (!v || (k === "type" && v === "all") || (k === "status" && v === "all") || (k === "page" && v === "1")) {
        u.delete(k);
      } else {
        u.set(k, v);
      }
    });
    const s = u.toString();
    return `/admin/disputes${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Moderation"
        title="Disputes"
        subtitle="CJ disputes, refunds, and paid orders cancelled after checkout."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Open" value={openCount.toLocaleString()} icon={AlertTriangle} tone="warn" />
        <Tile label="CJ linked" value={cjCount.toLocaleString()} icon={AlertTriangle} />
        <Tile label="Refunds" value={refundCount.toLocaleString()} icon={AlertTriangle} tone="default" />
        <Tile label="Listed" value={total.toLocaleString()} sublabel="matching filters" icon={AlertTriangle} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <FilterSegmentBar
          aria-label="Dispute type"
          activeValue={type}
          items={[
            { value: "all", label: "All", href: hrefWith({ type: "all", page: "1" }), count: total },
            { value: "cj", label: "CJ", href: hrefWith({ type: "cj", page: "1" }), count: cjCount },
            { value: "refund", label: "Refunds", href: hrefWith({ type: "refund", page: "1" }), count: refundCount },
            { value: "cancelled", label: "Cancelled", href: hrefWith({ type: "cancelled", page: "1" }) },
          ]}
        />
        <FilterSegmentBar
          aria-label="Admin status"
          activeValue={status}
          items={[
            { value: "all", label: "Any status", href: hrefWith({ status: "all", page: "1" }) },
            { value: "open", label: "Open", href: hrefWith({ status: "open", page: "1" }) },
            { value: "resolved", label: "Resolved", href: hrefWith({ status: "resolved", page: "1" }) },
          ]}
        />
      </div>

      <Suspense fallback={null}>
        <AdminDisputesToolbar />
      </Suspense>

      <div className={adminTableShell}>
        {rows.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="h-5 w-5 text-[var(--color-text-muted)]" />}
            title="No disputes in this view"
            message="Disputes appear when CJ flags an order, a refund is issued, or a paid order is cancelled."
            action={
              <Link
                href="/admin/orders?payment=refunded"
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                Browse refunded orders
              </Link>
            }
          />
        ) : (
          <AdminDisputesTable rows={rows} />
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-[12px]">
            <span className="text-[var(--color-text-muted)]">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={hrefWith({ page: String(page - 1) })} className={cn("rounded-md border border-[var(--color-border)] px-3 py-1.5")}>
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={hrefWith({ page: String(page + 1) })} className={cn("rounded-md border border-[var(--color-border)] px-3 py-1.5")}>
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
