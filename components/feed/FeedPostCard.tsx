"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Eye,
  Flame,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pin,
  RefreshCw,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/feed/PersonAvatar";
import { BlueVerifiedBadge } from "@/components/verification/BlueVerifiedBadge";
import { PresenceAvatarFrame } from "@/components/presence/PresenceAvatarFrame";
import { resolveFeedPublisher } from "@/lib/feed/post-identity";
import { CommunityVideoPlayer } from "@/components/community/CommunityVideoPlayer";
import { toPlayableCommunityVideoUrl } from "@/lib/community-chat-upload";
import type { FeedTab } from "@/lib/feed/mock-data";
import { FEED_TAB_FILTERS } from "@/lib/feed/tab-filters";
import { useFeedUser } from "@/lib/feed/use-feed-user";
import { jimvioPromotionLabel } from "@/lib/community/editorial-origin";
import {
  consumeSessionBoostPost,
  prependUniqueById,
} from "@/lib/feed/session-boost-post";
import {
  FEED_HEAD_SIZE,
  rememberFeedHead,
  wasFeedSessionShown,
} from "@/lib/feed/feed-session-head";
import { usePostViewTracker } from "@/lib/feed/use-post-view-tracker";
import { FeedCommentSheet } from "@/components/feed/FeedCommentSheet";
import { PostRichText } from "@/components/feed/PostRichText";
import { PostShareMenu } from "@/components/feed/PostShareMenu";
import {
  FeedInlineModule,
  feedModuleAtIndex,
} from "@/components/feed/FeedInlineModule";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChangesMany,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";


export type ApiPost = {
  id: string;
  body: string | null;
  title?: string | null;
  images?: string[] | null;
  video_url?: string | null;
  is_pinned?: boolean | null;
  like_count?: number | null;
  comment_count?: number | null;
  share_count?: number | null;
  view_count?: number | null;
  unique_view_count?: number | null;
  created_at?: string | null;
  user_has_liked?: boolean | null;
  community_id?: string | null;
  attachments?: Record<string, unknown> | null;
  communities?: {
    slug?: string | null;
    name?: string | null;
    avatar_url?: string | null;
  } | null;
  profiles?: {
    full_name?: string | null;
    avatar_url?: string | null;
    username?: string | null;
    is_verified?: boolean | null;
  } | null;
  author_id?: string | null;
};

type DisplayPost = {
  id: string;
  author: {
    name: string;
    handle: string;
    username: string | null;
    profileHref: string | null;
    verified: boolean;
    avatar: string | null;
    kind: "profile" | "community";
    userId: string | null;
  };
  timestamp: string;
  pinned: boolean;
  body: string;
  media:
    | {
        type: "video";
        duration: string;
        thumbnail: string;
        src: string;
        overlay?: { title: string; subtitle: string };
      }
    | { type: "image"; thumbnail: string }
    | null;
  engagement: {
    likes: number | string;
    comments: number;
    views: number;
    /** Internal only — never shown on the feed card. */
    shares: number;
  };
  liked?: boolean;
  href?: string;
  title?: string | null;
  promotionLabel?: string | null;
  communityName?: string | null;
  communitySlug?: string | null;
  communityId?: string | null;
};

