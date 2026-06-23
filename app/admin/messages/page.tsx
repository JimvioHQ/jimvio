import Link from "next/link";
import { Suspense } from "react";
import { MessageSquare, Users, Clock } from "lucide-react";
import { getAdminMessages } from "@/services/admin/getAdminMessages";
import { AdminMessagesToolbar } from "@/components/admin/admin-messages-toolbar";
import { PageHeader, EmptyState, Th } from "@/components/ui/admin";
import { Tile } from "@/components/ui/admin-server";
import { relativeTime } from "@/lib/utils";
import { adminTableShell } from "@/lib/admin/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function previewBody(body: string) {
  const t = body.trim();
  if (!t) return "—";
  return t.length > 90 ? `${t.slice(0, 88)}…` : t;
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const { rows, total, activeLast7d } = await getAdminMessages({
    q: params.q,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    if (params.q) u.set("q", params.q);
    if (page > 1) u.set("page", String(page));
    Object.entries(over).forEach(([k, v]) => {
      if (!v || (k === "page" && v === "1")) u.delete(k);
      else u.set(k, v);
    });
    const s = u.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Moderation"
        title="Messages"
        subtitle="Read-only overview of buyer–vendor threads. Message bodies stay private to participants."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Conversations" value={total.toLocaleString()} icon={MessageSquare} />
        <Tile label="Active (7d)" value={activeLast7d.toLocaleString()} icon={Clock} tone="success" />
        <Tile
          label="On this page"
          value={rows.length.toLocaleString()}
          sublabel={`Page ${page} of ${totalPages}`}
          icon={Users}
        />
      </div>

      <Suspense fallback={null}>
        <AdminMessagesToolbar />
      </Suspense>

      <div className={adminTableShell}>
        {rows.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-5 w-5 text-[var(--color-text-muted)]" />}
            title="No conversations found"
            message={params.q ? "Try a different search term." : "Threads will appear here once buyers contact vendors."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                  <Th>Buyer</Th>
                  <Th>Vendor</Th>
                  <Th>Last message</Th>
                  <Th>Messages</Th>
                  <Th>Updated</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-secondary)]/40"
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {row.buyer?.full_name ?? "Buyer"}
                      </p>
                      <p className="text-[10.5px] text-[var(--color-text-muted)]">{row.buyer?.email}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {row.vendor?.business_name ?? "—"}
                      </p>
                      {row.vendor?.business_slug && (
                        <p className="text-[10.5px] text-[var(--color-text-muted)]">/{row.vendor.business_slug}</p>
                      )}
                    </td>
                    <td className="max-w-[280px] px-3 py-2.5 text-[var(--color-text-secondary)]">
                      {previewBody(row.last_message?.body ?? "")}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--color-text-secondary)]">
                      {row.message_count}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--color-text-muted)]">
                      {relativeTime(row.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-[12px]">
            <span className="text-[var(--color-text-muted)]">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/messages${qs({ page: String(page - 1) })}`}
                  className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/messages${qs({ page: String(page + 1) })}`}
                  className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
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
