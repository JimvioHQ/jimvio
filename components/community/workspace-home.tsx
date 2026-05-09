// components/community/workspace-home.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    Sparkles, ArrowRight, Trophy, Briefcase, Radio,
    Flame, Calendar, BookOpen, MessageSquare, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/community/workspace-context";

export function WorkspaceHome() {
    const router = useRouter();
    const {
        slug, communityName, avatarUrl, profile, points, memberCount,
        spacesWithRooms, liveSessions, openMissionsCount, ownerId, userId,
    } = useWorkspace();

    const base = `/communities/${slug}/workspace`;
    const firstRoom = spacesWithRooms.find((s) => s.rooms.length)?.rooms[0];
    const firstSpace = spacesWithRooms.find((s) => s.rooms.length);

    const displayName = profile?.full_name?.split(" ")[0] || profile?.username || "there";
    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 5) return "Up late,";
        if (h < 12) return "Good morning,";
        if (h < 17) return "Good afternoon,";
        return "Good evening,";
    })();

    return (
        <div className="flex flex-1 flex-col overflow-y-auto bg-[var(--color-bg)]">
            <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">

                {/* ── Welcome header ────────────────────────────────────── */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[13px] text-[var(--color-text-muted)]">{greeting}</p>
                        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[28px]">
                            {displayName} 👋
                        </h1>
                        <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
                            Here's what's happening in {communityName} today.
                        </p>
                    </div>

                    {firstRoom && firstSpace && (
                        <button
                            type="button"
                            onClick={() => router.push(`${base}?space=${firstSpace.id}&room=${firstRoom.id}`)}
                            className="inline-flex h-10 items-center gap-1.5 px-4 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                            style={{
                                background: "var(--color-accent)",
                                borderRadius: "var(--radius-sm)",
                                boxShadow: "var(--shadow-sm)",
                            }}
                        >
                            Jump into a room <ArrowRight size={13} />
                        </button>
                    )}
                </div>

                {/* ── Quick stats ────────────────────────────────────────── */}
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard
                        icon={Briefcase}
                        label="Open missions"
                        value={openMissionsCount}
                        href={`${base}/missions`}
                        tone="accent"
                    />
                    <StatCard
                        icon={Radio}
                        label={liveSessions.length === 1 ? "Live now" : "Live sessions"}
                        value={liveSessions.length}
                        href={`${base}/live`}
                        tone="danger"
                        pulse={liveSessions.length > 0}
                    />
                    <StatCard
                        icon={Trophy}
                        label="Your level"
                        value={points?.level ?? 1}
                        suffix={points ? `${points.total_points.toLocaleString()} XP` : undefined}
                        href={`${base}/leaderboard`}
                        tone="warning"
                    />
                    <StatCard
                        icon={Flame}
                        label="Day streak"
                        value={points?.streak_days ?? 0}
                        href={`${base}/profile`}
                        tone="warning"
                    />
                </div>

                {/* ── Live now (only if any) ─────────────────────────────── */}
                {liveSessions.length > 0 && (
                    <Section
                        title="Live now"
                        badge={liveSessions.length.toString()}
                        badgeTone="danger"
                        href={`${base}/live`}
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {liveSessions.slice(0, 3).map((s) => (
                                <Link
                                    key={s.id}
                                    href={`${base}/live/${s.id}`}
                                    className="group block overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:border-[var(--color-accent)]/40"
                                    style={{ borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)" }}
                                >
                                    <div className="relative aspect-video bg-gradient-to-br from-[var(--color-surface-secondary)] to-[var(--color-border)]">
                                        <span
                                            className="absolute left-2 top-2 inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white"
                                            style={{
                                                background: "var(--color-danger)",
                                                borderRadius: "var(--radius-sm)",
                                            }}
                                        >
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                                            </span>
                                            Live
                                        </span>
                                        <span className="absolute right-2 top-2 px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ background: "rgba(0,0,0,0.5)", borderRadius: "var(--radius-sm)" }}>
                                            {s.viewer_count.toLocaleString()} watching
                                        </span>
                                    </div>
                                    <div className="p-3">
                                        <h3 className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                                            {s.title}
                                        </h3>
                                        <div className="mt-1 flex items-center gap-1.5">
                                            {s.host_avatar ? (
                                                <Image src={s.host_avatar} alt="" width={16} height={16} className="rounded-full" unoptimized />
                                            ) : null}
                                            <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                                                {s.host_name ?? "Host"}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </Section>
                )}

                {/* ── Spaces overview ────────────────────────────────────── */}
                <Section
                    title="Your spaces"
                    badge={spacesWithRooms.length.toString()}
                    href={`${base}/discover`}
                    hrefLabel="Browse all"
                >
                    {spacesWithRooms.length === 0 ? (
                        <EmptySpacesPanel slug={slug} canManage={ownerId === userId} />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {spacesWithRooms.slice(0, 6).map((space) => (
                                <SpaceCard
                                    key={space.id}
                                    space={space}
                                    onOpen={(roomId) => router.push(`${base}?space=${space.id}&room=${roomId}`)}
                                />
                            ))}
                        </div>
                    )}
                </Section>

                {/* ── Events placeholder (wire up when you have events table) ── */}
                <Section title="Upcoming events" muted>
                    <div
                        className="flex items-center gap-3 border border-dashed border-[var(--color-border)] p-4 text-[13px] text-[var(--color-text-muted)]"
                        style={{ borderRadius: "var(--radius-md)" }}
                    >
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>No events scheduled yet. Check back soon — or {ownerId === userId ? "create one" : "ask the owner"} to host one.</span>
                    </div>
                </Section>

            </div>
        </div>
    );
}

/* ─── Atoms ─────────────────────────────────────────────────────── */

function StatCard({
    icon: Icon, label, value, suffix, href, tone, pulse,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: number | string;
    suffix?: string;
    href: string;
    tone: "accent" | "danger" | "warning" | "success";
    pulse?: boolean;
}) {
    const toneVars = {
        accent: { bg: "var(--color-accent-light)", fg: "var(--color-accent)" },
        danger: { bg: "var(--color-danger-light)", fg: "var(--color-danger)" },
        warning: { bg: "var(--color-warning-light)", fg: "var(--color-warning)" },
        success: { bg: "var(--color-success-light)", fg: "var(--color-success)" },
    }[tone];

    return (
        <Link
            href={href}
            className="group flex items-center gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-all hover:border-[var(--color-border-strong)]"
            style={{ borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)" }}
        >
            <div
                className="relative flex h-9 w-9 shrink-0 items-center justify-center"
                style={{ background: toneVars.bg, borderRadius: "var(--radius-sm)" }}
            >
                <Icon size={16} className="opacity-90" />
                <style>{`
          .stat-icon-${tone} { color: ${toneVars.fg}; }
        `}</style>
                {pulse && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: toneVars.fg }} />
                        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: toneVars.fg }} />
                    </span>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-[var(--color-text-muted)]">{label}</p>
                <p className="text-[16px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {value}
                    {suffix && <span className="ml-1 text-[11px] font-normal text-[var(--color-text-muted)]">{suffix}</span>}
                </p>
            </div>
        </Link>
    );
}

