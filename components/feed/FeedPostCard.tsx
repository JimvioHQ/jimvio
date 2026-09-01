"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Flame,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn, getInitials } from "@/lib/utils";
import { communityProfileHref } from "@/lib/community/profile-href";
import { CommunityVideoPlayer } from "@/components/community/CommunityVideoPlayer";
import { toPlayableCommunityVideoUrl } from "@/lib/community-chat-upload";
import type { FeedTab } from "@/lib/feed/mock-data";
import { FEED_TAB_FILTERS } from "@/lib/feed/tab-filters";
import { useFeedUser } from "@/lib/feed/use-feed-user";
import { jimvioPromotionLabel } from "@/lib/community/editorial-origin";

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
  created_at?: string | null;
  user_has_liked?: boolean | null;
  community_id?: string | null;
  attachments?: Record<string, unknown> | null;
  communities?: { slug?: string | null; name?: string | null } | null;
  profiles?: {
    full_name?: string | null;
    avatar_url?: string | null;
    username?: string | null;
  } | null;
};

type DisplayPost = {
  id: string;
  author: {
    name: string;
    handle: string;
    username: string | null;
    profileHref: string | null;
    level: number;
    verified: boolean;
    avatar: string | null;
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
    shares: number;
    socialProof?: {
      names: string[];
      avatars: string[];
      others: number;
    };
  };
  liked?: boolean;
  href?: string;
  title?: string | null;
  promotionLabel?: string | null;
  communityName?: string | null;
  communitySlug?: string | null;
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

  return {
    id: post.id,
    author: {
      name,
      handle: username ? `@${username}` : "@member",
      username: username ?? null,
      profileHref: communityProfileHref(username),
      level: 1,
      verified: false,
      avatar: post.profiles?.avatar_url ?? null,
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
      shares: post.share_count ?? 0,
    },
    liked: Boolean(post.user_has_liked),
    communityName: post.communities?.name ?? null,
    communitySlug: post.communities?.slug ?? null,
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
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className={cn("h-10 w-10 rounded-full object-cover", className)} />
    );
  }
  return (
    <span
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-600",
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}

