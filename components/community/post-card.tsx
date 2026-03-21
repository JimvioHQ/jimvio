"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Pin, Loader2, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";
import { likePost, createPostComment, savePost } from "@/lib/actions/community";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: any;
  isMember: boolean;
  /** When set, title links to discussion thread and Share copies this URL */
  communitySlug?: string;
}

export function PostCard({ post, isMember, communitySlug }: PostCardProps) {
  const router = useRouter();
  const author = post.profiles;
  const comments = post.community_post_comments || [];
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [isPending, startTransition] = useTransition();

  const threadUrl = communitySlug ? `${typeof window !== "undefined" ? window.location.origin : ""}/communities/${communitySlug}/post/${post.id}` : null;
  const handleShare = () => {
    if (threadUrl) {
      navigator.clipboard.writeText(threadUrl);
      toast.success("Link copied to clipboard");
    } else {
      toast.info("Share link not available");
    }
  };
  const handleSave = () => {
    startTransition(async () => {
      const res = await savePost(post.id);
      if (res.success) toast.success("Saved for later");
      else toast.error(res.error ?? "Could not save");
    });
  };

  const handleLike = () => {
    if (!isMember) { toast.error("Join the community to interact"); return; }
    setLiked(!liked);
    setLikeCount((prev: number) => liked ? prev - 1 : prev + 1);
    startTransition(async () => {
      await likePost(post.id);
      router.refresh();
    });
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    startTransition(async () => {
      const res = await createPostComment(post.id, commentText.trim());
      if (res.success) {
        setCommentText("");
        router.refresh();
        toast.success("Comment added! 💬");
      } else {
        toast.error(res.error || "Failed to comment");
      }
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group">
      {/* Post Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10 border-2 border-[var(--color-border)] ring-2 ring-[var(--color-accent)]/10">
            <AvatarImage src={author?.avatar_url || ""} />
            <AvatarFallback className="bg-[var(--color-accent-light)] text-[var(--color-accent)] font-black text-sm">
              {author?.full_name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--color-text-primary)]">{author?.full_name || "Community Member"}</span>
              {post.is_pinned && (
                <span className="flex items-center gap-1 text-[9px] font-black text-[var(--color-accent)] bg-[var(--color-accent-light)] px-2 py-0.5 rounded-full capitalize tracking-wider">
                  <Pin className="h-2.5 w-2.5" /> Pinned
                </span>
              )} 
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)] font-medium">{timeAgo(post.created_at)}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Post Body */}
        {post.title && (
          <h3 className="text-lg font-black text-[var(--color-text-primary)] mb-2 leading-tight">
            {communitySlug ? (
              <Link href={`/communities/${communitySlug}/post/${post.id}`} className="hover:text-[var(--color-accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 rounded">
                {post.title}
              </Link>
            ) : (
              post.title
            )}
          </h3>
        )}
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap mb-4">
          {communitySlug ? (
            <Link href={`/communities/${communitySlug}/post/${post.id}`} className="block hover:opacity-90 focus:outline-none">
              {post.body.length > 200 ? `${post.body.slice(0, 200)}…` : post.body}
            </Link>
          ) : (
            post.body.length > 200 ? `${post.body.slice(0, 200)}…` : post.body
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="px-4 sm:px-6 py-3 border-t border-[var(--color-border)]/50 flex items-center gap-1 flex-wrap">
        <button
          onClick={handleLike}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            liked
              ? "text-red-500 bg-red-50 hover:bg-red-100"
              : "text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50"
          )}
        >
          <Heart className={cn("h-4 w-4 transition-all", liked && "fill-red-500 scale-110")} />
          {likeCount > 0 && likeCount}
        </button>
        {communitySlug ? (
          <Link
            href={`/communities/${communitySlug}/post/${post.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-50 transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            {comments.length > 0 && comments.length}
          </Link>
        ) : (
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-50 transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            {comments.length > 0 && comments.length}
          </button>
        )}
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-all"
        >
          <Share2 className="h-4 w-4" />
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-all"
        >
          <Bookmark className="h-4 w-4" />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-6 py-4 bg-[var(--color-surface-secondary)]/50 border-t border-[var(--color-border)]/30 space-y-4">
          {comments.map((comment: any) => (
            <div key={comment.id} className="flex items-start gap-3">
              <Avatar className="h-7 w-7 border border-[var(--color-border)]">
                <AvatarImage src={comment.profiles?.avatar_url || ""} />
                <AvatarFallback className="text-[9px] font-black bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                  {comment.profiles?.full_name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-white rounded-2xl px-4 py-2.5 border border-[var(--color-border)]/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">{comment.profiles?.full_name || "Member"}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{comment.body}</p>
              </div>
            </div>
          ))}

          {isMember && (
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  className="w-full h-10 px-4 pr-12 rounded-2xl bg-white border border-[var(--color-border)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all placeholder:text-[var(--color-text-muted)]"
                />
                <button
                  type="button"
                  onClick={handleComment}
                  disabled={isPending || !commentText.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-accent-hover)] transition-all"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
