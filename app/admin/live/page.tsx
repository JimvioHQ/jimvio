import Link from "next/link";
import { PageHeader } from "@/components/ui/admin";
import { adminBtnSecondary, adminInputClass, adminTableShell } from "@/lib/admin/ui";
import { endLiveAction } from "@/lib/admin/portal-actions";
import { getAdminDB } from "@/services/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

export default async function AdminLivePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status === "live" || params.status === "ended" ? params.status : "all";
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  let query = getAdminDB()
    .from("live_sessions")
    .select("id, title, status, host_id, community_id, viewer_count, started_at, scheduled_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (status !== "all") query = query.eq("status", status);
  const { data, count, error } = await query;
  const rows = data ?? [];
  const total = count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Community" title="Live sessions" subtitle="Active and recent sessions. Stream keys are not shown. Ending a session uses the existing live finalizer." />
      <form className="flex gap-2" action="/admin/live">
        <select name="status" defaultValue={status} className={adminInputClass}>
          <option value="all">All</option>
          <option value="live">Live</option>
          <option value="ended">Ended</option>
        </select>
        <button className={adminBtnSecondary} type="submit">Filter</button>
      </form>
      {error ? <p className="text-sm text-rose-600">Live sessions could not be loaded.</p> : null}
      <div className={adminTableShell}>
        <table className="w-full text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Viewers</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3">
                  <p className="font-medium">{row.title}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{row.started_at ?? row.scheduled_at ?? "Not started"}</p>
                </td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3 tabular-nums">{row.viewer_count}</td>
                <td className="px-4 py-3">
                  {row.status === "live" ? (
                    <form action={endLiveAction} className="flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={row.id} />
                      <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                      <button className={adminBtnSecondary} type="submit">End live</button>
                    </form>
                  ) : (
                    <span className="text-[var(--color-text-muted)]">No end action</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={4}>No sessions match this filter.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{total} sessions</p>
      {page > 1 || from + rows.length < total ? (
        <div className="flex gap-3 text-sm">
          {page > 1 ? <Link href={`/admin/live?page=${page - 1}&status=${status}`}>Previous</Link> : null}
          {from + rows.length < total ? <Link href={`/admin/live?page=${page + 1}&status=${status}`}>Next</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
