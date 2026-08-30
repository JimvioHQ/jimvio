"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePostgresChangesMany,
  unsubscribeRealtime,
} from "@/lib/supabase/realtime-subscribe";
import { toast } from "sonner";
import {
    Image as ImageIcon,
    Send,
    MessageCircle,
    Heart,
    Share2,
    Bookmark,
    BookmarkCheck,
    Reply,
    X,
    ChevronLeft,
    Loader2,
    Pin,
    Trash2,
    AlertCircle,
    ChevronDown,
    Users,
    Lock,
    BarChart3,
    Flag,
    Quote,
    Package,
    Radio,
    MoreHorizontal,
    Video,
    Copy,
    ExternalLink,
    Pencil,
    RefreshCw,
    Archive,
    MessageSquareOff,
} from "lucide-react";
import { CommunityVideoPlayer } from "@/components/community/CommunityVideoPlayer";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { communityProfileHref } from "@/lib/community/profile-href";
import { buildHubLoginUrl } from "@/lib/community/hub-auth";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
    POST_REACTIONS,
    isPostReactionId,
    reactionEmoji,
    type PostReactionId,
} from "@/lib/feed/reactions";
import {
    COMPOSER_MAX_CHARS,
} from "@/lib/feed/composer-utils";
import { isTechnicalFeedBody } from "@/lib/community/message-signaling";
import { jimvioPromotionLabel } from "@/lib/community/editorial-origin";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
    id?: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
}

interface Post {
    id: string;
    title: string | null;
    body: string;
    post_type: string;
    images: unknown;
    attachments?: Record<string, unknown> | null;
    like_count: number;
    comment_count: number;
    share_count?: number;
    is_pinned: boolean | null;
    is_published?: boolean | null;
    created_at: string;
    community_id: string;
    room_id: string;
    space_id: string;
    author_id: string;
    quote_of_post_id?: string | null;
    quoted_post?: { id: string; body: string; profiles?: Profile | null } | null;
    profiles?: Profile | null;
    author?: Profile | null;
    content?: string;
    reactions_count?: number;
    comments_count?: number;
    user_has_liked?: boolean;
    reaction_counts?: Record<string, number> | null;
    unique_view_count?: number | null;
    video_url?: string | null;
    user_reaction?: string | null;
    audience?: string | null;
    comments_disabled?: boolean | null;
    archived_at?: string | null;
    communities?: { slug?: string | null; name?: string | null } | null;
}

type CommentSort = "top" | "newest" | "oldest";

interface Comment {
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    profiles?: Profile | null;
    parent_id: string | null;
    like_count?: number;
    is_pinned?: boolean | null;
    edited_at?: string | null;
}

interface Community {
    id: string;
    name: string;
    slug: string;
    avatar_url: string | null;
    is_private: boolean;
    default_room_id?: string;
    default_space_id?: string;
}

