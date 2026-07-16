"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Cast, Users, Lock, Globe, Plus, LogIn, Clock, Shield,
  Search, Bell, BellOff, Sparkles, Flame, ShoppingBag, Video,
  ArrowRight, RotateCcw,
} from "lucide-react";
import { LiveIndicator } from "./hub-ui";
import { HubAvatar } from "./hub-ui";
import { canAccessSpace } from "@/lib/community-workspace-access";

/* ── Space → gradient map for thumbnails ── */
const SPACE_GRADIENTS: Record<string, string> = {
  "space-coding": "from-emerald-500/35 via-emerald-600/20 to-transparent",
  "space-trading": "from-amber-500/35 via-amber-600/20 to-transparent",
  "space-design": "from-violet-500/35 via-violet-600/20 to-transparent",
  "space-music": "from-rose-500/35 via-rose-600/20 to-transparent",
  "space-gaming": "from-sky-500/35 via-sky-600/20 to-transparent",
};
const SPACE_ICON: Record<string, string> = {
  "space-coding": "</>",
  "space-trading": "📈",
  "space-design": "🎨",
  "space-music": "🎵",
  "space-gaming": "🎮",
};

function getSpaceGradient(spaceId: string): string {
  return SPACE_GRADIENTS[spaceId] ?? "from-zinc-500/30 via-zinc-600/15 to-transparent";
}
function getSpaceIcon(spaceId: string): string {
  return SPACE_ICON[spaceId] ?? "📡";
}

/* ── Types ── */
export type SessionWithSpace = {
  id: string;
  title: string;
  host: string;
  host_avatar: string | null;
  space_id: string;
  space_name: string;
  space_access_type: string;
  community_slug: string;
  viewer_count: number;
  status: "live" | "upcoming" | "ended";
  privacy: "public" | "private";
  started_at: string;
  category?: string;
  description?: string | null;
  host_follower_count?: number;
  host_bio?: string | null;
  cover_url?: string | null;
  community_icon?: string | null;
  rsvp_count?: number;
  featured_product?: { name: string; price: string } | null;
};

type MembershipData = {
  role?: string;
  plan_type: string | null;
  status: string;
  space_access?: string[] | null;
} | null;

/* ── Helpers ── */
function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString();
}

function elapsedSince(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m live`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m live`;
  return `${Math.floor(diff / 86400)}d live`;
}

