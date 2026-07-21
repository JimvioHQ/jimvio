"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import {
  Award,
  BadgeCheck,
  Calendar,
  Check,
  ChevronDown,
  Crown,
  Flame,
  GraduationCap,
  Heart,
  Lock,
  MessageCircle,
  Play,
  Radio,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";
import {
  HubAvatar,
  HubBadge,
  HubCard,
  HubLinkButton,
  HubProgressBar,
  HubSectionTitle,
  HubStatCard,
} from "./hub-ui";
import { cn } from "@/lib/utils";
import type { OverviewInsight } from "@/services/community/hub-data";
import {
  AiWeeklySummaryCard,
  CalendarPreviewCard,
  CommunityMilestonesCard,
  LiveStatusBanner,
  MemberGrowthChart,
  MissionVisionCard,
  OverviewIntelligenceStrip,
  WeeklyHighlightsCard,
} from "./overview-intelligence";

function formatJoined(iso: string | null) {
  if (!iso) return null;
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return null;
  }
}

const INSIGHT_ICONS: Record<OverviewInsight["icon"], LucideIcon> = {
  sparkles: Sparkles,
  trending: TrendingUp,
  users: Users,
  clock: Clock,
  flame: Flame,
};

function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function EmptyCover({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "C";
  return (
    <div className="absolute inset-0 overflow-hidden bg-zinc-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(253,80,0,0.35),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(255,255,255,0.08),transparent_50%)]" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-dm-sans)] text-[clamp(6rem,22vw,12rem)] font-black tracking-tighter text-white/[0.07]">
        {initial}
      </span>
    </div>
  );
}

