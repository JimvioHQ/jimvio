import Link from "next/link";
import { PageHeader } from "@/components/ui/admin";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { adminBtnSecondary, adminInputClass, adminTableShell } from "@/lib/admin/ui";
import { moderateCommentOperationAction, moderatePostOperationAction } from "@/lib/admin/portal-actions";
import { adminPageBounds, adminSearchTerm, describeCommentState, describePostState } from "@/lib/admin/control-policy";
import { getAdminDB } from "@/services/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const POST_STATES = ["all", "published", "hidden", "archived", "deleted"] as const;

export default async function AdminCommunityPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; page?: string; cpage?: string; community?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const search = adminSearchTerm(q);
  const community = adminSearchTerm(params.community ?? "").uuid;
  const state = POST_STATES.includes(params.state as (typeof POST_STATES)[number]) ? params.state! : "all";
  const { page, from, to } = adminPageBounds(Number(params.page) || 1, PAGE_SIZE);
  const comments = adminPageBounds(Number(params.cpage) || 1, PAGE_SIZE);

  let postsQuery = getAdminDB()
    .from("community_posts")
    .select("id, title, community_id, author_id, is_published, archived_at, hidden_at, deleted_at, comments_disabled, comment_count, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (community) postsQuery = postsQuery.eq("community_id", community);
  if (search.uuid) postsQuery = postsQuery.or(`id.eq.${search.uuid},author_id.eq.${search.uuid},community_id.eq.${search.uuid}`);
  else if (search.text) postsQuery = postsQuery.ilike("title", `%${search.text}%`);
  if (state === "archived") postsQuery = postsQuery.is("deleted_at", null).not("archived_at", "is", null);
  if (state === "published") postsQuery = postsQuery.is("archived_at", null).is("hidden_at", null).is("deleted_at", null).eq("is_published", true);
  if (state === "hidden") postsQuery = postsQuery.is("archived_at", null).is("deleted_at", null).not("hidden_at", "is", null);
  if (state === "deleted") postsQuery = postsQuery.not("deleted_at", "is", null);

  let commentsQuery = getAdminDB()
    .from("community_post_comments")
    .select("id, post_id, body, is_published, deleted_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(comments.from, comments.to);
  if (search.text && !search.uuid) commentsQuery = commentsQuery.ilike("body", `%${search.text}%`);
  if (search.uuid) commentsQuery = commentsQuery.or(`id.eq.${search.uuid},post_id.eq.${search.uuid},author_id.eq.${search.uuid}`);

  const [posts, commentResult] = await Promise.all([postsQuery, commentsQuery]);
  const postRows = posts.data ?? [];
  const commentRows = commentResult.data ?? [];
  const postTotal = posts.count ?? 0;
  const commentTotal = commentResult.count ?? 0;
  const query = `q=${encodeURIComponent(q)}&state=${state}${community ? `&community=${community}` : ""}`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Community"
        title="Posts and comments"
        subtitle="Hide removes a post from feeds. Archive keeps it out of active surfaces. Delete is a soft-delete and does not remove the community, members, or other posts."
      />
      <form className="flex flex-wrap gap-2" action="/admin/communities/posts">
        <input name="q" defaultValue={q} placeholder="Search title, comment, or id" className={adminInputClass} />
        <input name="community" defaultValue={community ?? ""} placeholder="Community id" className={adminInputClass} />
        <select name="state" defaultValue={state} className={adminInputClass}>
          <option value="all">All posts</option>
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
          <option value="archived">Archived</option>
          <option value="deleted">Deleted</option>
        </select>
        <button className={adminBtnSecondary} type="submit">Filter</button>
      </form>
      {posts.error || commentResult.error ? <p className="text-sm text-rose-600">Some community content could not be loaded.</p> : null}
      <div className="space-y-2">
        <p className="text-xs text-[var(--color-text-muted)]">{postTotal} posts</p>
        <div className={adminTableShell}>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3">Post</th>
                <th className="px-4 py-3">Comments</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {postRows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--color-border)] align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.title || "Untitled post"}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{row.created_at}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Community {row.community_id}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.comment_count ?? 0}</td>
                  <td className="px-4 py-3">
                    {describePostState(row)}
                    {row.comments_disabled ? <p className="text-[11px] text-[var(--color-text-muted)]">Comments disabled</p> : null}
                  </td>
                  <td className="space-y-2 px-4 py-3">
                    <AdminActionForm action={moderatePostOperationAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="operation" value={row.hidden_at ? "unhide" : "hide"} />
                      <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                      <button className={adminBtnSecondary} type="submit">{row.hidden_at ? "Unhide" : "Hide"}</button>
                    </AdminActionForm>
                    <AdminActionForm action={moderatePostOperationAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="operation" value={row.archived_at && !row.deleted_at ? "restore" : "archive"} />
                      <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                      <button className={adminBtnSecondary} type="submit">{row.archived_at && !row.deleted_at ? "Restore" : "Archive"}</button>
                    </AdminActionForm>
                    <AdminActionForm action={moderatePostOperationAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="operation" value={row.comments_disabled ? "enable_comments" : "disable_comments"} />
                      <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                      <button className={adminBtnSecondary} type="submit">{row.comments_disabled ? "Enable comments" : "Disable comments"}</button>
                    </AdminActionForm>
                    {row.deleted_at ? null : (
                      <AdminActionForm action={moderatePostOperationAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="operation" value="soft_delete" />
                        <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                        <input name="confirm" required pattern="DELETE" placeholder="Type DELETE" aria-label={`Confirm delete ${row.title || "post"}`} className={adminInputClass} />
                        <button className="inline-flex h-9 items-center rounded-md bg-rose-600 px-3 text-[12px] font-semibold text-white" type="submit">Delete post</button>
                      </AdminActionForm>
                    )}
                  </td>
                </tr>
              ))}
              {postRows.length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={4}>No posts match this filter.</td></tr> : null}
            </tbody>
          </table>
        </div>
        {page > 1 || from + postRows.length < postTotal ? (
          <div className="flex gap-3 text-sm">
            {page > 1 ? <Link href={`/admin/communities/posts?${query}&page=${page - 1}&cpage=${comments.page}`}>Previous posts</Link> : null}
            {from + postRows.length < postTotal ? <Link href={`/admin/communities/posts?${query}&page=${page + 1}&cpage=${comments.page}`}>Next posts</Link> : null}
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <p className="text-xs text-[var(--color-text-muted)]">{commentTotal} comments</p>
        <div className={adminTableShell}>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr><th className="px-4 py-3">Comment</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody>
              {commentRows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--color-border)] align-top">
                  <td className="max-w-md px-4 py-3">
                    <p className="line-clamp-2">{row.body}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Post {row.post_id}</p>
                  </td>
                  <td className="px-4 py-3">{describeCommentState(row)}</td>
                  <td className="space-y-2 px-4 py-3">
                    <AdminActionForm action={moderateCommentOperationAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="operation" value={row.is_published === false && !row.deleted_at ? "unhide" : "hide"} />
                      <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                      <button className={adminBtnSecondary} type="submit">{row.is_published === false && !row.deleted_at ? "Unhide" : "Hide"}</button>
                    </AdminActionForm>
                    {row.deleted_at ? null : (
                      <AdminActionForm action={moderateCommentOperationAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="operation" value="soft_delete" />
                        <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                        <input name="confirm" required pattern="DELETE" placeholder="Type DELETE" aria-label="Confirm delete comment" className={adminInputClass} />
                        <button className="inline-flex h-9 items-center rounded-md bg-rose-600 px-3 text-[12px] font-semibold text-white" type="submit">Delete comment</button>
                      </AdminActionForm>
                    )}
                  </td>
                </tr>
              ))}
              {commentRows.length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={3}>No comments match this filter.</td></tr> : null}
            </tbody>
          </table>
        </div>
        {comments.page > 1 || comments.from + commentRows.length < commentTotal ? (
          <div className="flex gap-3 text-sm">
            {comments.page > 1 ? <Link href={`/admin/communities/posts?${query}&page=${page}&cpage=${comments.page - 1}`}>Previous comments</Link> : null}
            {comments.from + commentRows.length < commentTotal ? <Link href={`/admin/communities/posts?${query}&page=${page}&cpage=${comments.page + 1}`}>Next comments</Link> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
