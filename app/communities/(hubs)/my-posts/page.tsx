"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFeedUser } from "@/lib/feed/use-feed-user";

type MyPost = {
  id: string;
  title: string | null;
  body: string;
  post_type: string | null;
  is_published: boolean | null;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string | null;
  communities?: { name?: string | null; slug?: string | null } | null;
};

function postStatus(post: MyPost) {
  if (!post.is_published && post.scheduled_at) return "Scheduled";
  if (!post.is_published) return "Draft";
  return "Published";
}

export default function MyPostsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useFeedUser();
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated || !user?.id) {
      setPosts([]);
      setLoading(false);
      router.replace("/login?next=%2Fcommunities%2Fmy-posts");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/c/me/posts", { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not load your posts");
      setPosts(Array.isArray(json.posts) ? json.posts : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load your posts");
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user?.id, router]);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  async function deletePost(post: MyPost) {
    const label = post.title?.trim() || post.body.slice(0, 80);
    if (!window.confirm(`Permanently delete “${label}”?`)) return;
    setDeletingId(post.id);
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(post.id)}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not delete post");
      setPosts((current) => current.filter((item) => item.id !== post.id));
      toast.success("Post permanently deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete post");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#FF5A1F]/10 text-[#FF5A1F]"><FileText className="size-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">My Posts</h1>
          <p className="text-sm text-[var(--color-text-muted)]">All posts you have created across your communities.</p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-[var(--color-text-muted)]"><Loader2 className="mr-2 size-4 animate-spin" /> Loading your posts…</div>
      ) : posts.length ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <span className="rounded-full bg-[#FF5A1F]/10 px-2.5 py-1 font-semibold text-[#D6480F]">{postStatus(post)}</span>
                  {post.communities?.name && <span>{post.communities.name}</span>}
                  {post.created_at && <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString()}</time>}
                </div>
                <button type="button" disabled={deletingId !== null} onClick={() => void deletePost(post)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-red-100 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                  {deletingId === post.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Delete
                </button>
              </div>
              {post.title && <h2 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">{post.title}</h2>}
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--color-text-secondary)]">{post.body}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-5 py-16 text-center">
          <FileText className="mx-auto size-7 text-[var(--color-text-muted)]" />
          <h2 className="mt-3 font-semibold text-[var(--color-text-primary)]">No posts yet</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Posts you create in Communities will appear here.</p>
        </div>
      )}
    </div>
  );
}
