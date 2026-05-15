
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, Check, LayoutGrid, Loader2, MessageCircle, Sparkles,
  Users, Video, ShieldCheck, ArrowRight, Lock, Globe, Calendar,
  Flame, AlertCircle, Crown, type LucideIcon,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────────────────────── */

type ProfileRef = {
  id: string;
  full_name: string | null;
  username?: string | null;
  avatar_url: string | null;
};

export type CommunityDetailPayload = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  long_description: string | null;
  avatar_url: string | null;
  cover_image: string | null;
  category: string | null;
  tags: string[] | null;
  is_free: boolean | null;
  is_private: boolean | null;
  monthly_price: number | string | null;
  yearly_price: number | string | null;
  lifetime_price: number | string | null;
  currency: string | null;
  trial_days: number | null;
  member_count: number | null;
  space_count: number | null;
  created_at: string | null;
  owner: ProfileRef | null;
  recent_members: ProfileRef[];
  stats: {
    course_count: number;
    lesson_count: number;
    posts_last_week: number;
    last_post_at: string | null;
  };
};

export type MembershipPayload = {
  status: string;
  role: string | null;
  created_at: string | null;
  subscribed_at: string | null;
  expires_at: string | null;
  plan_type: string | null;
} | null;

type SpaceRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  access_type: string;
  room_count: number | null;
  hasAccess?: boolean;
};

type PlanKey = "monthly" | "yearly" | "lifetime";

/* ─── Constants ─────────────────────────────────────────────────────── */

const SPACE_ICON_MAP: Record<string, LucideIcon> = {
  message: MessageCircle, chat: MessageCircle,
  course: BookOpen, learn: BookOpen,
  video: Video, sparkles: Sparkles,
};

function spaceIcon(icon?: string | null): LucideIcon {
  if (!icon) return LayoutGrid;
  return SPACE_ICON_MAP[icon.toLowerCase()] ?? LayoutGrid;
}

function plural(n: number, word: string) {
  return `${formatNumber(n)} ${word}${n === 1 ? "" : "s"}`;
}

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/* ─── SVG: empty cover artwork ─────────────────────────────────────── */

function EmptyCoverArt({ initial }: { initial: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[var(--color-surface)]">
      <svg viewBox="0 0 1200 380" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="cover-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-surface)" />
            <stop offset="100%" stopColor="var(--color-surface-secondary)" />
          </linearGradient>
          <pattern id="cover-grid" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M 44 0 L 0 0 0 44" fill="none" stroke="var(--color-border)" strokeWidth="0.5" opacity="0.6" />
          </pattern>
          <radialGradient id="cover-spot" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1200" height="380" fill="url(#cover-grad)" />
        <rect width="1200" height="380" fill="url(#cover-grid)" />
        <ellipse cx="600" cy="190" rx="500" ry="200" fill="url(#cover-spot)" />

        {/* Floating geometric shapes — distinct silhouette */}
        <g opacity="0.18">
          <circle cx="180" cy="120" r="6" fill="var(--color-accent)" />
          <circle cx="320" cy="280" r="4" fill="var(--color-text-muted)" />
          <circle cx="950" cy="90" r="5" fill="var(--color-accent)" />
          <circle cx="1080" cy="240" r="3" fill="var(--color-text-muted)" />
          <rect x="240" y="60" width="8" height="8" fill="none" stroke="var(--color-text-muted)" strokeWidth="1" transform="rotate(15 244 64)" />
          <rect x="880" y="320" width="6" height="6" fill="none" stroke="var(--color-accent)" strokeWidth="1" transform="rotate(45 883 323)" />
        </g>

        {/* Massive serif initial — editorial centerpiece */}
        <text
          x="600"
          y="260"
          textAnchor="middle"
          fontSize="280"
          fontFamily="ui-serif, Georgia, serif"
          fontWeight="600"
          fontStyle="italic"
          fill="var(--color-accent)"
          opacity="0.07"
          letterSpacing="-0.04em"
        >
          {initial}
        </text>
      </svg>
    </div>
  );
}

/* ─── Avatar stack ──────────────────────────────────────────────────── */

function MemberStack({ members, totalCount }: { members: ProfileRef[]; totalCount: number }) {
  const visible = members.slice(0, 6);
  const remaining = Math.max(0, totalCount - visible.length);

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((m, i) => (
        <div
          key={m.id}
          title={m.full_name ?? "Member"}
          className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[var(--color-bg)] bg-[var(--color-surface)]"
          style={{ zIndex: visible.length - i }}
        >
          {m.avatar_url && m.avatar_url.trim() ? (
            <Image src={m.avatar_url} alt="" fill sizes="32px" className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-[var(--color-text-muted)]">
              {m.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--color-bg)] bg-[var(--color-accent)]/10 text-[10px] font-medium text-[var(--color-accent)]"
          style={{ zIndex: 0 }}
        >
          +{remaining > 999 ? `${Math.floor(remaining / 1000)}k` : remaining}
        </div>
      )}
    </div>
  );
}

/* ─── Activity pulse — visual "is this place alive?" ────────────────── */

function ActivityIndicator({ postsLastWeek, lastPostAt }: { postsLastWeek: number; lastPostAt: string | null }) {
  if (!lastPostAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)] opacity-40" />
        No recent activity
      </span>
    );
  }

  const days = Math.floor((Date.now() - new Date(lastPostAt).getTime()) / 86_400_000);
  const isHot = postsLastWeek >= 10;
  const isActive = days <= 7;

  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
      <span className={cn(
        "relative flex h-1.5 w-1.5 rounded-full",
        isActive ? "bg-[var(--color-success)]" : "bg-[var(--color-text-muted)]"
      )}>
        {isActive && (
          <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-success)] opacity-60" />
        )}
      </span>
      {isHot ? (
        <>
          <Flame size={11} className="text-[var(--color-accent)]" />
          {postsLastWeek} posts this week
        </>
      ) : isActive ? (
        <>Active · last post {relativeTime(lastPostAt)}</>
      ) : (
        <>Last post {relativeTime(lastPostAt)}</>
      )}
    </span>
  );
}

