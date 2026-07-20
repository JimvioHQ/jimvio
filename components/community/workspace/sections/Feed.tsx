"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
    Sparkles,
    BarChart3,
    Flag,
    Quote,
    FileText,
    Package,
    Radio,
    MoreHorizontal,
} from "lucide-react";
import { uploadCommunityChatFile } from "@/lib/community-chat-upload";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
}

type ComposerMode = "discussion" | "poll";

interface Comment {
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    profiles?: Profile | null;
    parent_id: string | null;
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
    return {
        ...raw,
        body: raw.body ?? raw.content ?? "",
        profiles: raw.profiles ?? raw.author ?? null,
        like_count: raw.like_count ?? raw.reactions_count ?? 0,
        comment_count: raw.comment_count ?? raw.comments_count ?? 0,
        user_has_liked: raw.user_has_liked ?? false,
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

// ─── FeedSection ──────────────────────────────────────────────────────────────

const FEED_FILTER_MAP: Record<string, string> = {
    "for-you": "for-you",
    "following": "following",
    "trending": "trending",
    "spaces": "spaces",
    "missions": "missions",
    "ai-picks": "ai-picks",
};

export function FeedSection({ filter = "for-you", variant = "default" }: { filter?: string; variant?: "default" | "hub" }) {
    const supabase = createClient();
    const feedFilter = FEED_FILTER_MAP[filter] ?? "for-you";
    const isHub = variant === "hub";

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [communities, setCommunities] = useState<Community[]>([]);
    const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);

    const [composer, setComposer] = useState("");
    const [composerMode, setComposerMode] = useState<ComposerMode>("discussion");
    const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
    const [quoteOfPostId, setQuoteOfPostId] = useState<string | null>(null);
    const [quotePreview, setQuotePreview] = useState<Post | null>(null);
    const [productAttachId, setProductAttachId] = useState("");
    const [liveAttachId, setLiveAttachId] = useState("");
    const [showAttachPanel, setShowAttachPanel] = useState(false);
    const [aiBusy, setAiBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const [composerError, setComposerError] = useState<string | null>(null);
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [detailId, setDetailId] = useState<string | null>(null);
    const [pendingImages, setPendingImages] = useState<
        Array<{ url: string; name: string; mime: string }>
    >([]);
    const [uploading, setUploading] = useState(false);
    const [showCommunityPicker, setShowCommunityPicker] = useState(false);
    const [showDrafts, setShowDrafts] = useState(false);
    const [drafts, setDrafts] = useState<Post[]>([]);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const composerRef = useRef<HTMLTextAreaElement>(null);
    const realtimeRef = useRef<RealtimeChannel | null>(null);
    const communityPickerRef = useRef<HTMLDivElement>(null);
    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

    // ── Bootstrap current user + memberships ──────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        async function bootstrap() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;
            setCurrentUserId(user.id);

            // Load memberships
            const { data: mships } = await supabase
                .from("community_memberships")
                .select("community_id, role, status")
                .eq("user_id", user.id)
                .eq("status", "active");

            if (cancelled) return;
            const activeMships = mships ?? [];
            setMemberships(activeMships);

            if (activeMships.length === 0) return;

            // Load community details
            const communityIds = activeMships.map((m: Membership) => m.community_id);
            const { data: comms } = await supabase
                .from("communities")
                .select("id, name, slug, avatar_url, is_private")
                .in("id", communityIds)
                .eq("is_active", true);

            if (cancelled) return;

            // For each community, get the first room to use as default
            const enriched: Community[] = await Promise.all(
                (comms ?? []).map(async (c: Community) => {
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
            if (enriched.length > 0) setSelectedCommunity(enriched[0]);
        }
        bootstrap();
        return () => { cancelled = true; };
    }, [supabase]);

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

    // ── Keyboard shortcut: N = focus composer ────────────────────────────────
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === "n" || e.key === "N") {
                e.preventDefault();
                composerRef.current?.focus();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // ── Load posts (first page) ───────────────────────────────────────────────
    const load = useCallback(async (replace = true) => {
        if (replace) setLoading(true);
        try {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE), filter: feedFilter });
            const res = await fetch(`/api/posts/feed?${params}`);
            const data = await res.json();
            const normalized = (data.posts ?? []).map(normalizePost);

            if (replace) {
                setPosts(normalized);
            } else {
                setPosts((prev) => [...prev, ...normalized]);
            }

            setHasMore((data.posts ?? []).length === PAGE_SIZE);
            setCursor(data.next_cursor ?? null);

            // Sync liked + saved IDs from server response
            const liked = new Set<string>(
                normalized.filter((p: Post) => p.user_has_liked).map((p: Post) => p.id)
            );
            setLikedIds((prev) => replace ? liked : new Set([...prev, ...liked]));
        } finally {
            if (replace) setLoading(false);
        }
    }, [feedFilter]);

    useEffect(() => { load(); }, [load]);

    // ── Infinite scroll ───────────────────────────────────────────────────────
    useEffect(() => {
        const el = loadMoreSentinelRef.current;
        if (!el || !hasMore) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) void loadMore();
            },
            { rootMargin: "240px" }
        );
        obs.observe(el);
        return () => obs.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasMore, cursor, loadingMore]);

    // ── Load more (pagination) ────────────────────────────────────────────────
    async function loadMore() {
        if (!cursor || loadingMore) return;
        setLoadingMore(true);
        try {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE), cursor, filter: feedFilter });
            const res = await fetch(`/api/posts/feed?${params}`);
            const data = await res.json();
            const normalized = (data.posts ?? []).map(normalizePost);
            setPosts((prev) => [...prev, ...normalized]);
            setHasMore((data.posts ?? []).length === PAGE_SIZE);
            setCursor(data.next_cursor ?? null);

            const liked = new Set<string>(
                normalized.filter((p: Post) => p.user_has_liked).map((p: Post) => p.id)
            );
            setLikedIds((prev) => new Set([...prev, ...liked]));
        } finally {
            setLoadingMore(false);
        }
    }

    async function loadDrafts() {
        const params = new URLSearchParams({ drafts: "1", limit: "20" });
        const res = await fetch(`/api/posts/feed?${params}`);
        const data = await res.json();
        if (res.ok) setDrafts((data.posts ?? []).map(normalizePost));
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
        // Clean up previous channel
        if (realtimeRef.current) {
            supabase.removeChannel(realtimeRef.current);
            realtimeRef.current = null;
        }

        const channel = supabase
            .channel("feed:community_posts")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "community_posts" },
                async (payload: any) => {
                    // Fetch full post with profile join
                    const { data } = await supabase
                        .from("community_posts")
                        .select("*, profiles:author_id(id, full_name, avatar_url, username)")
                        .eq("id", payload.new.id)
                        .single();
                    if (!data) return;
                    const normalized = normalizePost(data as Post);
                    setPosts((prev) => {
                        // Avoid duplicates
                        if (prev.find((p) => p.id === normalized.id)) return prev;
                        // Pinned posts go first, then newest
                        return normalized.is_pinned
                            ? [normalized, ...prev]
                            : [normalized, ...prev.filter((p) => !p.is_pinned), ...prev.filter((p) => p.is_pinned ? false : false)];
                    });
                }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "community_posts" },
                (payload: any) => {
                    setPosts((prev) =>
                        prev.map((p) =>
                            p.id === payload.new.id ? normalizePost({ ...p, ...payload.new } as Post) : p
                        )
                    );
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "community_posts" },
                (payload: any) => {
                    setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
                }
            )
            .subscribe();

        realtimeRef.current = channel;
        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    // ── Image upload ──────────────────────────────────────────────────────────
    async function handleImageUpload(files: FileList | null) {
        if (!files?.length) return;
        for (const file of Array.from(files)) {
            if (!file.type.startsWith("image/")) continue;
            const tempEntry = { url: "", name: file.name, mime: file.type };
            setPendingImages((prev) => [...prev, tempEntry]);
            setUploading(true);
            try {
                const uploaded = await uploadCommunityChatFile("", "feed", file);
                setPendingImages((prev) =>
                    prev.map((img) =>
                        img === tempEntry ? { ...uploaded, url: uploaded.url || "" } : img
                    )
                );
            } catch {
                setPendingImages((prev) => prev.filter((img) => img !== tempEntry));
            } finally {
                setUploading(false);
            }
        }
    }

    // ── Submit post ───────────────────────────────────────────────────────────
    async function submitPost(asDraft = false) {
        setComposerError(null);

        const trimmed = composer.trim();
        const cleanPoll = pollOptions.map((o) => o.trim()).filter(Boolean);
        if (composerMode === "poll") {
            if (cleanPoll.length < 2) {
                setComposerError("Add at least 2 poll options.");
                return;
            }
        } else if (!trimmed && pendingImages.every((i) => !i.url)) {
            return;
        }

        if (!currentUserId) {
            setComposerError("You must be signed in to post.");
            return;
        }

        if (!selectedCommunity) {
            setComposerError("Please select a community to post in.");
            setShowCommunityPicker(true);
            return;
        }

        if (!selectedCommunity.default_room_id || !selectedCommunity.default_space_id) {
            setComposerError("This community has no active feed room. Contact the owner.");
            return;
        }

        const isMember = memberships.some(
            (m) => m.community_id === selectedCommunity.id && m.status === "active"
        );
        if (!isMember) {
            setComposerError("You are not a member of this community.");
            return;
        }

        const attachments: Record<string, unknown> = {};
        if (productAttachId.trim()) attachments.product_id = productAttachId.trim();
        if (liveAttachId.trim()) attachments.live_session_id = liveAttachId.trim();

        setSaving(true);
        try {
            const res = await fetch(`/api/posts/feed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    body: trimmed || (composerMode === "poll" ? "Poll" : ""),
                    post_type: composerMode === "poll" ? "poll" : "discussion",
                    community_id: selectedCommunity.id,
                    room_id: selectedCommunity.default_room_id,
                    space_id: selectedCommunity.default_space_id,
                    images: pendingImages.filter((i) => i.url).map((i) => i.url),
                    attachments,
                    poll_options: composerMode === "poll" ? cleanPoll : undefined,
                    is_published: !asDraft,
                    quote_of_post_id: quoteOfPostId,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setComposerError(err.error ?? "Failed to post. Please try again.");
                return;
            }

            setComposer("");
            setPollOptions(["", ""]);
            setComposerMode("discussion");
            setPendingImages([]);
            setQuoteOfPostId(null);
            setQuotePreview(null);
            setProductAttachId("");
            setLiveAttachId("");
            setShowAttachPanel(false);
            if (asDraft) {
                await loadDrafts();
                setShowDrafts(true);
            } else {
                await load();
            }
        } catch {
            setComposerError("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    async function runAiAssist(mode: "improve" | "shorten" | "expand" | "engaging" = "improve") {
        if (!composer.trim() || aiBusy) return;
        setAiBusy(true);
        setComposerError(null);
        try {
            const res = await fetch("/api/c/feed/assist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: composer, mode }),
            });
            const data = await res.json();
            if (data.text) setComposer(data.text);
            else setComposerError(data.error ?? "AI assist unavailable");
        } catch {
            setComposerError("AI assist failed. Try again.");
        } finally {
            setAiBusy(false);
        }
    }

    function startQuote(post: Post) {
        setQuoteOfPostId(post.id);
        setQuotePreview(post);
        composerRef.current?.focus();
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
        if (!res.ok) return;
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

    // ── Toggle like (optimistic) ──────────────────────────────────────────────
    async function toggleLike(postId: string) {
        const wasLiked = likedIds.has(postId);

        // Optimistic update
        setLikedIds((prev) => {
            const next = new Set(prev);
            wasLiked ? next.delete(postId) : next.add(postId);
            return next;
        });
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? { ...p, like_count: p.like_count + (wasLiked ? -1 : 1) }
                    : p
            )
        );

        try {
            const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
            if (!res.ok) throw new Error("like failed");
        } catch {
            // Revert
            setLikedIds((prev) => {
                const next = new Set(prev);
                wasLiked ? next.add(postId) : next.delete(postId);
                return next;
            });
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? { ...p, like_count: p.like_count + (wasLiked ? 1 : -1) }
                        : p
                )
            );
        }
    }

    // ── Toggle save ───────────────────────────────────────────────────────────
    async function toggleSave(postId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        if (savedIds.has(postId)) {
            setSavedIds((s) => { const n = new Set(s); n.delete(postId); return n; });
            await supabase
                .from("community_saved_posts")
                .delete()
                .eq("post_id", postId)
                .eq("user_id", user.id);
        } else {
            setSavedIds((s) => new Set(s).add(postId));
            const { error } = await supabase
                .from("community_saved_posts")
                .insert({ post_id: postId, user_id: user.id });
            if (error) {
                setSavedIds((s) => { const n = new Set(s); n.delete(postId); return n; });
            }
        }
    }

    // ── Delete post ───────────────────────────────────────────────────────────
    async function deletePost(postId: string) {
        if (!confirm("Delete this post? This cannot be undone.")) return;
        const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
        if (res.ok) {
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            if (detailId === postId) setDetailId(null);
        }
    }

    // ── Share post ────────────────────────────────────────────────────────────
    async function sharePost(postId: string) {
        const url = getPostPermalink(postId);
        try {
            if (navigator.share) {
                await navigator.share({ url });
            } else {
                await navigator.clipboard?.writeText(url);
            }
            void fetch(`/api/posts/${postId}/share`, { method: "POST" });
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
    const isMemberOfSelected = selectedCommunity
        ? memberships.some((m) => m.community_id === selectedCommunity.id && m.status === "active")
        : false;

    return (
        <div className={cn("flex flex-col", isHub ? "gap-3" : "gap-4")}>

            {/* ── Community Picker ───────────────────────────────────────────── */}
            {communities.length > 1 && !isHub && (
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
                                        setComposerError(null);
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

            {/* ── Composer ───────────────────────────────────────────────────── */}
            <div
                className={cn(
                    "bg-surface border rounded-2xl p-4",
                    isHub ? "border-[var(--color-border,#e4e4e7)] bg-white shadow-sm" : "border-border"
                )}
            >

                {/* Membership gate warning */}
                {selectedCommunity && !isMemberOfSelected && (
                    <div className="flex items-center gap-2 text-[12px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-3">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>You are not a member of <strong>{selectedCommunity.name}</strong>. Join first to post.</span>
                    </div>
                )}

                {/* No community warning */}
                {communities.length === 0 && !loading && (
                    <div className="flex items-center gap-2 text-[12px] text-text-muted bg-surface-secondary border border-border rounded-lg px-3 py-2 mb-3">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span>Join a community to start posting.</span>
                    </div>
                )}

                {/* Mode tabs */}
                <div className="flex items-center gap-1 mb-2 overflow-x-auto">
                    {(
                        [
                            { id: "discussion" as const, label: "Post", icon: FileText },
                            { id: "poll" as const, label: "Poll", icon: BarChart3 },
                        ] as const
                    ).map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setComposerMode(m.id)}
                            className={cn(
                                "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors",
                                composerMode === m.id
                                    ? "bg-[#fd5000]/12 text-[#fd5000]"
                                    : "text-text-muted hover:bg-surface-secondary"
                            )}
                        >
                            <m.icon className="w-3.5 h-3.5" />
                            {m.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={async () => {
                            setShowDrafts((v) => !v);
                            if (!showDrafts) await loadDrafts();
                        }}
                        className={cn(
                            "ml-auto inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg",
                            showDrafts ? "text-[#fd5000]" : "text-text-muted hover:bg-surface-secondary"
                        )}
                    >
                        Drafts
                    </button>
                </div>

                {quotePreview && (
                    <div className="mb-2 flex items-start gap-2 rounded-xl border border-border bg-surface-secondary/60 px-3 py-2">
                        <Quote className="w-3.5 h-3.5 text-[#fd5000] mt-0.5 shrink-0" />
                        <p className="text-[12px] text-text-muted line-clamp-2 flex-1">{quotePreview.body}</p>
                        <button
                            type="button"
                            onClick={() => { setQuoteOfPostId(null); setQuotePreview(null); }}
                            className="text-text-muted hover:text-[#fd5000]"
                            aria-label="Remove quote"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                <textarea
                    id={isHub ? "hub-community-composer" : undefined}
                    ref={composerRef}
                    value={composer}
                    onChange={(e) => { setComposer(e.target.value); setComposerError(null); }}
                    placeholder={
                        !selectedCommunity
                            ? "Select a community above to post…"
                            : composerMode === "poll"
                              ? `Ask a question in ${selectedCommunity.name}…`
                              : `Share something in ${selectedCommunity.name}…`
                    }
                    rows={isHub ? 2 : 3}
                    disabled={!isMemberOfSelected && communities.length > 0}
                    className={cn(
                        "w-full resize-none text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
                        isHub ? "min-h-[56px] bg-transparent" : "bg-transparent"
                    )}
                />

                {composerMode === "poll" && (
                    <div className="mt-2 space-y-2">
                        {pollOptions.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <input
                                    value={opt}
                                    onChange={(e) =>
                                        setPollOptions((prev) =>
                                            prev.map((p, j) => (j === i ? e.target.value : p))
                                        )
                                    }
                                    placeholder={`Option ${i + 1}`}
                                    className="flex-1 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-[13px] text-text-primary focus:outline-none"
                                />
                                {pollOptions.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPollOptions((prev) => prev.filter((_, j) => j !== i))
                                        }
                                        className="p-1.5 text-text-muted hover:text-red-500"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {pollOptions.length < 6 && (
                            <button
                                type="button"
                                onClick={() => setPollOptions((prev) => [...prev, ""])}
                                className="text-[11px] font-semibold text-[#fd5000]"
                            >
                                + Add option
                            </button>
                        )}
                    </div>
                )}

                {showAttachPanel && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <label className="text-[11px] text-text-muted">
                            Product ID
                            <input
                                value={productAttachId}
                                onChange={(e) => setProductAttachId(e.target.value)}
                                placeholder="product uuid"
                                className="mt-1 w-full rounded-lg border border-border bg-surface-secondary px-3 py-2 text-[12px] text-text-primary focus:outline-none"
                            />
                        </label>
                        <label className="text-[11px] text-text-muted">
                            Live session ID
                            <input
                                value={liveAttachId}
                                onChange={(e) => setLiveAttachId(e.target.value)}
                                placeholder="live session uuid"
                                className="mt-1 w-full rounded-lg border border-border bg-surface-secondary px-3 py-2 text-[12px] text-text-primary focus:outline-none"
                            />
                        </label>
                    </div>
                )}

                {/* Pending images */}
                {pendingImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mt-2">
                        {pendingImages.map((img, i) => (
                            <div key={i} className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-border">
                                {!img.url ? (
                                    <div className="h-full w-full flex items-center justify-center bg-surface-secondary">
                                        <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                                    </div>
                                ) : (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img.url} alt="" className="object-cover w-full h-full" />
                                        <button
                                            onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                                            className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {showDrafts && (
                    <div className="mt-3 rounded-xl border border-border bg-surface-secondary/40 p-2 space-y-1 max-h-40 overflow-y-auto">
                        {drafts.length === 0 ? (
                            <p className="text-[11px] text-text-muted px-2 py-1">No drafts yet.</p>
                        ) : (
                            drafts.map((d) => (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => {
                                        setComposer(d.body);
                                        setComposerMode(d.post_type === "poll" ? "poll" : "discussion");
                                        setShowDrafts(false);
                                    }}
                                    className="w-full text-left rounded-lg px-2 py-1.5 text-[12px] text-text-primary hover:bg-surface"
                                >
                                    <span className="line-clamp-1">{d.body || "Untitled draft"}</span>
                                </button>
                            ))
                        )}
                    </div>
                )}

                {/* Composer error */}
                {composerError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-500 mt-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{composerError}</span>
                    </div>
                )}

                <div className={cn("flex items-center justify-between pt-3 border-t border-border gap-2", isHub ? "mt-2" : "mt-3")}>
                    <div className="flex items-center gap-0.5 flex-wrap">
                        <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={!isMemberOfSelected}
                            className="p-2 rounded-lg text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Attach photo"
                        >
                            <ImageIcon className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowAttachPanel((v) => !v)}
                            disabled={!isMemberOfSelected}
                            className={cn(
                                "p-2 rounded-lg transition-colors disabled:opacity-40",
                                showAttachPanel ? "text-[#fd5000] bg-[#fd5000]/10" : "text-text-muted hover:bg-surface-secondary hover:text-[#fd5000]"
                            )}
                            aria-label="Attach product or live"
                            title="Product / Live"
                        >
                            <Package className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => runAiAssist("improve")}
                            disabled={!isMemberOfSelected || !composer.trim() || aiBusy}
                            className="p-2 rounded-lg text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors disabled:opacity-40"
                            aria-label="AI Assist"
                            title="AI Assist"
                        >
                            {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        </button>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            disabled={saving || uploading || !isMemberOfSelected}
                            onClick={() => submitPost(true)}
                            className="text-[11px] font-semibold px-3 py-2 rounded-xl text-text-muted hover:bg-surface-secondary disabled:opacity-40"
                        >
                            Save draft
                        </button>
                        <button
                            type="button"
                            disabled={
                                (composerMode === "discussion" && !composer.trim() && pendingImages.every((i) => !i.url)) ||
                                saving ||
                                uploading ||
                                !isMemberOfSelected
                            }
                            onClick={() => submitPost(false)}
                            className={cn(
                                "inline-flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all",
                                isHub
                                    ? "bg-[#fd5000]/15 text-[#fd5000] hover:bg-[#fd5000]/22"
                                    : "text-white"
                            )}
                            style={isHub ? undefined : { background: "linear-gradient(135deg, #fd5000, #ff7a30)" }}
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Post
                        </button>
                    </div>
                </div>

                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                />
            </div>

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
                            liked={likedIds.has(p.id)}
                            currentUserId={currentUserId}
                            onLike={() => toggleLike(p.id)}
                            onSave={() => toggleSave(p.id)}
                            onSelect={() => setDetailId(detailId === p.id ? null : p.id)}
                            onDelete={() => deletePost(p.id)}
                            onShare={() => sharePost(p.id)}
                            onQuote={() => startQuote(p)}
                            onReport={() => reportPost(p.id)}
                            onVotePoll={(idx) => votePoll(p.id, idx)}
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
                    onClose={() => setDetailId(null)}
                    onCommentAdded={(postId) => {
                        setPosts((prev) =>
                            prev.map((p) =>
                                p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
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
    onSave,
    onSelect,
    onDelete,
    onShare,
    onQuote,
    onReport,
    onVotePoll,
    isDetailOpen,
}: {
    post: Post;
    saved: boolean;
    liked: boolean;
    currentUserId: string | null;
    onLike: () => void;
    onSave: () => void;
    onSelect: () => void;
    onDelete: () => void;
    onShare: () => void;
    onQuote: () => void;
    onReport: () => void;
    onVotePoll: (optionIndex: number) => void;
    isDetailOpen: boolean;
}) {
    const profile = post.profiles ?? post.author ?? null;
    const name = profile?.full_name ?? profile?.username ?? "Creator";
    const imgs = Array.isArray(post.images)
        ? (post.images as string[]).filter(Boolean)
        : [];
    const isOwn = currentUserId && post.author_id === currentUserId;
    const poll = (post.attachments as { poll?: { options?: Array<{ text: string; votes?: number }> } } | null)
        ?.poll;
    const productId = (post.attachments as { product_id?: string } | null)?.product_id;
    const liveSessionId = (post.attachments as { live_session_id?: string } | null)?.live_session_id;
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <article
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
                {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={profile.avatar_url}
                        alt={name}
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
                    <p className="text-[13px] font-semibold text-text-primary truncate">{name}</p>
                    {profile?.username && (
                        <p className="text-[11px] text-text-muted truncate">
                            @{profile.username} · {timeAgo(post.created_at)}
                            {post.post_type === "poll" ? " · Poll" : ""}
                        </p>
                    )}
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
                        <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={() => { onQuote(); setMenuOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-secondary"
                            >
                                <Quote className="w-3.5 h-3.5" /> Quote
                            </button>
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

            <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap mb-3">
                {post.body}
            </p>

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

            {imgs.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                    {imgs.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            key={url}
                            src={url}
                            alt=""
                            className="h-32 w-auto rounded-lg object-cover border border-border"
                        />
                    ))}
                </div>
            )}

            <div className="flex items-center gap-1 -ml-2">
                {/* Like */}
                <button
                    type="button"
                    onClick={onLike}
                    aria-label={liked ? "Unlike post" : "Like post"}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${liked ? "text-[#fd5000]" : "text-text-muted hover:bg-surface-secondary hover:text-[#fd5000]"}`}
                >
                    <Heart className={`w-3.5 h-3.5 ${liked ? "fill-[#fd5000]" : ""}`} />
                    {(post.like_count ?? 0) > 0 && <span className="font-semibold">{post.like_count}</span>}
                </button>

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

                {/* Share — deep link */}
                <button
                    type="button"
                    onClick={onShare}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
                >
                    <Share2 className="w-3.5 h-3.5" />
                    {(post.share_count ?? 0) > 0 && <span className="font-semibold">{post.share_count}</span>}
                </button>
            </div>
        </article>
    );
}

