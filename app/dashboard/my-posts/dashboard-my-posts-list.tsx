"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { MessageSquare, Heart, Pencil, Trash2, ExternalLink, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import { updateCommunityPost, deleteCommunityPost } from "@/lib/actions/community";
import { toast } from "sonner";

type PostRow = {
  id: string;
  title: string | null;
  body: string;
  images?: string[] | null;
  like_count: number;
  comment_count: number;
  view_count?: number;
  created_at: string;
  community_id: string;
  is_published?: boolean;
  communities: { id: string; name: string; slug: string }[] | { id: string; name: string; slug: string } | null;
};

export function DashboardMyPostsList({ posts }: { posts: PostRow[] }) {
  const [list, setList] = useState(posts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function getCommunity(post: PostRow) {
    const c = post.communities;
    if (Array.isArray(c)) return c[0] ?? null;
    return c ?? null;
  }

  const handleStartEdit = (post: PostRow) => {
    setEditingId(post.id);
    setEditTitle(post.title ?? "");
    setEditBody(post.body);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    startTransition(async () => {
      const res = await updateCommunityPost(editingId, { title: editTitle || null, body: editBody });
      if (res.success) {
        setList((prev) =>
          prev.map((p) =>
            p.id === editingId ? { ...p, title: editTitle || null, body: editBody } : p
          )
        );
        setEditingId(null);
        setEditTitle("");
        setEditBody("");
        toast.success("Post updated");
      } else {
        toast.error(res.error ?? "Failed to update");
      }
    });
  };

  const handleDelete = (postId: string) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteCommunityPost(postId);
      if (res.success) {
        setList((prev) => prev.filter((p) => p.id !== postId));
        toast.success("Post deleted");
      } else {
        toast.error(res.error ?? "Failed to delete");
      }
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
      {list.map((post) => {
        const community = getCommunity(post);
        const slug = community?.slug ?? "";

        return (
          <Card key={post.id} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5">
              {editingId === post.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Post title"
                    className="w-full px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    placeholder="Content"
                    rows={4}
                    className="w-full px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={isPending} className="rounded-xl">
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={isPending} className="rounded-xl">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-[var(--color-text-primary)] truncate">
                    {post.title || "Untitled"}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                    <span>{community?.name ?? "Community"}</span>
                    <span className="flex items-center gap-1 ml-2">
                      <Calendar className="h-3 w-3" /> {timeAgo(post.created_at)}
                    </span>
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2 line-clamp-2">
                    {post.body}
                  </p>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--color-border)]">
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <Heart className="h-3.5 w-3" /> {post.like_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <MessageSquare className="h-3.5 w-3" /> {post.comment_count ?? 0}
                    </span>
                    <div className="flex-1" />
                    {slug && (
                      <Link href={`/communities/${slug}/post/${post.id}`}>
                        <Button variant="ghost" size="sm" className="rounded-lg gap-1">
                          View discussion <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => handleStartEdit(post)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(post.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