function Section({
    title, badge, badgeTone = "muted", href, hrefLabel = "See all", muted, children,
}: {
    title: string;
    badge?: string;
    badgeTone?: "muted" | "accent" | "danger";
    href?: string;
    hrefLabel?: string;
    muted?: boolean;
    children: React.ReactNode;
}) {
    const badgeStyle = {
        muted: { bg: "var(--color-surface-secondary)", fg: "var(--color-text-muted)" },
        accent: { bg: "var(--color-accent-light)", fg: "var(--color-accent)" },
        danger: { bg: "var(--color-danger-light)", fg: "var(--color-danger)" },
    }[badgeTone];

    return (
        <section className="mb-6">
            <div className="mb-3 flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                    <h2 className={cn(
                        "text-[15px] font-semibold tracking-tight",
                        muted ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"
                    )}>
                        {title}
                    </h2>
                    {badge && (
                        <span
                            className="inline-flex h-5 min-w-[20px] items-center justify-center px-1.5 text-[10px] font-semibold tabular-nums"
                            style={{
                                background: badgeStyle.bg,
                                color: badgeStyle.fg,
                                borderRadius: "var(--radius-full)",
                            }}
                        >
                            {badge}
                        </span>
                    )}
                </div>
                {href && (
                    <Link
                        href={href}
                        className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
                    >
                        {hrefLabel} <ArrowRight size={11} />
                    </Link>
                )}
            </div>
            {children}
        </section>
    );
}