function mapApiPost(post: ApiPost): DisplayPost {
  const name = post.profiles?.full_name || post.profiles?.username || "Member";
  const username = post.profiles?.username;
  const images = Array.isArray(post.images) ? post.images.filter(Boolean) : [];
  const video = post.video_url?.trim() || null;
  let media: DisplayPost["media"] = null;
  if (video) {
    media = {
      type: "video",
      duration: "",
      thumbnail: images[0] || "",
      src: toPlayableCommunityVideoUrl(video),
    };
  } else if (images[0]) {
    media = { type: "image", thumbnail: images[0] };
  }

  const publisher = resolveFeedPublisher({
    attachments: post.attachments,
    profile: {
      name,
      username: username ?? null,
      avatar: post.profiles?.avatar_url ?? null,
    },
    community: post.communities
      ? {
          name: post.communities.name ?? null,
          slug: post.communities.slug ?? null,
          avatar: post.communities.avatar_url ?? null,
        }
      : null,
  });

  return {
    id: post.id,
    author: {
      name: publisher.name,
      handle: publisher.handle,
      username: publisher.kind === "profile" ? (username ?? null) : null,
      profileHref: publisher.href,
      verified: post.profiles?.is_verified === true,
      avatar: publisher.avatar,
      kind: publisher.kind,
      userId: publisher.kind === "profile" ? post.author_id ?? null : null,
    },
    timestamp: post.created_at
      ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
      : "",
    pinned: Boolean(post.is_pinned),
    title: post.title?.trim() || null,
    body: (post.body || "").trim() || (post.title || "").trim(),
    promotionLabel: jimvioPromotionLabel(post.attachments),
    media,
    engagement: {
      likes: post.like_count ?? 0,
      comments: post.comment_count ?? 0,
      // Authoritative aggregate on the post row (legacy baselines + new events).
      views: Number(post.view_count ?? post.unique_view_count ?? 0) || 0,
      shares: post.share_count ?? 0,
    },
    liked: Boolean(post.user_has_liked),
    communityName: post.communities?.name ?? null,
    communitySlug: post.communities?.slug ?? null,
    communityId: post.community_id ?? null,
    href: post.communities?.slug
      ? `/communities/${post.communities.slug}/feed?post=${post.id}`
      : `/communities/feed?post=${post.id}`,
  };
}

function FeedVideoPlayer({
  src,
  poster,
}: {
  src: string;
  poster?: string;
}) {
  return (
    <CommunityVideoPlayer
      src={src}
      poster={poster || null}
      className="rounded-2xl border-0"
    />
  );
}

function formatEngagement(value: number | string): string {
  if (typeof value === "string") return value;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}

function AuthorAvatar({
  name,
  url,
  className,
}: {
  name: string;
  url: string | null;
  className?: string;
}) {
  return <PersonAvatar name={name} url={url} className={cn("h-10 w-10", className)} />;
}

