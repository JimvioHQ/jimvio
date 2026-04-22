"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  ShoppingBag, Tag, ExternalLink, Flag, Trash2, CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TYPES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface UGCPostProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  images: unknown;
}

export interface UGCPostAuthor {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export interface UGCPostMedia {
  url: string;
  type: "image" | "video";
  thumbnail?: string;
}

export interface UGCPost {
  id: string;
  caption: string | null;
  media: UGCPostMedia[];
  post_type: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  is_featured?: boolean;
  created_at: string;
  profiles: UGCPostAuthor;
  ugc_post_product_tags?: Array<{ products: UGCPostProduct }>;
  ugc_post_hashtags?: Array<{ ugc_hashtags: { id: string; tag: string } }>;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HELPERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getProductImage(images: unknown): string | null {
  if (!images) return null;
  const arr = Array.isArray(images) ? images : [];
  if (arr.length === 0) return null;
  const first = arr[0];
  if (typeof first === "string") return first;
  if (typeof first === "object" && first !== null) {
    const obj = first as Record<string, unknown>;
    return (obj.url ?? obj.src ?? null) as string | null;
  }
  return null;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MEDIA CAROUSEL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MediaCarousel({ media }: { media: UGCPostMedia[] }) {
  const [index, setIndex] = useState(0);
  if (media.length === 0) return null;

  const current = media[index];
  return (
    <div className="relative overflow-hidden bg-black/5 rounded-none">
      {current.type === "video" ? (
        <video
          src={current.url}
          poster={current.thumbnail}
          controls
          playsInline
          className="w-full max-h-[520px] object-contain"
        />
      ) : (
        <div className="relative w-full aspect-[4/3]">
          <Image
            src={current.url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover rounded-none"
          />
        </div>
      )}
      {media.length > 1 && (
        <>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={cn(
                  "w-1.5 h-1.5 rounded-none transition-all",
                  i === index ? "bg-white dark:bg-surface w-4" : "bg-white dark:bg-surface/50"
                )}
              />
            ))}
          </div>
          {index > 0 && (
            <button
              onClick={() => setIndex((i) => i - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-none bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              "¹
            </button>
          )}
          {index < media.length - 1 && (
            <button
              onClick={() => setIndex((i) => i + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-none bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              "º
            </button>
          )}
        </>
      )}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PRODUCT STRIP
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProductStrip({ tags }: { tags: Array<{ products: UGCPostProduct }> }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex gap-2 flex-wrap mt-2">
      {tags.slice(0, 3).map(({ products: p }) => {
        const img = getProductImage(p.images);
        return (
          <Link
            key={p.id}
            href={`/marketplace/product/${p.slug}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-none bg-[var(--color-surface-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent-light)] transition-all group text-xs font-medium"
          >
            {img && (
              <Image src={img} alt={p.name} width={20} height={20} className="w-5 h-5 rounded-none object-cover" />
            )}
            <Tag className="h-3 w-3 text-[var(--color-accent)]" />
            <span className="text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] truncate max-w-[120px]">
              {p.name}
            </span>
            <span className="text-[var(--color-text-muted)]">
              {p.currency} {Number(p.price).toLocaleString()}
            </span>
          </Link>
        );
      })}
      {tags.length > 3 && (
        <span className="flex items-center px-3 py-1.5 rounded-none bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] text-xs border border-[var(--color-border)]">
          +{tags.length - 3} more
        </span>
      )}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CAPTION WITH HASHTAG LINKS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Caption({ text }: { text: string | null }) {
  if (!text) return null;
  const MAX = 200;
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? text : text.slice(0, MAX);
  const parts = shown.split(/(\#\w+)/g);
  return (
    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed break-words mt-2">
      {parts.map((part, i) =>
        /^\#\w+$/.test(part) ? (
          <Link key={i} href={`/ugc?hashtag=${part.slice(1)}`} className="text-[var(--color-accent)] hover:underline font-medium">
            {part}
          </Link>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
      {!expanded && text.length > MAX && (
        <button onClick={() => setExpanded(true)} className="text-[var(--color-text-muted)] ml-1 hover:text-[var(--color-accent)] text-xs font-medium">
          …more
        </button>
      )}
    </p>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN CARD COMPONENT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface UGCPostCardProps {
  post: UGCPost;
  currentUserId?: string | null;
  onDelete?: (id: string) => void;
  className?: string;
}

export function UGCPostCard({ post, currentUserId, onDelete, className }: UGCPostCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [liking, setLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reported, setReported] = useState(false);
  const [copied, setCopied] = useState(false);

  const author = post.profiles;
  const tags = post.ugc_post_product_tags ?? [];
  const hashtags = (post.ugc_post_hashtags ?? []).map((h) => h.ugc_hashtags);
  const isOwner = currentUserId === author.id;

  const handleLike = useCallback(async () => {
    if (liking) return;
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      await fetch(`/api/ugc/posts/${post.id}/like`, { method: "POST" });
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
    } finally {
      setLiking(false);
    }
  }, [liked, liking, post.id]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/ugc/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: author.full_name ?? "Check this out on Jimvio" });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  }, [post.id, author.full_name]);

  const handleReport = useCallback(async () => {
    if (reported) return;
    try {
      await fetch("/api/ugc/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, reason: "spam" }),
      });
      setReported(true);
      setShowMenu(false);
    } catch {}
  }, [post.id, reported]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this post?")) return;
    try {
      await fetch(`/api/ugc/posts/${post.id}`, { method: "DELETE" });
      onDelete?.(post.id);
    } catch {}
  }, [post.id, onDelete]);

  return (
    <article
      className={cn(
        "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-none overflow-hidden transition-shadow hover:shadow-none",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link href={`/dashboard/settings`} className="flex items-center gap-2.5 group">
          <Avatar className="h-9 w-9">
            <AvatarImage src={author.avatar_url ?? ""} />
            <AvatarFallback className="bg-[var(--color-accent-light)] text-[var(--color-accent)] text-sm font-bold">
              {(author.full_name ?? author.username ?? "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                {author.full_name ?? author.username ?? "Creator"}
              </span>
              {author.is_verified && (
                <CheckCircle className="h-3.5 w-3.5 text-[var(--color-accent)] fill-[var(--color-accent)]" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
              {post.post_type !== "post" && (
                <Badge className="text-[10px] py-0 px-1.5 font-medium capitalize" variant="secondary">
                  {post.post_type}
                </Badge>
              )}
              {post.is_featured && (
                <Badge className="text-[10px] py-0 px-1.5 font-medium bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-900/50">
                  Featured
                </Badge>
              )}
            </div>
          </div>
        </Link>

        <div className="relative">
          <button
            onClick={() => setShowMenu((s) => !s)}
            className="p-2 rounded-none text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-9 z-50 w-44 rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] shadow-none py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              {isOwner && (
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="h-4 w-4" /> Delete post
                </button>
              )}
              <button
                onClick={handleReport}
                disabled={reported}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors disabled:opacity-50"
              >
                <Flag className="h-4 w-4" />
                {reported ? "Reported" : "Report content"}
              </button>
              <Link
                href={`/marketplace`}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                onClick={() => setShowMenu(false)}
              >
                <ExternalLink className="h-4 w-4" /> Browse products
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="px-4 pb-2">
          <MediaCarousel media={post.media} />
        </div>
      )}

      {/* Caption */}
      <div className="px-4 pb-2">
        <Caption text={post.caption} />
      </div>

      {/* Hashtags row */}
      {hashtags.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {hashtags.slice(0, 8).map((h) => (
            <Link
              key={h.id}
              href={`/ugc?hashtag=${h.tag}`}
              className="text-xs text-[var(--color-accent)] font-medium hover:underline"
            >
              #{h.tag}
            </Link>
          ))}
        </div>
      )}

      {/* Product tags */}
      <div className="px-4 pb-3">
        <ProductStrip tags={tags} />
      </div>

      {/* Actions bar */}
      <div className="px-4 pb-4 flex items-center justify-between border-t border-[var(--color-border)]/60 pt-3">
        <div className="flex items-center gap-1">
          {/* Like */}
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-none text-sm font-medium transition-all active:scale-95",
              liked
                ? "text-red-500 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <Heart className={cn("h-4 w-4 transition-all", liked && "fill-red-500 scale-110")} />
            <span>{formatCount(likeCount)}</span>
          </button>

          {/* Comment */}
          <Link
            href={`/ugc/${post.id}#comments`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-none text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{formatCount(post.comment_count ?? 0)}</span>
          </Link>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-none text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-all"
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            <span>{copied ? "Copied!" : formatCount(post.share_count ?? 0)}</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {tags.length > 0 && (
            <Link
              href={`/marketplace/product/${tags[0].products.slug}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-none text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-accent-light)] hover:bg-[var(--color-accent)] hover:text-white transition-all"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Shop now
            </Link>
          )}
          <button className="p-2 rounded-none text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <Bookmark className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

