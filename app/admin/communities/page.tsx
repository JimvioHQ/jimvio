import Link from "next/link";
import { PageHeader } from "@/components/ui/admin";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { adminBtnSecondary, adminInputClass, adminTableShell } from "@/lib/admin/ui";
import { setCommunityFeaturedAction, setCommunityOperationAction, setCommunityVisibilityAction } from "@/lib/admin/portal-actions";
import { adminPageBounds, adminSearchTerm, describeCommunityState } from "@/lib/admin/control-policy";
import { getAdminDB } from "@/services/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const STATES = ["all", "active", "disabled", "archived", "featured"] as const;

export default async function AdminCommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const search = adminSearchTerm(q);
  const state = STATES.includes(params.state as (typeof STATES)[number]) ? params.state! : "all";
  const { page, from, to } = adminPageBounds(Number(params.page) || 1, PAGE_SIZE);
  let query = getAdminDB()
    .from("communities")
    .select("id, name, slug, visibility_mode, is_active, archived_at, member_count, post_count, is_featured, owner_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (search.uuid) {
    query = query.or(`id.eq.${search.uuid},owner_id.eq.${search.uuid},name.ilike.%${search.text}%,slug.ilike.%${search.text}%`);
  } else if (search.text) {
    query = query.or(`name.ilike.%${search.text}%,slug.ilike.%${search.text}%`);
  }
  if (state === "archived") query = query.not("archived_at", "is", null);
  if (state === "disabled") query = query.is("archived_at", null).eq("is_active", false);
  if (state === "active") query = query.is("archived_at", null).eq("is_active", true);
  if (state === "featured") query = query.eq("is_featured", true);
  const { data, count, error } = await query;
  const rows = data ?? [];
  const total = count ?? 0;
  const listQuery = `q=${encodeURIComponent(q)}&state=${state}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        title="Communities"
        subtitle="Disable stops access and keeps the data. Archive removes a community from active surfaces. Neither deletes members or posts."
      />
      <form className="flex flex-wrap gap-2" action="/admin/communities">
        <input name="q" defaultValue={q} placeholder="Search name, slug, or id" className={adminInputClass} />
        <select name="state" defaultValue={state} className={adminInputClass}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="archived">Archived</option>
          <option value="featured">Featured</option>
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
              <th className="px-4 py-3">Posts</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const label = describeCommunityState(row);
              return (
                <tr key={row.id} className="border-t border-[var(--color-border)] align-top">
                  <td className="px-4 py-3">
                    <Link href={`/admin/communities/${row.id}`} className="font-medium hover:underline">{row.name}</Link>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{row.slug}</p>
                  </td>
                  <td className="px-4 py-3">{row.visibility_mode}</td>
                  <td className="px-4 py-3 tabular-nums">{row.member_count ?? 0}</td>
                  <td className="px-4 py-3 tabular-nums">{row.post_count ?? 0}</td>
                  <td className="px-4 py-3">{row.is_featured ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{label}</td>
                  <td className="space-y-2 px-4 py-3">
                    <AdminActionForm action={setCommunityOperationAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="operation" value={row.archived_at ? "restore" : "archive"} />
                      <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                      <button className={adminBtnSecondary} type="submit">{row.archived_at ? "Restore archive" : "Archive"}</button>
                    </AdminActionForm>
                    <AdminActionForm action={setCommunityOperationAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="operation" value={row.is_active === false ? "enable" : "disable"} />
                      <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                      <button className={adminBtnSecondary} type="submit">{row.is_active === false ? "Enable" : "Disable"}</button>
                    </AdminActionForm>
                    <AdminActionForm action={setCommunityFeaturedAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="featured" value={row.is_featured ? "0" : "1"} />
                      <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                      <button className={adminBtnSecondary} type="submit">{row.is_featured ? "Unfeature" : "Feature"}</button>
                    </AdminActionForm>
                    <AdminActionForm action={setCommunityVisibilityAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <select name="visibility" defaultValue={row.visibility_mode} className={adminInputClass}>
                        <option value="public">public</option>
                        <option value="private">private</option>
                        <option value="invite_only">invite_only</option>
                        <option value="hidden">hidden</option>
                      </select>
                      <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                      <button className={adminBtnSecondary} type="submit">Save visibility</button>
                    </AdminActionForm>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={7}>No communities match this filter.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{total} communities</p>
      {page > 1 || from + rows.length < total ? (
        <div className="flex gap-3 text-sm">
          {page > 1 ? <Link href={`/admin/communities?${listQuery}&page=${page - 1}`}>Previous</Link> : null}
          {from + rows.length < total ? <Link href={`/admin/communities?${listQuery}&page=${page + 1}`}>Next</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
