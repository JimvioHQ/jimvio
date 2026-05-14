"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FeedSection } from "@/components/community/workspace/sections/Feed";
import {
    Search,
    TrendingUp,
    Users,
    Flame,
    Clock,
    Pin,
    ChevronDown,
    X,
    Hash,
    Rss,
    SlidersHorizontal,
    CheckCircle2,
    ArrowUpRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    member_count?: number;
}

interface TrendingPost {
    id: string;
    body: string;
    like_count: number;
    comment_count: number;
    created_at: string;
    community_name?: string;
    profiles?: { full_name: string | null; username: string | null } | null;
}

export type SortOption = "latest" | "top" | "pinned";

// ─── Utility ─────────────────────────────────────────────────────────────────

function communityInitials(name: string) {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

// Deterministic hue from community name
function communityColor(name: string): string {
    const hues = [14, 30, 195, 260, 340, 160, 45];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hues[Math.abs(hash) % hues.length]}, 70%, 52%)`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FeedPage() {
    const supabase = createClient();

    const [communities, setCommunities] = useState<Community[]>([]);
    const [activeCommunity, setActiveCommunity] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sort, setSort] = useState<SortOption>("latest");
    const [sortOpen, setSortOpen] = useState(false);
    const [trending, setTrending] = useState<TrendingPost[]>([]);
    const [loadingTrending, setLoadingTrending] = useState(true);
    const searchRef = useRef<HTMLInputElement>(null);
    const sortRef = useRef<HTMLDivElement>(null);

    // ── Debounce search ───────────────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    // ── Close sort dropdown on outside click ─────────────────────────────────
    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (sortRef.current && !sortRef.current.contains(e.target as Node))
                setSortOpen(false);
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    // ── Keyboard shortcut: / = focus search ──────────────────────────────────
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            )
                return;
            if (e.key === "/") {
                e.preventDefault();
                searchRef.current?.focus();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // ── Load joined communities ───────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        async function load() {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from("community_memberships")
                .select("community_id, communities(id, name, slug, logo_url)")
                .eq("user_id", user.id)
                .limit(20);

            if (cancelled || !data) return;

            const mapped: Community[] = data
                .map((row: { communities: Community | null }) => row.communities)
                .filter(Boolean) as Community[];

            setCommunities(mapped);
        }
        load();
        return () => { cancelled = true; };
    }, [supabase]);

    // ── Load trending posts ───────────────────────────────────────────────────
    const loadTrending = useCallback(async () => {
        setLoadingTrending(true);
        try {
            const res = await fetch("/api/posts/feed?sort=top&limit=5");
            const data = await res.json();
            setTrending(data.posts ?? []);
        } finally {
            setLoadingTrending(false);
        }
    }, []);

    useEffect(() => {
        loadTrending();
    }, [loadTrending]);

    const sortOptions: Record<SortOption, { label: string; icon: React.ReactNode; desc: string }> = {
        latest: { label: "Latest", icon: <Clock className="w-3.5 h-3.5" />, desc: "Most recent first" },
        top: { label: "Top", icon: <Flame className="w-3.5 h-3.5" />, desc: "Most liked posts" },
        pinned: { label: "Pinned", icon: <Pin className="w-3.5 h-3.5" />, desc: "Pinned by moderators" },
    };

    const hasFilters = activeCommunity !== "all" || debouncedSearch || sort !== "latest";
    const activeCommunityName = communities.find((c) => c.id === activeCommunity)?.name;

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-4 py-6">

                {/* ── Page header ───────────────────────────────────────────────── */}
                <div className="mb-6 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {/* Brand icon */}
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0"
                            style={{ background: "linear-gradient(135deg, #fd5000 0%, #ff7a30 100%)" }}
                        >
                            <Rss className="w-4.5 h-4.5 text-white" strokeWidth={2} />
                        </div>
                        <div>
                            <h1 className="text-[22px] font-bold text-text-primary tracking-tight leading-none">
                                Your Feed
                            </h1>
                            <p className="text-[12px] text-text-muted mt-0.5">
                                Posts from all your communities
                            </p>
                        </div>
                    </div>

                    {/* Active filter summary badge */}
                    {hasFilters && (
                        <button
                            onClick={() => { setActiveCommunity("all"); setSearch(""); setSort("latest"); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-[#fd5000] bg-[#fd5000]/8 border border-[#fd5000]/20 hover:bg-[#fd5000]/15 transition-all"
                        >
                            <SlidersHorizontal className="w-3 h-3" />
                            Filters active
                            <X className="w-3 h-3 opacity-60" />
                        </button>
                    )}
                </div>

                <div className="flex gap-6 items-start">

                    {/* ── Main column ───────────────────────────────────────────── */}
                    <div className="flex-1 min-w-0 flex flex-col gap-3">

                        {/* ── Filter bar ──────────────────────────────────────────── */}
                        <div className="bg-surface border border-border rounded-2xl p-3 flex flex-col gap-2.5 shadow-sm">

                            {/* Search row */}
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none transition-colors group-focus-within:text-[#fd5000]" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search posts…"
                                    className="w-full bg-surface-secondary text-[13px] text-text-primary placeholder:text-text-muted pl-8 pr-16 py-2.5 rounded-xl border border-border focus:outline-none focus:border-[#fd5000]/50 focus:bg-surface focus:ring-2 focus:ring-[#fd5000]/10 transition-all"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                    {search ? (
                                        <button
                                            onClick={() => setSearch("")}
                                            className="w-5 h-5 rounded-md flex items-center justify-center text-text-muted hover:text-[#fd5000] hover:bg-[#fd5000]/10 transition-all"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    ) : (
                                        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md border border-border text-[10px] text-text-muted font-mono font-semibold bg-surface-secondary">
                                            /
                                        </kbd>
                                    )}
                                </div>
                            </div>

                            {/* Community tabs + Sort row */}
                            <div className="flex items-center gap-2">
                                {/* Community filter tabs */}
                                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0 pb-0.5">
                                    {/* All tab */}
                                    <button
                                        onClick={() => setActiveCommunity("all")}
                                        className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 ${activeCommunity === "all"
                                            ? "bg-[#fd5000] text-white shadow-sm scale-[1.02]"
                                            : "text-text-muted hover:bg-surface-secondary hover:text-text-primary"
                                            }`}
                                    >
                                        <Hash className="w-3 h-3 shrink-0" />
                                        All
                                    </button>

                                    {communities.map((c) => {
                                        const isActive = activeCommunity === c.id;
                                        const color = communityColor(c.name);
                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => setActiveCommunity(isActive ? "all" : c.id)}
                                                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 ${isActive
                                                    ? "bg-[#fd5000] text-white shadow-sm scale-[1.02]"
                                                    : "text-text-muted hover:bg-surface-secondary hover:text-text-primary"
                                                    }`}
                                            >
                                                {c.logo_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={c.logo_url}
                                                        alt={c.name}
                                                        className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-white/30"
                                                    />
                                                ) : (
                                                    <span
                                                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black shrink-0"
                                                        style={{
                                                            background: isActive ? "rgba(255,255,255,0.28)" : color,
                                                            color: "white",
                                                        }}
                                                    >
                                                        {communityInitials(c.name)}
                                                    </span>
                                                )}
                                                <span className="truncate max-w-[72px]">{c.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Divider */}
                                <div className="w-px h-5 bg-border shrink-0" />

                                {/* Sort dropdown */}
                                <div ref={sortRef} className="relative shrink-0">
                                    <button
                                        onClick={() => setSortOpen((o) => !o)}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 border ${sortOpen
                                            ? "bg-surface-secondary border-[#fd5000]/30 text-text-primary"
                                            : "border-border text-text-muted hover:bg-surface-secondary hover:text-text-primary"
                                            }`}
                                    >
                                        <span className="text-[#fd5000]">{sortOptions[sort].icon}</span>
                                        {sortOptions[sort].label}
                                        <ChevronDown
                                            className={`w-3 h-3 transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`}
                                        />
                                    </button>

                                    {sortOpen && (
                                        <div className="absolute right-0 top-[calc(100%+6px)] bg-surface border border-border rounded-xl shadow-xl z-20 overflow-hidden w-44 py-1">
                                            {(Object.keys(sortOptions) as SortOption[]).map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => { setSort(s); setSortOpen(false); }}
                                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold transition-colors ${sort === s
                                                        ? "text-[#fd5000] bg-[#fd5000]/6"
                                                        : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                                                        }`}
                                                >
                                                    <span className={sort === s ? "text-[#fd5000]" : "text-text-muted"}>
                                                        {sortOptions[s].icon}
                                                    </span>
                                                    <div className="flex flex-col items-start">
                                                        <span>{sortOptions[s].label}</span>
                                                        <span className="text-[10px] font-normal text-text-muted leading-none mt-0.5">
                                                            {sortOptions[s].desc}
                                                        </span>
                                                    </div>
                                                    {sort === s && (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#fd5000] ml-auto shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Active filter pills ──────────────────────────────────── */}
                        {hasFilters && (
                            <div className="flex items-center gap-1.5 flex-wrap px-0.5">
                                <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wide">
                                    Active:
                                </span>
                                {activeCommunity !== "all" && activeCommunityName && (
                                    <FilterPill
                                        icon={
                                            <span
                                                className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-black text-white shrink-0"
                                                style={{ background: communityColor(activeCommunityName) }}
                                            >
                                                {communityInitials(activeCommunityName)}
                                            </span>
                                        }
                                        label={activeCommunityName}
                                        onRemove={() => setActiveCommunity("all")}
                                    />
                                )}
                                {debouncedSearch && (
                                    <FilterPill
                                        icon={<Search className="w-3 h-3 shrink-0" />}
                                        label={debouncedSearch}
                                        onRemove={() => setSearch("")}
                                    />
                                )}
                                {sort !== "latest" && (
                                    <FilterPill
                                        icon={sortOptions[sort].icon as React.ReactElement}
                                        label={sortOptions[sort].label}
                                        onRemove={() => setSort("latest")}
                                    />
                                )}
                            </div>
                        )}

                        {/* ── Feed ────────────────────────────────────────────────── */}
                        <FeedSection
                        // communityFilter={activeCommunity === "all" ? null : activeCommunity}
                        // search={debouncedSearch}
                        // sort={sort}
                        />
                    </div>

                    {/* ── Right sidebar ─────────────────────────────────────────── */}
                    <aside className="w-[268px] shrink-0 hidden lg:flex flex-col gap-3 sticky top-6">

                        {/* Your communities */}
                        <SidebarCard
                            icon={<Users className="w-3.5 h-3.5 text-[#fd5000]" />}
                            title="Your Communities"
                            badge={communities.length > 0 ? String(communities.length) : undefined}
                        >
                            {communities.length === 0 ? (
                                <p className="text-[12px] text-text-muted text-center py-5 leading-relaxed">
                                    Join communities<br />to see them here.
                                </p>
                            ) : (
                                <div className="space-y-0.5 mt-1">
                                    {communities.map((c) => {
                                        const isActive = activeCommunity === c.id;
                                        const color = communityColor(c.name);
                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => setActiveCommunity(isActive ? "all" : c.id)}
                                                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-all duration-150 group ${isActive
                                                    ? "bg-[#fd5000]/8 text-[#fd5000]"
                                                    : "hover:bg-surface-secondary text-text-primary"
                                                    }`}
                                            >
                                                {c.logo_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={c.logo_url}
                                                        alt={c.name}
                                                        className="w-6 h-6 rounded-full object-cover ring-1 ring-border"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0"
                                                        style={{ background: isActive ? "#fd5000" : color }}
                                                    >
                                                        {communityInitials(c.name)}
                                                    </div>
                                                )}
                                                <span className="text-[12px] font-semibold truncate flex-1 leading-none">
                                                    {c.name}
                                                </span>
                                                {isActive && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#fd5000] shrink-0 opacity-80" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </SidebarCard>

                        {/* Trending posts */}
                        <SidebarCard icon={<ArrowUpRight className="w-3.5 h-3.5 text-[#fd5000]" />} title="Trending" badge="Today">
                            {loadingTrending ? (
                                <div className="space-y-px py-1">
                                    {[0, 1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className="flex animate-pulse gap-2.5 px-3.5 py-2"
                                            style={{ animationDelay: `${i * 150}ms` }}
                                        >
                                            <div className="mt-px h-[17px] w-[17px] shrink-0 rounded-[5px] bg-surface-secondary" />
                                            <div className="flex-1 space-y-[5px]">
                                                <div className="h-[9px] w-full rounded-[3px] bg-surface-secondary" />
                                                <div className="h-[9px] w-4/5 rounded-[3px] bg-surface-secondary" />
                                                <div className="h-[7px] w-2/5 rounded-[3px] bg-surface-secondary" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : trending.length === 0 ? (
                                <p className="py-6 text-center text-[12px] text-text-muted">
                                    No trending posts yet.
                                </p>
                            ) : (
                                <div className="py-1.5">
                                    {trending.map((post, i) => (
                                        <TrendingItem key={post.id} post={post} rank={i + 1} />
                                    ))}
                                </div>
                            )}
                        </SidebarCard>
                    </aside>
                </div>
            </div>
        </div>
    );
}

// ─── SidebarCard ──────────────────────────────────────────────────────────────

// ── SidebarCard ───────────────────────────────────────────────────────────────
function SidebarCard({
    icon,
    title,
    badge,
    children,
}: {
    icon?: React.ReactNode;
    title: string;
    badge?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-[14px] border border-border/60 bg-surface">
            <div className="flex items-center gap-2 px-3.5 pt-3 pb-2.5">
                {icon && (
                    <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-[#fd5000]/10">
                        {icon}
                    </div>
                )}
                <h2 className="flex-1 text-[12px] font-bold tracking-tight text-text-primary">
                    {title}
                </h2>
                {badge && (
                    <span className="rounded-[5px] border border-border/60 bg-surface-secondary px-[7px] py-[2px] text-[10px] font-semibold text-text-muted">
                        {badge}
                    </span>
                )}
            </div>

            <div className="mx-3.5 h-px bg-border/60" />

            {children}
        </div>
    );
}

// ── Icon (swap out TrendingUp for this crisp arrow-trend SVG) ─────────────────
const TrendingIcon = () => (
    <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fd5000"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

function FilterPill({
    icon,
    label,
    onRemove,
}: {
    icon?: React.ReactElement;
    label: string;
    onRemove: () => void;
}) {
    return (
        <span className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-[#fd5000]/8 text-[#fd5000] text-[11px] font-semibold border border-[#fd5000]/20 transition-all">
            {icon && <span className="opacity-70">{icon}</span>}
            <span className="max-w-[120px] truncate">{label}</span>
            <button
                onClick={onRemove}
                className="w-4 h-4 rounded-md flex items-center justify-center hover:bg-[#fd5000]/15 transition-colors ml-0.5"
                aria-label={`Remove ${label} filter`}
            >
                <X className="w-2.5 h-2.5" />
            </button>
        </span>
    );
}

// ─── TrendingItem ─────────────────────────────────────────────────────────────

const rankStyles = [
    { color: "#fd5000", bg: "#fd5000" },
    { color: "#ff8c52", bg: "#ff8c52" },
    { color: "#ffb899", bg: "#ffb899" },
    { color: "#c4c4c4", bg: "#c4c4c4" },
    { color: "#b0b0b0", bg: "#b0b0b0" },
];

// ── rank colour helper ────────────────────────────────────────────────────────
function getRankColor(rank: number): string {
    if (rank === 1) return "#fd5000";
    if (rank === 2) return "#c94000";
    if (rank === 3) return "#903000";
    if (rank === 4) return "#2e2e31";
    return "#232325";
}

// ── stat pill ─────────────────────────────────────────────────────────────────
function StatBadge({ icon, value }: { icon: React.ReactNode; value: number }) {
    return (
        <span className="flex items-center gap-[3px] text-[11px] font-medium text-text-muted">
            {icon}
            {value.toLocaleString()}
        </span>
    );
}

// ── trending item ─────────────────────────────────────────────────────────────
function TrendingItem({ post, rank }: { post: TrendingPost; rank: number }) {
    const isHot = rank <= 3;

    return (
        <div className="group relative flex cursor-pointer items-start gap-[11px] px-3 py-[9px] transition-colors duration-100 hover:bg-surface-secondary">
            {/* separator — skip on last child via CSS */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-3 right-3.5 h-px bg-border/60 group-last:hidden"
            />

            {/* rank badge */}
            <div
                className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] text-[10px] font-black tracking-tight text-white"
                style={{ background: getRankColor(rank) }}
                aria-label={`Rank ${rank}`}
            >
                {rank}
            </div>

            {/* body */}
            <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[12.5px] font-medium leading-[1.45] text-text-primary transition-colors duration-100 group-hover:text-[#fd5000]">
                    {post.body}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatBadge
                        icon={
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        }
                        value={post.like_count ?? 0}
                    />

                    <span aria-hidden="true" className="h-[2px] w-[2px] rounded-full bg-text-muted/30" />

                    <StatBadge
                        icon={
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        }
                        value={post.comment_count ?? 0}
                    />

                    {post.community_name && (
                        <>
                            <span aria-hidden="true" className="h-[2px] w-[2px] rounded-full bg-text-muted/30" />
                            <span className="max-w-[90px] truncate text-[10.5px] font-bold tracking-tight text-[#fd5000] opacity-80 transition-opacity group-hover:opacity-100">
                                {post.community_name}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* live indicator for top 3 */}
            {isHot && (
                <span
                    aria-hidden="true"
                    className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#fd5000]"
                    style={{ opacity: rank === 3 ? 0.35 : 0.7 }}
                />
            )}
        </div>
    );
}
