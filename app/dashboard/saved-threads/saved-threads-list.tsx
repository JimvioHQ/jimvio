"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { MessageSquare, Heart, Bookmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import { unsavePost } from "@/lib/actions/community";
import { toast } from "sonner";

type Post = {
  id: string;
  title: string | null;
  body: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  community_id: string;
  communities: { id: string; name: string; slug: string }[] | { id: string; name: string; slug: string } | null;
  profiles: { full_name?: string; avatar_url?: string }[] | { full_name?: string; avatar_url?: string } | null;
};

export function SavedThreadsList({ posts }: { posts: Post[] }) {
  const [list, setList] = useState(posts);
  const [isPending, startTransition] = useTransition();

  function getCommunity(post: Post) {
    const c = post.communities;
    if (Array.isArray(c)) return c[0] ?? null;
    return c ?? null;
  }

  const handleUnsave = (postId: string) => {
    startTransition(async () => {
      const res = await unsavePost(postId);
      if (res.success) {
        setList((prev) => prev.filter((p) => p.id !== postId));
        toast.success("Removed from saved");
      } else {
        toast.error(res.error ?? "Failed to remove");
      }
    });
  };

  return (
    <div className="space-y-4">
      {list.map((post) => {
        const community = getCommunity(post);
        const slug = community?.slug ?? "";
        return (
          <Card key={post.id} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[var(--color-text-primary)] truncate">
                    {post.title || "Untitled"}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {community?.name ?? "Community"} · {timeAgo(post.created_at)}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2 line-clamp-2">
                    {post.body}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <Heart className="h-3.5 w-3" /> {post.like_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <MessageSquare className="h-3.5 w-3" /> {post.comment_count ?? 0}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {slug && (
                    <Link href={`/communities/${slug}/post/${post.id}`}>
                      <Button size="sm" variant="outline" className="rounded-xl">
                        View
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-[var(--color-accent)]"
                    disabled={isPending}
                    onClick={() => handleUnsave(post.id)}
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4 fill-current" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