interface Membership {
    community_id: string;
    role: string;
    status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePost(raw: Post): Post {
    const userReaction = raw.user_reaction ?? (raw.user_has_liked ? "like" : null);
    return {
        ...raw,
        body: raw.body ?? raw.content ?? "",
        profiles: raw.profiles ?? raw.author ?? null,
        like_count: raw.like_count ?? raw.reactions_count ?? 0,
        comment_count: raw.comment_count ?? raw.comments_count ?? 0,
        user_has_liked: raw.user_has_liked ?? Boolean(userReaction),
        user_reaction: userReaction,
        reaction_counts: raw.reaction_counts ?? null,
        unique_view_count: raw.unique_view_count ?? null,
        video_url: raw.video_url ?? null,
        audience: raw.audience ?? null,
    };
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

function getPostPermalink(postId: string): string {
    if (typeof window === "undefined") return `/posts/${postId}`;
    const url = new URL(window.location.href);
    url.searchParams.set("post", postId);
    return url.toString();
}

const PAGE_SIZE = 20;
/** Dedupes feed view POSTs across remounts in the same session. */
const viewedPostIds = new Set<string>();

// ─── FeedSection ──────────────────────────────────────────────────────────────

const FEED_FILTER_MAP: Record<string, string> = {
    "for-you": "for-you",
    "following": "following",
    "trending": "trending",
    "spaces": "spaces",
    "missions": "missions",
    "ai-picks": "ai-picks",
};

export function FeedSection({
  filter = "for-you",
  variant = "default",
  communityId,
  hideComposer = false,
}: {
  filter?: string;
  variant?: "default" | "hub";
  /** When set, scopes the feed to a single community (e.g. /communities/[slug]/feed). */
  communityId?: string;
  /** Hub feed already has a Create Post launcher above this section. */
  hideComposer?: boolean;
}) {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();
    const feedFilter = FEED_FILTER_MAP[filter] ?? "for-you";
    const isHub = variant === "hub";
    const scopedCommunityId = communityId ?? null;

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [communities, setCommunities] = useState<Community[]>([]);
    const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);

    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [detailId, setDetailId] = useState<string | null>(null);
    const [showCommunityPicker, setShowCommunityPicker] = useState(false);

    const realtimeRef = useRef<RealtimeChannel | null>(null);
    const communityPickerRef = useRef<HTMLDivElement>(null);
    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
    const loadingMoreRef = useRef(false);

    // ── Bootstrap current user + memberships ──────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        async function bootstrap() {
            const { data: { user } } = await supabase.auth.getUser();
            if (cancelled) return;
            if (user) setCurrentUserId(user.id);

            // Load memberships
            const { data: mships } = user
                ? await supabase
                    .from("community_memberships")
                    .select("community_id, role, status")
                    .eq("user_id", user.id)
                    .eq("status", "active")
                : { data: [] as Membership[] };

            if (cancelled) return;
            const activeMships = mships ?? [];
            setMemberships(activeMships);

            const communityIds = activeMships.map((m: Membership) => m.community_id);
            const { data: comms } = communityIds.length
                ? await supabase
                    .from("communities")
                    .select("id, name, slug, avatar_url, is_private")
                    .in("id", communityIds)
                    .eq("is_active", true)
                : { data: [] as Community[] };

            if (cancelled) return;

            let scopedRow: Community | null = null;
            if (scopedCommunityId) {
                scopedRow =
                    (comms ?? []).find((c: Community) => c.id === scopedCommunityId) ?? null;
                if (!scopedRow) {
                    const { data: scoped } = await supabase
                        .from("communities")
                        .select("id, name, slug, avatar_url, is_private")
                        .eq("id", scopedCommunityId)
                        .eq("is_active", true)
                        .maybeSingle();
                    if (scoped) scopedRow = scoped as Community;
                }
            }

            if (cancelled) return;
            if (activeMships.length === 0 && !scopedRow) return;

            const communityList = [...(comms ?? [])];
            if (scopedRow && !communityList.some((c) => c.id === scopedRow!.id)) {
                communityList.unshift(scopedRow);
            }

            // For each community, get the first room to use as default
            const enriched: Community[] = await Promise.all(
                communityList.map(async (c: Community) => {
                    const { data: room } = await supabase
                        .from("rooms")
                        .select("id, space_id")
                        .eq("community_id", c.id)
                        .eq("room_type", "feed")
                        .eq("is_active", true)
                        .limit(1)
                        .maybeSingle();

                    // Fallback to first active room if no feed room
                    const { data: fallbackRoom } = !room
                        ? await supabase
                            .from("rooms")
                            .select("id, space_id")
                            .eq("community_id", c.id)
                            .eq("is_active", true)
                            .limit(1)
                            .maybeSingle()
                        : { data: null };

                    const activeRoom = room ?? fallbackRoom;
                    return {
                        ...c,
                        default_room_id: activeRoom?.id,
                        default_space_id: activeRoom?.space_id,
                    };
                })
            );

            setCommunities(enriched);
            if (scopedCommunityId) {
                const scoped = enriched.find((c) => c.id === scopedCommunityId) ?? null;
                setSelectedCommunity(scoped);
            } else if (enriched.length > 0) {
                setSelectedCommunity(enriched[0]);
            }
        }
        bootstrap();
        return () => { cancelled = true; };
    }, [supabase, scopedCommunityId]);

    // ── Close community picker on outside click ───────────────────────────────
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (communityPickerRef.current && !communityPickerRef.current.contains(e.target as Node)) {
                setShowCommunityPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // ── Keyboard shortcut: N = open Create Post ───────────────────────────────
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === "n" || e.key === "N") {
                e.preventDefault();
                const params = new URLSearchParams();
                if (selectedCommunity?.slug) params.set("community", selectedCommunity.slug);
                const qs = params.toString();
                router.push(qs ? `/create/post?${qs}` : "/create/post");
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [router, selectedCommunity?.slug]);

    // ── Load posts (first page) ───────────────────────────────────────────────
    const load = useCallback(async (replace = true) => {
        if (replace) setLoading(true);
        try {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE), filter: feedFilter });
            if (scopedCommunityId) params.set("community_id", scopedCommunityId);
            const res = await fetch(`/api/posts/feed?${params}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to load feed");
                if (replace) setPosts([]);
                setHasMore(false);
                setCursor(null);
                return;
            }
            const normalized = (data.posts ?? [])
                .map(normalizePost)
                .filter((p: Post) => !isTechnicalFeedBody(p.body));

            if (replace) {
                setPosts(normalized);
            } else {
                setPosts((prev) => {
                    const seen = new Set(prev.map((p) => p.id));
                    return [...prev, ...normalized.filter((p: Post) => !seen.has(p.id))];
                });
            }

            setHasMore(Boolean(data.next_cursor));
            setCursor(data.next_cursor ?? null);

            // Sync liked + saved IDs from server response
            const liked = new Set<string>(
                normalized
                    .filter((p: Post) => p.user_has_liked || Boolean(p.user_reaction))
                    .map((p: Post) => p.id)
            );
            setLikedIds((prev) => replace ? liked : new Set([...prev, ...liked]));
        } finally {
            if (replace) setLoading(false);
        }
    }, [feedFilter, scopedCommunityId]);

    useEffect(() => { load(); }, [load]);

    // Open post detail from ?post= deep links (notifications, search, share)
    useEffect(() => {
        if (typeof window === "undefined") return;
        const postId = new URLSearchParams(window.location.search).get("post");
        if (postId) setDetailId(postId);
    }, []);

    // ── Infinite scroll ───────────────────────────────────────────────────────
    useEffect(() => {
        const el = loadMoreSentinelRef.current;
        if (!el || !hasMore) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !loadingMoreRef.current) {
                    void loadMore();
                }
            },
            { rootMargin: "240px" }
        );
        obs.observe(el);
        return () => obs.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasMore, cursor]);

    // ── Load more (pagination) ────────────────────────────────────────────────
    async function loadMore() {
        if (!cursor || loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                cursor,
                filter: feedFilter,
            });
            if (scopedCommunityId) params.set("community_id", scopedCommunityId);
            const res = await fetch(`/api/posts/feed?${params}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to load more posts");
                return;
            }
            const normalized = (data.posts ?? [])
                .map(normalizePost)
                .filter((p: Post) => !isTechnicalFeedBody(p.body));
            setPosts((prev) => {
                const seen = new Set(prev.map((p) => p.id));
                return [...prev, ...normalized.filter((p: Post) => !seen.has(p.id))];
            });
            setHasMore(Boolean(data.next_cursor));
            setCursor(data.next_cursor ?? null);

            const liked = new Set<string>(
                normalized
                    .filter((p: Post) => p.user_has_liked || Boolean(p.user_reaction))
                    .map((p: Post) => p.id)
            );
            setLikedIds((prev) => new Set([...prev, ...liked]));
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }

    // ── Load saved post ids ───────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        async function loadSaved() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from("community_saved_posts")
                .select("post_id")
                .eq("user_id", user.id);
            if (cancelled || !data) return;
            setSavedIds(new Set(data.map((r: { post_id: string }) => r.post_id)));
        }
        loadSaved();
        return () => { cancelled = true; };
    }, [supabase]);

    // ── Realtime subscription on community_posts ──────────────────────────────
    useEffect(() => {
        if (memberships.length === 0 && !scopedCommunityId) return;

        const allowed = new Set(
            scopedCommunityId
                ? [scopedCommunityId]
                : memberships.map((m) => m.community_id)
        );
        let cancelled = false;
        let channel: Awaited<ReturnType<typeof subscribePostgresChangesMany>> = null;
        const channelName = scopedCommunityId
            ? `feed:community_posts:${scopedCommunityId}`
            : "feed:community_posts";

        void (async () => {
            channel = await subscribePostgresChangesMany(
                supabase,
                channelName,
                [
                    {
                        config: {
                            event: "INSERT",
                            schema: "public",
                            table: "community_posts",
                            ...(scopedCommunityId
                                ? { filter: `community_id=eq.${scopedCommunityId}` }
                                : {}),
                        },
                        onChange: async (payload) => {
                            const row = payload?.new;
                            if (!row?.id) return;
                            if (!allowed.has(String(row.community_id))) return;
                            if (row.is_published === false) return;
                            const { data } = await supabase
                                .from("community_posts")
                                .select(
                                    "*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)"
                                )
                                .eq("id", String(row.id))
                                .eq("is_published", true)
                                .maybeSingle();
                            if (!data || cancelled) return;
                            const normalized = normalizePost(data as Post);
                            if (isTechnicalFeedBody(normalized.body)) return;
                            setPosts((prev) => {
                                if (prev.find((p) => p.id === normalized.id)) return prev;
                                const without = prev.filter((p) => p.id !== normalized.id);
                                if (normalized.is_pinned) {
                                    return [normalized, ...without];
                                }
                                const pinned = without.filter((p) => p.is_pinned);
                                const rest = without.filter((p) => !p.is_pinned);
                                return [...pinned, normalized, ...rest];
                            });
                        },
                    },
                    {
                        config: {
                            event: "UPDATE",
                            schema: "public",
                            table: "community_posts",
                            ...(scopedCommunityId
                                ? { filter: `community_id=eq.${scopedCommunityId}` }
                                : {}),
                        },
                        onChange: (payload) => {
                            const row = payload?.new;
                            if (!row?.id) return;
                            if (!allowed.has(String(row.community_id))) return;
                            if (row.is_published === false) {
                                setPosts((prev) => prev.filter((p) => p.id !== row.id));
                                return;
                            }
                            setPosts((prev) =>
                                prev.map((p) =>
                                    p.id === row.id
                                        ? normalizePost({ ...p, ...row } as Post)
                                        : p
                                )
                            );
                        },
                    },
                    {
                        config: {
                            event: "DELETE",
                            schema: "public",
                            table: "community_posts",
                            ...(scopedCommunityId
                                ? { filter: `community_id=eq.${scopedCommunityId}` }
                                : {}),
                        },
                        onChange: (payload) => {
                            const id = payload?.old?.id;
                            if (!id) return;
                            setPosts((prev) => prev.filter((p) => p.id !== id));
                        },
                    },
                ],
                () => cancelled
            );
            realtimeRef.current = channel;
        })();

        return () => {
            cancelled = true;
            unsubscribeRealtime(supabase, channel, channelName);
            realtimeRef.current = null;
        };
    }, [supabase, memberships, scopedCommunityId]);

    function startQuote(post: Post) {
        const params = new URLSearchParams();
        if (selectedCommunity?.slug) params.set("community", selectedCommunity.slug);
        params.set("quote", post.id);
        router.push(`/create/post?${params.toString()}`);
    }

    async function reportPost(postId: string) {
        const reason = window.prompt("Report reason (spam, harassment, misinformation, other):", "other");
        if (!reason) return;
        const res = await fetch(`/api/posts/${postId}/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
        });
        if (res.ok) {
            window.alert("Thanks — moderators will review this post.");
        } else {
            const err = await res.json().catch(() => ({}));
            window.alert(err.error ?? "Could not submit report");
        }
    }

    async function votePoll(postId: string, optionIndex: number) {
        const res = await fetch(`/api/posts/${postId}/poll/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ optionIndex }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "Failed to record vote");
            return;
        }
        const data = await res.json();
        if (data.options) {
            setPosts((prev) =>
                prev.map((p) => {
                    if (p.id !== postId) return p;
                    const attachments = { ...(p.attachments ?? {}), poll: { options: data.options } };
                    return { ...p, attachments };
                })
            );
        } else {
            await load(false);
        }
    }

    // ── Reactions (optimistic) ────────────────────────────────────────────────
    async function setReaction(postId: string, next: PostReactionId | null) {
        const post = posts.find((p) => p.id === postId);
        const prevReaction = (post?.user_reaction as PostReactionId | null | undefined)
            ?? (likedIds.has(postId) ? "like" as const : null);
        if (prevReaction === next) return;

        const bump = (counts: Record<string, number> | null | undefined, from: string | null, to: string | null) => {
            const c = { ...(counts ?? {}) };
            if (from) c[from] = Math.max(0, (c[from] ?? 0) - 1);
            if (to) c[to] = (c[to] ?? 0) + 1;
            return c;
        };

        setLikedIds((prev) => {
            const s = new Set(prev);
            if (next) s.add(postId);
            else s.delete(postId);
            return s;
        });
        setPosts((prev) =>
            prev.map((p) => {
                if (p.id !== postId) return p;
                const reaction_counts = bump(p.reaction_counts, prevReaction, next);
                const likeDelta =
                    (next ? 1 : 0) - (prevReaction ? 1 : 0);
                return {
                    ...p,
                    user_reaction: next,
                    user_has_liked: Boolean(next),
                    reaction_counts,
                    like_count: Math.max(0, (p.like_count ?? 0) + likeDelta),
                };
            })
        );

        try {
            const res = await fetch(`/api/posts/${postId}/react`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reaction: next }),
            });
            if (res.status === 401) {
                const nextPath =
                    typeof window !== "undefined"
                        ? `${window.location.pathname}${window.location.search}`
                        : "/communities";
                router.push(buildHubLoginUrl(nextPath));
                throw new Error("Sign in required");
            }
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "reaction failed");
            const data = await res.json().catch(() => ({}));
            if (data.counts) {
                setPosts((prev) =>
                    prev.map((p) =>
                        p.id === postId
                            ? { ...p, reaction_counts: data.counts, user_reaction: data.reaction ?? next }
                            : p
                    )
                );
            }
        } catch (e: unknown) {
            setLikedIds((prev) => {
                const s = new Set(prev);
                if (prevReaction) s.add(postId);
                else s.delete(postId);
                return s;
            });
            setPosts((prev) =>
                prev.map((p) => {
                    if (p.id !== postId) return p;
                    return {
                        ...p,
                        user_reaction: prevReaction,
                        user_has_liked: Boolean(prevReaction),
                        reaction_counts: bump(p.reaction_counts, next, prevReaction),
                        like_count: Math.max(
                            0,
                            (p.like_count ?? 0) + ((prevReaction ? 1 : 0) - (next ? 1 : 0))
                        ),
                    };
                })
            );
            if (e instanceof Error && e.message === "Sign in required") return;
            toast.error(e instanceof Error ? e.message : "Failed to update reaction");
        }
    }

    function toggleLike(postId: string) {
        const post = posts.find((p) => p.id === postId);
        const current = post?.user_reaction ?? (likedIds.has(postId) ? "like" : null);
        void setReaction(postId, current === "like" ? null : "like");
    }

    // ── Toggle save ───────────────────────────────────────────────────────────
    async function toggleSave(postId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Sign in to bookmark posts");
            return;
        }
        const wasSaved = savedIds.has(postId);
        setSavedIds((s) => {
            const n = new Set(s);
            if (wasSaved) n.delete(postId);
            else n.add(postId);
            return n;
        });
        try {
            if (wasSaved) {
                const { error } = await supabase
                    .from("community_saved_posts")
                    .delete()
                    .eq("post_id", postId)
                    .eq("user_id", user.id);
                if (error) throw error;
                toast.success("Bookmark removed");
            } else {
                const { error } = await supabase
                    .from("community_saved_posts")
                    .insert({ post_id: postId, user_id: user.id });
                if (error) throw error;
                toast.success("Post bookmarked");
            }
        } catch (e: unknown) {
            setSavedIds((s) => {
                const n = new Set(s);
                if (wasSaved) n.add(postId);
                else n.delete(postId);
                return n;
            });
            toast.error(e instanceof Error ? e.message : "Failed to update bookmark");
        }
    }

    // ── Delete post ───────────────────────────────────────────────────────────
    async function deletePost(postId: string) {
        if (!confirm("Delete this post? This cannot be undone.")) return;
        const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
        if (res.ok) {
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            if (detailId === postId) setDetailId(null);
            toast.success("Post deleted");
        } else {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "Failed to delete post");
        }
    }

    async function patchPost(postId: string, patch: Record<string, unknown>) {
        const res = await fetch(`/api/posts/${postId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
        });
        const data = (await res.json().catch(() => ({}))) as {
            post?: Post;
            error?: string;
        };
        if (!res.ok) {
            toast.error(data.error || "Failed to update post");
            return null;
        }
        if (data.post) {
            const archivedAt = (data.post as Post).archived_at ?? null;
            if (archivedAt) {
                setPosts((prev) => prev.filter((p) => p.id !== postId));
                if (detailId === postId) setDetailId(null);
            } else {
                setPosts((prev) =>
                    prev.map((p) => (p.id === postId ? normalizePost({ ...p, ...data.post! }) : p))
                );
            }
        } else if (patch.archived_at === true) {
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            if (detailId === postId) setDetailId(null);
        } else {
            setPosts((prev) =>
                prev.map((p) => (p.id === postId ? normalizePost({ ...p, ...patch } as Post) : p))
            );
        }
        return data.post ?? true;
    }

    // ── Share post ────────────────────────────────────────────────────────────
    async function sharePost(
        postId: string,
        type: "link" | "copy" | "repost" | "quote" | "external" = "link"
    ) {
        const url = getPostPermalink(postId);
        const communityId = posts.find((p) => p.id === postId)?.community_id;
        try {
            if (type === "copy" || type === "link") {
                if (type === "link" && navigator.share) {
                    await navigator.share({ url });
                } else {
                    await navigator.clipboard?.writeText(url);
                    toast.success("Link copied");
                }
            } else if (type === "external") {
                window.open(url, "_blank", "noopener,noreferrer");
            } else if (type === "quote") {
                const post = posts.find((p) => p.id === postId);
                if (post) startQuote(post);
            } else if (type === "repost") {
                toast.success("Repost recorded");
            }
            void fetch(`/api/posts/${postId}/share`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, communityId }),
            });
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId ? { ...p, share_count: (p.share_count ?? 0) + 1 } : p
                )
            );
        } catch {
            // Ignore share abort
        }
    }

    // ── Sorted posts: pinned first ────────────────────────────────────────────
    const sortedPosts = [
        ...posts.filter((p) => p.is_pinned),
        ...posts.filter((p) => !p.is_pinned),
    ];

    const detail = detailId ? posts.find((p) => p.id === detailId) : null;
    const createPostHref = selectedCommunity?.slug
        ? `/create/post?community=${encodeURIComponent(selectedCommunity.slug)}`
        : "/create/post";

    return (
        <div className={cn("flex flex-col", isHub ? "gap-3" : "gap-4")}>

            {/* ── Community Picker ───────────────────────────────────────────── */}
            {communities.length > 1 && !isHub && !scopedCommunityId && (
                <div className="relative" ref={communityPickerRef}>
                    <button
                        type="button"
                        onClick={() => setShowCommunityPicker((v) => !v)}
                        className="inline-flex items-center gap-2 text-[12px] font-semibold text-text-primary bg-surface border border-border rounded-xl px-3 py-2 hover:border-border-hover transition-colors"
                    >
                        {selectedCommunity ? (
                            <>
                                {selectedCommunity.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={selectedCommunity.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                                ) : (
                                    <div className="w-4 h-4 rounded-full bg-[#fd5000] flex items-center justify-center text-white text-[8px] font-bold">
                                        {selectedCommunity.name[0]?.toUpperCase()}
                                    </div>
                                )}
                                <span>{selectedCommunity.name}</span>
                                {selectedCommunity.is_private && <Lock className="w-3 h-3 text-text-muted" />}
                            </>
                        ) : (
                            <>
                                <Users className="w-4 h-4 text-text-muted" />
                                <span>Select Community</span>
                            </>
                        )}
                        <ChevronDown className="w-3.5 h-3.5 text-text-muted ml-1" />
                    </button>

                    {showCommunityPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-xl shadow-lg z-20 min-w-[200px] overflow-hidden">
                            {communities.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCommunity(c);
                                        setShowCommunityPicker(false);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium text-left hover:bg-surface-secondary transition-colors ${selectedCommunity?.id === c.id ? "text-[#fd5000]" : "text-text-primary"}`}
                                >
                                    {c.avatar_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={c.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-[#fd5000] flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                            {c.name[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <span className="truncate flex-1">{c.name}</span>
                                    {c.is_private && <Lock className="w-3 h-3 text-text-muted shrink-0" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!hideComposer ? (
                <div
                    className={cn(
                        "bg-surface border rounded-2xl p-3.5",
                        isHub ? "border-[var(--color-border,#e4e4e7)] bg-white shadow-sm" : "border-border"
                    )}
                >
                    <Link
                        href={createPostHref}
                        className="flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-surface-secondary/70 transition-colors"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fd5000]/10 text-[12px] font-bold text-[#fd5000]">
                            {selectedCommunity?.name?.[0]?.toUpperCase() ?? "J"}
                        </div>
                        <span className="flex-1 rounded-full bg-surface-secondary px-4 py-2.5 text-[14px] text-text-muted">
                            {"What's on your mind?"}
                        </span>
                    </Link>
                    <div className="mt-2 flex items-center gap-1 px-1">
                        <Link
                            href={createPostHref}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-text-muted hover:bg-surface-secondary hover:text-[#fd5000]"
                        >
                            <ImageIcon className="h-4 w-4" />
                            Photo
                        </Link>
                        <Link
                            href={createPostHref}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-text-muted hover:bg-surface-secondary hover:text-[#fd5000]"
                        >
                            <Video className="h-4 w-4" />
                            Video
                        </Link>
                    </div>
                </div>
            ) : null}

            {/* ── Posts ──────────────────────────────────────────────────────── */}
            {loading ? (
                <FeedSkeleton />
            ) : sortedPosts.length === 0 ? (
                <FeedEmpty />
            ) : (
                <>
                    {sortedPosts.map((p) => (
                        <PostCard
                            key={p.id}
                            post={p}
                            saved={savedIds.has(p.id)}
                            liked={likedIds.has(p.id) || Boolean(p.user_reaction)}
                            currentUserId={currentUserId}
                            onLike={() => toggleLike(p.id)}
                            onReact={(reaction) => void setReaction(p.id, reaction)}
                            onSave={() => toggleSave(p.id)}
                            onSelect={() => setDetailId(detailId === p.id ? null : p.id)}
                            onDelete={() => deletePost(p.id)}
                            onShare={(type) => sharePost(p.id, type)}
                            onQuote={() => startQuote(p)}
                            onReport={() => reportPost(p.id)}
                            onVotePoll={(idx) => votePoll(p.id, idx)}
                            onPatch={(patch) => patchPost(p.id, patch)}
                            isDetailOpen={detailId === p.id}
                        />
                    ))}

                    {/* Infinite scroll sentinel */}
                    <div ref={loadMoreSentinelRef} className="h-4" aria-hidden />
                    {hasMore && (
                        <button
                            type="button"
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="w-full flex items-center justify-center gap-2 py-3 text-[12px] font-semibold text-text-muted hover:text-[#fd5000] border border-border rounded-2xl bg-surface hover:border-border-hover transition-colors disabled:opacity-40"
                        >
                            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                            {loadingMore ? "Loading…" : "Load more"}
                        </button>
                    )}
                </>
            )}

            {/* ── Thread detail panel (inline, adjacent logic handled by key) ── */}
            {detailId && (
                <PostDetailPanel
                    key={detailId}
                    postId={detailId}
                    post={detail}
                    currentUserId={currentUserId}
                    canPin={Boolean(
                        detail &&
                        currentUserId &&
                        (detail.author_id === currentUserId ||
                            ["owner", "admin", "moderator"].includes(
                                memberships.find((m) => m.community_id === detail.community_id)?.role ?? ""
                            ))
                    )}
                    onClose={() => setDetailId(null)}
                    onCommentAdded={(postId) => {
                        setPosts((prev) =>
                            prev.map((p) =>
                                p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
                            )
                        );
                    }}
                    onCommentRemoved={(postId) => {
                        setPosts((prev) =>
                            prev.map((p) =>
                                p.id === postId
                                    ? { ...p, comment_count: Math.max(0, p.comment_count - 1) }
                                    : p
                            )
                        );
                    }}
                />
            )}
        </div>
    );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({
    post,
    saved,
    liked,
    currentUserId,
    onLike,
    onReact,
    onSave,
    onSelect,
    onDelete,
    onShare,
    onQuote,
    onReport,
    onVotePoll,
    onPatch,
    isDetailOpen,
}: {
    post: Post;
    saved: boolean;
    liked: boolean;
    currentUserId: string | null;
    onLike: () => void;
    onReact: (reaction: PostReactionId | null) => void;
    onSave: () => void;
    onSelect: () => void;
    onDelete: () => void;
    onShare: (type: "link" | "copy" | "repost" | "quote" | "external") => void;
    onQuote: () => void;
    onReport: () => void;
    onVotePoll: (optionIndex: number) => void;
    onPatch: (patch: Record<string, unknown>) => Promise<unknown>;
    isDetailOpen: boolean;
}) {
    const profile = post.profiles ?? post.author ?? null;
    const name = profile?.full_name ?? profile?.username ?? "Creator";
    const authorProfileHref = communityProfileHref(profile?.username);
    const imgs = Array.isArray(post.images)
        ? (post.images as string[]).filter(Boolean)
        : [];
    const isOwn = currentUserId && post.author_id === currentUserId;
    const communitySlug = post.communities?.slug ?? null;
    const communityName = post.communities?.name ?? null;
    const poll = (post.attachments as { poll?: { options?: Array<{ text: string; votes?: number }> } } | null)
        ?.poll;
    const productId = (post.attachments as { product_id?: string } | null)?.product_id;
    const liveSessionId = (post.attachments as { live_session_id?: string } | null)?.live_session_id;
    const altTexts = (post.attachments as { alt_texts?: Record<string, string> } | null)?.alt_texts;
    const locationLabel = (post.attachments as { location?: string } | null)?.location;
    const [menuOpen, setMenuOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editBody, setEditBody] = useState(post.body);
    const [ownerBusy, setOwnerBusy] = useState(false);
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pickerOpenedByHoldRef = useRef(false);
    const cardRef = useRef<HTMLElement | null>(null);
    const activeReaction = post.user_reaction && isPostReactionId(post.user_reaction)
        ? post.user_reaction
        : liked
          ? "like"
          : null;
    const reactionSummary = Object.entries(post.reaction_counts ?? {})
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]);

    useEffect(() => {
        setEditBody(post.body);
    }, [post.body]);

    useEffect(() => {
        const el = cardRef.current;
        if (!el || viewedPostIds.has(post.id)) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting || viewedPostIds.has(post.id)) return;
                viewedPostIds.add(post.id);
                void fetch(`/api/posts/${post.id}/view`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ source: "feed" }),
                });
                obs.disconnect();
            },
            { threshold: 0.5 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [post.id]);

    function clearHold() {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }

    function startHold() {
        clearHold();
        pickerOpenedByHoldRef.current = false;
        holdTimerRef.current = setTimeout(() => {
            pickerOpenedByHoldRef.current = true;
            setPickerOpen(true);
            holdTimerRef.current = null;
        }, 400);
    }

    function endHold() {
        // Always clear the pending timer; picker stays open if hold already fired.
        clearHold();
    }

    async function runOwnerAction(action: () => Promise<void>) {
        if (ownerBusy) return;
        setOwnerBusy(true);
        setMenuOpen(false);
        try {
            await action();
        } finally {
            setOwnerBusy(false);
        }
    }

    const promotionLabel = jimvioPromotionLabel(post.attachments);

    return (
        <article
            ref={cardRef}
            className={`bg-surface border rounded-2xl p-4 hover:border-border-hover transition-colors ${isDetailOpen ? "border-[#fd5000]/40" : "border-border"}`}
        >
            {/* Pinned badge */}
            {post.is_pinned && (
                <div className="flex items-center gap-1 text-[10px] font-semibold text-[#fd5000] mb-2">
                    <Pin className="w-3 h-3" />
                    Pinned
                </div>
            )}

            <header className="flex items-start gap-3 mb-3">
                {authorProfileHref ? (
                    <Link
                        href={authorProfileHref}
                        aria-label={`View ${name}'s profile`}
                        className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={profile.avatar_url}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="w-10 h-10 rounded-full object-cover ring-1 ring-border"
                            />
                        ) : (
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                                style={{ background: "#fd5000" }}
                                aria-hidden
                            >
                                {name[0]?.toUpperCase()}
                            </div>
                        )}
                    </Link>
                ) : profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={profile.avatar_url}
                        alt={name}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-border"
                    />
                ) : (
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: "#fd5000" }}
                    >
                        {name[0]?.toUpperCase()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    {authorProfileHref ? (
                        <Link
                            href={authorProfileHref}
                            aria-label={`View ${name}'s profile`}
                            className="block text-[13px] font-semibold text-text-primary truncate hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40 rounded-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {name}
                        </Link>
                    ) : (
                        <p className="text-[13px] font-semibold text-text-primary truncate">{name}</p>
                    )}
                    {profile?.username && (
                        <p className="text-[11px] text-text-muted truncate">
                            {authorProfileHref ? (
                                <Link
                                    href={authorProfileHref}
                                    className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40 rounded-sm"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    @{profile.username}
                                </Link>
                            ) : (
                                <>@{profile.username}</>
                            )}
                            {" · "}
                            {timeAgo(post.created_at)}
                            {post.post_type === "poll" ? " · Poll" : ""}
                            {locationLabel ? ` · ${locationLabel}` : ""}
                        </p>
                    )}
                    {communitySlug && communityName ? (
                        <Link
                            href={`/communities/${communitySlug}`}
                            className="mt-0.5 inline-block text-[11px] font-medium text-[#fd5000] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {communityName}
                        </Link>
                    ) : null}
                </div>

                <div className="relative flex items-center gap-1">
                    {isOwn && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="p-1.5 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                            aria-label="Delete post"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        className="p-1.5 rounded-lg text-text-muted hover:bg-surface-secondary"
                        aria-label="More actions"
                    >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 z-20 min-w-[168px] rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={() => { onQuote(); setMenuOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-secondary"
                            >
                                <Quote className="w-3.5 h-3.5" /> Quote
                            </button>
                            {isOwn && (
                                <>
                                    <button
                                        type="button"
                                        disabled={ownerBusy}
                                        onClick={() => {
                                            setEditing(true);
                                            setEditBody(post.body);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-secondary disabled:opacity-40"
                                    >
                                        <Pencil className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button
                                        type="button"
                                        disabled={ownerBusy}
                                        onClick={() =>
                                            void runOwnerAction(async () => {
                                                const ok = await onPatch({
                                                    archived_at: post.archived_at ? null : true,
                                                });
                                                if (ok) {
                                                    toast.success(
                                                        post.archived_at ? "Post restored" : "Post archived"
                                                    );
                                                }
                                            })
                                        }
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-secondary disabled:opacity-40"
                                    >
                                        <Archive className="w-3.5 h-3.5" />
                                        {post.archived_at ? "Unarchive" : "Archive"}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={ownerBusy}
                                        onClick={() =>
                                            void runOwnerAction(async () => {
                                                const next = !post.is_pinned;
                                                const ok = await onPatch({ is_pinned: next });
                                                if (ok) toast.success(next ? "Post pinned" : "Post unpinned");
                                            })
                                        }
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-secondary disabled:opacity-40"
                                    >
                                        <Pin className="w-3.5 h-3.5" />
                                        {post.is_pinned ? "Unpin" : "Pin"}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={ownerBusy}
                                        onClick={() =>
                                            void runOwnerAction(async () => {
                                                const res = await fetch(`/api/posts/${post.id}/analytics`);
                                                const data = await res.json().catch(() => ({}));
                                                if (!res.ok) {
                                                    toast.error(data.error || "Analytics unavailable");
                                                    return;
                                                }
                                                toast.message("Post analytics", {
                                                    description: `Views ${data.views ?? 0} · Reach ${data.reach ?? 0} · Likes ${data.likes ?? 0} · Comments ${data.comments ?? 0} · Shares ${data.shares ?? 0}`,
                                                });
                                            })
                                        }
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-secondary disabled:opacity-40"
                                    >
                                        <BarChart3 className="w-3.5 h-3.5" /> Analytics
                                    </button>
                                    <button
                                        type="button"
                                        disabled={ownerBusy}
                                        onClick={() =>
                                            void runOwnerAction(async () => {
                                                const next = !post.comments_disabled;
                                                const ok = await onPatch({ comments_disabled: next });
                                                if (ok) {
                                                    toast.success(
                                                        next ? "Comments disabled" : "Comments enabled"
                                                    );
                                                }
                                            })
                                        }
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-secondary disabled:opacity-40"
                                    >
                                        <MessageSquareOff className="w-3.5 h-3.5" />
                                        {post.comments_disabled ? "Enable comments" : "Disable comments"}
                                    </button>
                                </>
                            )}
                            {!isOwn && (
                                <button
                                    type="button"
                                    onClick={() => { onReport(); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50"
                                >
                                    <Flag className="w-3.5 h-3.5" /> Report
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {editing ? (
                <div className="mb-3 space-y-2">
                    <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value.slice(0, COMPOSER_MAX_CHARS))}
                        rows={4}
                        className="w-full resize-none rounded-xl border border-border bg-surface-secondary/40 px-3 py-2 text-[14px] text-text-primary outline-none focus:border-[#fd5000]/40"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setEditing(false);
                                setEditBody(post.body);
                            }}
                            className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-text-muted hover:bg-surface-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={ownerBusy || !editBody.trim()}
                            onClick={() =>
                                void runOwnerAction(async () => {
                                    const ok = await onPatch({ body: editBody.trim() });
                                    if (ok) {
                                        setEditing(false);
                                        toast.success("Post updated");
                                    }
                                })
                            }
                            className="rounded-lg bg-[#fd5000] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
            <div className="mb-3 min-w-0">
                {promotionLabel && (
                    <span className="mb-2 inline-flex rounded-md bg-[var(--color-accent-light)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                        {promotionLabel}
                    </span>
                )}
                {post.title?.trim() && (
                    <h3 className="mb-1.5 min-w-0 break-words text-[15px] font-semibold leading-snug text-text-primary">
                        {post.title.trim()}
                    </h3>
                )}
                <p className="min-w-0 break-words text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">
                    {post.body}
                </p>
            </div>
            )}

            {post.quoted_post && (
                <div className="mb-3 rounded-xl border border-border bg-surface-secondary/50 px-3 py-2">
                    <p className="text-[12px] text-text-muted line-clamp-3">{post.quoted_post.body}</p>
                </div>
            )}

            {poll?.options && poll.options.length > 0 && (
                <div className="mb-3 space-y-1.5">
                    {poll.options.map((opt, i) => {
                        const total = poll.options!.reduce((s, o) => s + (o.votes ?? 0), 0) || 1;
                        const pct = Math.round(((opt.votes ?? 0) / total) * 100);
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => onVotePoll(i)}
                                className="relative w-full overflow-hidden rounded-xl border border-border px-3 py-2 text-left text-[12px] font-medium text-text-primary hover:border-[#fd5000]/40"
                            >
                                <span
                                    className="absolute inset-y-0 left-0 bg-[#fd5000]/12"
                                    style={{ width: `${pct}%` }}
                                />
                                <span className="relative flex justify-between gap-2">
                                    <span>{opt.text}</span>
                                    <span className="text-text-muted">{pct}%</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {(productId || liveSessionId) && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {productId && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-surface-secondary px-2 py-1 text-[11px] font-semibold text-text-muted">
                            <Package className="w-3 h-3 text-[#fd5000]" /> Product attached
                        </span>
                    )}
                    {liveSessionId && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-surface-secondary px-2 py-1 text-[11px] font-semibold text-text-muted">
                            <Radio className="w-3 h-3 text-[#fd5000]" /> Live attached
                        </span>
                    )}
                </div>
            )}

            {post.video_url && (
                <div className="mb-3">
                    <CommunityVideoPlayer src={post.video_url} />
                </div>
            )}

            {imgs.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                    {imgs.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            key={url}
                            src={url}
                            alt={altTexts?.[url] ?? ""}
                            loading="lazy"
                            decoding="async"
                            className="h-32 w-auto rounded-lg object-cover border border-border"
                        />
                    ))}
                </div>
            )}

            {reactionSummary.length > 0 && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {reactionSummary.slice(0, 6).map(([id, count]) => (
                        <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] text-text-muted"
                        >
                            <span>{isPostReactionId(id) ? reactionEmoji(id) : "👍"}</span>
                            <span className="font-semibold">{count}</span>
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-1 -ml-2 relative">
                {/* Reactions */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            if (pickerOpenedByHoldRef.current || pickerOpen) {
                                pickerOpenedByHoldRef.current = false;
                                setPickerOpen(false);
                                return;
                            }
                            onLike();
                        }}
                        onPointerDown={startHold}
                        onPointerUp={endHold}
                        onPointerLeave={endHold}
                        onPointerCancel={endHold}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            pickerOpenedByHoldRef.current = true;
                            setPickerOpen(true);
                        }}
                        aria-label={activeReaction ? "Change reaction" : "Like post"}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${activeReaction ? "text-[#fd5000]" : "text-text-muted hover:bg-surface-secondary hover:text-[#fd5000]"}`}
                    >
                        {activeReaction && activeReaction !== "like" ? (
                            <span className="text-sm leading-none">{reactionEmoji(activeReaction)}</span>
                        ) : (
                            <Heart className={`w-3.5 h-3.5 ${activeReaction === "like" ? "fill-[#fd5000]" : ""}`} />
                        )}
                        {(post.like_count ?? 0) > 0 && <span className="font-semibold">{post.like_count}</span>}
                    </button>
                    {pickerOpen && (
                        <div className="absolute bottom-full left-0 mb-1 z-30 flex gap-0.5 rounded-xl border border-border bg-surface p-1 shadow-lg">
                            {POST_REACTIONS.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    title={r.label}
                                    onClick={() => {
                                        onReact(activeReaction === r.id ? null : r.id);
                                        setPickerOpen(false);
                                        pickerOpenedByHoldRef.current = false;
                                    }}
                                    className={cn(
                                        "h-8 w-8 rounded-lg text-base hover:bg-surface-secondary",
                                        activeReaction === r.id && "bg-[#fd5000]/12"
                                    )}
                                >
                                    {r.emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Comments */}
                <button
                    type="button"
                    onClick={onSelect}
                    aria-label="Comment on post"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${isDetailOpen ? "text-[#fd5000]" : "text-text-muted hover:bg-surface-secondary hover:text-[#fd5000]"}`}
                >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {(post.comment_count ?? 0) > 0 && <span className="font-semibold">{post.comment_count}</span>}
                </button>

                {/* Save */}
                <button
                    type="button"
                    onClick={onSave}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
                >
                    {saved ? (
                        <BookmarkCheck className="w-3.5 h-3.5 text-[#fd5000]" />
                    ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                    )}
                </button>

                {/* Share menu */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShareOpen((v) => !v)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                        {(post.share_count ?? 0) > 0 && <span className="font-semibold">{post.share_count}</span>}
                    </button>
                    {shareOpen && (
                        <div className="absolute bottom-full left-0 mb-1 z-30 min-w-[150px] rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
                            {(
                                [
                                    { type: "copy" as const, label: "Copy Link", icon: Copy },
                                    { type: "link" as const, label: "Share", icon: Share2 },
                                    { type: "repost" as const, label: "Repost", icon: RefreshCw },
                                    { type: "external" as const, label: "External", icon: ExternalLink },
                                ] as const
                            ).map((item) => (
                                <button
                                    key={item.type}
                                    type="button"
                                    onClick={() => {
                                        onShare(item.type);
                                        setShareOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-secondary"
                                >
                                    <item.icon className="w-3.5 h-3.5" /> {item.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

// ─── PostDetailPanel ──────────────────────────────────────────────────────────

function PostDetailPanel({
    postId,
    post,
    currentUserId,
    canPin,
    onClose,
    onCommentAdded,
    onCommentRemoved,
}: {
    postId: string;
    post: Post | undefined | null;
    currentUserId: string | null;
    canPin?: boolean;
    onClose: () => void;
    onCommentAdded: (postId: string) => void;
    onCommentRemoved?: (postId: string) => void;
}) {
    const supabase = createClient();
    const [comments, setComments] = useState<Comment[]>([]);
    const [text, setText] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [commentSort, setCommentSort] = useState<CommentSort>("newest");
    const textRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingComments(true);
            const res = await fetch(`/api/posts/${postId}/comments?sort=${commentSort}`);
            const data = await res.json();
            if (!cancelled && res.ok) setComments(data.comments ?? []);
            if (!cancelled) setLoadingComments(false);
        })();
        return () => { cancelled = true; };
    }, [postId, commentSort]);

    // Realtime on comments (shared chat realtime subscribe helper)
    useEffect(() => {
        let cancelled = false;
        let channel: Awaited<ReturnType<typeof subscribePostgresChangesMany>> = null;
        const channelName = `post-comments:${postId}`;

        void (async () => {
            channel = await subscribePostgresChangesMany(
                supabase,
                channelName,
                [
                    {
                        config: {
                            event: "INSERT",
                            schema: "public",
                            table: "community_post_comments",
                            filter: `post_id=eq.${postId}`,
                        },
                        onChange: async (payload) => {
                            const id = payload?.new?.id;
                            if (!id) return;
                            const { data } = await supabase
                                .from("community_post_comments")
                                .select("*, profiles!community_post_comments_author_id_fkey(full_name, avatar_url, username)")
                                .eq("id", String(id))
                                .single();
                            if (!data || cancelled) return;
                            setComments((prev) => {
                                if (prev.find((c) => c.id === data.id)) return prev;
                                return [...prev, data as Comment];
                            });
                        },
                    },
                    {
                        config: {
                            event: "UPDATE",
                            schema: "public",
                            table: "community_post_comments",
                            filter: `post_id=eq.${postId}`,
                        },
                        onChange: (payload) => {
                            const row = payload?.new;
                            if (!row?.id) return;
                            setComments((prev) =>
                                prev.map((c) => (c.id === row.id ? { ...c, ...row } as Comment : c))
                            );
                        },
                    },
                    {
                        config: {
                            event: "DELETE",
                            schema: "public",
                            table: "community_post_comments",
                            filter: `post_id=eq.${postId}`,
                        },
                        onChange: (payload) => {
                            const id = payload?.old?.id;
                            if (!id) return;
                            setComments((prev) => prev.filter((c) => c.id !== id));
                        },
                    },
                ],
                () => cancelled
            );
        })();

        return () => {
            cancelled = true;
            unsubscribeRealtime(supabase, channel, channelName);
        };
    }, [postId, supabase]);

    async function sendComment() {
        if (!text.trim() || sending) return;
        setSendError(null);
        setSending(true);
        try {
            const res = await fetch(`/api/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    body: text.trim(),
                    // Collapse nested replies onto the top-level thread parent so they remain visible.
                    parent_id: replyTo
                        ? replyTo.parent_id ?? replyTo.id
                        : null,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setSendError(err.error ?? "Failed to post comment. Please try again.");
                return;
            }
            const data = await res.json();
            setText("");
            setReplyTo(null);
            // Realtime will add it, but also add locally to avoid double-fetch
            setComments((c) => {
                if (c.find((cm) => cm.id === data.comment?.id)) return c;
                return [...c, data.comment];
            });
            onCommentAdded(postId);
        } catch {
            setSendError("Network error. Please try again.");
        } finally {
            setSending(false);
        }
    }

    async function deleteComment(commentId: string) {
        if (!confirm("Delete this comment?")) return;
        const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
        if (res.ok) {
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            onCommentRemoved?.(postId);
            toast.success("Comment deleted");
        } else {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "Failed to delete comment");
        }
    }

    async function editComment(commentId: string, body: string) {
        const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "Failed to edit comment");
            return;
        }
        const data = await res.json().catch(() => ({}));
        if (data.comment) {
            setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ...data.comment } : c)));
        } else {
            setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, body } : c)));
        }
        toast.success("Comment updated");
    }

    async function pinComment(commentId: string, is_pinned: boolean) {
        const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_pinned }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "Failed to pin comment");
            return;
        }
        const data = await res.json().catch(() => ({}));
        if (data.comment) {
            setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ...data.comment } : c)));
        } else {
            setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, is_pinned } : c)));
        }
    }

    async function likeComment(commentId: string) {
        const res = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
            method: "POST",
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "Failed to like comment");
            return;
        }
        const data = await res.json().catch(() => ({}));
        setComments((prev) =>
            prev.map((c) =>
                c.id === commentId
                    ? { ...c, like_count: typeof data.like_count === "number" ? data.like_count : c.like_count }
                    : c
            )
        );
    }

    const topComments = comments.filter((c) => !c.parent_id);
    // Include direct replies and any legacy deeper nested replies under this thread.
    const replies = (parentId: string) => {
        const byId = new Map(comments.map((c) => [c.id, c]));
        return comments.filter((c) => {
            if (!c.parent_id) return false;
            if (c.parent_id === parentId) return true;
            let cursor: Comment | undefined = byId.get(c.parent_id);
            while (cursor) {
                if (cursor.id === parentId) return true;
                if (!cursor.parent_id) return false;
                cursor = byId.get(cursor.parent_id);
            }
            return false;
        });
    };

    return (
        <div className="bg-surface border border-[#fd5000]/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4 gap-2">
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
                    {(
                        [
                            { id: "top" as const, label: "Top" },
                            { id: "newest" as const, label: "Newest" },
                            { id: "oldest" as const, label: "Oldest" },
                        ] as const
                    ).map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setCommentSort(s.id)}
                            className={cn(
                                "text-[10px] font-semibold px-2 py-1 rounded-md transition-colors",
                                commentSort === s.id
                                    ? "bg-[#fd5000]/12 text-[#fd5000]"
                                    : "text-text-muted hover:text-text-primary"
                            )}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <span className="text-[12px] font-semibold text-text-muted">
                    {comments.length} comment{comments.length !== 1 ? "s" : ""}
                </span>
            </div>

            {post && (
                <p className="text-[13px] text-text-primary leading-relaxed mb-4 pb-4 border-b border-border">
                    {post.body}
                </p>
            )}

            {loadingComments ? (
                <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                </div>
            ) : (
                <div className="space-y-4 mb-4">
                    {topComments.map((c) => (
                        <div key={c.id}>
                            <CommentItem
                                comment={c}
                                currentUserId={currentUserId}
                                canPin={canPin}
                                onReply={(c) => { setReplyTo(c); setTimeout(() => textRef.current?.focus(), 50); }}
                                onDelete={deleteComment}
                                onEdit={editComment}
                                onPin={pinComment}
                                onLike={likeComment}
                            />
                            {replies(c.id).map((r) => (
                                <div key={r.id} className="ml-8 mt-3 pl-3 border-l-2 border-border">
                                    <CommentItem
                                        comment={r}
                                        currentUserId={currentUserId}
                                        canPin={canPin}
                                        onReply={(c) => { setReplyTo(c); setTimeout(() => textRef.current?.focus(), 50); }}
                                        onDelete={deleteComment}
                                        onEdit={editComment}
                                        onPin={pinComment}
                                        onLike={likeComment}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                    {!loadingComments && topComments.length === 0 && (
                        <p className="text-center text-[12px] text-text-muted py-4">
                            No comments yet. Be the first!
                        </p>
                    )}
                </div>
            )}

            {/* Reply context */}
            {replyTo && (
                <div className="flex items-center gap-2 text-[11px] text-text-muted bg-surface-secondary rounded-lg px-3 py-2 mb-2 border border-border">
                    <Reply className="h-3 w-3 shrink-0" />
                    <span className="truncate flex-1">
                        Replying to{" "}
                        <strong>
                            {replyTo.profiles?.full_name || replyTo.profiles?.username || "Member"}
                        </strong>
                    </span>
                    <button onClick={() => setReplyTo(null)} className="hover:text-[#fd5000] transition-colors">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Send error */}
            {sendError && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-500 mb-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{sendError}</span>
                </div>
            )}

            <div className="flex gap-2">
                <textarea
                    ref={textRef}
                    value={text}
                    onChange={(e) => { setText(e.target.value); setSendError(null); }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void sendComment();
                        }
                    }}
                    placeholder={replyTo ? "Write a reply…" : "Add a comment…"}
                    rows={2}
                    className="flex-1 bg-surface-secondary text-[13px] text-text-primary placeholder:text-text-muted resize-none focus:outline-none rounded-lg px-3 py-2 border border-border"
                />
                <button
                    type="button"
                    disabled={!text.trim() || sending}
                    onClick={sendComment}
                    className="self-end inline-flex items-center gap-1.5 text-[12px] font-semibold text-white px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    style={{ background: "linear-gradient(135deg, #fd5000, #ff7a30)" }}
                >
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>
    );
}

// ─── CommentItem ──────────────────────────────────────────────────────────────

function CommentItem({
    comment,
    currentUserId,
    canPin,
    onReply,
    onDelete,
    onEdit,
    onPin,
    onLike,
}: {
    comment: Comment;
    currentUserId: string | null;
    canPin?: boolean;
    onReply: (c: Comment) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string, body: string) => void;
    onPin: (id: string, isPinned: boolean) => void;
    onLike: (id: string) => void;
}) {
    const profile = comment.profiles;
    const name = profile?.full_name ?? profile?.username ?? "Member";
    const isOwn = currentUserId && comment.author_id === currentUserId;
    const [editing, setEditing] = useState(false);
    const [editBody, setEditBody] = useState(comment.body);

    return (
        <div className="flex gap-2">
            {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={profile.avatar_url}
                    alt={name}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-border shrink-0"
                />
            ) : (
                <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: "#fd5000" }}
                >
                    {name[0]?.toUpperCase()}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[12px] font-semibold text-text-primary">{name}</span>
                    <span className="text-[10px] text-text-muted">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        {comment.edited_at ? " · edited" : ""}
                    </span>
                    {comment.is_pinned && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#fd5000]">
                            <Pin className="h-2.5 w-2.5" /> Pinned
                        </span>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                        {canPin && (
                            <button
                                type="button"
                                onClick={() => onPin(comment.id, !comment.is_pinned)}
                                className="text-text-muted hover:text-[#fd5000] transition-colors"
                                aria-label={comment.is_pinned ? "Unpin comment" : "Pin comment"}
                            >
                                <Pin className="h-3 w-3" />
                            </button>
                        )}
                        {isOwn && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditBody(comment.body);
                                        setEditing((v) => !v);
                                    }}
                                    className="text-text-muted hover:text-[#fd5000] transition-colors"
                                    aria-label="Edit comment"
                                >
                                    <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(comment.id)}
                                    className="text-text-muted hover:text-red-500 transition-colors"
                                    aria-label="Delete comment"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
                {editing ? (
                    <div className="space-y-1.5">
                        <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-border bg-surface-secondary px-2 py-1.5 text-[13px] text-text-primary focus:outline-none resize-none"
                        />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const trimmed = editBody.trim();
                                    if (!trimmed) return;
                                    onEdit(comment.id, trimmed);
                                    setEditing(false);
                                }}
                                className="text-[11px] font-semibold text-[#fd5000]"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                className="text-[11px] font-semibold text-text-muted"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap">
                        {comment.body}
                    </p>
                )}
                <div className="mt-1 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onReply(comment)}
                        className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-[#fd5000] transition-colors font-semibold"
                    >
                        <Reply className="h-3 w-3" /> Reply
                    </button>
                    <button
                        type="button"
                        onClick={() => onLike(comment.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-[#fd5000] transition-colors font-semibold"
                    >
                        <Heart className="h-3 w-3" />
                        {(comment.like_count ?? 0) > 0 ? comment.like_count : "Like"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Skeletons / Empty ────────────────────────────────────────────────────────

function FeedSkeleton() {
    return (
        <>
            {[0, 1, 2].map((i) => (
                <div key={i} className="bg-surface border border-border rounded-2xl p-4 animate-pulse">
                    <div className="flex gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-surface-secondary" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 w-32 rounded bg-surface-secondary" />
                            <div className="h-2 w-20 rounded bg-surface-secondary" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 w-full rounded bg-surface-secondary" />
                        <div className="h-3 w-4/5 rounded bg-surface-secondary" />
                    </div>
                </div>
            ))}
        </>
    );
}

function FeedEmpty() {
    return (
        <div className="bg-surface border border-border rounded-2xl p-12 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#fd5000]/10 flex items-center justify-center mb-3">
                <MessageCircle className="w-6 h-6 text-[#fd5000]" />
            </div>
            <h3 className="text-[15px] font-bold text-text-primary mb-1">Be the first to post</h3>
            <p className="text-[12px] text-text-muted max-w-sm">
                No conversations yet. Share a win, ask a question, or drop a link to get the community going.
            </p>
        </div>
    );
}