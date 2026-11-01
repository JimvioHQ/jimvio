"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, FileText, Heart, Loader2, MessageCircle, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFeedUser } from "@/lib/feed/use-feed-user";

const PAGE_SIZE = 24;

type PostMedia = { url: string; kind: "image" | "video" | "file"; name?: string };
type MyPost = {
  id: string;
  title: string | null;
  body: string;
  post_type: string | null;
  images?: unknown;
  attachments?: unknown;
  video_url?: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  view_count?: number | null;
  is_published: boolean | null;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string | null;
  archived_at?: string | null;
  hidden_at?: string | null;
  community_id?: string | null;
  communities?: { name?: string | null; slug?: string | null } | { name?: string | null; slug?: string | null }[] | null;
};

function postStatus(post: MyPost) {
  if (post.archived_at) return "Archived";
  if (post.hidden_at) return "Hidden";
  if (!post.is_published && post.scheduled_at) return "Scheduled";
  if (!post.is_published) return "Draft";
  return "Published";
}

function safeMediaUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function mediaKind(url: string, mime: string, fallback: PostMedia["kind"] = "file"): PostMedia["kind"] {
  const type = mime.toLowerCase();
  if (type === "image" || type.startsWith("image/") || /\.(avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(url)) return "image";
  if (type === "video" || type.startsWith("video/") || /\.(m4v|mov|mp4|webm|m3u8)(?:[?#]|$)/i.test(url)) return "video";
  return fallback;
}

function collectMedia(post: MyPost): PostMedia[] {
  const media: PostMedia[] = [];
  const add = (value: unknown, fallback: PostMedia["kind"] = "file") => {
    let urlValue: unknown = value;
    let mime = "";
    let name: string | undefined;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const item = value as Record<string, unknown>;
      urlValue = item.url ?? item.src ?? item.publicUrl ?? item.public_url ?? item.file_url ?? item.media_url;
      mime = String(item.mimeType ?? item.mime_type ?? item.type ?? "");
      name = typeof item.name === "string" ? item.name : typeof item.file_name === "string" ? item.file_name : undefined;
    }
    const url = safeMediaUrl(urlValue);
    if (!url || media.some((entry) => entry.url === url)) return;
    media.push({ url, kind: mediaKind(url, mime, fallback), name });
  };

  if (Array.isArray(post.images)) post.images.forEach((item) => add(item, "image"));
  else if (post.images) add(post.images, "image");
  if (Array.isArray(post.attachments)) post.attachments.forEach((item) => add(item));
  else if (post.attachments) add(post.attachments);
  if (post.video_url) add(post.video_url, "video");
  return media;
}

function communityName(post: MyPost): string | null {
  const relation = Array.isArray(post.communities) ? post.communities[0] : post.communities;
  return relation?.name?.trim() || null;
}

function formatCount(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—";
}

export default function MyPostsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useFeedUser();
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async (requestedPage = 1, append = false) => {
    if (authLoading) return;
    if (!isAuthenticated || !user?.id) {
      setPosts([]);
      setLoading(false);
      router.replace("/login?next=%2Fcommunities%2Fmy-posts");
      return;
    }
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/c/me/posts?page=" + requestedPage + "&limit=" + PAGE_SIZE, { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not load your posts.");
      const incoming = Array.isArray(json.posts) ? json.posts as MyPost[] : [];
      setPosts((current) => append ? [...current, ...incoming] : incoming);
      setTotal(typeof json.total === "number" ? json.total : incoming.length);
      setPage(requestedPage);
      setHasMore(Boolean(json.hasMore));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Could not load your posts.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [authLoading, isAuthenticated, user?.id, router]);

  useEffect(() => { void loadPosts(1, false); }, [loadPosts]);

  async function deletePost(post: MyPost) {
    const label = post.title?.trim() || post.body.slice(0, 80) || "this post";
    if (!window.confirm("Permanently delete “" + label + "”? This cannot be undone.")) return;
    setDeletingId(post.id);
    try {
      const response = await fetch("/api/c/me/posts/" + encodeURIComponent(post.id), { method: "DELETE" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not delete post.");
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setTotal((current) => Math.max(0, current - 1));
      toast.success("Post permanently deleted.");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Could not delete post.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#FF5A1F]/10 text-[#FF5A1F]"><FileText className="size-5" /></span>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">My Posts</h1>
            <p className="text-sm text-[var(--color-text-muted)]">All posts you created across Jimvio.</p>
          </div>
        </div>
        {!loading && !error ? (
          <span className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
            {total.toLocaleString()} {total === 1 ? "post" : "posts"}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-[var(--color-text-muted)]"><Loader2 className="mr-2 size-4 animate-spin" /> Loading your posts…</div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-12 text-center">
          <p className="font-semibold text-red-800">Your posts could not be loaded</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <button type="button" onClick={() => void loadPosts(1, false)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-800">
            <RefreshCw className="size-3.5" /> Try again
          </button>
        </div>
      ) : posts.length ? (
        <>
          <div className="space-y-3">
            {posts.map((post) => {
              const media = collectMedia(post);
              const community = communityName(post);
              const status = postStatus(post);
              const date = status === "Scheduled" ? post.scheduled_at : post.published_at || post.created_at;
              return (
                <article key={post.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span className="rounded-full bg-[#FF5A1F]/10 px-2.5 py-1 font-semibold text-[#D6480F]">{status}</span>
                      <span>{community ? "Community · " + community : post.community_id ? "Community" : "Profile"}</span>
                      {date ? <time dateTime={date}>{new Date(date).toLocaleDateString()}</time> : null}
                      {post.post_type ? <span className="capitalize">{post.post_type.replace(/[_-]/g, " ")}</span> : null}
                    </div>
                    <button type="button" disabled={deletingId !== null} onClick={() => void deletePost(post)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-red-100 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                      {deletingId === post.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Delete
                    </button>
                  </div>
                  {post.title ? <h2 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">{post.title}</h2> : null}
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--color-text-secondary)]">{post.body}</p>

                  {media.length ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {media.map((item) => (
                        <div key={item.url} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-black/[0.02]">
                          {item.kind === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.url} alt={post.title || "Post image"} loading="lazy" className="max-h-80 w-full object-contain" />
                          ) : item.kind === "video" ? (
                            <video src={item.url} controls preload="metadata" className="max-h-80 w-full bg-black" />
                          ) : (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="block break-all px-3 py-3 text-xs font-semibold text-[#D6480F]">
                              {item.name || "Open attachment"}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
                    {post.like_count != null ? <span className="inline-flex items-center gap-1.5"><Heart className="size-3.5" /> {formatCount(post.like_count)} likes</span> : null}
                    {post.comment_count != null ? <span className="inline-flex items-center gap-1.5"><MessageCircle className="size-3.5" /> {formatCount(post.comment_count)} comments</span> : null}
                    {post.view_count != null ? <span className="inline-flex items-center gap-1.5"><Eye className="size-3.5" /> {formatCount(post.view_count)} views</span> : null}
                  </div>
                </article>
              );
            })}
          </div>
          {hasMore ? (
            <div className="flex justify-center pt-6">
              <button type="button" disabled={loadingMore} onClick={() => void loadPosts(page + 1, true)} className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-50">
                {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
                {loadingMore ? "Loading…" : "Load more posts"}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-5 py-16 text-center">
          <FileText className="mx-auto size-7 text-[var(--color-text-muted)]" />
          <h2 className="mt-3 font-semibold text-[var(--color-text-primary)]">No posts yet</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Posts you create on Jimvio will appear here.</p>
        </div>
      )}
    </div>
  );
}
