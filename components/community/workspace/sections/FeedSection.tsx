
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Image as ImageIcon,
  Video,
  BarChart3,
  Smile,
  Send,
  MessageCircle,
  Heart,
  Repeat2,
  Share2,
  MoreHorizontal,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Reply,
  X,
  ChevronLeft,
} from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";
import { uploadCommunityChatFile } from "@/lib/community-chat-upload";
import { formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id?: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface Post {
  id: string;
  title: string | null;
  body: string;
  post_type: string;
  images: unknown;
  like_count: number;
  comment_count: number;
  is_pinned: boolean | null;
  created_at: string;
  profiles?: Profile | null;
  author?: Profile | null;
  content?: string;
  reactions_count?: number;
  comments_count?: number;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  profiles?: Profile | null;
  parent_id: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePost(raw: Post): Post {
  return {
    ...raw,
    body: raw.body ?? raw.content ?? "",
    profiles: raw.profiles ?? raw.author ?? null,
    like_count: raw.like_count ?? raw.reactions_count ?? 0,
    comment_count: raw.comment_count ?? raw.comments_count ?? 0,
  };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── FeedSection ──────────────────────────────────────────────────────────────

export function FeedSection() {
  const { communityId, communityName, view, isAdmin } = useWorkspace();
  const supabase = createClient();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<
    Array<{ url: string; name: string; mime: string }>
  >([]);
  const [uploading, setUploading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const adminView = view === "admin" && isAdmin;

  // Keyboard shortcut: N = focus composer
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        composerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Load posts ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/all/${communityId}`);
      const data = await res.json();
      setPosts((data.posts ?? []).map(normalizePost));
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => { load(); }, [load]);

  // ── Load saved post ids ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadSaved() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("community_saved_posts")
        .select("post_id")
        .eq("user_id", user.id);
      if (cancelled || !data) return;
      setSavedIds(new Set(data.map((r: { post_id: string }) => r.post_id)));
    }
    loadSaved();
    return () => { cancelled = true; };
  }, [posts, supabase]);

  // ── Image upload ──────────────────────────────────────────────────────────
  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const tempEntry = { url: "", name: file.name, mime: file.type };
      setPendingImages((prev) => [...prev, tempEntry]);
      setUploading(true);
      try {
        const uploaded = await uploadCommunityChatFile(communityId, "feed", file);
        setPendingImages((prev) =>
          prev.map((img) =>
            img === tempEntry ? { ...uploaded, url: uploaded.url || "" } : img
          )
        );
      } catch {
        setPendingImages((prev) => prev.filter((img) => img !== tempEntry));
      } finally {
        setUploading(false);
      }
    }
  }

  // ── Submit post ───────────────────────────────────────────────────────────
  async function submitPost() {
    if (!composer.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/posts/all/${communityId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: composer.trim(),
          post_type: "discussion",
          images: pendingImages.filter((i) => i.url).map((i) => i.url),
        }),
      });
      setComposer("");
      setPendingImages([]);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle like ───────────────────────────────────────────────────────────
  async function toggleLike(postId: string) {
    await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    await load();
  }

  // ── Toggle save ───────────────────────────────────────────────────────────
  async function toggleSave(postId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (savedIds.has(postId)) {
      await supabase
        .from("community_saved_posts")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      setSavedIds((s) => { const n = new Set(s); n.delete(postId); return n; });
    } else {
      await supabase
        .from("community_saved_posts")
        .insert({ post_id: postId, user_id: user.id });
      setSavedIds((s) => new Set(s).add(postId));
    }
  }

  const detail = detailId ? posts.find((p) => p.id === detailId) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Composer */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <textarea
          ref={composerRef}
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          placeholder={`Share something with ${communityName}...`}
          rows={3}
          className="w-full bg-transparent text-[14px] text-text-primary placeholder:text-text-muted resize-none focus:outline-none"
        />

        {pendingImages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mt-2">
            {pendingImages.map((img, i) => (
              <div
                key={i}
                className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-border"
              >
                {!img.url ? (
                  <div className="h-full w-full flex items-center justify-center bg-surface-secondary">
                    <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="object-cover w-full h-full" />
                    <button
                      onClick={() =>
                        setPendingImages((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            {[
              { icon: ImageIcon, label: "Photo", action: () => imageInputRef.current?.click() },
              { icon: Video, label: "Video", action: () => { } },
              { icon: BarChart3, label: "Poll", action: () => { } },
              { icon: Smile, label: "Mood", action: () => { } },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <button
                  type="button"
                  key={b.label}
                  onClick={b.action}
                  className="p-2 rounded-lg text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
                  aria-label={b.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!composer.trim() || saving || uploading}
            onClick={submitPost}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: "linear-gradient(135deg, #fd5000, #ff7a30)" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Post
          </button>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleImageUpload(e.target.files)}
        />
      </div>

      {/* Admin notice */}
      {adminView && (
        <div className="text-[11px] font-semibold text-[#fd5000] bg-[#fd5000]/10 border border-[#fd5000]/20 rounded-lg px-3 py-2">
          Admin view: you can pin, hide, or delete any post.
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <FeedEmpty />
      ) : (
        posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            isAdmin={adminView}
            saved={savedIds.has(p.id)}
            onLike={() => toggleLike(p.id)}
            onSave={() => toggleSave(p.id)}
            onSelect={() => setDetailId(detailId === p.id ? null : p.id)}
          />
        ))
      )}

      {/* Thread detail panel */}
      {detailId && (
        <PostDetailPanel
          postId={detailId}
          post={detail}
          onClose={() => setDetailId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({
  post,
  isAdmin,
  saved,
  onLike,
  onSave,
  onSelect,
}: {
  post: Post;
  isAdmin: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
  onSelect: () => void;
}) {
  const profile = post.profiles ?? post.author ?? null;
  const name = profile?.full_name ?? profile?.username ?? "Creator";
  const imgs = Array.isArray(post.images)
    ? (post.images as string[]).filter(Boolean)
    : [];

  return (
    <article className="bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition-colors">
      <header className="flex items-start gap-3 mb-3">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={name}
            className="w-10 h-10 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: "#fd5000" }}
          >
            {name[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-text-primary truncate">{name}</p>
          {profile?.username && (
            <p className="text-[11px] text-text-muted truncate">
              @{profile.username} · {timeAgo(post.created_at)}
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            type="button"
            className="p-1.5 rounded-lg text-text-muted hover:bg-surface-secondary"
            aria-label="Post actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </header>

      <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap mb-3">
        {post.body}
      </p>

      {imgs.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {imgs.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="h-32 w-auto rounded-lg object-cover border border-border"
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 -ml-2">
        <button
          type="button"
          onClick={onLike}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
        >
          <Heart className="w-3.5 h-3.5" />
          {(post.like_count ?? 0) > 0 && <span className="font-semibold">{post.like_count}</span>}
        </button>

        <button
          type="button"
          onClick={onSelect}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {(post.comment_count ?? 0) > 0 && <span className="font-semibold">{post.comment_count}</span>}
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
        >
          <Repeat2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
        >
          {saved ? (
            <BookmarkCheck className="w-3.5 h-3.5 text-[#fd5000]" />
          ) : (
            <Bookmark className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(window.location.href)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
}

// ─── PostDetailPanel ──────────────────────────────────────────────────────────

function PostDetailPanel({
  postId,
  post,
  onClose,
  onChanged,
}: {
  postId: string;
  post: Post | undefined | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingComments(true);
      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();
      if (!cancelled && res.ok) setComments(data.comments ?? []);
      if (!cancelled) setLoadingComments(false);
    })();
    return () => { cancelled = true; };
  }, [postId]);

  async function sendComment() {
    if (!text.trim()) return;
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim(), parent_id: replyTo?.id ?? null }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setText("");
    setReplyTo(null);
    setComments((c) => [...c, data.comment]);
    onChanged();
  }

  const topComments = comments.filter((c) => !c.parent_id);
  const replies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[12px] font-semibold text-text-muted">
          {comments.length} comment{comments.length !== 1 ? "s" : ""}
        </span>
      </div>

      {post && (
        <p className="text-[13px] text-text-primary leading-relaxed mb-4 pb-4 border-b border-border">
          {post.body}
        </p>
      )}

      {loadingComments ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          {topComments.map((c) => (
            <div key={c.id}>
              <CommentItem
                comment={c}
                onReply={(c) => { setReplyTo(c); setTimeout(() => textRef.current?.focus(), 50); }}
              />
              {replies(c.id).map((r) => (
                <div key={r.id} className="ml-8 mt-3 pl-3 border-l-2 border-border">
                  <CommentItem
                    comment={r}
                    onReply={(c) => { setReplyTo(c); setTimeout(() => textRef.current?.focus(), 50); }}
                  />
                </div>
              ))}
            </div>
          ))}
          {!loadingComments && topComments.length === 0 && (
            <p className="text-center text-[12px] text-text-muted py-4">
              No comments yet. Be the first!
            </p>
          )}
        </div>
      )}

      {replyTo && (
        <div className="flex items-center gap-2 text-[11px] text-text-muted bg-surface-secondary rounded-lg px-3 py-2 mb-2 border border-border">
          <Reply className="h-3 w-3 shrink-0" />
          <span className="truncate flex-1">
            Replying to{" "}
            <strong>
              {replyTo.profiles?.full_name || replyTo.profiles?.username || "Member"}
            </strong>
          </span>
          <button onClick={() => setReplyTo(null)} className="hover:text-[#fd5000] transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              sendComment();
            }
          }}
          placeholder={replyTo ? "Write a reply…" : "Add a comment…"}
          rows={2}
          className="flex-1 bg-surface-secondary text-[13px] text-text-primary placeholder:text-text-muted resize-none focus:outline-none rounded-lg px-3 py-2 border border-border"
        />
        <button
          type="button"
          disabled={!text.trim()}
          onClick={sendComment}
          className="self-end inline-flex items-center gap-1.5 text-[12px] font-semibold text-white px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          style={{ background: "linear-gradient(135deg, #fd5000, #ff7a30)" }}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── CommentItem ──────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  onReply,
}: {
  comment: Comment;
  onReply: (c: Comment) => void;
}) {
  const profile = comment.profiles;
  const name = profile?.full_name ?? profile?.username ?? "Member";

  return (
    <div className="flex gap-2">
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt={name}
          className="w-7 h-7 rounded-full object-cover ring-1 ring-border shrink-0"
        />
      ) : (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: "#fd5000" }}
        >
          {name[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[12px] font-semibold text-text-primary">{name}</span>
          <span className="text-[10px] text-text-muted">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap">
          {comment.body}
        </p>
        <button
          type="button"
          onClick={() => onReply(comment)}
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-[#fd5000] transition-colors font-semibold"
        >
          <Reply className="h-3 w-3" /> Reply
        </button>
      </div>
    </div>
  );
}

// ─── Skeletons / Empty ────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-surface border border-border rounded-2xl p-4 animate-pulse">
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-surface-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-surface-secondary" />
              <div className="h-2 w-20 rounded bg-surface-secondary" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-surface-secondary" />
            <div className="h-3 w-4/5 rounded bg-surface-secondary" />
          </div>
        </div>
      ))}
    </>
  );
}

function FeedEmpty() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-12 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#fd5000]/10 flex items-center justify-center mb-3">
        <MessageCircle className="w-6 h-6 text-[#fd5000]" />
      </div>
      <h3 className="text-[15px] font-bold text-text-primary mb-1">Be the first to post</h3>
      <p className="text-[12px] text-text-muted max-w-sm">
        No conversations yet. Share a win, ask a question, or drop a link to get the community going.
      </p>
    </div>
  );
}