function SpaceCard({
    space, onOpen,
}: {
    space: ReturnType<typeof useWorkspace>["spacesWithRooms"][number];
    onOpen: (roomId: string) => void;
}) {
    const firstRoom = space.rooms[0];

    return (
        <button
            type="button"
            onClick={() => firstRoom && onOpen(firstRoom.id)}
            disabled={!firstRoom}
            className="group flex flex-col gap-2 border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition-all hover:border-[var(--color-accent)]/40 disabled:opacity-50"
            style={{ borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)" }}
        >
            <div className="flex items-center gap-2">
                <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center"
                    style={{
                        background: "var(--color-accent-light)",
                        color: "var(--color-accent)",
                        borderRadius: "var(--radius-sm)",
                    }}
                >
                    <BookOpen size={13} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                        {space.name}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                        {space.rooms.length} room{space.rooms.length !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>
            {space.rooms.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {space.rooms.slice(0, 3).map((r) => (
                        <span
                            key={r.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]"
                            style={{
                                background: "var(--color-surface-secondary)",
                                borderRadius: "var(--radius-sm)",
                            }}
                        >
                            {r.name}
                        </span>
                    ))}
                    {space.rooms.length > 3 && (
                        <span className="inline-flex px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                            +{space.rooms.length - 3}
                        </span>
                    )}
                </div>
            )}
        </button>
    );
}

function EmptySpacesPanel({ slug, canManage }: { slug: string; canManage: boolean }) {
    return (
        <div
            className="flex flex-col items-center gap-3 border border-dashed border-[var(--color-border)] p-8 text-center"
            style={{ borderRadius: "var(--radius-md)" }}
        >
            <svg width="64" height="44" viewBox="0 0 64 44" fill="none" aria-hidden>
                <rect x="3" y="8" width="18" height="24" rx="3" fill="var(--color-border)" />
                <rect x="25" y="3" width="18" height="32" rx="3" fill="var(--color-border-strong)" opacity="0.6" />
                <rect x="47" y="11" width="14" height="20" rx="3" fill="var(--color-border)" />
                <circle cx="14" cy="38" r="2" fill="var(--color-accent)" opacity="0.4" />
                <circle cx="34" cy="40" r="2" fill="var(--color-accent)" opacity="0.7" />
                <circle cx="55" cy="36" r="2" fill="var(--color-accent)" opacity="0.4" />
            </svg>
            <div>
                <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
                    No spaces yet
                </p>
                <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                    Spaces organize discussions, courses, and events.
                </p>
            </div>
            {canManage ? (
                <Link
                    href={`/communities/${slug}/settings/spaces`}
                    className="inline-flex h-8 items-center gap-1 px-3 text-[12px] font-medium text-white"
                    style={{
                        background: "var(--color-accent)",
                        borderRadius: "var(--radius-sm)",
                    }}
                >
                    <Plus size={12} /> Create your first space
                </Link>
            ) : (
                <p className="text-[11px] text-[var(--color-text-muted)]">Ask an admin to add some.</p>
            )}
        </div>
    );
}