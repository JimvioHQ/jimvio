"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Heart, Loader2, MessageCircle, Pin, Plus } from "lucide-react";
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

type Profile = { full_name: string | null; avatar_url: string | null; username: string | null };

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

export function PostsRoom({
  roomId,
  roomName,
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

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState("discussion");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?roomId=${encodeURIComponent(roomId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPosts(data.posts ?? []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function loadSaved() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("community_saved_posts").select("post_id").eq("user_id", user.id);
      if (cancelled || !data) return;
      setSavedIds(new Set(data.map((r) => r.post_id)));
    }
    loadSaved();
    return () => {
      cancelled = true;
    };
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
          images: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCreateOpen(false);
      setTitle("");
      setBody("");
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function toggleLike(postId: string) {
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (!res.ok) return;
    await load();
  }

  async function toggleSave(postId: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    if (savedIds.has(postId)) {
      await supabase.from("community_saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
      setSavedIds((s) => {
        const n = new Set(s);
        n.delete(postId);
        return n;
      });
    } else {
      await supabase.from("community_saved_posts").insert({ post_id: postId, user_id: user.id });
      setSavedIds((s) => new Set(s).add(postId));
    }
  }

  const detail = detailId ? posts.find((p) => p.id === detailId) : null;

  return (
    <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
      <div className="flex flex-1 min-w-0 flex-col border-r border-[var(--color-border)]">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          {!hideHeader && <h1 className="text-lg font-black text-[var(--color-text-primary)] truncate">{roomName}</h1>}
          <Button
            type="button"
            size="sm"
            className={cn(
              "rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black shrink-0",
              hideHeader && "ml-auto"
            )}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> New Post
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12 text-[var(--color-text-muted)]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No posts yet.</p>
          ) : (
            posts.map((p) => {
              const imgs = Array.isArray(p.images) ? (p.images as string[]).filter(Boolean).slice(0, 3) : [];
              const author = p.profiles;
              return (
                <article
                  key={p.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm"
                >
                  {p.is_pinned && (
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)] mb-2">
                      <Pin className="h-3 w-3" /> Pinned
                    </div>
                  )}
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)] shrink-0">
                      {author?.avatar_url ? (
                        <Image src={author.avatar_url} alt="" width={40} height={40} className="object-cover h-full w-full" unoptimized />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs font-black text-[var(--color-accent)]">
                          {(author?.full_name || author?.username || "?")[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-[var(--color-text-primary)]">
                          {author?.full_name || author?.username || "Member"}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
                          {p.post_type}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {p.title && <h2 className="mt-1 font-black text-[var(--color-text-primary)]">{p.title}</h2>}
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-3 whitespace-pre-wrap">{p.body}</p>
                      {imgs.length > 0 && (
                        <div className="mt-3 flex gap-2">
                          {imgs.map((url) => (
                            <div key={url} className="relative h-20 w-28 rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                              <Image src={url} alt="" fill className="object-cover" unoptimized />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-[var(--color-text-muted)]">
                        <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--color-accent)]" onClick={() => toggleLike(p.id)}>
                          <Heart className="h-3.5 w-3.5" /> {p.like_count ?? 0}
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--color-accent)]" onClick={() => setDetailId(p.id)}>
                          <MessageCircle className="h-3.5 w-3.5" /> {p.comment_count ?? 0}
                        </button>
                        <button type="button" className="hover:text-[var(--color-accent)]" onClick={() => toggleSave(p.id)}>
                          {savedIds.has(p.id) ? "Saved" : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <PostDetailPanel postId={detailId} post={detail} onClose={() => setDetailId(null)} onChanged={load} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-[var(--color-border)] bg-[var(--color-surface)] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black !text-[var(--color-text-primary)]">New post</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl border-[var(--color-border)]"
            />
            <Textarea
              placeholder="Write something…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="rounded-xl border-[var(--color-border)]"
            />
            <label className="text-xs font-bold text-[var(--color-text-muted)]">Post type</label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold"
            >
              <option value="discussion">Discussion</option>
              <option value="announcement">Announcement</option>
              <option value="question">Question</option>
              <option value="resource">Resource</option>
              <option value="poll">Poll</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 justify-end pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black" disabled={saving} onClick={submitPost}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  const [comments, setComments] = useState<
    { id: string; body: string; created_at: string; profiles?: Profile | null; parent_id: string | null }[]
  >([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function sendComment() {
    if (!postId || !text.trim()) return;
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim() }),
    });
    if (!res.ok) return;
    setText("");
    const data = await res.json();
    setComments((c) => [...c, data.comment]);
    onChanged();
  }

  if (!postId || !post) {
    return (
      <aside className="hidden lg:flex w-[340px] shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-4 text-sm text-[var(--color-text-muted)] items-start">
        Select a post to view comments.
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex w-[380px] shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] min-h-0">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <h2 className="text-sm font-black truncate">Thread</h2>
        <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="font-black text-[var(--color-text-primary)]">{post.title || "Post"}</h3>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{post.body}</p>
          <div className="mt-3 flex gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={async () => {
                await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
                onChanged();
              }}
            >
              <Heart className="h-4 w-4 mr-1" /> Like
            </Button>
          </div>
        </div>
        <div className="border-t border-[var(--color-border)] pt-4">
          <p className="text-xs font-black uppercase text-[var(--color-text-muted)] mb-2">Comments</p>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" />
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="text-sm">
                  <span className="font-bold text-[var(--color-text-primary)]">{c.profiles?.full_name || c.profiles?.username || "Member"}</span>
                  <span className="text-[var(--color-text-muted)] text-xs ml-2">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                  <p className="text-[var(--color-text-secondary)] mt-1 whitespace-pre-wrap">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-[var(--color-border)] p-3">
        <Textarea
          placeholder="Write a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="rounded-xl border-[var(--color-border)] mb-2"
        />
        <Button type="button" className="w-full rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black" onClick={sendComment}>
          Comment
        </Button>
      </div>
    </aside>
  );
}
