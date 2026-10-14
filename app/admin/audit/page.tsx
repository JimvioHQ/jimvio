import { PageHeader } from "@/components/ui/admin";
import { adminBtnSecondary, adminInputClass, adminTableShell } from "@/lib/admin/ui";
import { getAdminDB } from "@/services/db";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  let query = getAdminDB()
    .from("admin_audit_events")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (q) query = query.or(`action.ilike.%${q.replace(/[%_,]/g, "")}%,entity_type.ilike.%${q.replace(/[%_,]/g, "")}%`);
  const { data, error } = await query;

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
            {(data ?? []).map((row) => (
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
            {(data ?? []).length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={5}>No audit events match this search.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
