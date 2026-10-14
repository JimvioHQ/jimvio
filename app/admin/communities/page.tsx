import Link from "next/link";
import { PageHeader } from "@/components/ui/admin";
import { adminBtnSecondary, adminInputClass, adminTableShell } from "@/lib/admin/ui";
import { archiveCommunityAction, setCommunityFeaturedAction, setCommunityVisibilityAction } from "@/lib/admin/portal-actions";
import { getAdminDB } from "@/services/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AdminCommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const state = params.state === "archived" || params.state === "active" ? params.state : "all";
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  let query = getAdminDB()
    .from("communities")
    .select("id, name, slug, visibility_mode, is_active, archived_at, member_count, is_featured, owner_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (q) query = query.or(`name.ilike.%${q.replace(/[%_,]/g, "")}%,slug.ilike.%${q.replace(/[%_,]/g, "")}%`);
  if (state === "archived") query = query.not("archived_at", "is", null);
  if (state === "active") query = query.is("archived_at", null);
  const { data, count, error } = await query;
  const rows = data ?? [];
  const total = count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Community" title="Communities" subtitle="Real communities. Archive hides a community without deleting its members or posts." />
      <form className="flex flex-wrap gap-2" action="/admin/communities">
        <input name="q" defaultValue={q} placeholder="Search name or slug" className={adminInputClass} />
        <select name="state" defaultValue={state} className={adminInputClass}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <button className={adminBtnSecondary} type="submit">Filter</button>
      </form>
      {error ? <p className="text-sm text-rose-600">Communities could not be loaded.</p> : null}
      <div className={adminTableShell}>
        <table className="w-full text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Community</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{row.slug}</p>
                </td>
                <td className="px-4 py-3">{row.visibility_mode}</td>
                <td className="px-4 py-3 tabular-nums">{row.member_count ?? 0}</td>
                <td className="px-4 py-3">{row.is_featured ? "Yes" : "No"}</td>
                <td className="px-4 py-3">{row.archived_at ? "Archived" : row.is_active ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3 space-y-2">
                  <form action={archiveCommunityAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="archived" value={row.archived_at ? "0" : "1"} />
                    <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                    <button className={adminBtnSecondary} type="submit">{row.archived_at ? "Restore" : "Archive"}</button>
                  </form>
                  <form action={setCommunityFeaturedAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="featured" value={row.is_featured ? "0" : "1"} />
                    <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                    <button className={adminBtnSecondary} type="submit">{row.is_featured ? "Unfeature" : "Feature"}</button>
                  </form>
                  <form action={setCommunityVisibilityAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <select name="visibility" defaultValue={row.visibility_mode} className={adminInputClass}>
                      <option value="public">public</option>
                      <option value="private">private</option>
                      <option value="invite_only">invite_only</option>
                      <option value="hidden">hidden</option>
                    </select>
                    <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                    <button className={adminBtnSecondary} type="submit">Save visibility</button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={6}>No communities match this filter.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{total} communities</p>
      {page > 1 || from + rows.length < total ? (
        <div className="flex gap-3 text-sm">
          {page > 1 ? <Link href={`/admin/communities?page=${page - 1}&q=${encodeURIComponent(q)}&state=${state}`}>Previous</Link> : null}
          {from + rows.length < total ? <Link href={`/admin/communities?page=${page + 1}&q=${encodeURIComponent(q)}&state=${state}`}>Next</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
