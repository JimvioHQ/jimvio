"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createPostComment } from "@/lib/actions/community";
import { timeAgo } from "@/lib/utils";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  like_count: number;
  created_at: string;
  profiles: { full_name?: string; avatar_url?: string } | null;
};

function CommentItem({
  comment,
  depth,
  onReply,
  isMember,
}: {
  comment: Comment;
  depth: number;
  onReply: (parentId: string) => void;
  isMember: boolean;
}) {
  return (
    <div className={depth > 0 ? "ml-6 sm:ml-8 mt-3 pl-4 border-l-2 border-[var(--color-border)]" : ""}>
      <div className="flex gap-3 py-3">
        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 border border-[var(--color-border)]">
          <AvatarImage src={comment.profiles?.avatar_url} />
          <AvatarFallback className="text-xs font-semibold bg-[var(--color-accent-light)] text-[var(--color-accent)]">
            {comment.profiles?.full_name?.[0] ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[var(--color-text-primary)]">
              {comment.profiles?.full_name ?? "Member"}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 whitespace-pre-wrap">{comment.body}</p>
          {isMember && depth < 2 && (
            <button
              type="button"
              onClick={() => onReply(comment.id)}
              className="text-xs font-medium text-[var(--color-accent)] hover:underline mt-1"
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DiscussionThreadClient({
  postId,
  communitySlug,
  initialComments,
  isMember,
}: {
  postId: string;
  communitySlug: string;
  initialComments: Comment[];
  isMember: boolean;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function buildTree(items: Comment[], parentId: string | null = null): Comment[] {
    return items
      .filter((c) => c.parent_id === parentId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  const topLevel = buildTree(comments, null);

  function renderComments(items: Comment[], depth: number) {
    return items.map((comment) => (
      <div key={comment.id}>
        <CommentItem
          comment={comment}
          depth={depth}
          onReply={setReplyTo}
          isMember={isMember}
        />
        {renderComments(buildTree(comments, comment.id), depth + 1)}
      </div>
    ));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await createPostComment(postId, body.trim(), replyTo ?? undefined);
      if (res.success && res.data) {
        setComments((prev) => [...prev, res.data as Comment]);
        setBody("");
        setReplyTo(null);
        router.refresh();
        toast.success("Comment added");
      } else {
        toast.error(res.error ?? "Failed to add comment");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        {topLevel.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-6 text-center rounded-2xl bg-[var(--color-surface-secondary)]/50">
            No comments yet. Be the first to reply!
          </p>
        ) : (
          renderComments(topLevel, 0)
        )}
      </div>

      {isMember && (
        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl p-4 sm:p-5">
          {replyTo && (
            <p className="text-xs text-[var(--color-text-muted)] mb-2">
              Replying to comment · <button type="button" onClick={() => { setReplyTo(null); setBody(""); }} className="text-[var(--color-accent)] hover:underline">Cancel</button>
            </p>
          )}
          <div className="flex gap-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a comment..."
              rows={2}
              className="flex-1 min-h-[44px] px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 touch-manipulation"
            />
            <Button type="submit" disabled={isPending || !body.trim()} size="icon" className="shrink-0 h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl touch-manipulation">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