function MemberAvatarStack({
  members,
  total,
  size = 32,
}: {
  members: Array<{ id: string; name: string; avatar_url: string | null }>;
  total: number;
  size?: number;
}) {
  const visible = members.slice(0, 7);
  const remaining = Math.max(0, total - visible.length);
  return (
    <div className="flex items-center" role="list" aria-label={`${total.toLocaleString()} members`}>
      {visible.map((m, i) => (
        <div
          key={m.id}
          role="listitem"
          title={m.name}
          className="relative rounded-full ring-2 ring-[var(--color-surface,#fff)]"
          style={{ marginLeft: i === 0 ? 0 : -10, zIndex: visible.length - i, width: size, height: size }}
        >
          <HubAvatar name={m.name} src={m.avatar_url} size={size} className="!ring-0" />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className="relative flex items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[10px] font-bold text-[var(--color-text-secondary)] ring-2 ring-[var(--color-surface,#fff)]"
          style={{ marginLeft: -10, width: size, height: size, zIndex: 0 }}
          aria-hidden
        >
          +{remaining > 999 ? `${Math.floor(remaining / 1000)}k` : remaining}
        </div>
      )}
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="border-b border-[var(--color-border)] last:border-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3.5 text-left transition-colors hover:text-[var(--color-text-primary)]"
      >
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{question}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        id={panelId}
        role="region"
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <p className="pb-3.5 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function HubCommunityOverview() {
  const {
    communityName,
    slug,
    memberCount,
    avatarUrl,
    coverUrl,
    tagline,
    isPrivate,
    joinedAt,
    ownerName,
    membership,
    isOwner,
    isAdmin,
    points,
    overview,
  } = useWorkspace();

  const base = `/communities/${slug}`;
  const joinedLabel = formatJoined(joinedAt);
  const cover = overview?.coverImage ?? coverUrl;
  const logo = overview?.avatarUrl ?? avatarUrl;
  const members = overview?.memberCount ?? memberCount ?? 0;
  const desc =
    overview?.description ??
    `Build, learn, and earn with ${communityName}. Join live sessions, complete courses, and connect with creators.`;
  const communityTagline = overview?.tagline ?? tagline ?? "Create · Grow · Earn";
  const verified = overview?.isVerified ?? false;
  const roleLabel = isOwner
    ? "Owner"
    : isAdmin
      ? "Moderator"
      : membership?.role
        ? membership.role.charAt(0).toUpperCase() + membership.role.slice(1)
        : "Member";
  const planLabel = membership?.plan_type
    ? membership.plan_type.charAt(0).toUpperCase() + membership.plan_type.slice(1)
    : overview?.isFree
      ? "Free"
      : "Member";

  const communityLevel = overview?.progressBreakdown.communityLevel ?? points?.level ?? 1;
  const communityProgress = overview?.progressBreakdown.communityProgress ?? 0;
  const memberTopPercent = overview?.progressBreakdown.memberTopPercent ?? 1;
  const founder = overview?.founder;
  const founderName = founder?.name ?? ownerName ?? "Founder";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1120px] px-3 pb-16 pt-3 sm:px-5 sm:pb-20 sm:pt-5 lg:px-6">
        {overview && <LiveStatusBanner overview={overview} base={base} />}

        {/* 1–4 · Hero + identity */}
        <FadeIn>
          <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="relative aspect-[2.4/1] min-h-[160px] w-full sm:aspect-[2.8/1] sm:min-h-[200px]">
              {cover ? (
                <Image
                  src={cover}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1120px) 100vw, 1120px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <EmptyCover name={communityName} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      Community Overview
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-[1.65rem] font-bold tracking-[-0.03em] text-white sm:text-[2rem]">
                        {communityName}
                      </h1>
                      {verified && (
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#3b82f6] text-white shadow-sm"
                          title="Verified community"
                          aria-label="Verified community"
                        >
                          <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-white/80">
                      {communityTagline}
                    </p>
                  </div>
                  {(overview?.activeLiveSession || (overview?.liveNow ?? 0) > 0) && (
                    <Link
                      href={overview?.activeLiveSession?.href ?? `${base}/live`}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-red-500 px-3.5 py-2 text-[12px] font-bold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-600"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                      </span>
                      Live now
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="relative px-4 pb-5 pt-0 sm:px-6 sm:pb-6">
              <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex min-w-0 items-end gap-3.5 sm:gap-4">
                  <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl border-[3px] border-[var(--color-surface)] bg-[var(--color-surface-secondary)] shadow-md sm:h-24 sm:w-24 sm:rounded-[1.25rem]">
                    {logo ? (
                      <Image
                        src={logo}
                        alt={`${communityName} logo`}
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#fd5000] to-[#ff7a30] text-2xl font-black text-white sm:text-3xl">
                        {communityName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                        {isPrivate || overview?.isPrivate ? (
                          <>
                            <Lock className="h-3 w-3" /> Private
                          </>
                        ) : (
                          "Public"
                        )}
                      </span>
                      {overview?.category && (
                        <span className="rounded-full bg-[#fd5000]/10 px-2.5 py-1 text-[11px] font-semibold text-[#fd5000]">
                          {overview.category}
                        </span>
                      )}
                      {verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                          <BadgeCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 8 · Join status */}
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Joined · {roleLabel}
                  </span>
                  <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)]">
                    {planLabel} plan
                  </span>
                  <HubLinkButton href={`${base}/members`} className="!rounded-full !px-4">
                    Invite
                  </HubLinkButton>
                </div>
              </div>

              {/* 3 · Description */}
              <p className="mt-4 max-w-3xl text-[13.5px] leading-relaxed text-[var(--color-text-secondary)] sm:text-[14px]">
                {desc}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[var(--color-text-muted)]">
                <span>Created by {founderName}</span>
                {joinedLabel && (
                  <>
                    <span aria-hidden>·</span>
                    <span>Joined {joinedLabel}</span>
                  </>
                )}
                <span aria-hidden>·</span>
                <span>{members.toLocaleString()} members</span>
                {(overview?.membersOnline ?? 0) > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="text-emerald-600">
                      {(overview?.membersOnline ?? 0).toLocaleString()} online
                    </span>
                  </>
                )}
              </div>

              {/* 9 · Member avatars */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <MemberAvatarStack
                  members={overview?.memberAvatars?.length ? overview.memberAvatars : overview?.activeMembers ?? []}
                  total={members}
                />
                <div className="flex min-w-[160px] flex-1 flex-col gap-1.5 sm:max-w-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      Level {communityLevel}
                    </span>
                    <span className="text-[var(--color-text-muted)]">Top {memberTopPercent}%</span>
                  </div>
                  <HubProgressBar value={communityProgress} max={100} />
                </div>
              </div>
            </div>
          </section>
        </FadeIn>

        {/* 5 · Statistics */}
        <FadeIn delay={0.05} className="mt-5 sm:mt-6">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-5">
            <HubStatCard
              label="Members Online"
              value={(overview?.membersOnline ?? 0).toLocaleString()}
              delta={overview?.membersOnlineDelta ?? undefined}
              icon={<Users className="h-4 w-4" />}
              accent="#22c55e"
            />
            <HubStatCard
              label="Live Now"
              value={String(overview?.liveNow ?? 0)}
              delta={overview?.liveNowDelta ?? undefined}
              icon={<Radio className="h-4 w-4" />}
              accent="#ef4444"
            />
            <HubStatCard
              label="Messages / Week"
              value={(overview?.messagesThisWeek ?? 0).toLocaleString()}
              icon={<MessageCircle className="h-4 w-4" />}
              accent="#0ea5e9"
            />
            <HubStatCard
              label="Courses"
              value={String(overview?.courseCount ?? 0)}
              delta={overview?.courseCountDelta ?? undefined}
              icon={<GraduationCap className="h-4 w-4" />}
            />
            <HubStatCard
              label="Challenges"
              value={String(overview?.progressBreakdown.challenges ?? 0)}
              icon={<Target className="h-4 w-4" />}
              accent="#f59e0b"
            />
          </div>
        </FadeIn>

        {overview && (
          <FadeIn delay={0.055} className="mt-5 sm:mt-6">
            <OverviewIntelligenceStrip overview={overview} base={base} />
          </FadeIn>
        )}

        <div className="mt-5 grid gap-5 sm:mt-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
          {/* ── Main column ── */}
          <div className="min-w-0 space-y-5 sm:space-y-6">
            {overview?.missionVision && (
              <FadeIn delay={0.058}>
                <MissionVisionCard overview={overview} />
              </FadeIn>
            )}

            {/* 6–7 · Founder + Moderators */}
            <FadeIn delay={0.06}>
              <div className="grid gap-3 sm:grid-cols-2">
                <HubCard className="!p-4">
                  <HubSectionTitle title="Founder" />
                  <div className="flex items-center gap-3">
                    <HubAvatar name={founderName} src={founder?.avatar_url} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[14px] font-bold text-[var(--color-text-primary)]">
                          {founderName}
                        </p>
                        <Crown className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                      </div>
                      <p className="text-[12px] text-[var(--color-text-muted)]">Community founder</p>
                      {founder?.username && (
                        <Link
                          href={`${base}/members/${founder.username}`}
                          className="mt-1 inline-block text-[11px] font-semibold text-[#fd5000] hover:underline"
                        >
                          View profile
                        </Link>
                      )}
                    </div>
                  </div>
                </HubCard>

                <HubCard className="!p-4">
                  <HubSectionTitle
                    title="Moderators"
                    badge={overview?.moderators?.length ? String(overview.moderators.length) : undefined}
                  />
                  {(overview?.moderators?.length ?? 0) === 0 ? (
                    <p className="text-[12px] text-[var(--color-text-muted)]">
                      Moderators will appear here once assigned.
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {overview!.moderators.slice(0, 4).map((mod) => (
                        <li key={mod.id} className="flex items-center gap-2.5">
                          <HubAvatar name={mod.name} src={mod.avatar_url} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-semibold">{mod.name}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">
                              {mod.status ?? "Moderator"}
                            </p>
                          </div>
                          <Shield className="h-3.5 w-3.5 text-sky-500" aria-hidden />
                        </li>
                      ))}
                    </ul>
                  )}
                </HubCard>
              </div>
            </FadeIn>

            {overview && overview.memberGrowth.length > 0 && (
              <FadeIn delay={0.065}>
                <MemberGrowthChart overview={overview} />
              </FadeIn>
            )}

            {overview && overview.weeklyHighlights.length > 0 && (
              <FadeIn delay={0.068}>
                <WeeklyHighlightsCard overview={overview} />
              </FadeIn>
            )}

            {/* 14 · Active Live Session */}
            {(overview?.activeLiveSession || (overview?.liveNow ?? 0) > 0) && (
              <FadeIn delay={0.07}>
                <HubCard className="!overflow-hidden !p-0">
                  <div className="relative flex flex-col gap-4 bg-zinc-950 p-4 sm:flex-row sm:items-center sm:p-5">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-800 sm:aspect-auto sm:h-28 sm:w-44 sm:shrink-0">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(253,80,0,0.35),transparent_60%)]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-9 w-9 text-white/90" fill="currentColor" />
                      </div>
                      <HubBadge variant="live" className="absolute left-2 top-2">
                        LIVE
                      </HubBadge>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                        Active live session
                      </p>
                      <h2 className="mt-1 text-[16px] font-bold text-white">
                        {overview?.activeLiveSession?.title ?? `Live in ${communityName}`}
                      </h2>
                      <p className="mt-0.5 text-[12px] text-white/60">
                        {overview?.activeLiveSession?.room_name ?? "Live room"} ·{" "}
                        {overview?.activeLiveSession?.active_count ?? overview?.liveNow ?? 0} active
                      </p>
                      <HubLinkButton
                        href={overview?.activeLiveSession?.href ?? `${base}/live`}
                        className="mt-3 !rounded-full"
                      >
                        Join live
                      </HubLinkButton>
                    </div>
                  </div>
                </HubCard>
              </FadeIn>
            )}

            {/* 10 · Gallery */}
            <FadeIn delay={0.08}>
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
                    Community Gallery
                  </h2>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {(overview?.gallery.length ?? 0) || "No"} moments
                  </span>
                </div>
                {(overview?.gallery.length ?? 0) === 0 ? (
                  <HubCard>
                    <p className="text-[12px] text-[var(--color-text-muted)]">
                      Gallery moments will appear as members share images in posts.
                    </p>
                  </HubCard>
                ) : (
                  <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 scrollbar-hide">
                    {overview!.gallery.map((item, i) => (
                      <div
                        key={item.id}
                        className={cn(
                          "relative shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-secondary)]",
                          i === 0 ? "h-36 w-56 sm:h-40 sm:w-64" : "h-36 w-36 sm:h-40 sm:w-40"
                        )}
                      >
                        <Image
                          src={item.url}
                          alt={item.label}
                          fill
                          sizes="256px"
                          className="object-cover transition duration-500 hover:scale-105"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </FadeIn>

            {/* 11 · Featured Posts */}
            <FadeIn delay={0.09}>
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
                    Featured Posts
                  </h2>
                  <Link href={`${base}/feed`} className="text-[12px] font-semibold text-[#fd5000] hover:underline">
                    Open feed
                  </Link>
                </div>
                {(overview?.featuredPosts.length ?? 0) === 0 ? (
                  <HubCard>
                    <p className="text-[12px] text-[var(--color-text-muted)]">
                      Pin or engage with posts to feature them here.
                    </p>
                    <HubLinkButton href={`${base}/feed`} variant="soft" className="mt-3 !rounded-full">
                      Go to Feed
                    </HubLinkButton>
                  </HubCard>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {overview!.featuredPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={post.href}
                        className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[#fd5000]/35 hover:shadow-sm"
                      >
                        {post.image_url && (
                          <div className="relative h-28 w-full overflow-hidden bg-[var(--color-surface-secondary)]">
                            <Image
                              src={post.image_url}
                              alt=""
                              fill
                              sizes="400px"
                              className="object-cover transition duration-500 group-hover:scale-105"
                              unoptimized
                            />
                          </div>
                        )}
                        <div className="p-3.5">
                          <div className="mb-2 flex items-center gap-2">
                            <HubAvatar name={post.author.name} src={post.author.avatar_url} size={24} />
                            <span className="truncate text-[11px] font-medium text-[var(--color-text-muted)]">
                              {post.author.name}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--color-text-primary)]">
                            {post.title || post.body}
                          </p>
                          <div className="mt-2.5 flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
                            <span className="inline-flex items-center gap-1">
                              <Heart className="h-3 w-3" /> {post.like_count}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" /> {post.comment_count}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </FadeIn>

            {/* 12 · Featured Course */}
            <FadeIn delay={0.1}>
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
                    Featured Course
                  </h2>
                  <Link href={`${base}/courses`} className="text-[12px] font-semibold text-[#fd5000] hover:underline">
                    All courses
                  </Link>
                </div>
                {!overview?.featuredCourse ? (
                  <HubCard>
                    <p className="text-[12px] text-[var(--color-text-muted)]">
                      No published courses yet. Courses will showcase here first.
                    </p>
                  </HubCard>
                ) : (
                  <Link
                    href={overview.featuredCourse.href}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[#fd5000]/35 sm:flex-row"
                  >
                    <div
                      className="relative h-40 w-full shrink-0 bg-gradient-to-br from-[#fd5000]/30 to-zinc-900 sm:h-auto sm:w-52"
                      style={
                        overview.featuredCourse.cover_image
                          ? {
                              backgroundImage: `url(${overview.featuredCourse.cover_image})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    />
                    <div className="flex flex-1 flex-col justify-center p-4 sm:p-5">
                      <HubBadge variant="orange">Featured</HubBadge>
                      <h3 className="mt-2 text-[16px] font-bold tracking-tight text-[var(--color-text-primary)] group-hover:text-[#fd5000]">
                        {overview.featuredCourse.title}
                      </h3>
                      <p className="mt-1 text-[12px] capitalize text-[var(--color-text-muted)]">
                        {overview.featuredCourse.difficulty} · {overview.featuredCourse.total_lessons}{" "}
                        lessons
                      </p>
                      <HubProgressBar
                        value={overview.featuredCourse.progress}
                        max={100}
                        className="mt-3"
                      />
                      <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">
                        {overview.featuredCourse.progress}% complete
                      </p>
                    </div>
                  </Link>
                )}
              </section>
            </FadeIn>

            {/* 13 + 15 · Events + Challenges */}
            <FadeIn delay={0.11}>
              <div className="grid gap-3 sm:grid-cols-2">
                <HubCard>
                  <div className="mb-3 flex items-center justify-between">
                    <HubSectionTitle title="Upcoming Events" />
                    <Calendar className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden />
                  </div>
                  {(overview?.upcomingEvents.length ?? 0) === 0 ? (
                    <p className="text-[12px] text-[var(--color-text-muted)]">No upcoming events.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {overview!.upcomingEvents.map((ev) => (
                        <li key={ev.id}>
                          <Link
                            href={ev.href}
                            className="flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-[var(--color-surface-secondary)]"
                          >
                            <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-[#fd5000]/10 text-[#fd5000]">
                              <span className="text-[9px] font-bold uppercase leading-none">
                                {format(new Date(ev.start_date), "MMM")}
                              </span>
                              <span className="text-[14px] font-black leading-none">
                                {format(new Date(ev.start_date), "d")}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[12.5px] font-semibold">{ev.title}</p>
                              <p className="text-[10px] text-[var(--color-text-muted)]">
                                {format(new Date(ev.start_date), "h:mm a")}
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </HubCard>

                <HubCard>
                  <div className="mb-3 flex items-center justify-between">
                    <HubSectionTitle title="Challenges" />
                    <Target className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden />
                  </div>
                  {(overview?.challenges.length ?? 0) === 0 ? (
                    <p className="text-[12px] text-[var(--color-text-muted)]">No active challenges.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {overview!.challenges.map((ch) => (
                        <li key={ch.id}>
                          <Link
                            href={ch.href}
                            className="flex items-start gap-2.5 rounded-lg p-1.5 transition hover:bg-[var(--color-surface-secondary)]"
                          >
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                              <Flame className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[12.5px] font-semibold">{ch.title}</p>
                              {ch.due_date && (
                                <p className="text-[10px] text-[var(--color-text-muted)]">
                                  Due {format(new Date(ch.due_date), "MMM d")}
                                </p>
                              )}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </HubCard>
              </div>
            </FadeIn>

            {/* 17 · Achievements */}
            <FadeIn delay={0.12}>
              <section>
                <h2 className="mb-3 text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
                  Community Achievements
                </h2>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {(overview?.achievements ?? []).map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        "rounded-xl border p-3.5 transition",
                        a.unlocked
                          ? "border-[#fd5000]/25 bg-[#fd5000]/[0.04]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] opacity-60"
                      )}
                    >
                      <Award
                        className={cn(
                          "h-5 w-5",
                          a.unlocked ? "text-[#fd5000]" : "text-[var(--color-text-muted)]"
                        )}
                      />
                      <p className="mt-2 text-[12.5px] font-bold text-[var(--color-text-primary)]">
                        {a.title}
                      </p>
                      <p className="mt-0.5 text-[10.5px] leading-snug text-[var(--color-text-muted)]">
                        {a.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </FadeIn>

            {overview && overview.milestones.length > 0 && (
              <FadeIn delay={0.125}>
                <CommunityMilestonesCard overview={overview} />
              </FadeIn>
            )}

            {/* 18 · Rules */}
            <FadeIn delay={0.13}>
              <HubCard>
                <HubSectionTitle title="Community Rules" />
                <ol className="space-y-2.5">
                  {(overview?.rules ?? []).map((rule, i) => (
                    <li key={`${i}-${rule}`} className="flex gap-3 text-[13px] text-[var(--color-text-secondary)]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fd5000]/10 text-[11px] font-bold text-[#fd5000]">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ol>
              </HubCard>
            </FadeIn>

            {/* 19 · FAQ */}
            <FadeIn delay={0.14}>
              <HubCard>
                <HubSectionTitle title="FAQ" />
                <div>
                  {(overview?.faq ?? []).map((item) => (
                    <FaqItem key={item.question} question={item.question} answer={item.answer} />
                  ))}
                </div>
              </HubCard>
            </FadeIn>

            {/* 20 · Similar Communities */}
            <FadeIn delay={0.15}>
              <section>
                <h2 className="mb-3 text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
                  Similar Communities
                </h2>
                {(overview?.similarCommunities.length ?? 0) === 0 ? (
                  <HubCard>
                    <p className="text-[12px] text-[var(--color-text-muted)]">
                      Discover more communities from Explore.
                    </p>
                    <HubLinkButton href="/communities/explore" variant="soft" className="mt-3 !rounded-full">
                      Explore
                    </HubLinkButton>
                  </HubCard>
                ) : (
                  <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide">
                    {overview!.similarCommunities.map((c) => (
                      <Link
                        key={c.id}
                        href={`/communities/${c.slug}`}
                        className="w-52 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[#fd5000]/35"
                      >
                        <div className="relative h-20 bg-zinc-900">
                          {c.cover_image ? (
                            <Image
                              src={c.cover_image}
                              alt=""
                              fill
                              sizes="208px"
                              className="object-cover opacity-90"
                              unoptimized
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
                          )}
                        </div>
                        <div className="relative -mt-5 px-3 pb-3">
                          <div className="relative mb-2 h-10 w-10 overflow-hidden rounded-xl border-2 border-[var(--color-surface)] bg-[var(--color-surface-secondary)]">
                            {c.avatar_url ? (
                              <Image src={c.avatar_url} alt="" fill sizes="40px" className="object-cover" unoptimized />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#fd5000] text-sm font-bold text-white">
                                {c.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <p className="truncate text-[13px] font-bold">{c.name}</p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--color-text-muted)]">
                            {c.tagline || `${c.member_count.toLocaleString()} members`}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </FadeIn>

            {/* 21 · Activity timeline */}
            <FadeIn delay={0.16}>
              <HubCard>
                <HubSectionTitle title="Latest Activity" badge="Live" />
                {(overview?.recentActivity.length ?? 0) === 0 ? (
                  <p className="text-[12px] text-[var(--color-text-muted)]">No recent activity yet.</p>
                ) : (
                  <ol className="relative space-y-0 border-l border-[var(--color-border)] ml-2">
                    {overview!.recentActivity.map((item) => (
                      <li key={item.id} className="relative pl-5 py-2.5">
                        <span className="absolute -left-[5px] top-4 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-surface)] bg-[#fd5000]" />
                        <Link href={item.href} className="block rounded-lg hover:bg-[var(--color-surface-secondary)]/80 -ml-1 px-2 py-1">
                          <p className="text-[12.5px] font-medium leading-snug text-[var(--color-text-primary)]">
                            {item.text}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                            {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </HubCard>
            </FadeIn>
          </div>

          {/* ── Right rail ── */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
            {overview?.aiWeeklySummary && (
              <FadeIn delay={0.07}>
                <AiWeeklySummaryCard overview={overview} />
              </FadeIn>
            )}

            {overview && overview.upcomingEvents.length > 0 && (
              <FadeIn delay={0.075}>
                <CalendarPreviewCard overview={overview} base={base} />
              </FadeIn>
            )}

            {/* 16 · Leaderboard preview */}
            <FadeIn delay={0.08}>
              <HubCard>
                <div className="mb-1 flex items-center justify-between">
                  <HubSectionTitle title="Leaderboard" />
                  <Link href={`${base}/leaderboard`} className="text-[11px] font-semibold text-[#fd5000]">
                    Full ranks
                  </Link>
                </div>
                {(overview?.topContributors.length ?? 0) === 0 ? (
                  <p className="text-[12px] text-[var(--color-text-muted)]">No rankings yet.</p>
                ) : (
                  <ol className="space-y-1">
                    {overview!.topContributors.map((u, i) => (
                      <li
                        key={u.id}
                        className="flex items-center gap-2.5 rounded-lg px-1 py-2 transition hover:bg-[var(--color-surface-secondary)]"
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
                            i === 0
                              ? "bg-amber-100 text-amber-700"
                              : i === 1
                                ? "bg-zinc-200 text-zinc-700"
                                : i === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                          )}
                        >
                          {i + 1}
                        </span>
                        <HubAvatar name={u.name} src={u.avatar_url} size={30} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold">{u.name}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">
                            {u.points.toLocaleString()} XP
                          </p>
                        </div>
                        {i === 0 && <Trophy className="h-3.5 w-3.5 text-amber-500" aria-hidden />}
                      </li>
                    ))}
                  </ol>
                )}
              </HubCard>
            </FadeIn>

            {/* Active now */}
            <FadeIn delay={0.09}>
              <HubCard>
                <HubSectionTitle title="Active Now" />
                {(overview?.activeMembers.length ?? 0) === 0 ? (
                  <p className="text-[12px] text-[var(--color-text-muted)]">No one active right now.</p>
                ) : (
                  overview!.activeMembers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between border-t border-[var(--color-border)] py-2.5 first:border-0 first:pt-0"
                    >
                      <div className="flex items-center gap-2.5">
                        <HubAvatar name={u.name} src={u.avatar_url} size={32} live />
                        <div>
                          <p className="text-[12px] font-semibold">{u.name}</p>
                          <p className="text-[10px] text-emerald-600">{u.status ?? "Online"}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </HubCard>
            </FadeIn>

            {/* Weekly pulse */}
            {(overview?.weeklyActivity?.length ?? 0) > 0 && (
              <FadeIn delay={0.1}>
                <HubCard>
                  <HubSectionTitle title="Weekly Pulse" badge="7d" />
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Messages", value: (overview?.messagesThisWeek ?? 0).toLocaleString() },
                      { label: "Online", value: (overview?.membersOnline ?? 0).toLocaleString() },
                      { label: "Courses", value: String(overview?.courseCount ?? 0) },
                      { label: "Rooms", value: String(overview?.activeRoomCount ?? 0) },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-[var(--color-surface-secondary)] p-2.5">
                        <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
                        <p className="text-[15px] font-black tracking-tight">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex h-16 items-end gap-1" aria-hidden>
                    {overview!.weeklyActivity.map((h, i) => {
                      const max = Math.max(...overview!.weeklyActivity, 1);
                      const pct = Math.max(12, Math.round((h / max) * 100));
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-[#fd5000]/25 transition-all"
                          style={{ height: `${pct}%` }}
                        />
                      );
                    })}
                  </div>
                </HubCard>
              </FadeIn>
            )}

            {/* 22 · Insights */}
            <FadeIn delay={0.11}>
              <HubCard>
                <HubSectionTitle title="Community Insights" />
                <ul className="space-y-3">
                  {(overview?.insights ?? []).map((insight) => {
                    const Icon = INSIGHT_ICONS[insight.icon] ?? Sparkles;
                    return (
                      <li key={insight.id} className="flex gap-2.5">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fd5000]/10 text-[#fd5000]">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="text-[12.5px] font-semibold leading-snug text-[var(--color-text-primary)]">
                            {insight.headline}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                            {insight.subtext}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </HubCard>
            </FadeIn>

            <FadeIn delay={0.12}>
              <div className="grid grid-cols-2 gap-2">
                <HubLinkButton href={`${base}/feed`} variant="secondary" className="!rounded-xl !py-2.5">
                  Feed
                </HubLinkButton>
                <HubLinkButton href={`${base}/chat`} variant="secondary" className="!rounded-xl !py-2.5">
                  Chats
                </HubLinkButton>
                <HubLinkButton href={`${base}/courses`} variant="secondary" className="!rounded-xl !py-2.5">
                  Courses
                </HubLinkButton>
                <HubLinkButton href={`${base}/live`} className="!rounded-xl !py-2.5">
                  Go Live
                </HubLinkButton>
              </div>
            </FadeIn>
          </aside>
        </div>
      </div>
    </div>
  );
}
