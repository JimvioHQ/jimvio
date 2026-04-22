"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, TrendingUp, Clock, Award, RefreshCw, Plus, Flame } from "lucide-react";
import { UGCPostCard, type UGCPost } from "./ugc-post-card";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type FeedSort = "latest" | "trending" | "top";

interface UGCFeedProps {
  initialPosts?: UGCPost[];
  currentUserId?: string | null;
  hashtag?: string;
  productId?: string;
  showSortBar?: boolean;
  className?: string;
}

const SORT_TABS: { value: FeedSort; label: string; icon: React.ReactNode }[] = [
  { value: "latest", label: "Latest", icon: <Clock className="h-3.5 w-3.5" /> },
  { value: "trending", label: "Trending", icon: <Flame className="h-3.5 w-3.5" /> },
  { value: "top", label: "Top", icon: <Award className="h-3.5 w-3.5" /> },
];

const PAGE_SIZE = 12;

// ─────────────────────────────────────────────────────────────
// SKELETON CARD
// ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-none overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-9 h-9 rounded-none bg-[var(--color-surface-secondary)]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-[var(--color-surface-secondary)] rounded-none w-32" />
          <div className="h-2.5 bg-[var(--color-surface-secondary)] rounded-none w-20" />
        </div>
      </div>
      <div className="mx-4 mb-3 aspect-[4/3] rounded-none bg-[var(--color-surface-secondary)]" />
      <div className="px-4 space-y-2 mb-4">
        <div className="h-3 bg-[var(--color-surface-secondary)] rounded-none w-full" />
        <div className="h-3 bg-[var(--color-surface-secondary)] rounded-none w-3/4" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export function UGCFeed({
  initialPosts = [],
  currentUserId,
  hashtag,
  productId,
  showSortBar = true,
  className,
}: UGCFeedProps) {
  const [posts, setPosts] = useState<UGCPost[]>(initialPosts);
  const [sort, setSort] = useState<FeedSort>("latest");
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(initialPosts.length);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ─── Fetch posts ─────────────────────────────────────────
  const fetchPosts = useCallback(
    async (opts: { sort: FeedSort; offset: number; reset?: boolean }) => {
      if (opts.reset) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          sort: opts.sort,
          limit: String(PAGE_SIZE),
          offset: String(opts.offset),
          ...(hashtag && { hashtag }),
          ...(productId && { productId }),
        });
        const res = await fetch(`/api/ugc/posts?${params}`);
        const { data } = await res.json();
        const fetched: UGCPost[] = data ?? [];

        setPosts((prev) => (opts.reset ? fetched : [...prev, ...fetched]));
        setHasMore(fetched.length === PAGE_SIZE);
        setOffset(opts.offset + fetched.length);
      } catch {
        // silent
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [hashtag, productId]
  );

  // ─── Sort change ─────────────────────────────────────────
  const handleSortChange = useCallback(
    (newSort: FeedSort) => {
      setSort(newSort);
      setOffset(0);
      fetchPosts({ sort: newSort, offset: 0, reset: true });
    },
    [fetchPosts]
  );

  // ─── Initial load ─────────────────────────────────────────
  useEffect(() => {
    if (initialPosts.length === 0) {
      fetchPosts({ sort, offset: 0, reset: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Infinite scroll via IntersectionObserver ─────────────
  useEffect(() => {
    if (!sentinelRef.current) return;
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          fetchPosts({ sort, offset });
        }
      },
      { rootMargin: "300px" }
    );
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [fetchPosts, hasMore, loading, loadingMore, offset, sort]);

  const handleDelete = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleRefresh = useCallback(() => {
    setOffset(0);
    fetchPosts({ sort, offset: 0, reset: true });
  }, [fetchPosts, sort]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Sort bar */}
      {showSortBar && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-none bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
            {SORT_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleSortChange(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-none text-xs font-semibold transition-all",
                  sort === tab.value
                    ? "bg-[var(--color-accent)] text-white shadow-none"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-none text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-all active:scale-95"
            title="Refresh feed"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      )}

      {/* Skeleton loading state */}
      {loading && (
        <div className="columns-1 sm:columns-2 gap-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="break-inside-avoid mb-4">
              <SkeletonCard />
            </div>
          ))}
        </div>
      )}

      {/* Post Feed — Masonry-style using CSS columns */}
      {!loading && posts.length > 0 && (
        <div className="columns-1 sm:columns-2 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="break-inside-avoid mb-4">
              <UGCPostCard
                post={post}
                currentUserId={currentUserId}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-none bg-[var(--color-surface-secondary)] flex items-center justify-center text-3xl mb-4">
            📸
          </div>
          <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1">No posts yet</h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xs">
            {hashtag ? `No posts tagged #${hashtag} yet.` : "Be the first to post something here!"}
          </p>
        </div>
      )}

      {/* Load more indicator / Sentinel */}
      <div ref={sentinelRef} className="py-4 flex justify-center">
        {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" />}
        {!hasMore && posts.length > 0 && !loadingMore && (
          <p className="text-xs text-[var(--color-text-muted)]">You've seen everything âœ¨</p>
        )}
      </div>
    </div>
  );
}