/* ─── Main component ────────────────────────────────────────────────── */

export function CommunityDetailView({
  community,
  membership,
  isLoggedIn,
}: {
  community: CommunityDetailPayload;
  membership: MembershipPayload;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const { formatMoney } = useCurrency();
  const [spaces, setSpaces] = useState<SpaceRow[] | null>(null);
  const [plan, setPlan] = useState<PlanKey>("monthly");
  const [joining, setJoining] = useState(false);
  const [localMembership, setLocalMembership] = useState<MembershipPayload>(membership);

  // Stable dep — only re-sync when meaningful values change
  const membershipKey = `${membership?.status}-${membership?.expires_at}-${membership?.role}`;
  useEffect(() => { setLocalMembership(membership); }, [community.id, membershipKey]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/spaces/${community.id}`)
      .then((r) => r.json())
      .then((d: { spaces?: SpaceRow[] }) => { if (!cancelled) setSpaces(d.spaces ?? []); })
      .catch(() => { if (!cancelled) setSpaces([]); });
    return () => { cancelled = true; };
  }, [community.id]);

  /* ── Derived state ─────────────────────────────────────────────── */
  const isMember = useMemo(() => {
    if (!localMembership || localMembership.status !== "active") return false;
    if (localMembership.expires_at && new Date(localMembership.expires_at) < new Date()) return false;
    return true;
  }, [localMembership]);

  const isOwner = localMembership?.role === "owner" || community.owner?.id === membership?.role; // adjust to your auth pattern
  const isModerator = localMembership?.role === "moderator";

  const memberSince = useMemo(() => {
    const raw = localMembership?.subscribed_at || localMembership?.created_at;
    if (!raw) return null;
    return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(raw));
  }, [localMembership]);

  const expiresInDays = useMemo(() => {
    if (!localMembership?.expires_at) return null;
    const days = Math.floor((new Date(localMembership.expires_at).getTime() - Date.now()) / 86_400_000);
    return days >= 0 ? days : null;
  }, [localMembership]);

  const monthly = Number(community.monthly_price ?? 0);
  const yearly = Number(community.yearly_price ?? 0);
  const lifetime = Number(community.lifetime_price ?? 0);
  const currency = (community.currency || "USD").toUpperCase();
  const isFree = community.is_free || (monthly === 0 && yearly === 0 && lifetime === 0);
  const isPrivate = !!community.is_private;
  const trialDays = community.trial_days ?? 0;

  const priceForPlan = (p: PlanKey) =>
    p === "monthly" ? monthly : p === "yearly" ? yearly : lifetime;
  const availablePlans: PlanKey[] = [
    monthly > 0 && "monthly",
    yearly > 0 && "yearly",
    lifetime > 0 && "lifetime",
  ].filter(Boolean) as PlanKey[];

  // Reset to first available plan if currently selected isn't offered
  useEffect(() => {
    if (availablePlans.length && !availablePlans.includes(plan)) {
      setPlan(availablePlans[0]);
    }
  }, [availablePlans.join(","), plan]);

  const yearlySaving = monthly > 0 && yearly > 0
    ? Math.round(100 - (yearly / (monthly * 12)) * 100)
    : 0;

  const lifetimeBreakeven = monthly > 0 && lifetime > 0
    ? Math.ceil(lifetime / monthly)
    : 0;

  const loginNext = `/login?next=${encodeURIComponent(`/c/${community.slug}`)}`;
  const initial = community.name?.[0]?.toUpperCase() ?? "?";
  const createdYear = community.created_at ? new Date(community.created_at).getFullYear() : null;

  // Build dynamic value list based on what the community actually offers
  const valueList = useMemo(() => {
    const list: string[] = [];
    if (community.stats.course_count > 0) {
      list.push(`${community.stats.course_count} course${community.stats.course_count !== 1 ? "s" : ""} · ${community.stats.lesson_count} lessons`);
    }
    if ((community.space_count ?? 0) > 0) {
      list.push(`${community.space_count} private space${community.space_count !== 1 ? "s" : ""}`);
    }
    list.push("Direct messaging with members");
    if (!isFree) list.push("Cancel anytime");
    return list;
  }, [community.stats, community.space_count, isFree]);

  /* ── Handlers ──────────────────────────────────────────────────── */
  async function handleJoin() {
    if (!isLoggedIn) { router.push(loginNext); return; }

    if (isPrivate) {
      router.push(`/c/${community.slug}/request`);
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`/api/communities/${community.slug}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't join community");
      setLocalMembership(data.membership);
      toast.success(`Welcome to ${community.name}`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Couldn't join — please try again");
    } finally {
      setJoining(false);
    }
  }

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">

      {/* ══════════ HERO ══════════ */}
      <section className="relative">
        <div className="relative h-[220px] overflow-hidden sm:h-[320px]">
          {community.cover_image ? (
            <Image src={community.cover_image} alt="" fill className="object-cover" unoptimized priority />
          ) : (
            <EmptyCoverArt initial={initial} />
          )}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />
        </div>

        <div className="mx-auto max-w-6xl px-6">
          <div className="relative z-10 -mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:gap-6">
            {/* Avatar */}
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-4 border-[var(--color-bg)] bg-[var(--color-surface)] shadow-sm sm:h-24 sm:w-24">
              {community.avatar_url && community.avatar_url.trim() ? (
                <Image src={community.avatar_url} alt="" fill sizes="96px" className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-accent)]/5">
                  <span className="font-serif text-3xl italic text-[var(--color-accent)]">{initial}</span>
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="min-w-0 flex-1 pb-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                {community.category && (
                  <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    {community.category}
                  </span>
                )}
                {isPrivate && (
                  <span className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                    <Lock size={9} /> Private
                  </span>
                )}
                {!isFree && !isPrivate && (
                  <span className="inline-flex items-center gap-1 rounded border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                    <Lock size={9} /> Premium
                  </span>
                )}
                {isFree && (
                  <span className="rounded border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 px-2 py-0.5 text-[10px] font-medium text-[var(--color-success)]">
                    Free
                  </span>
                )}
              </div>
              <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
                {community.name}
              </h1>
              {community.tagline && (
                <p className="mt-1 line-clamp-2 max-w-2xl text-[14px] text-[var(--color-text-muted)]">
                  {community.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Owner + stats strip */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--color-border)] pb-4 text-[13px]">
            {community.owner && (
              <Link
                href={community.owner.username ? `/u/${community.owner.username}` : `/u/${community.owner.id}`}
                className="group flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <div className="relative h-5 w-5 overflow-hidden rounded-full bg-[var(--color-surface)]">
                  {community.owner.avatar_url && community.owner.avatar_url.trim() ? (
                    <Image src={community.owner.avatar_url} alt="" fill sizes="20px" className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] font-medium text-[var(--color-text-muted)]">
                      {community.owner.full_name?.[0] ?? "?"}
                    </div>
                  )}
                </div>
                <span>
                  by <span className="font-medium group-hover:underline">{community.owner.full_name ?? "Anonymous"}</span>
                </span>
              </Link>
            )}
            <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
              <Users size={13} />
              {plural(community.member_count ?? 0, "member")}
            </span>
            {(community.space_count ?? 0) > 0 && (
              <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <LayoutGrid size={13} />
                {plural(community.space_count ?? 0, "space")}
              </span>
            )}
            {community.stats.course_count > 0 && (
              <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <BookOpen size={13} />
                {plural(community.stats.course_count, "course")}
              </span>
            )}
            {createdYear && (
              <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                <Calendar size={13} />
                Since {createdYear}
              </span>
            )}
            <ActivityIndicator
              postsLastWeek={community.stats.posts_last_week}
              lastPostAt={community.stats.last_post_at}
            />
          </div>
        </div>
      </section>

      {/* ══════════ BODY ══════════ */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 px-6 py-10 lg:grid-cols-[1fr_340px] lg:gap-14">

        {/* ── LEFT ── */}
        <div className="min-w-0 space-y-12">
          {/* About */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">About</h2>
            {community.long_description ? (
              <div className="whitespace-pre-wrap text-[15px] leading-[1.7] text-[var(--color-text-secondary)]">
                {community.long_description}
              </div>
            ) : community.description && community.description !== community.tagline ? (
              <p className="text-[15px] leading-[1.7] text-[var(--color-text-secondary)]">
                {community.description}
              </p>
            ) : (
              <p className="text-[14px] italic text-[var(--color-text-muted)]">
                The owner hasn't written a description yet.
              </p>
            )}
            {community.tags && community.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {community.tags.map((t) => {
                  const clean = t.replace(/^#/, "");
                  return (
                    <Link
                      key={clean}
                      href={`/communities?tag=${encodeURIComponent(clean)}`}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                    >
                      #{clean}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* What's inside (course preview) */}
          {community.stats.course_count > 0 && (
            <section className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">What's inside</h2>
                <span className="text-[12px] text-[var(--color-text-muted)]">
                  {community.stats.course_count} course{community.stats.course_count !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
                      {community.stats.lesson_count} lessons across {community.stats.course_count} courses
                    </p>
                    <p className="text-[12px] text-[var(--color-text-muted)]">
                      {isMember ? "Continue learning from your dashboard" : `${isFree ? "Join" : "Subscribe"} to unlock all lessons`}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Spaces */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Spaces</h2>
              {spaces && spaces.length > 0 && (
                <span className="text-[12px] text-[var(--color-text-muted)]">{spaces.length} available</span>
              )}
            </div>

            {spaces === null ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[88px] animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" />
                ))}
              </div>
            ) : spaces.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] py-12 text-[var(--color-text-muted)]">
                <LayoutGrid size={20} strokeWidth={1.5} />
                <p className="text-[13px]">Spaces are being set up — check back soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {spaces.map((s) => {
                  const Icon = spaceIcon(s.icon);
                  // Use member status, not the unset hasAccess flag
                  const locked = s.access_type === "paid" && !isMember;
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "group relative rounded-lg border bg-[var(--color-bg)] p-4 transition-colors",
                        "border-[var(--color-border)] hover:border-[var(--color-accent)]/40"
                      )}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                          <Icon size={15} strokeWidth={1.8} />
                        </div>
                        {locked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-text-muted)]">
                            <Lock size={9} /> Members only
                          </span>
                        )}
                      </div>
                      <h3 className="text-[14px] font-medium leading-snug text-[var(--color-text-primary)]">
                        {s.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
                        {(s.room_count ?? 0) > 0 && (
                          <span>{plural(s.room_count!, "room")}</span>
                        )}
                        {s.description && (
                          <>
                            {(s.room_count ?? 0) > 0 && <span aria-hidden>·</span>}
                            <span className="line-clamp-1">{s.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT: action panel ── */}
        <aside className="space-y-3 lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
            <div className="space-y-4 p-5">

              {/* Already a member */}
              {isMember ? (
                <>
                  <div className="flex items-center gap-3 rounded-md border border-[var(--color-success)]/20 bg-[var(--color-success)]/5 p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
                      {isOwner ? <Crown size={13} strokeWidth={2.5} /> :
                        isModerator ? <ShieldCheck size={13} strokeWidth={2.5} /> :
                          <Check size={13} strokeWidth={2.5} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                        {isOwner ? "Owner" : isModerator ? "Moderator" : "Active member"}
                      </p>
                      {memberSince && (
                        <p className="text-[11px] text-[var(--color-text-muted)]">Member since {memberSince}</p>
                      )}
                    </div>
                  </div>

                  {/* Expiry warning */}
                  {expiresInDays !== null && expiresInDays <= 7 && !isOwner && (
                    <div className="flex items-start gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-2.5 text-[12px] text-[var(--color-warning)]">
                      <AlertCircle size={13} className="mt-0.5 shrink-0" />
                      <span>
                        Your access expires in {expiresInDays} day{expiresInDays !== 1 ? "s" : ""}.{" "}
                        <Link href={`/c/${community.slug}/subscribe?plan=${plan}`} className="font-medium underline">
                          Renew
                        </Link>
                      </span>
                    </div>
                  )}

                  <Link
                    href={`/c/community/${community.slug}/chats`}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] text-[13px] font-medium text-white hover:bg-[var(--color-accent-hover)]"
                  >
                    Open workspace <ArrowRight size={13} />
                  </Link>
                  {(isOwner || isModerator) && (
                    <Link
                      href={`/creator/${community.id}/dashboard`}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] text-[12px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    >
                      Manage community
                    </Link>
                  )}
                </>
              ) : isPrivate ? (
                /* Private — request to join */
                <>
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                      Access
                    </p>
                    <p className="text-xl font-semibold text-[var(--color-text-primary)]">Invite only</p>
                    <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                      The owner reviews join requests manually.
                    </p>
                  </div>
                  <button
                    onClick={handleJoin}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] text-[13px] font-medium text-white hover:bg-[var(--color-accent-hover)]"
                  >
                    Request to join
                  </button>
                </>
              ) : isFree ? (
                /* Free */
                <>
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                      Access
                    </p>
                    <p className="text-xl font-semibold text-[var(--color-text-primary)]">Free</p>
                    <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                      No payment required
                    </p>
                  </div>
                  <ValueList items={valueList} accent />
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] text-[13px] font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                  >
                    {joining ? <Loader2 size={14} className="animate-spin" /> : "Join community"}
                  </button>
                </>
              ) : (
                /* Paid */
                <>
                  {/* Plan selector */}
                  {availablePlans.length > 1 && (
                    <div className="flex gap-1 rounded-md bg-[var(--color-surface)] p-1">
                      {availablePlans.map((p) => (
                        <button
                          key={p}
                          onClick={() => setPlan(p)}
                          className={cn(
                            "relative h-7 flex-1 rounded text-[11px] font-medium capitalize transition-colors",
                            plan === p
                              ? "bg-[var(--color-bg)] text-[var(--color-text-primary)] shadow-sm"
                              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                          )}
                        >
                          {p}
                          {p === "yearly" && yearlySaving > 0 && (
                            <span className="absolute -right-1 -top-1.5 rounded-full bg-[var(--color-success)] px-1.5 py-px text-[9px] font-medium leading-none text-white">
                              −{yearlySaving}%
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Price */}
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                      {trialDays > 0 ? `After ${trialDays}-day free trial` : "Price"}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] tabular-nums">
                        {formatMoney(priceForPlan(plan), currency)}
                      </span>
                      <span className="text-[12px] text-[var(--color-text-muted)]">
                        {plan === "monthly" ? "per month" : plan === "yearly" ? "per year" : "one-time"}
                      </span>
                    </div>
                    {plan === "yearly" && yearlySaving > 0 && (
                      <p className="mt-1 text-[12px] text-[var(--color-success)]">
                        Save {yearlySaving}% vs monthly
                      </p>
                    )}
                    {plan === "lifetime" && lifetimeBreakeven > 0 && (
                      <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                        Pays back after {lifetimeBreakeven} months
                      </p>
                    )}
                  </div>

                  <ValueList items={valueList} accent />

                  <Link
                    href={
                      isLoggedIn
                        ? `/c/${community.slug}/subscribe?plan=${plan}`
                        : loginNext
                    }
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] text-[13px] font-medium text-white hover:bg-[var(--color-accent-hover)]"
                  >
                    {trialDays > 0 ? `Start ${trialDays}-day free trial` : "Subscribe"}
                    <ArrowRight size={13} />
                  </Link>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-[11px] text-[var(--color-text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={11} /> Secured by Jimvio
              </span>
              {!isFree && !isMember && <span>Cancel anytime</span>}
            </div>
          </div>

          {/* Members card — REAL avatars now */}
          {community.recent_members.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                Recent members
              </p>
              <MemberStack
                members={community.recent_members}
                totalCount={community.member_count ?? 0}
              />
              <p className="mt-3 text-[12px] text-[var(--color-text-secondary)]">
                {community.recent_members[0]?.full_name ?? "Someone"}
                {community.recent_members.length > 1 && (
                  <> and {plural((community.member_count ?? 1) - 1, "other")}</>
                )}
                {" "}{isMember ? "are part of this community" : "have joined"}.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ─── Value list helper ─────────────────────────────────────────────── */

function ValueList({ items, accent }: { items: string[]; accent?: boolean }) {
  return (
    <ul className="space-y-2">
      {items.map((line) => (
        <li key={line} className="flex items-start gap-2 text-[12px] text-[var(--color-text-secondary)]">
          <Check
            size={13}
            strokeWidth={2.5}
            className={cn("mt-0.5 shrink-0", accent ? "text-[var(--color-accent)]" : "text-[var(--color-success)]")}
          />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