function upcomingTime(iso: string): string {
  const diff = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (diff < 0) return "Any moment";
  if (diff < 3600) return `In ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `In ${Math.floor(diff / 3600)}h`;
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const CATEGORY_COLORS: Record<string, string> = {
  Tutorial: "bg-emerald-500/15 text-emerald-400",
  Workshop: "bg-amber-500/15 text-amber-400",
  Review: "bg-violet-500/15 text-violet-400",
  Talk: "bg-sky-500/15 text-sky-400",
  "Q&A": "bg-rose-500/15 text-rose-400",
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  Tutorial: "Public Masterclass",
  Workshop: "Guild Workshop",
  Review: "Portfolio Review",
  Talk: "Keynote Talk",
  "Q&A": "Live Q&A",
};

function getRoomType(status: string, category?: string, spaceName?: string): string {
  if (status === "ended") return "Archived Replay";
  if (category && ROOM_TYPE_LABELS[category]) return ROOM_TYPE_LABELS[category];
  return spaceName ?? "Live Session";
}


/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
export function LiveSessionsList({
  communitySlug,
  onStartLive,
  onJoinSession,
}: {
  communitySlug?: string;
  onStartLive?: () => void;
  onJoinSession?: (session: SessionWithSpace) => void;
}) {
  const [liveSessions, setLiveSessions] = useState<SessionWithSpace[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<SessionWithSpace[]>([]);
  const [endedSessions, setEndedSessions] = useState<SessionWithSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membership, setMembership] = useState<MembershipData>(null);
  const [userId, setUserId] = useState<string | null>(null);

  /* ── Filter / search state ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "live" | "upcoming" | "replay">("all");
  const [notified, setNotified] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSessions();
    const getUser = async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, [communitySlug]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const url = communitySlug ? `/api/c/live?communityId=${communitySlug}` : `/api/c/live`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const sessions = data.sessions || [];
        setMembership(data.membership || null);
        const live = sessions.filter((s: SessionWithSpace) => s.status === "live");
        const upcoming = sessions.filter((s: SessionWithSpace) => s.status === "scheduled");
        const ended = sessions.filter((s: SessionWithSpace) => s.status === "ended");
        setLiveSessions(live);
        setUpcomingSessions(upcoming);
        setEndedSessions(ended);
      } else {
        setError("Failed to load sessions");
      }
    } catch (err) {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const hasSpaceAccess = (spaceAccessType: string, spaceId: string): boolean => {
    return canAccessSpace(spaceAccessType, membership, undefined, userId || undefined, spaceId);
  };

  const filterAccessible = (sessions: SessionWithSpace[]) =>
    sessions.filter(s => hasSpaceAccess(s.space_access_type, s.space_id));

  const accessibleLive = useMemo(() => filterAccessible(liveSessions), [liveSessions, membership, userId]);
  const accessibleUpcoming = useMemo(() => filterAccessible(upcomingSessions), [upcomingSessions, membership, userId]);
  const accessibleEnded = useMemo(() => filterAccessible(endedSessions), [endedSessions, membership, userId]);

  /* ── Filtered sessions ── */
  const filteredSessions = useMemo(() => {
    const all = [...accessibleLive, ...accessibleUpcoming, ...accessibleEnded];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return all.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.host.toLowerCase().includes(q) ||
        s.space_name.toLowerCase().includes(q)
      );
    }
    if (activeFilter === "live") return accessibleLive;
    if (activeFilter === "upcoming") return accessibleUpcoming;
    if (activeFilter === "replay") return accessibleEnded;
    // "all": live first, then upcoming, then ended
    return [...accessibleLive, ...accessibleUpcoming, ...accessibleEnded];
  }, [accessibleLive, accessibleUpcoming, accessibleEnded, searchQuery, activeFilter]);

  const hasLocked = liveSessions.length > accessibleLive.length ||
    upcomingSessions.length > accessibleUpcoming.length ||
    endedSessions.length > accessibleEnded.length;
  const lockedCount =
    (liveSessions.length - accessibleLive.length) +
    (upcomingSessions.length - accessibleUpcoming.length) +
    (endedSessions.length - accessibleEnded.length);

  const isEmpty = accessibleLive.length === 0 && accessibleUpcoming.length === 0 && accessibleEnded.length === 0 && !hasLocked;

  const toggleNotify = (id: string) => {
    setNotified(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const filterTabs = [
    { id: "all" as const, label: "All Sessions", count: accessibleLive.length + accessibleUpcoming.length + accessibleEnded.length },
    { id: "live" as const, label: "Live Now", count: accessibleLive.length },
    { id: "upcoming" as const, label: "Upcoming Workshops", count: accessibleUpcoming.length },
    { id: "replay" as const, label: "Archived Replays", count: accessibleEnded.length },
  ];


  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-[var(--color-bg)]">
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <Cast className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
              <p className="text-[13px] text-[var(--color-text-muted)]">Loading sessions...</p>
            </div>
          </div>

        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)]">
              <Cast className="h-8 w-8 text-[var(--color-text-muted)]/30" />
            </div>
            <p className="text-[16px] font-bold text-[var(--color-text-primary)]">Failed to load</p>
            <p className="mt-1.5 max-w-[300px] text-[13px] text-[var(--color-text-muted)]">{error}</p>
          </div>

        ) : (
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">

            {/* ═══════════════════ HERO ═══════════════════ */}
            <section className="animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[var(--color-accent)]/8 to-transparent hidden md:block" />
                <div className="relative z-10 max-w-2xl space-y-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
                    <Video className="h-4 w-4" />
                    Jimvio Live Hub
                  </span>
                  <h1 className="text-[22px] sm:text-[30px] font-black text-[var(--color-text-primary)] leading-tight tracking-tight">
                    Choose Your Desired Live Session or Masterclass
                  </h1>
                  <p className="text-[13px] sm:text-[14px] text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                    Jump into active streams, register for upcoming workshops, or catch up on archived replays featuring studio products and expert hosts.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-3">
                    {onStartLive && (
                      <button type="button" onClick={onStartLive}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-[12px] font-bold text-white shadow-lg transition hover:brightness-110">
                        <Plus className="h-4 w-4 stroke-[3]" />
                        Host Your Own Live Room
                      </button>
                    )}
                    <button type="button" onClick={() => alert("Calendar schedule coming soon")}
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-5 py-2.5 text-[12px] font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)]">
                      <Clock className="h-4 w-4" />
                      Calendar Schedule
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ═══════════════════ FILTER TABS ═══════════════════ */}
            {!isEmpty && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 animate-in fade-in">
                <div className="flex flex-wrap items-center gap-1.5">
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFilter(tab.id)}
                      className={cn(
                        "rounded-xl px-3.5 py-2 text-[11px] font-semibold transition flex items-center gap-1.5",
                        activeFilter === tab.id
                          ? "bg-[var(--color-accent)] text-white shadow-sm"
                          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                      )}
                    >
                      <span>{tab.label}</span>
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        activeFilter === tab.id ? "bg-white/20 text-white" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                      )}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="relative min-w-0 sm:max-w-[220px] w-full">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sessions, hosts..."
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] py-2 pl-9 pr-3 text-[12px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition focus:border-[var(--color-accent)]/30 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ═══════════════════ EMPTY STATE ═══════════════════ */}
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="relative mb-6">
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--color-surface-secondary)]">
                    <Cast className="h-12 w-12 text-[var(--color-text-muted)]/20" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface)] text-[10px]">🎙</span>
                </div>
                <p className="text-[18px] font-black text-[var(--color-text-primary)]">No one&apos;s live right now</p>
                <p className="mt-2 max-w-[340px] text-[13px] text-[var(--color-text-muted)] leading-relaxed">
                  {onStartLive
                    ? "Start a session in any space you have access to, or check the schedule for upcoming workshops."
                    : "No sessions found. Check back later or explore spaces to find something interesting."}
                </p>
                <div className="mt-6 flex items-center gap-3">
                  {onStartLive && (
                    <button type="button" onClick={onStartLive}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110">
                      <Plus className="h-4 w-4" /> Start Your Own
                    </button>
                  )}
                </div>
              </div>

            ) : (
              <>
                {/* ═══════════════════ SESSION GRID ═══════════════════ */}
                {filteredSessions.length === 0 && searchQuery ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <Search className="mb-3 h-10 w-10 text-[var(--color-text-muted)]/30" />
                    <p className="text-[15px] font-bold text-[var(--color-text-primary)]">No results for &ldquo;{searchQuery}&rdquo;</p>
                    <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">Try a different search term</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {filteredSessions.map((s) => (
                      <SessionCard
                        key={s.id}
                        session={s}
                        onJoin={onJoinSession}
                        isUpcoming={s.status === "upcoming" || (s.status === "scheduled")}
                        isNotified={notified.has(s.id)}
                        onToggleNotify={() => toggleNotify(s.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Locked notice */}
                {hasLocked && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Shield className="h-4 w-4" />
                      <span className="text-[13px] font-semibold">Some sessions require access</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                      {lockedCount} session{lockedCount !== 1 ? "s" : ""} hidden — upgrade your membership to view paid or premium spaces.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════
   SESSION CARD
   ═══════════════════════════════════════════════ */
function SessionCard({
  session,
  onJoin,
  isUpcoming,
  isNotified,
  onToggleNotify,
}: {
  session: SessionWithSpace;
  onJoin?: (session: SessionWithSpace) => void;
  isUpcoming?: boolean;
  isNotified?: boolean;
  onToggleNotify?: () => void;
}) {
  const isLive = session.status === "live" && !isUpcoming;
  const isEnded = session.status === "ended";
  const isLocked = session.space_access_type !== "free";
  const roomType = getRoomType(isEnded ? "ended" : session.status, session.category, session.space_name);

  return (
    <div
      className={cn(
        "group flex flex-col rounded-2xl border bg-[var(--color-surface)] overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        isLive
          ? "border-[var(--color-accent)]/20 ring-1 ring-[var(--color-accent)]/10"
          : isEnded
          ? "border-[var(--color-border)] opacity-80 hover:opacity-100"
          : "border-[var(--color-border)]"
      )}
    >
      {/* ══ THUMBNAIL ══ */}
      <div className={cn(
        "relative aspect-video w-full overflow-hidden",
        "bg-gradient-to-br", getSpaceGradient(session.space_id)
      )}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl opacity-15 select-none">{getSpaceIcon(session.space_id)}</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Status badge */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          {isLive ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-600/90 px-2 py-1 text-[9px] font-mono font-bold text-white shadow">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE NOW
            </span>
          ) : isUpcoming ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/90 px-2 py-1 text-[9px] font-mono font-bold text-white shadow">
              <Clock className="h-3 w-3" />
              Upcoming
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-black/60 backdrop-blur-md px-2 py-1 text-[9px] font-mono font-bold text-white shadow">
              <RotateCcw className="h-3 w-3" />
              Replay
            </span>
          )}

          {/* Counter */}
          <span className="flex items-center gap-1 rounded-md bg-black/50 backdrop-blur-md px-2 py-1 text-[9.5px] font-mono text-white">
            {isLive ? (
              <><Users className="h-3 w-3 text-emerald-400" /> {session.viewer_count} watching</>
            ) : isUpcoming ? (
              <><Users className="h-3 w-3 text-indigo-400" /> {(session.rsvp_count ?? 0) > 0 ? `${session.rsvp_count} RSVP` : "0 RSVP"}</>
            ) : (
              <><Clock className="h-3 w-3 text-slate-300" /> {elapsedSince(session.started_at)}</>
            )}
          </span>
        </div>

        {/* Featured product overlay (live only) */}
        {isLive && session.featured_product && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-white/95 text-[#1A2332] px-2.5 py-1 text-[10px] font-mono shadow">
            <ShoppingBag className="h-3 w-3 text-[var(--color-accent)] shrink-0" />
            <span className="font-bold">{session.featured_product.name}</span>
            <span className="opacity-40">•</span>
            <span>{session.featured_product.price}</span>
          </div>
        )}
      </div>

      {/* ══ CONTENT ══ */}
      <div className="flex flex-1 flex-col p-4 space-y-3">

        {/* Room type + community */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--color-text-muted)]">
          {session.community_icon ? (
            <img src={session.community_icon} alt="" className="h-4 w-4 rounded object-cover border border-[var(--color-border)]" />
          ) : (
            <span className="flex h-4 w-4 items-center justify-center rounded bg-[var(--color-surface-secondary)] text-[8px]">
              {getSpaceIcon(session.space_id)}
            </span>
          )}
          <span className="truncate max-w-[130px] font-semibold text-[var(--color-text-primary)]">{session.space_name}</span>
          <span className="opacity-30">•</span>
          <span className="shrink-0">{roomType}</span>
        </div>

        {/* Title */}
        <h3 className="text-[14px] font-bold text-[var(--color-text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors">
          {session.title}
        </h3>

        {/* Description */}
        {session.description && (
          <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
            {session.description}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Divider */}
        <div className="border-t border-[var(--color-border)]/60" />

        {/* ══ FOOTER: Host + CTA ══ */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <HubAvatar name={session.host?.full_name ?? "Host"} src={session.host?.avatar_url} size={22} />
            <div className="min-w-0 leading-tight">
              <p className="text-[11px] font-semibold text-[var(--color-text-primary)] truncate">
                {session.host?.full_name ?? "Host"}
              </p>
              {session.host_follower_count != null && (
                <p className="text-[9px] text-[var(--color-text-muted)]">
                  {formatCount(session.host_follower_count)} followers
                </p>
              )}
            </div>
          </div>

          {/* CTA */}
          {isLive && onJoin ? (
            <button type="button" onClick={() => onJoin(session)}
              className="inline-flex items-center gap-1 rounded-xl bg-[var(--color-accent)] px-3.5 py-2 text-[10px] font-bold text-white transition hover:brightness-110 shadow-sm">
              Join Stream <ArrowRight className="h-3 w-3" />
            </button>
          ) : isLocked ? (
            <span className="inline-flex items-center gap-1 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-[9px] font-bold text-amber-400">
              <Lock className="h-3 w-3" /> RSVP Gated
            </span>
          ) : isUpcoming ? (
            <button type="button" onClick={onToggleNotify}
              className={cn(
                "inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-[10px] font-bold transition",
                isNotified
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}>
              {isNotified ? <BellOff className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
              {isNotified ? "Notified" : "RSVP"}
            </button>
          ) : isEnded ? (
            <button type="button" onClick={() => onJoin?.(session)}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 py-2 text-[10px] font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)]">
              Watch Replay <ArrowRight className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
