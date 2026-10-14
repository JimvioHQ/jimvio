import { PageHeader } from "@/components/ui/admin";
import { adminBtnSecondary, adminInputClass, adminTableShell } from "@/lib/admin/ui";
import { moderateCommunityCommentAction, moderateCommunityPostAction } from "@/lib/admin/portal-actions";
import { getAdminDB } from "@/services/db";

export const dynamic = "force-dynamic";

export default async function AdminCommunityPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const safe = q.replace(/[%_,]/g, "");
  let postsQuery = getAdminDB()
    .from("community_posts")
    .select("id, title, community_id, is_published, archived_at, comment_count, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (safe) postsQuery = postsQuery.ilike("title", `%${safe}%`);
  const commentsQuery = getAdminDB()
    .from("community_post_comments")
    .select("id, post_id, body, is_published, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  const [posts, comments] = await Promise.all([postsQuery, commentsQuery]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Community" title="Posts and comments" subtitle="Archive a post or hide a comment. Records stay in place for moderation history." />
      <form className="flex gap-2" action="/admin/communities/posts">
        <input name="q" defaultValue={q} placeholder="Search post title" className={adminInputClass} />
        <button className={adminBtnSecondary} type="submit">Search</button>
      </form>
      {posts.error || comments.error ? <p className="text-sm text-rose-600">Some community content could not be loaded.</p> : null}
      <div className={adminTableShell}>
        <table className="w-full text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr><th className="px-4 py-3">Post</th><th className="px-4 py-3">Comments</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Action</th></tr>
          </thead>
          <tbody>
            {(posts.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3">
                  <p className="font-medium">{row.title || "Untitled post"}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{row.created_at}</p>
                </td>
                <td className="px-4 py-3 tabular-nums">{row.comment_count ?? 0}</td>
                <td className="px-4 py-3">{row.archived_at ? "Archived" : row.is_published ? "Published" : "Unpublished"}</td>
                <td className="px-4 py-3">
                  <form action={moderateCommunityPostAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="archived" value={row.archived_at ? "0" : "1"} />
                    <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                    <button className={adminBtnSecondary} type="submit">{row.archived_at ? "Restore" : "Archive"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {(posts.data ?? []).length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={4}>No posts match this search.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className={adminTableShell}>
        <table className="w-full text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr><th className="px-4 py-3">Comment</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Action</th></tr>
          </thead>
          <tbody>
            {(comments.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3 max-w-md">
                  <p className="line-clamp-2">{row.body}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{row.created_at}</p>
                </td>
                <td className="px-4 py-3">{row.is_published === false ? "Hidden" : "Visible"}</td>
                <td className="px-4 py-3">
                  <form action={moderateCommunityCommentAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="published" value={row.is_published === false ? "1" : "0"} />
                    <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                    <button className={adminBtnSecondary} type="submit">{row.is_published === false ? "Restore" : "Hide"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {(comments.data ?? []).length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={3}>No recent comments.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