function HubFeedArticle({
  post,
  index,
  shareOpen,
  likePending = false,
  onToggleLike,
  onOpenComments,
  onOpenShare,
  onCloseShare,
  onViewCount,
}: {
  post: DisplayPost;
  index: number;
  shareOpen: boolean;
  likePending?: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onOpenShare: () => void;
  onCloseShare: () => void;
  onViewCount: (views: number) => void;
}) {
  const viewRef = usePostViewTracker<HTMLElement>(post.id, (count, recorded) => {
    if (recorded && typeof count === "number") onViewCount(count);
  });

  return (
    <article
      ref={viewRef}
      className="bg-transparent px-0.5 py-3.5 transition-colors first:pt-3 hover:bg-[var(--color-surface)]/40"
    >
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {post.author.profileHref ? (
            <Link
              href={post.author.profileHref}
              aria-label={
                post.author.kind === "community"
                  ? `Open ${post.author.name}`
                  : `View ${post.author.name}'s profile`
              }
              className="mt-0.5 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/50"
              onClick={(e) => e.stopPropagation()}
            >
              <PresenceAvatarFrame userId={post.author.userId}>
                <AuthorAvatar name={post.author.name} url={post.author.avatar} />
              </PresenceAvatarFrame>
            </Link>
          ) : (
            <PresenceAvatarFrame userId={post.author.userId} className="mt-0.5 shrink-0">
              <AuthorAvatar name={post.author.name} url={post.author.avatar} />
            </PresenceAvatarFrame>
          )}
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {post.author.profileHref ? (
                <Link
                  href={post.author.profileHref}
                  aria-label={
                    post.author.kind === "community"
                      ? `Open ${post.author.name}`
                      : `View ${post.author.name}'s profile`
                  }
                  className="min-w-0 break-words text-[14px] font-semibold leading-none text-gray-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40 rounded-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.author.name}
                </Link>
              ) : (
                <span className="min-w-0 break-words text-[14px] font-semibold leading-none text-gray-900">
                  {post.author.name}
                </span>
              )}
              <BlueVerifiedBadge verified={post.author.verified} size="sm" label="Verified account" />
              {post.author.profileHref ? (
                <Link
                  href={post.author.profileHref}
                  className="text-[12px] text-gray-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.author.handle}
                </Link>
              ) : (
                <span className="text-[12px] text-gray-400">{post.author.handle}</span>
              )}
              <span className="text-[12px] text-gray-300">·</span>
              <span className="text-[12px] text-gray-400">{post.timestamp}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {post.author.kind !== "community" && post.communitySlug && post.communityName ? (
                <Link
                  href={`/communities/${post.communitySlug}`}
                  className="text-[12px] font-medium text-[#fd5000] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40 rounded-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.communityName}
                </Link>
              ) : null}
              {post.pinned && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-600">
                  <Pin className="h-3 w-3" />
                  Pinned
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Post options"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="min-w-0 pl-0 sm:pl-[52px]">
        {post.promotionLabel && (
          <span className="mb-2 inline-flex rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
            {post.promotionLabel}
          </span>
        )}
        {post.title && (
          <h3 className="mb-1 min-w-0 break-words text-[15px] font-semibold leading-snug text-gray-900 dark:text-[var(--color-text-primary)]">
            {post.title}
          </h3>
        )}
        {post.body ? (
          <PostRichText
            text={post.body}
            collapsible
            className="mb-2.5 min-w-0 break-words text-[14px] leading-relaxed text-gray-800 dark:text-[var(--color-text-primary)] whitespace-pre-wrap"
          />
        ) : null}

        {post.media?.type === "video" && (
          <div className="mb-2.5 overflow-hidden rounded-2xl">
            <FeedVideoPlayer
              src={post.media.src}
              poster={post.media.thumbnail || undefined}
            />
          </div>
        )}
        {post.media?.type === "image" && (
          <div className="mb-2.5 overflow-hidden rounded-2xl bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.media.thumbnail}
              alt={post.body.slice(0, 80) || post.author.name}
              loading={index < 2 ? "eager" : "lazy"}
              decoding="async"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
              className="max-h-[70vh] w-full object-contain"
            />
          </div>
        )}

        {/* Views · Likes · Comments · Share (no share count) */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <span
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium text-gray-500"
            aria-label={`${formatEngagement(post.engagement.views)} views`}
          >
            <Eye className="h-4 w-4" aria-hidden />
            {formatEngagement(post.engagement.views)}
          </span>
          <button
            type="button"
            onClick={onToggleLike}
            disabled={likePending}
            aria-busy={likePending || undefined}
            aria-label={post.liked ? "Unlike post" : "Like post"}
            aria-pressed={post.liked}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40 disabled:pointer-events-none disabled:opacity-60",
              post.liked ? "text-red-500" : "text-gray-500",
            )}
          >
            <Heart
              className={cn("h-4 w-4", post.liked ? "fill-red-500 text-red-500" : "")}
            />
            {formatEngagement(post.engagement.likes)}
          </button>
          <button
            type="button"
            onClick={onOpenComments}
            aria-label={`Comments (${post.engagement.comments})`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium text-gray-500 transition-colors hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
          >
            <MessageCircle className="h-4 w-4" />
            {formatEngagement(post.engagement.comments)}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={onOpenShare}
              aria-label="Share post"
              aria-expanded={shareOpen}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-2.5 text-[12px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <PostShareMenu
              postId={post.id}
              permalinkPath={post.href ?? `/communities/feed?post=${post.id}`}
              defaultCommunityId={post.communityId}
              open={shareOpen}
              onClose={onCloseShare}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function FeedPostCard({
  tab = "For You",
  initialPosts = [],
  initialNextCursor = null,
  initialSessionCursor = null,
  initialAvoidIds = [],
  tag = null,
}: {
  tab?: FeedTab;
  initialPosts?: ApiPost[];
  initialNextCursor?: string | null;
  /** Offset-0 cursor of the SSR feed session (seed + asOf). */
  initialSessionCursor?: string | null;
  /** Previous-session head ids the SSR ranking kept out of the top slots. */
  initialAvoidIds?: string[];
  tag?: string | null;
}) {
  const router = useRouter();
  const { isAuthenticated } = useFeedUser();
  const [posts, setPosts] = useState<DisplayPost[]>(() => initialPosts.map(mapApiPost));
  /** Avoid list for the current feed session — resent on every page of it. */
  const avoidRef = useRef<string[]>(initialAvoidIds);
  const [sessionKey, setSessionKey] = useState<string | null>(initialSessionCursor);
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(Boolean(initialNextCursor));
  const [loadError, setLoadError] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [pendingNewCount, setPendingNewCount] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const refreshingRef = useRef(false);
  const cursorRef = useRef<string | null>(initialNextCursor);
  const abortRef = useRef<AbortController | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set(initialPosts.map((p) => p.id)));
  const pullStartY = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const likeInFlightRef = useRef<Set<string>>(new Set());
  const postsRef = useRef<DisplayPost[]>(posts);
  postsRef.current = posts;
  /** Re-render gate so Like stays disabled while a request is in flight. */
  const [likingPostIds, setLikingPostIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const filter = FEED_TAB_FILTERS[tab];
  const load = useCallback(async (nextCursor?: string | null, opts?: { soft?: boolean; refresh?: boolean }) => {
    // Soft/refresh may pass a session seed cursor (bucket:0:asOf) — that is a
    // replace, not infinite-scroll append.
    const isMore = Boolean(nextCursor) && !opts?.soft && !opts?.refresh;
    const isRefresh = Boolean(opts?.refresh);
    if (isMore) {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else if (isRefresh) {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      setRefreshing(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();
    } else if (!opts?.soft) {
      setLoading(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();
    }
    try {
      // A fresh (non-paginating) load starts a new feed session: keep what
      // the viewer is looking at right now out of the new session's head.
      if (!isMore && !opts?.soft) {
        const head = postsRef.current.slice(0, FEED_HEAD_SIZE).map((p) => p.id);
        if (head.length) avoidRef.current = head;
      }
      const params = new URLSearchParams({ limit: "20", filter });
      if (tag) params.set("tag", tag);
      if (nextCursor) params.set("cursor", nextCursor);
      if (!tag && avoidRef.current.length) params.set("avoid", avoidRef.current.join("."));
      let timer: number | undefined;
      const res = await new Promise<Response>((resolve, reject) => {
        timer = window.setTimeout(() => {
          abortRef.current?.abort();
          reject(new Error("feed-timeout"));
        }, 12_000);
        fetch(`/api/posts/feed?${params}`, {
          cache: "no-store",
          signal: abortRef.current?.signal,
        }).then(resolve, reject);
      }).finally(() => {
        if (timer != null) window.clearTimeout(timer);
      });
      if (res.status === 401) {
        if (!isMore && !opts?.soft) {
          setPosts([]);
          setHasMore(false);
          cursorRef.current = null;
          setCursor(null);
          setLoadError(true);
        }
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!isMore && !opts?.soft) {
          setPosts([]);
          setLoadError(true);
        }
        if (!opts?.soft) toast.error(data.error || "Failed to load feed");
        return;
      }
      const mapped = ((data.posts ?? []) as ApiPost[]).map(mapApiPost);
      setLoadError(false);
      setPosts((prev) => {
        if (!isMore) {
          const boostRaw = tag ? null : consumeSessionBoostPost<ApiPost>();
          const boost = boostRaw ? mapApiPost(boostRaw) : null;
          const next = prependUniqueById(mapped, boost);
          knownIdsRef.current = new Set(next.map((p) => p.id));
          return next;
        }
        const seen = new Set(prev.map((p) => p.id));
        const appended = mapped.filter((p) => !seen.has(p.id));
        for (const p of appended) knownIdsRef.current.add(p.id);
        return [...prev, ...appended];
      });
      if (!isMore) {
        setPendingNewCount(0);
        const sessionCursor = (data.session_cursor as string | null | undefined) ?? null;
        setSessionKey(sessionCursor ?? `client:${Date.now()}`);
        if (sessionCursor) wasFeedSessionShown(sessionCursor);
      }
      const next = (data.next_cursor as string | null | undefined) ?? null;
      cursorRef.current = next;
      setHasMore(Boolean(next));
      setCursor(next);
    } catch (err) {
      if (err instanceof Error && err.message === "feed-timeout") {
        if (!isMore && !opts?.soft) setLoadError(true);
        return;
      }
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!isMore && !opts?.soft) {
        setPosts([]);
        setLoadError(true);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      loadingMoreRef.current = false;
      refreshingRef.current = false;
      setPullDistance(0);
    }
  }, [filter, tag]);

  useEffect(() => {
    // Hashtag views are a filtered keyset, not a ranked session.
    if (tag) {
      if (initialPosts.length === 0) void load();
      return;
    }
    if (initialPosts.length > 0 && filter === FEED_TAB_FILTERS["For You"]) {
      // SSR already rendered a complete, ranked first page with like state —
      // no second fetch. Back/Forward can restore an already-seen session
      // payload; then start a fresh session so the feed visibly rotates.
      if (wasFeedSessionShown(initialSessionCursor)) {
        void load(undefined, { refresh: true });
        return;
      }
      const boostRaw = consumeSessionBoostPost<ApiPost>();
      if (boostRaw) {
        const boost = mapApiPost(boostRaw);
        knownIdsRef.current.add(boost.id);
        setPosts((prev) => prependUniqueById(prev, boost));
      }
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, initialPosts.length, filter, initialSessionCursor]);

  // Remember the head of each displayed session so the next visit opens fresh.
  useEffect(() => {
    if (tag || !sessionKey) return;
    const head = postsRef.current.slice(0, FEED_HEAD_SIZE).map((p) => p.id);
    if (head.length) rememberFeedHead(head);
  }, [sessionKey, tag]);

  // bfcache restore: explicit refresh mints a fresh session (new ranking seed).
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) void load(undefined, { refresh: true });
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [load]);

  // Realtime: update engagement on visible posts; banner for brand-new inserts.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: Awaited<ReturnType<typeof subscribePostgresChangesMany>> = null;

    void (async () => {
      channel = await subscribePostgresChangesMany(
        supabase,
        "hub-community-feed",
        [
          {
            config: { event: "INSERT", schema: "public", table: "community_posts" },
            onChange: (payload) => {
              const id = String(payload?.new?.id ?? "");
              if (!id || knownIdsRef.current.has(id)) return;
              if (payload?.new?.is_published === false) return;
              setPendingNewCount((n) => n + 1);
            },
          },
          {
            config: { event: "UPDATE", schema: "public", table: "community_posts" },
            onChange: (payload) => {
              const id = String(payload?.new?.id ?? "");
              if (!id) return;
              const likeCount = Number(payload?.new?.like_count);
              const commentCount = Number(payload?.new?.comment_count);
              const shareCount = Number(payload?.new?.share_count);
              const viewCount = Number(payload?.new?.view_count);
              const archived = payload?.new?.archived_at != null;
              const unpublished = payload?.new?.is_published === false;
              if (archived || unpublished) {
                knownIdsRef.current.delete(id);
                setPosts((prev) => prev.filter((p) => p.id !== id));
                return;
              }
              setPosts((prev) =>
                prev.map((p) => {
                  if (p.id !== id) return p;
                  // Don't overwrite an in-flight optimistic like with stale counts.
                  if (likeInFlightRef.current.has(id)) return p;
                  return {
                    ...p,
                    engagement: {
                      likes: Number.isFinite(likeCount) ? likeCount : p.engagement.likes,
                      comments: Number.isFinite(commentCount)
                        ? commentCount
                        : p.engagement.comments,
                      views: Number.isFinite(viewCount) ? viewCount : p.engagement.views,
                      shares: Number.isFinite(shareCount) ? shareCount : p.engagement.shares,
                    },
                  };
                }),
              );
            },
          },
          {
            config: { event: "DELETE", schema: "public", table: "community_posts" },
            onChange: (payload) => {
              const id = String(payload?.old?.id ?? "");
              if (!id) return;
              knownIdsRef.current.delete(id);
              setPosts((prev) => prev.filter((p) => p.id !== id));
            },
          },
        ],
        () => cancelled,
      );
    })();

    return () => {
      cancelled = true;
      void unsubscribeRealtime(supabase, channel);
    };
  }, []);

  // Mobile pull-to-refresh
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const THRESHOLD = 64;
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 4 || refreshingRef.current) {
        pullStartY.current = null;
        return;
      }
      pullStartY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pullStartY.current == null) return;
      const y = e.touches[0]?.clientY ?? 0;
      const delta = Math.max(0, Math.min(96, y - pullStartY.current));
      if (delta > 8 && window.scrollY <= 0) {
        pullDistanceRef.current = delta;
        setPullDistance(delta);
      }
    };
    const onTouchEnd = () => {
      if (pullStartY.current == null) return;
      const shouldRefresh = pullDistanceRef.current >= THRESHOLD;
      pullStartY.current = null;
      pullDistanceRef.current = 0;
      if (shouldRefresh) {
        void load(undefined, { refresh: true });
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [load]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        const next = cursorRef.current;
        if (!next || loadingMoreRef.current) return;
        void load(next);
      },
      { rootMargin: "320px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, load]);

  async function toggleLike(postId: string) {
    const next =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/communities";
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (likeInFlightRef.current.has(postId)) return;
    likeInFlightRef.current.add(postId);
    setLikingPostIds((prev) => {
      const nextSet = new Set(prev);
      nextSet.add(postId);
      return nextSet;
    });

    const snapshot = posts.find((p) => p.id === postId);
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const liked = !p.liked;
        const likes =
          typeof p.engagement.likes === "number"
            ? Math.max(0, p.engagement.likes + (liked ? 1 : -1))
            : p.engagement.likes;
        return {
          ...p,
          liked,
          engagement: { ...p.engagement, likes },
        };
      })
    );
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        liked?: boolean;
        like_count?: number | null;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not update like");
      }
      // Reconcile optimistic UI with authoritative server state.
      if (typeof data.liked === "boolean") {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            const serverCount = Number(data.like_count);
            const likes =
              Number.isFinite(serverCount) && serverCount >= 0
                ? Math.floor(serverCount)
                : (() => {
                    const wasLiked = Boolean(snapshot?.liked);
                    return typeof p.engagement.likes === "number"
                      ? Math.max(
                          0,
                          Number(snapshot?.engagement.likes ?? p.engagement.likes) +
                            (data.liked === wasLiked ? 0 : data.liked ? 1 : -1),
                        )
                      : p.engagement.likes;
                  })();
            return {
              ...p,
              liked: data.liked,
              engagement: { ...p.engagement, likes },
            };
          }),
        );
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not update like");
      if (snapshot) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? snapshot : p)));
      }
    } finally {
      likeInFlightRef.current.delete(postId);
      setLikingPostIds((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(postId);
        return nextSet;
      });
    }
  }

  if (loading && posts.length === 0) {
    return (
      <div className="space-y-3 py-2" aria-busy="true" aria-label="Loading your community feed">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-neutral-200" />
              <div className="h-3 w-32 rounded bg-neutral-200" />
            </div>
            <div className="mt-4 h-3 w-full rounded bg-neutral-100" />
            <div className="mt-2 h-3 w-4/5 rounded bg-neutral-100" />
            <div className="mt-4 h-40 rounded-xl bg-neutral-100" />
          </div>
        ))}
        <p className="sr-only">Loading your community feed...</p>
      </div>
    );
  }

  if (!loading && loadError && posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
        <p className="text-[15px] font-bold text-[var(--color-text-primary)]">Unable to load the community feed.</p>
        <p className="mx-auto mt-1 max-w-sm break-words text-[13px] text-[var(--color-text-muted)]">
          Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#fd5000] px-4 text-[13px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
        <Flame className="mx-auto h-6 w-6 text-[#fd5000]" />
        <p className="mt-3 text-[15px] font-bold text-[var(--color-text-primary)]">
          {isAuthenticated ? "No posts yet." : "No public posts yet."}
        </p>
        <p className="mx-auto mt-1 max-w-sm break-words text-[13px] text-[var(--color-text-muted)]">
          {isAuthenticated
            ? "Public communities and member posts will show up here. This is an empty feed, not a failed load."
            : "Public communities are still here. This is an empty feed, not a failed load."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/communities/explore"
            className="inline-flex min-h-11 items-center rounded-xl bg-[#fd5000] px-4 text-[13px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
          >
            Explore communities
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
    <div ref={listRef} className="relative divide-y divide-gray-100">
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden text-gray-400 transition-[height] duration-150"
          style={{ height: refreshing ? 40 : Math.max(0, pullDistance * 0.55) }}
          aria-live="polite"
        >
          <Loader2
            className={cn("h-4 w-4", refreshing || pullDistance > 48 ? "animate-spin" : "")}
          />
        </div>
      )}
      {pendingNewCount > 0 && (
        <div className="sticky top-0 z-20 flex justify-center py-2">
          <button
            type="button"
            onClick={() => void load(undefined, { refresh: true })}
            className="rounded-full bg-[#FF5A1F] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
          >
            {pendingNewCount === 1 ? "1 new post" : `${pendingNewCount} new posts`}
          </button>
        </div>
      )}
      {posts.map((post, index) => {
        const moduleKind = feedModuleAtIndex(index);
        return (
          <div key={post.id}>
            <HubFeedArticle
              post={post}
              index={index}
              shareOpen={sharePostId === post.id}
              likePending={likingPostIds.has(post.id)}
              onToggleLike={() => void toggleLike(post.id)}
              onOpenComments={() => setCommentPostId(post.id)}
              onOpenShare={() =>
                setSharePostId((id) => (id === post.id ? null : post.id))
              }
              onCloseShare={() => setSharePostId(null)}
              onViewCount={(views) => {
                setPosts((prev) =>
                  prev.map((p) =>
                    p.id === post.id
                      ? { ...p, engagement: { ...p.engagement, views } }
                      : p,
                  ),
                );
              }}
            />
            {moduleKind ? <FeedInlineModule kind={moduleKind} /> : null}
          </div>
        );
      })}
      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
      {loadingMore && (
        <div className="flex justify-center py-5 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading more posts" />
        </div>
      )}
      {!loading && !loadingMore && !refreshing && !hasMore && posts.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-7 text-center">
          <p className="text-[12px] text-gray-400">You’re all caught up</p>
          {!tag ? (
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                void load(undefined, { refresh: true });
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[#fd5000]/40 hover:text-[#fd5000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh feed
            </button>
          ) : null}
        </div>
      )}
    </div>
    {commentPostId ? (
      <FeedCommentSheet
        postId={commentPostId}
        open
        onClose={() => setCommentPostId(null)}
        onCommentCountChange={(delta) => {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === commentPostId
                ? {
                    ...p,
                    engagement: {
                      ...p.engagement,
                      comments: Math.max(0, p.engagement.comments + delta),
                    },
                  }
                : p,
            ),
          );
        }}
      />
    ) : null}
    </>
  );
}
