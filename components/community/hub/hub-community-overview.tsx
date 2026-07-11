"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  Users,
  Radio,
  Mic,
  GraduationCap,
  Trophy,
  Calendar,
  ShieldCheck,
  Target,
  FileText,
  Wrench,
  Sparkles,
  TrendingUp,
  Flame,
  DollarSign,
  MoreHorizontal,
  Play,
  MessageSquare,
  Heart,
  BarChart3,
  Clock,
  MapPin,
  Award,
  CheckCircle2,
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

function formatJoined(iso: string | null) {
  if (!iso) return null;
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return null;
  }
}

export function HubCommunityOverview({
  ownerName,
  joinedAt,
}: {
  ownerName?: string | null;
  joinedAt?: string | null;
}) {
  const { communityName, slug, memberCount, avatarUrl, points, overview } = useWorkspace();

  const base = `/c/${slug}`;
  const joinedLabel = formatJoined(joinedAt ?? null);

  const QUICK_LINKS = [
    { icon: Calendar, label: "Community Calendar", href: `${base}/live` },
    { icon: FileText, label: "Resources", href: `${base}?space=resources` },
    { icon: Wrench, label: "Creator Toolkit", href: `/c/analytics` },
    { icon: Radio, label: "Live Schedule", href: `${base}/live` },
    { icon: Trophy, label: "Leaderboard", href: `${base}/leaderboard` },
    { icon: MoreHorizontal, label: "More", href: `${base}/members` },
  ];

  const level = points?.level ?? 1;
  const communityLevel = overview?.progressBreakdown?.communityLevel ?? level;
  const communityProgress = overview?.progressBreakdown?.communityProgress ?? 0;
  const memberTopPercent = overview?.progressBreakdown?.memberTopPercent ?? 1;
  const userXp = points?.total_points ?? 0;
  const userLevelStart = points?.level_start_xp ?? 0;
  const userLevelNext = points?.next_level_xp ?? userLevelStart + 500;
  const userXpInLevel = Math.max(0, userXp - userLevelStart);
  const userXpSpan = Math.max(1, userLevelNext - userLevelStart);
  const userLevelProgress = Math.min(100, Math.round((userXpInLevel / userXpSpan) * 100));

  return (
    <div className="grid min-h-0 gap-6 xl:grid-cols-[1fr_320px]">
      {/* ── Main column ── */}
      <div className="min-w-0 space-y-6">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur hover-lift"
             style={{ background: "linear-gradient(135deg, var(--color-berry)/10, var(--color-ocean)/10)" }}>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/60">
              {communityName}
            </p>
            <h1 className="mt-1 font-black uppercase tracking-wide text-white text-2xl sm:text-4xl">
              Create · Grow · Earn
            </h1>
          </div>
        </div>

        {/* Community header card */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
          <div className="flex flex-col gap-4">
            {/* Top row — identity left, invite + menu right */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={communityName}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-[var(--color-accent)]/30"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] text-[14px] font-black text-white">
                    {communityName[0]}
                  </div>
                )}
                <h2 className="text-[18px] font-black text-[var(--color-text-primary)]">{communityName}</h2>
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                <HubBadge variant="orange">Private Community</HubBadge>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <HubLinkButton href={`${base}/members`} variant="primary" size="sm">
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  Invite People
                </HubLinkButton>
                <span className="h-5 w-px shrink-0 bg-[var(--color-border)]" aria-hidden />
                <button
                  type="button"
                  aria-label="Community options"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
              {overview?.description ??
                `Build, learn, and earn with ${communityName}. Join live sessions, complete courses, and connect with creators.`}
            </p>

            {/* Metadata row */}
            <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[var(--color-text-muted)]">
              {ownerName && <span>Created by {ownerName}</span>}
              {ownerName && joinedLabel && <span aria-hidden>·</span>}
              {joinedLabel && <span>Joined {joinedLabel}</span>}
              {(ownerName || joinedLabel) && <span aria-hidden>·</span>}
              <span>{(memberCount ?? 0).toLocaleString()} members</span>
            </div>

            <div className="h-px bg-[var(--color-border)]" aria-hidden />

            {/* Community level + progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full"
                       style={{ background: "linear-gradient(135deg, var(--color-berry), var(--color-amber))" }}>
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">Community Level</p>
                    <p className="text-[20px] font-black text-[var(--color-text-primary)]">{communityLevel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Overall Progress</p>
                  <p className="text-[20px] font-black text-[var(--color-accent)]">{communityProgress}%</p>
                </div>
              </div>
              <HubProgressBar value={communityProgress} max={100} />
              <p className="text-[10px] text-[var(--color-text-muted)]">Top {memberTopPercent}% of members</p>
            </div>

            {/* Your level + dual progress bars */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full"
                       style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))" }}>
                    <Star className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">Your Level</p>
                    <p className="text-[20px] font-black text-[var(--color-text-primary)]">{level}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">XP in this level</p>
                  <p className="text-[20px] font-black text-[var(--color-text-primary)]">{userXpInLevel.toLocaleString()} / {userXpSpan.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-semibold text-[var(--color-text-muted)]">Community Level</span>
                  <span className="font-semibold text-[var(--color-sage)]">{communityProgress}%</span>
                </div>
                <HubProgressBar value={communityProgress} max={100} />

                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-semibold text-[var(--color-text-muted)]">Personal Level</span>
                  <span className="font-semibold text-[var(--color-accent)]">{userLevelProgress}%</span>
                </div>
                <HubProgressBar value={userLevelProgress} max={100} />
              </div>
            </div>
          </div>

          <div className="h-px bg-[var(--color-border)]" aria-hidden />

          {/* Quick actions grid */}
          <div className="grid grid-cols-3 gap-3">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="relative group flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-3 transition-all hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-surface)]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                     style={{ background: `var(--color-${link.icon === Radio ? "ocean" : link.icon === Calendar ? "amber" : link.icon === Trophy ? "berry" : link.icon === FileText ? "sage" : link.icon === Wrench ? "orange" : "accent"})/15`, color: `var(--color-${link.icon === Radio ? "ocean" : link.icon === Calendar ? "amber" : link.icon === Trophy ? "berry" : link.icon === FileText ? "sage" : link.icon === Wrench ? "orange" : "accent"})` }}>
                  <link.icon className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats row — "Mood board" style cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-in stagger-children">
          <FeatureStatCard label="Members Online" value={overview?.onlineNow ?? 0} delta={overview?.onlineDelta ?? null} icon={Users} color="sage" />
          <FeatureStatCard label="Live Now" value={overview?.liveSessions ?? 0} delta={overview?.liveDelta ?? null} icon={Radio} color="ocean" />
          <FeatureStatCard label="Voice Rooms" value={overview?.voiceRooms ?? 0} delta={overview?.voiceDelta ?? null} icon={Mic} color="berry" />
          <FeatureStatCard label="Active Communities" value={overview?.activeCommunities ?? 0} delta={overview?.communityDelta ?? null} icon={Users} color="amber" />
        </div>

        {/* Creator challenge */}
        {overview?.challenge && (
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-secondary)] p-4 hover-lift animate-in animate-fade-in-up"
               style={{ background: "linear-gradient(135deg, var(--color-accent)/5, var(--color-accent-hover)/5)" }}>
            <div className="absolute inset-0 -z-10 opacity-20" style={{ background: "radial-gradient(circle at 80% 20%, var(--color-accent)/30, transparent 60%)" }} />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--color-accent)/15", color: "var(--color-accent)" }}>
                <Flame className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-bold text-[var(--color-text-primary)]">Creator Challenge</p>
                  <span className="text-[11px] font-bold text-[var(--color-accent)]">
                    {overview.challenge.completed}/{overview.challenge.target}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">{overview.challenge.title}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                  <div className="h-full rounded-full transition-all duration-500 ease-out animate-in animate-fade-in-right"
                       style={{ width: `${challengePct}%`, background: "linear-gradient(90deg, var(--color-sage), var(--color-accent))" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* About / Progress / Rules cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <h3 className="mb-2 text-[13px] font-black text-[var(--color-text-primary)]">About this Community</h3>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              {overview?.description ??
                `Welcome to ${communityName}! This is a space for creators to share, learn, and grow together. Participate in live sessions, complete courses, and earn rewards.`}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <h3 className="mb-2 text-[13px] font-black text-[var(--color-text-primary)]">Community Progress</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--color-text-muted)]">Level progress</span>
                <span className="font-semibold text-[var(--color-text-primary)]">{communityProgress}%</span>
              </div>
              <HubProgressBar value={communityProgress} max={100} />
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--color-text-muted)]">Your contribution</span>
                <span className="font-semibold text-[var(--color-accent)]">Top {memberTopPercent}%</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <h3 className="mb-2 text-[13px] font-black text-[var(--color-text-primary)]">Community Rules</h3>
            <ul className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)]">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> Be respectful and constructive</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> No spam, self-promotion without permission</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> Keep discussions on-topic per space</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> Report violations to moderators</li>
            </ul>
          </div>
        </div>

        {/* Courses section */}
        <div className="space-y-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-black uppercase tracking-wider text-[var(--color-text-primary)]">Courses</h3>
            <Link href={`${base}/courses`} className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline">View all</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {overview?.courses?.slice(0, 2).map((course) => (
              <Link key={course.id} href={`${base}/courses/${course.id}`} className="group">
                <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur hover-lift hover:border-[var(--color-accent)]/30">
                  <div className="relative aspect-video overflow-hidden">
                    {course.cover_image ? (
                      <img src={course.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                        <GraduationCap className="h-10 w-10 text-white/20" />
                      </div>
                    )}
                    {course.status === "completed" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 right-3">
                      <HubProgressBar value={course.progress} max={100} />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{course.community_name}</p>
                    <h3 className="mt-1 truncate text-[14px] font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">{course.title}</h3>
                    <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {course.total_lessons} lessons</span>
                      <span className="flex items-center gap-1">
                        {course.difficulty === "beginner" ? <HubBadge variant="default">{course.difficulty}</HubBadge> :
                         course.difficulty === "intermediate" ? <HubBadge variant="orange">{course.difficulty}</HubBadge> :
                         <HubBadge variant="live">{course.difficulty}</HubBadge>}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity + Popular This Week */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Recent Activity</h3>
              <HubBadge variant="default">Recent</HubBadge>
            </div>
            <div className="space-y-2">
              {overview?.recentActivity?.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center gap-2 py-1 hover-lift rounded-lg px-2 transition-colors"
                     style={{ background: "transparent" }}>
                  <HubAvatar name={a.name} src={a.avatar_url} size={28} live={a.live} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-[var(--color-text-primary)]">{a.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {a.live ? "Live now" : "Posted recently"}
                    </p>
                  </div>
                  {a.live && <HubBadge variant="live">LIVE</HubBadge>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Popular This Week</h3>
              <HubBadge variant="orange">Trending</HubBadge>
            </div>
            <div className="space-y-2">
              {overview?.popularThisWeek?.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-1 hover-lift rounded-lg px-2 transition-colors"
                     style={{ background: "transparent" }}>
                  <HubAvatar name={p.name} src={p.avatar_url} size={24} live={p.live} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-[var(--color-text-primary)]">{p.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {p.posts_this_week} posts · {p.engagement} engagement
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar content */}
        <div className="hidden w-[300px] shrink-0 space-y-4 lg:block">
          {/* Live Now card */}
          {overview?.featuredLive && (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 hover-lift"
                 style={{ background: "linear-gradient(135deg, var(--color-berry)/10, var(--color-ocean)/10)" }}>
              <div className="relative h-36 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-10 w-10 text-white/60" fill="white" />
                </div>
                <HubBadge variant="live" className="absolute left-3 top-3">LIVE</HubBadge>
                {overview.featuredLive.watchingLabel && (
                  <span className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                    {overview.featuredLive.watchingLabel}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Radio className="h-4 w-4 animate-pulse" style={{ color: "var(--color-accent)" }} />
                  <span className="text-[12px] font-black text-[var(--color-text-primary)]">Live Now</span>
                </div>
                <p className="text-[13px] font-bold leading-snug text-[var(--color-text-primary)]">{overview.featuredLive.title}</p>
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{overview.featuredLive.hostName}</p>
                <HubLinkButton href={overview.featuredLive.href} className="mt-3 w-full">Join Live</HubLinkButton>
              </div>
            </div>
          )}

          {/* Creator Insights */}
          {overview?.insights && (
            <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Creator Insights</h3>
                <HubBadge variant="default">This month</HubBadge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Posts", value: overview.insights.postCount30d, icon: MessageSquare, color: "sage" },
                  { label: "Engagement", value: overview.insights.engagement30d, icon: Heart, color: "ocean" },
                  { label: "Communities", value: overview.insights.communitiesJoined, icon: Users, color: "amber" },
                  { label: "Live rooms", value: overview?.liveSessions ?? 0, icon: Radio, color: "berry" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="relative rounded-xl p-3 hover-lift"
                       style={{ background: `var(--color-${color})/5`, border: "1px solid var(--color-border)/20" }}>
                    <div className="flex items-center justify-between mb-1">
                      <Icon className="h-3.5 w-3.5" style={{ color: `var(--color-${color})` }} />
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
                    <p className="text-[18px] font-black text-[var(--color-text-primary)]">{value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Assistant */}
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--color-berry)/15", color: "var(--color-berry)" }}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-[var(--color-text-primary)]">AI Assistant</p>
                <p className="text-[10px] font-semibold text-emerald-500">Beta</p>
              </div>
            </div>
            <ul className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)]">
              <li>• Your audience is most active during evenings.</li>
              <li>• Post clips today to boost reach.</li>
            </ul>
            <input
              placeholder="Ask AI anything…"
              className="mt-3 w-full rounded-lg border border-[var(--color-border)]/30 bg-[var(--color-surface-secondary)]/50 px-3 py-2 text-[12px] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]/40 focus:bg-[var(--color-surface)]"
              style={{ color: "var(--color-text-primary)" }}
            />
          </div>

          {/* Activity feed */}
          {overview?.activity?.length && (
            <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Activity</h3>
                <HubBadge variant="default">Recent</HubBadge>
              </div>
              <div className="space-y-2">
                {overview.activity.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-center gap-2 py-1 hover-lift rounded-lg px-2 transition-colors"
                       style={{ background: "transparent" }}>
                    <HubAvatar name={a.name} src={a.avatar_url} size={24} live={a.live} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-[var(--color-text-primary)]">{a.name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {a.live ? "Live now" : "Posted recently"}
                      </p>
                    </div>
                    {a.live && <HubBadge variant="live">LIVE</HubBadge>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Earnings Overview */}
          {overview?.earnings && (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]/30 hover-lift"
                 style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))" }}>
              <div className="absolute inset-0 -z-10 opacity-10" style={{ background: "radial-gradient(circle at 20% 80%, var(--color-berry), transparent 50%)" }} />
              <div className="p-4 text-white">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <p className="text-[12px] font-bold">Earnings Overview</p>
                </div>
                <p className="mb-2 text-[28px] font-black tracking-tight">{formatMoney(overview.earnings.total, overview.earnings.currency)}</p>
                {overview.earnings.monthChangePct != null && (
                  <p className="mb-3 text-[11px] text-white/80">
                    {overview.earnings.monthChangePct >= 0 ? "+" : ""}
                    {overview.earnings.monthChangePct.toFixed(1)}% this month
                  </p>
                )}
                <HubLinkButton
                  href="/dashboard/earnings"
                  variant="secondary"
                  className="w-full !rounded-lg !border-white/25 !bg-white/15 !text-white hover:!bg-white/25"
                >
                  View Payouts
                </HubLinkButton>
              </div>
            </div>
          )}

          {/* Top Missions */}
          {overview?.challenge && (
            <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover-lift">
              <h3 className="mb-3 text-[13px] font-black text-[var(--color-text-primary)]">Top Missions</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">{overview.challenge.title}</p>
                  <span className="text-[10px] font-bold text-emerald-500">{challengePct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                  <div className="h-full rounded-full transition-all duration-500"
                       style={{ width: `${challengePct}%`, background: "linear-gradient(90deg, var(--color-sage), var(--color-accent))" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureStatCard({ label, value, delta, icon: Icon, color }: { label: string; value: string | number; delta?: string | null; icon: typeof Users; color: string }) {
  const colorVar = `var(--color-${color})`;
  return (
    <div className="relative group hover-lift animate-in animate-fade-in-up rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)] p-4 transition-all duration-300"
         style={{ background: `linear-gradient(135deg, var(--color-surface), var(--color-surface-secondary))` }}>
      <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
           style={{ background: `radial-gradient(circle at top right, ${colorVar}15, transparent 60%)` }} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{label}</p>
          <p className="mt-1 text-[20px] font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>{value}</p>
          {delta && (
            <p className="mt-1 text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> {delta}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
             style={{ background: `${colorVar}15`, color: colorVar }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}