// ─── PostDetailPanel ──────────────────────────────────────────────────────────

function PostDetailPanel({
    postId,
    post,
    currentUserId,
    onClose,
    onCommentAdded,
}: {
    postId: string;
    post: Post | undefined | null;
    currentUserId: string | null;
    onClose: () => void;
    onCommentAdded: (postId: string) => void;
}) {
    const supabase = createClient();
    const [comments, setComments] = useState<Comment[]>([]);
    const [text, setText] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const textRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingComments(true);
            const res = await fetch(`/api/posts/${postId}/comments`);
            const data = await res.json();
            if (!cancelled && res.ok) setComments(data.comments ?? []);
            if (!cancelled) setLoadingComments(false);
        })();
        return () => { cancelled = true; };
    }, [postId]);

    // Realtime on comments
    useEffect(() => {
        const channel = supabase
            .channel(`post-comments:${postId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "community_post_comments",
                    filter: `post_id=eq.${postId}`,
                },
                async (payload: any) => {
                    const { data } = await supabase
                        .from("community_post_comments")
                        .select("*, profiles:author_id(id, full_name, avatar_url, username)")
                        .eq("id", payload.new.id)
                        .single();
                    if (!data) return;
                    setComments((prev) => {
                        if (prev.find((c) => c.id === data.id)) return prev;
                        return [...prev, data as Comment];
                    });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "community_post_comments",
                    filter: `post_id=eq.${postId}`,
                },
                (payload: any) => {
                    setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [postId, supabase]);

    async function sendComment() {
        if (!text.trim() || sending) return;
        setSendError(null);
        setSending(true);
        try {
            const res = await fetch(`/api/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: text.trim(), parent_id: replyTo?.id ?? null }),
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
        }
    }

    const topComments = comments.filter((c) => !c.parent_id);
    const replies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

    return (
        <div className="bg-surface border border-[#fd5000]/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
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
                                onReply={(c) => { setReplyTo(c); setTimeout(() => textRef.current?.focus(), 50); }}
                                onDelete={deleteComment}
                            />
                            {replies(c.id).map((r) => (
                                <div key={r.id} className="ml-8 mt-3 pl-3 border-l-2 border-border">
                                    <CommentItem
                                        comment={r}
                                        currentUserId={currentUserId}
                                        onReply={(c) => { setReplyTo(c); setTimeout(() => textRef.current?.focus(), 50); }}
                                        onDelete={deleteComment}
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
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            sendComment();
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
    onReply,
    onDelete,
}: {
    comment: Comment;
    currentUserId: string | null;
    onReply: (c: Comment) => void;
    onDelete: (id: string) => void;
}) {
    const profile = comment.profiles;
    const name = profile?.full_name ?? profile?.username ?? "Member";
    const isOwn = currentUserId && comment.author_id === currentUserId;

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
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] font-semibold text-text-primary">{name}</span>
                    <span className="text-[10px] text-text-muted">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    {isOwn && (
                        <button
                            type="button"
                            onClick={() => onDelete(comment.id)}
                            className="ml-auto text-text-muted hover:text-red-500 transition-colors"
                            aria-label="Delete comment"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    )}
                </div>
                <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap">
                    {comment.body}
                </p>
                <button
                    type="button"
                    onClick={() => onReply(comment)}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-[#fd5000] transition-colors font-semibold"
                >
                    <Reply className="h-3 w-3" /> Reply
                </button>
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