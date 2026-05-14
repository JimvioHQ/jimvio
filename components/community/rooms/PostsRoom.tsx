"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  ImageIcon,
  Loader2,
  MessageCircle,
  Pin,
  Plus,
  X,
  Search,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  Reply,
  TrendingUp,
  Clock,
  Flame,
  Share2,
  Eye,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { uploadCommunityChatFile } from "@/lib/community-chat-upload";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

type Post = {
  id: string;
  title: string | null;
  body: string;
  post_type: string;
  images: unknown;
  like_count: number | null;
  comment_count: number | null;
  is_pinned: boolean | null;
  created_at: string;
  profiles?: Profile | null;
};

type Comment = {
  id: string;
  body: string;
  created_at: string;
  profiles?: Profile | null;
  parent_id: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const POST_TYPES = ["all", "discussion", "announcement", "question", "resource", "poll"] as const;
type PostTypeFilter = (typeof POST_TYPES)[number];

const TYPE_COLORS: Record<string, string> = {
  discussion: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  announcement: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  question: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  resource: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  poll: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest", icon: Clock },
  { value: "top", label: "Top", icon: TrendingUp },
  { value: "trending", label: "Trending", icon: Flame },
] as const;
type SortOption = (typeof SORT_OPTIONS)[number]["value"];

const REACTIONS = ["👍", "❤️", "🔥", "💡", "😂"];

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ profile, size = 36 }: { profile?: Profile | null; size?: number }) {
  const initials = (profile?.full_name || profile?.username || "?")[0].toUpperCase();
  const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
  const color = colors[(initials.charCodeAt(0) || 0) % colors.length];

  return (
    <div
      className={cn("rounded-sm overflow-hidden shrink-0 border border-[var(--color-border)]", color)}
      style={{ width: size, height: size }}
    >
      {profile?.avatar_url && profile?.avatar_url.trim() ? (
        <Image
          src={profile.avatar_url}
          alt=""
          width={size}
          height={size}
          className="object-cover w-full h-full"
          unoptimized
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-white font-black text-sm">
          {initials}
        </div>
      )}
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({
  post,
  saved,
  active,
  onSelect,
  onLike,
  onSave,
}: {
  post: Post;
  saved: boolean;
  active: boolean;
  onSelect: () => void;
  onLike: () => void;
  onSave: () => void;
}) {
  const imgs = Array.isArray(post.images)
    ? (post.images as string[]).filter(Boolean).slice(0, 3)
    : [];
  const [showReactions, setShowReactions] = useState(false);
  const [pickedReaction, setPickedReaction] = useState<string | null>(null);

  return (
    <article
      className={cn(
        "group rounded-sm border bg-[var(--color-surface)] p-4 shadow-none transition-all duration-200 cursor-pointer",
        "hover:shadow-none hover:border-[var(--color-accent)]/40",
        active
          ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20"
          : "border-[var(--color-border)]"
      )}
      onClick={onSelect}
    >
      {/* Pinned badge */}
      {post.is_pinned && (
        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)] mb-2">
          <Pin className="h-3 w-3" /> Pinned
        </div>
      )}

      <div className="flex gap-3">
        <Avatar profile={post.profiles} size={36} />

        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-bold text-[var(--color-text-primary)]">
              {post.profiles?.full_name || post.profiles?.username || "Member"}
            </span>
            <span
              className={cn(
                "text-[10px] font-black uppercase px-2 py-0.5 rounded-sm border",
                TYPE_COLORS[post.post_type] ?? "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border-transparent"
              )}
            >
              {post.post_type}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] ml-auto">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Title */}
          {post.title && (
            <h2 className="font-black text-[var(--color-text-primary)] leading-snug mb-1">
              {post.title}
            </h2>
          )}

          {/* Body */}
          <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3 whitespace-pre-wrap">
            {post.body}
          </p>

          {/* Images */}
          {imgs.length > 0 && (
            <div className="mt-3 flex gap-2">
              {imgs.map((url) => (
                <div
                  key={url}
                  className="relative h-20 w-28 rounded-sm overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
                >
                  <Image src={url} alt="" fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          )}

          {/* Action row */}
          <div
            className="mt-3 flex flex-wrap items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-sm transition-colors",
                  "hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-rose-500"
                )}
                onClick={() => setShowReactions((v) => !v)}
              >
                <Heart className="h-3.5 w-3.5" />
                <span>{post.like_count ?? 0}</span>
              </button>
              {showReactions && (
                <div className="absolute bottom-full left-0 mb-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-2 py-1.5 flex gap-1 shadow-none z-10 animate-in fade-in slide-in-from-bottom-2">
                  {REACTIONS.map((r) => (
                    <button
                      key={r}
                      className={cn(
                        "text-base transition-transform hover:scale-125 rounded-sm px-1",
                        pickedReaction === r && "bg-[var(--color-surface-secondary)]"
                      )}
                      onClick={() => {
                        setPickedReaction(r);
                        setShowReactions(false);
                        onLike();
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-sm transition-colors hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
              onClick={onSelect}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{post.comment_count ?? 0}</span>
            </button>

            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-sm transition-colors",
                saved
                  ? "text-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
              )}
              onClick={onSave}
            >
              {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-sm transition-colors hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PostsRoom({
  roomId,
  roomName,
  communityId,
  hideHeader,
}: {
  roomId: string;
  roomName: string;
  communityId: string;
  slug: string;
  hideHeader?: boolean;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PostTypeFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState("discussion");
  const [saving, setSaving] = useState(false);
  const [pendingImages, setPendingImages] = useState<Array<{ url: string; name: string; mime: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setCreateOpen(true); }
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const tempImage = { url: "", name: file.name, mime: file.type };
      setPendingImages((prev) => [...prev, tempImage]);
      setUploading(true);
      try {
        const uploaded = await uploadCommunityChatFile(communityId, roomId, file);
        setPendingImages((prev) =>
          prev.map((img) => (img === tempImage ? { ...uploaded, url: uploaded.url || "" } : img))
        );
      } catch (err) {
        setPendingImages((prev) => prev.filter((img) => img !== tempImage));
      } finally {
        setUploading(false);
      }
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?roomId=${encodeURIComponent(roomId)}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function loadSaved() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("community_saved_posts").select("post_id").eq("user_id", user.id);
      if (cancelled || !data) return;
      setSavedIds(new Set(data.map((r: { post_id: string }) => r.post_id)));
    }
    loadSaved();
    return () => { cancelled = true; };
  }, [posts]);

  async function submitPost() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: roomId,
          title: title.trim() || null,
          body: body.trim(),
          post_type: postType,
          images: pendingImages.filter((img) => img.url).map((img) => img.url),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setCreateOpen(false);
      setTitle("");
      setBody("");
      setPendingImages([]);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function toggleLike(postId: string) {
    await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    await load();
  }

  async function toggleSave(postId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (savedIds.has(postId)) {
      await supabase.from("community_saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
      setSavedIds((s) => { const n = new Set(s); n.delete(postId); return n; });
    } else {
      await supabase.from("community_saved_posts").insert({ post_id: postId, user_id: user.id });
      setSavedIds((s) => new Set(s).add(postId));
    }
  }

  const filtered = posts
    .filter((p) => {
      if (typeFilter !== "all" && p.post_type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (p.title ?? "").toLowerCase().includes(q) || p.body.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      if (sortBy === "top") return (b.like_count ?? 0) - (a.like_count ?? 0);
      if (sortBy === "trending") return (b.comment_count ?? 0) - (a.comment_count ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const detail = detailId ? posts.find((p) => p.id === detailId) : null;

  return (
    <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden relative">
      <div className={cn(
        "flex flex-1 min-w-0 flex-col border-r border-[var(--color-border)]",
        detailId ? "hidden lg:flex" : "flex"
      )}>
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shrink-0">
          {!hideHeader && (
            <h1 className="text-lg font-black text-[var(--color-text-primary)] truncate">{roomName}</h1>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              size="sm"
              className="rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> New Post
            </Button>
          </div>
        </header>

        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 space-y-2 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              <Input
                ref={searchRef}
                placeholder="Search posts… (/)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm rounded-sm border-[var(--color-border)]"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("rounded-sm border-[var(--color-border)] gap-1.5", showFilters && "bg-[var(--color-surface-secondary)]")}
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Filter</span>
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2 pb-1 animate-in fade-in slide-in-from-top-1">
              <div className="flex gap-1 flex-wrap">
                {POST_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-sm border capitalize transition-all",
                      typeFilter === t
                        ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 ml-auto">
                {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSortBy(value)}
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-sm border transition-all",
                      sortBy === value
                        ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-[var(--color-text-muted)] font-bold italic">
              No posts found.
            </div>
          ) : (
            filtered.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                saved={savedIds.has(p.id)}
                active={detailId === p.id}
                onSelect={() => setDetailId(detailId === p.id ? null : p.id)}
                onLike={() => toggleLike(p.id)}
                onSave={() => toggleSave(p.id)}
              />
            ))
          )}
        </div>
      </div>

      <PostDetailPanel
        postId={detailId}
        post={detail}
        onClose={() => setDetailId(null)}
        onChanged={load}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="z-[10051] border-[var(--color-border)] bg-[var(--color-surface)] max-w-lg max-h-[90vh] overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-black !text-[var(--color-text-primary)]">New post</DialogTitle>
          </DialogHeader>

          <div className="flex gap-1.5 flex-wrap">
            {POST_TYPES.filter((t) => t !== "all").map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPostType(t)}
                className={cn(
                  "text-[11px] font-black px-3 py-1.5 rounded-sm border capitalize transition-all",
                  postType === t
                    ? cn("border-transparent", TYPE_COLORS[t])
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border)]"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-4 pt-2">
            <Input
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-sm border-[var(--color-border)]"
            />
            <Textarea
              placeholder="What's on your mind?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="rounded-sm border-[var(--color-border)] resize-none"
            />

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />

            {pendingImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {pendingImages.map((img, i) => (
                  <div key={i} className="relative h-20 w-20 shrink-0 rounded-sm overflow-hidden border border-[var(--color-border)]">
                    {!img.url ? (
                      <div className="h-full w-full flex items-center justify-center bg-[var(--color-surface-secondary)]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <Image src={img.url} alt="" fill className="object-cover" unoptimized />
                        <button
                          onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-sm hover:bg-black/70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full rounded-sm border-dashed border-2 py-8"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
            >
              <ImageIcon className="h-5 w-5 mr-2" />
              {uploading ? "Uploading..." : "Add Images"}
            </Button>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-sm">Cancel</Button>
            <Button
              className="rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black px-8"
              disabled={saving || uploading || !body.trim()}
              onClick={submitPost}
            >
              {saving ? "Publishing..." : "Publish Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── PostDetailPanel component ───────────────────────────────────────────────

function PostDetailPanel({
  postId,
  post,
  onClose,
  onChanged,
}: {
  postId: string | null;
  post: Post | undefined | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();
      if (!cancelled && res.ok) setComments(data.comments ?? []);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [postId]);

  async function sendComment() {
    if (!postId || !text.trim()) return;
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim(), parent_id: replyTo?.id ?? null }),
    });
    if (!res.ok) return;
    setText("");
    setReplyTo(null);
    const data = await res.json();
    setComments((c) => [...c, data.comment]);
    onChanged();
  }

  function handleReply(c: Comment) {
    setReplyTo(c);
    setTimeout(() => textRef.current?.focus(), 50);
  }

  const topComments = comments.filter((c) => !c.parent_id);
  const replies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);
  const imgs = Array.isArray(post?.images) ? (post.images as string[]).filter(Boolean) : [];

  return (
    <aside className={cn(
      "w-full lg:w-[400px] shrink-0 flex flex-col lg:border-l border-[var(--color-border)] bg-[var(--color-surface)] min-h-0 transition-all duration-300",
      postId ? "flex absolute inset-0 z-[1000] lg:static" : "hidden lg:flex"
    )}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface)] shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="lg:hidden p-1 mr-1 hover:bg-black/5 rounded-sm transition-colors text-[var(--color-accent)]">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span
            className={cn(
              "text-[10px] font-black uppercase px-2 py-0.5 rounded-sm border",
              post ? TYPE_COLORS[post.post_type] ?? "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border-transparent" : "bg-transparent text-transparent border-transparent"
            )}
          >
            {post?.post_type || "Thread"}
          </span>
          <h2 className="text-sm font-black truncate">Thread</h2>
        </div>
        <Button type="button" variant="ghost" size="sm" className="hidden lg:flex rounded-sm h-7 px-2" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!post ? (
        <div className="flex-1 flex items-center justify-center p-6 text-sm text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)]/40">
          <div className="text-center space-y-2">
            <MessageCircle className="h-8 w-8 mx-auto opacity-30" />
            <p className="text-xs">Select a post to read and comment</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto bg-[var(--color-surface-secondary)]/5">
            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex gap-3 mb-3">
                <Avatar profile={post.profiles} size={32} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                    {post.profiles?.full_name || post.profiles?.username || "Member"}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-bold">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {post.title && <h3 className="font-black text-lg text-[var(--color-text-primary)] mb-2 leading-snug">{post.title}</h3>}
              <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{post.body}</p>

              {imgs.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {imgs.map((url) => (
                    <div key={url} className="relative h-44 rounded-sm overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                      <Image src={url} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-4">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-sm transition-colors bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-rose-500"
                  onClick={async () => {
                    await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
                    onChanged();
                  }}
                >
                  <Heart className="h-3.5 w-3.5" />
                  <span>{post.like_count ?? 0}</span>
                </button>
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-black">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>{post.comment_count ?? 0} Comments</span>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-6">
              <h4 className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest flex items-center gap-2">
                Discussion · {comments.length}
                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              </h4>

              <div className="space-y-6">
                {topComments.map((c) => (
                  <div key={c.id} className="space-y-4">
                    <CommentItem comment={c} onReply={handleReply} />
                    {replies(c.id).map((r) => (
                      <div key={r.id} className="ml-8 border-l-2 border-[var(--color-border)] pl-4">
                        <CommentItem comment={r} onReply={handleReply} />
                      </div>
                    ))}
                  </div>
                ))}
                {!loading && topComments.length === 0 && (
                  <p className="py-8 text-center text-xs text-[var(--color-text-muted)] font-bold italic">No comments yet. Join the talk!</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 space-y-3">
            {replyTo && (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] rounded-sm px-3 py-2 border border-[var(--color-border)]">
                <Reply className="h-3 w-3.5 shrink-0" />
                <span className="truncate flex-1">Replying to <strong>{replyTo.profiles?.full_name || replyTo.profiles?.username || "Member"}</strong></span>
                <button type="button" onClick={() => setReplyTo(null)} className="p-1 hover:bg-black/5 rounded-sm"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
            <Textarea
              ref={textRef}
              placeholder={replyTo ? "Your reply..." : "Add to the discussion..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  sendComment();
                }
              }}
              rows={2}
              className="rounded-sm border-[var(--color-border)] resize-none text-sm focus:ring-[var(--color-accent)]"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-text-muted)] font-black">âŒ˜â†µ to post</span>
              <Button
                type="button"
                size="sm"
                className="rounded-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black px-6"
                disabled={!text.trim()}
                onClick={sendComment}
              >
                Post
              </Button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

// ─── CommentItem component ───────────────────────────────────────────────────

function CommentItem({ comment, onReply }: { comment: Comment; onReply: (c: Comment) => void }) {
  return (
    <div className="flex gap-3 group/comment">
      <Avatar profile={comment.profiles} size={28} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-[var(--color-text-primary)]">
            {comment.profiles?.full_name || comment.profiles?.username || "Member"}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
          {comment.body}
        </p>
        <button
          type="button"
          onClick={() => onReply(comment)}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          <Reply className="h-3 w-3" /> Reply
        </button>
      </div>
    </div>
  );
}

