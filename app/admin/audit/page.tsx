import Link from "next/link";
import { PageHeader } from "@/components/ui/admin";
import { adminBtnSecondary, adminInputClass, adminTableShell } from "@/lib/admin/ui";
import { getAdminDB } from "@/services/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  let query = getAdminDB()
    .from("admin_audit_events")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (q) query = query.or(`action.ilike.%${q.replace(/[%_,]/g, "")}%,entity_type.ilike.%${q.replace(/[%_,]/g, "")}%`);
  const { data, count, error } = await query;
  const rows = data ?? [];
  const total = count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="System" title="Audit log" subtitle="Administrative mutations already recorded. This view does not edit or delete audit rows." />
      <form className="flex gap-2" action="/admin/audit">
        <input name="q" defaultValue={q} placeholder="Action or entity type" className={adminInputClass} />
        <button className={adminBtnSecondary} type="submit">Search</button>
      </form>
      {error ? <p className="text-sm text-rose-600">Audit events could not be loaded.</p> : null}
      <div className={adminTableShell}>
        <table className="w-full text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Actor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--color-border)] align-top">
                <td className="px-4 py-3 whitespace-nowrap">{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td>
                <td className="px-4 py-3 font-medium">{row.action}</td>
                <td className="px-4 py-3">
                  <p>{row.entity_type}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{row.entity_id}</p>
                </td>
                <td className="px-4 py-3 text-[12px] text-[var(--color-text-secondary)]">
                  {row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) && typeof (row.metadata as { reason?: unknown }).reason === "string"
                    ? (row.metadata as { reason: string }).reason
                    : "—"}
                </td>
                <td className="px-4 py-3 text-[11px]">{row.actor_id}</td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={5}>No audit events match this search.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{total} audit events</p>
      {page > 1 || from + rows.length < total ? (
        <div className="flex gap-3 text-sm">
          {page > 1 ? <Link href={`/admin/audit?page=${page - 1}&q=${encodeURIComponent(q)}`}>Previous</Link> : null}
          {from + rows.length < total ? <Link href={`/admin/audit?page=${page + 1}&q=${encodeURIComponent(q)}`}>Next</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
