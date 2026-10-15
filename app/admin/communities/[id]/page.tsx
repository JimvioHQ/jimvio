import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/admin";
import { adminTableShell } from "@/lib/admin/ui";
import { communityPermanentDeleteAllowed, describeCommunityState } from "@/lib/admin/control-policy";
import { getAdminDB } from "@/services/db";

export const dynamic = "force-dynamic";

export default async function AdminCommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = getAdminDB();
  const [{ data: community }, { data: events }] = await Promise.all([
    admin
      .from("communities")
      .select("id, name, slug, owner_id, visibility_mode, is_active, archived_at, is_featured, member_count, post_count, created_at")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("admin_audit_events")
      .select("id, action, actor_id, metadata, created_at")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (!community) notFound();
  const deletion = communityPermanentDeleteAllowed({
    memberCount: community.member_count ?? 0,
    postCount: community.post_count ?? 0,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        title={community.name}
        subtitle={`${community.slug} · ${describeCommunityState(community)} · ${community.visibility_mode}`}
      />
      <p className="text-sm">
        <Link href="/admin/communities" className="underline">All communities</Link>
        {" · "}
        <Link href={`/admin/communities/posts?community=${community.id}`} className="underline">Posts</Link>
        {" · "}
        <Link href={`/admin/audit?q=community`} className="underline">Audit log</Link>
      </p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-[var(--color-text-muted)]">Owner</dt><dd className="font-mono text-xs">{community.owner_id}</dd></div>
        <div><dt className="text-[var(--color-text-muted)]">Members</dt><dd>{community.member_count ?? 0}</dd></div>
        <div><dt className="text-[var(--color-text-muted)]">Posts</dt><dd>{community.post_count ?? 0}</dd></div>
        <div><dt className="text-[var(--color-text-muted)]">Featured</dt><dd>{community.is_featured ? "Yes" : "No"}</dd></div>
      </dl>
      <p className="text-sm text-[var(--color-text-secondary)]">{deletion.ok ? "" : deletion.error}</p>
      <div className={adminTableShell}>
        <table className="w-full text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Actor</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((row) => (
              <tr key={row.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">{row.action}</td>
                <td className="px-4 py-3">
                  {row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) && typeof (row.metadata as { reason?: unknown }).reason === "string"
                    ? (row.metadata as { reason: string }).reason
                    : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-[11px]">{row.actor_id}</td>
              </tr>
            ))}
            {(events ?? []).length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={4}>No audit events for this community yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