export function FeedPostCard({
  tab = "For You",
  initialPosts = [],
  initialNextCursor = null,
}: {
  tab?: FeedTab;
  initialPosts?: ApiPost[];
  initialNextCursor?: string | null;
}) {
  const router = useRouter();
  const { isAuthenticated } = useFeedUser();
  const [posts, setPosts] = useState<DisplayPost[]>(() => initialPosts.map(mapApiPost));
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(Boolean(initialNextCursor));
  const [usingMock, setUsingMock] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filter = FEED_TAB_FILTERS[tab];
  const load = useCallback(async (nextCursor?: string | null) => {
    const isMore = Boolean(nextCursor);
    if (isMore) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20", filter });
      if (nextCursor) params.set("cursor", nextCursor);
      const res = await fetch(`/api/posts/feed?${params}`, { cache: "no-store" });
      if (res.status === 401) {
        if (!isMore) {
          setPosts([]);
          setUsingMock(false);
          setHasMore(false);
          setCursor(null);
          setLoadError(true);
        }
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!isMore) {
          setPosts([]);
          setUsingMock(false);
          setLoadError(true);
        }
        toast.error(data.error || "Failed to load feed");
        return;
      }
      const mapped = ((data.posts ?? []) as ApiPost[]).map(mapApiPost);
      setUsingMock(false);
      setLoadError(false);
      setPosts((prev) => {
        if (!isMore) return mapped;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...mapped.filter((p) => !seen.has(p.id))];
      });
      setHasMore(Boolean(data.next_cursor));
      setCursor(data.next_cursor ?? null);
    } catch {
      if (!isMore) {
        setPosts([]);
        setUsingMock(false);
        setLoadError(true);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    if (
      !isAuthenticated &&
      initialPosts.length > 0 &&
      filter === FEED_TAB_FILTERS["For You"]
    ) {
      return;
    }
    void load();
  }, [load, initialPosts.length, filter, isAuthenticated]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || usingMock) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && cursor && !loadingMore) {
          void load(cursor);
        }
      },
      { rootMargin: "240px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, cursor, loadingMore, usingMock, load]);

  async function toggleLike(postId: string) {
    const next =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/communities";
    if (usingMock || !isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
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
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Could not update like");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not update like");
      void load();
    }
  }

  async function sharePost(post: DisplayPost) {
    const path = post.href ?? `/communities/feed?post=${post.id}`;
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.body.slice(0, 80), url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
      if (!usingMock && isAuthenticated) {
        const res = await fetch(`/api/posts/${post.id}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "link" }),
        });
        if (res.ok) {
          const data = (await res.json().catch(() => ({}))) as { share_count?: number };
          if (typeof data.share_count === "number") {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === post.id
                  ? { ...p, engagement: { ...p.engagement, shares: data.share_count! } }
                  : p
              )
            );
          }
        }
      }
    } catch {
      /* user cancelled share */
    }
  }

  if (loading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-[13px] font-medium text-[var(--color-text-muted)]">Loading your community feed...</p>
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
    <div className="divide-y divide-gray-100">
      {posts.map((post, index) => (
        <article
          key={post.id}
          className="bg-transparent px-0.5 py-5 transition-colors first:pt-4 hover:bg-[var(--color-surface)]/40"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              {post.author.profileHref ? (
                <Link
                  href={post.author.profileHref}
                  aria-label={`View ${post.author.name}'s profile`}
                  className="mt-0.5 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AuthorAvatar name={post.author.name} url={post.author.avatar} />
                </Link>
              ) : (
                <AuthorAvatar name={post.author.name} url={post.author.avatar} className="mt-0.5 shrink-0" />
              )}
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {post.author.profileHref ? (
                    <Link
                      href={post.author.profileHref}
                      aria-label={`View ${post.author.name}'s profile`}
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
                  {post.author.verified && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-900">
                      <Check className="h-2 w-2 text-white" strokeWidth={3} />
                    </span>
                  )}
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
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {post.communitySlug && post.communityName ? (
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
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                    <Flame className="h-3 w-3 text-orange-500" />
                    Lv. {post.author.level} Creator
                  </span>
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
              <h3 className="mb-1.5 min-w-0 break-words text-[15px] font-semibold leading-snug text-gray-900 dark:text-[var(--color-text-primary)]">
                {post.title}
              </h3>
            )}
            <p className="mb-3 min-w-0 break-words text-[14px] leading-relaxed text-gray-800 dark:text-[var(--color-text-primary)] whitespace-pre-wrap">
              {post.body}
            </p>

            {post.media?.type === "video" && (
              <div className="mb-3">
                <FeedVideoPlayer
                  src={post.media.src}
                  poster={post.media.thumbnail || undefined}
                />
              </div>
            )}
            {post.media?.type === "image" && (
              <div className="mb-3 overflow-hidden rounded-2xl">
                <img
                  src={post.media.thumbnail}
                  alt={post.body.slice(0, 80) || post.author.name}
                  width={800}
                  height={450}
                  loading={index < 2 ? "eager" : "lazy"}
                  decoding="async"
                  className="aspect-video w-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void toggleLike(post.id)}
                  aria-label={post.liked ? "Unlike post" : "Like post"}
                  aria-pressed={post.liked}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40",
                    post.liked ? "text-red-500" : "text-gray-500"
                  )}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      post.liked ? "fill-red-500 text-red-500" : ""
                    )}
                  />
                  {formatEngagement(post.engagement.likes)}
                </button>
                <Link
                  href={post.href ?? `/communities?post=${post.id}`}
                  aria-label={`Comments (${post.engagement.comments})`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium text-gray-500 transition-colors hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.engagement.comments}
                </Link>
                <button
                  type="button"
                  onClick={() => void sharePost(post)}
                  aria-label="Share post"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                >
                  <Share2 className="h-4 w-4" />
                  {post.engagement.shares}
                </button>
                <button
                  type="button"
                  aria-label="More actions"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
      <div ref={sentinelRef} className="h-4" />
      {loadingMore && (
        <div className="flex justify-center py-4 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  );
}
