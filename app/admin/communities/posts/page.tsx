import Link from "next/link";
import { PageHeader } from "@/components/ui/admin";
import { adminBtnSecondary, adminInputClass, adminTableShell } from "@/lib/admin/ui";
import { moderateCommunityCommentAction, moderateCommunityPostAction } from "@/lib/admin/portal-actions";
import { getAdminDB } from "@/services/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AdminCommunityPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; page?: string; cpage?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const safe = q.replace(/[%_,]/g, "");
  const state = params.state === "archived" || params.state === "published" ? params.state : "all";
  const page = Math.max(1, Number(params.page) || 1);
  const cpage = Math.max(1, Number(params.cpage) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const cfrom = (cpage - 1) * PAGE_SIZE;

  let postsQuery = getAdminDB()
    .from("community_posts")
    .select("id, title, community_id, is_published, archived_at, comment_count, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (safe) postsQuery = postsQuery.ilike("title", `%${safe}%`);
  if (state === "archived") postsQuery = postsQuery.not("archived_at", "is", null);
  if (state === "published") postsQuery = postsQuery.is("archived_at", null).eq("is_published", true);

  let commentsQuery = getAdminDB()
    .from("community_post_comments")
    .select("id, post_id, body, is_published, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(cfrom, cfrom + PAGE_SIZE - 1);
  if (safe) commentsQuery = commentsQuery.ilike("body", `%${safe}%`);

  const [posts, comments] = await Promise.all([postsQuery, commentsQuery]);
  const postRows = posts.data ?? [];
  const commentRows = comments.data ?? [];
  const postTotal = posts.count ?? 0;
  const commentTotal = comments.count ?? 0;
  const query = `q=${encodeURIComponent(q)}&state=${state}`;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Community" title="Posts and comments" subtitle="Archive a post or hide a comment. Records stay in place for moderation history." />
      <form className="flex flex-wrap gap-2" action="/admin/communities/posts">
        <input name="q" defaultValue={q} placeholder="Search post title or comment" className={adminInputClass} />
        <select name="state" defaultValue={state} className={adminInputClass}>
          <option value="all">All posts</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <button className={adminBtnSecondary} type="submit">Filter</button>
      </form>
      {posts.error || comments.error ? <p className="text-sm text-rose-600">Some community content could not be loaded.</p> : null}
      <div className="space-y-2">
        <p className="text-xs text-[var(--color-text-muted)]">{postTotal} posts</p>
        <div className={adminTableShell}>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr><th className="px-4 py-3">Post</th><th className="px-4 py-3">Comments</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Action</th></tr>
            </thead>
            <tbody>
              {postRows.map((row) => (
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
              {postRows.length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={4}>No posts match this filter.</td></tr> : null}
            </tbody>
          </table>
        </div>
        {page > 1 || from + postRows.length < postTotal ? (
          <div className="flex gap-3 text-sm">
            {page > 1 ? <Link href={`/admin/communities/posts?${query}&page=${page - 1}&cpage=${cpage}`}>Previous posts</Link> : null}
            {from + postRows.length < postTotal ? <Link href={`/admin/communities/posts?${query}&page=${page + 1}&cpage=${cpage}`}>Next posts</Link> : null}
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <p className="text-xs text-[var(--color-text-muted)]">{commentTotal} comments</p>
        <div className={adminTableShell}>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr><th className="px-4 py-3">Comment</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Action</th></tr>
            </thead>
            <tbody>
              {commentRows.map((row) => (
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
              {commentRows.length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={3}>No comments match this filter.</td></tr> : null}
            </tbody>
          </table>
        </div>
        {cpage > 1 || cfrom + commentRows.length < commentTotal ? (
          <div className="flex gap-3 text-sm">
            {cpage > 1 ? <Link href={`/admin/communities/posts?${query}&page=${page}&cpage=${cpage - 1}`}>Previous comments</Link> : null}
            {cfrom + commentRows.length < commentTotal ? <Link href={`/admin/communities/posts?${query}&page=${page}&cpage=${cpage + 1}`}>Next comments</Link> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
