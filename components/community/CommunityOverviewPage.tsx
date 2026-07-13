import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { StatCard } from "@/components/shell/StatCard";
import { AboutCommunityCard } from "@/components/community/AboutCommunityCard";
import { CommunityProgressCard } from "@/components/community/CommunityProgressCard";
import { CommunityRulesCard } from "@/components/community/CommunityRulesCard";
import { CommunityQuickActions } from "@/components/community/CommunityQuickActions";
import { CommunityRightRail } from "@/components/community/CommunityRightRail";
import { CourseCard } from "@/components/community/CourseCard";
import { CommunitySidebar } from "@/components/shell/CommunitySidebar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { useWorkspace } from "@/components/community/workspace-context";
import { Users, Radio, Mic, MessageSquare, DollarSign, TrendingUp, Target, MessageSquare as MessageSquareIcon } from "lucide-react";

type CommunityOverviewPageProps = {
  slug: string;
};

export function CommunityOverviewPage({ slug }: CommunityOverviewPageProps) {
  const { 
    communityName, 
    communityId, 
    avatarUrl, 
    coverImage, 
    memberCount, 
    visibility, 
    points, 
    overview, 
    membership,
    spacesWithRooms,
    userId,
    isOwner,
    isAdmin,
    profile
  } = useWorkspace();

  const xpPct = points 
    ? Math.round(((points.total_points - points.level_start_xp) / Math.max(1, points.next_level_xp - points.level_start_xp)) * 100)
    : 0;

  // Build stats from overview data
  const statsData = overview ? [
    { label: "Members Online", value: overview.membersOnline.toLocaleString(), delta: overview.membersOnlineDelta, icon: Users },
    { label: "Live Sessions", value: overview.liveNow.toLocaleString(), delta: overview.liveNowDelta, icon: Radio },
    { label: "Voice Rooms", value: overview.voiceRooms.toLocaleString(), delta: overview.voiceRoomsDelta, icon: Mic },
    { label: "Active Rooms", value: overview.activeRoomCount.toLocaleString(), delta: null, icon: MessageSquareIcon },
    { label: "Messages This Week", value: overview.messagesThisWeek.toLocaleString(), delta: null, icon: Target },
  ] : [
    { label: "Members Online", value: "0", delta: null, icon: Users },
    { label: "Live Sessions", value: "0", delta: null, icon: Radio },
    { label: "Voice Rooms", value: "0", delta: null, icon: Mic },
    { label: "Active Rooms", value: "0", delta: null, icon: MessageSquareIcon },
    { label: "Messages This Week", value: "0", delta: null, icon: Target },
  ];

  const STAT_ICONS = [Users, Radio, Mic, MessageSquareIcon, Target];

  // Build stats cards data
  const statsCards = overview ? [
    { label: "Members Online", value: overview.membersOnline.toLocaleString(), delta: overview.membersOnlineDelta },
    { label: "Live Sessions", value: overview.liveNow.toLocaleString(), delta: overview.liveNowDelta },
    { label: "Voice Rooms", value: overview.voiceRooms.toLocaleString(), delta: overview.voiceRoomsDelta },
    { label: "Active Rooms", value: overview.activeRoomCount.toLocaleString(), delta: null },
    { label: "Messages This Week", value: overview.messagesThisWeek.toLocaleString(), delta: null },
  ] : [
    { label: "Members Online", value: "0", delta: null },
    { label: "Live Sessions", value: "0", delta: null },
    { label: "Voice Rooms", value: "0", delta: null },
    { label: "Active Rooms", value: "0", delta: null },
    { label: "Messages This Week", value: "0", delta: null },
  ];

  // Build popular this week from courses
  const popularThisWeek = overview?.courses?.slice(0, 4).map((course: any) => ({
    id: course.id,
    title: course.title,
    meta: `${course.total_lessons ?? 0} lessons · ${course.difficulty ?? "beginner"}`,
    href: course.href ?? `/c/${slug}/courses`,
  })) ?? [];

  // Build recent activity
  const recentActivity = overview && overview.recentActivity
    ? overview.recentActivity.map((a: any) => ({
        id: a.id,
        user: a.text.split(" ")[0],
        action: a.text.replace(/^[^ ]+ /, ""),
        time: a.time,
        href: a.href,
      }))
    : [];

  // Build top contributors for right rail
  const topContributors = overview && overview.topContributors
    ? overview.topContributors.map((c: any, i: number) => ({
        rank: i + 1,
        name: c.name,
        avatar: c.avatar_url,
        live: false,
        points: c.points,
      }))
    : [];

  // Build upcoming events for right rail
  const upcomingEvents = overview && overview.upcomingEvents
    ? overview.upcomingEvents.map((e: any) => ({
        id: e.id,
        title: e.title,
        month: new Date(e.start_date).toLocaleString("default", { month: "short" }).toUpperCase(),
        day: new Date(e.start_date).getDate(),
        host: e.location ?? "Community",
        time: new Date(e.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        href: e.href,
      }))
    : [];

  // Build active now for right rail
  const activeNow = overview && overview.activeMembers
    ? overview.activeMembers.map((m: any) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        variant: m.status === "Active now" ? "online" : "watching",
        avatar: m.avatar_url,
      }))
    : [];

  // Build top contributors for right rail
  const topContributorsRail = overview && overview.topContributors
    ? overview.topContributors.map((c: any, i: number) => ({
        rank: i + 1,
        name: c.name,
        avatar: c.avatar_url,
        live: false,
        points: c.points,
      }))
    : [];

  return (
    <div className="flex min-h-0 flex-1 bg-[var(--color-bg)]">
      <CommunitySidebar slug={slug} activeNav="overview" />

      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1600px] gap-5 p-4 lg:p-5">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="relative overflow-hidden rounded-xl">
              <img src={coverImage ?? "/placeholder-banner.jpg"} alt="" className="aspect-[3/1] w-full object-cover" />
              {isOwner && (
                <button
                  type="button"
                  className="absolute right-3 top-3 rounded-lg border border-white/30 bg-black/40 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/55"
                >
                  Edit Banner
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-success)]/10 text-sm font-semibold text-[var(--color-success)]">
                  {communityName.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{communityName}</h1>
                    <span className="rounded-md bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)]">
                      {visibility}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Created by Admin · Joined Jan 2024
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--color-accent)]">Level {points?.level ?? 1}</span>
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                      <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${xpPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)] hover:bg-[var(--color-accent-hover)]">
                  Invite
                </button>
                <button type="button" aria-label="More" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>

            <CommunityQuickActions slug={slug} />

            {(() => {
              const statsData = overview ? [
                { label: "Messages", value: overview.messages?.value ?? "0", delta: overview.messages?.delta ?? null },
                { label: "Engagement", value: overview.engagement?.value ?? "0", delta: overview.engagement?.delta ?? null },
                { label: "New Members", value: overview.newMembers?.value ?? "0", delta: overview.newMembers?.delta ?? null },
                { label: "Active Members", value: overview.activeMembers?.value ?? "0", delta: overview.activeMembers?.delta ?? null },
                { label: "Revenue", value: overview.revenue?.value ?? "$0", delta: overview.revenue?.delta ?? null },
              ] : [
                { label: "Messages", value: "12.4K", delta: "+12%" },
                { label: "Engagement", value: "8.7%", delta: "+0.5%" },
                { label: "New Members", value: "342", delta: "+8%" },
                { label: "Active Members", value: "1.2K", delta: "+3%" },
                { label: "Revenue", value: "$4.2K", delta: "+15%" },
              ];

              return (
                <div className="grid grid-cols-12 gap-3">
                  {statsData.map((stat, i) => {
                    const Icon = STAT_ICONS[i] ?? Users;
                    return (
                      <StatCard
                        key={stat.label}
                        className={i === 4 ? "col-span-12 sm:col-span-6 lg:col-span-4" : "col-span-6 sm:col-span-4 lg:col-span-2"}
                        icon={<Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
                        value={stat.value}
                        label={stat.label}
                        delta={stat.delta}
                      />
                    );
                  })}
                </div>
              );
            })()}

            <div className="grid gap-4 lg:grid-cols-3">
              <AboutCommunityCard />
              <CommunityProgressCard />
              <CommunityRulesCard />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Courses</h2>
                <Link href={`/c/${slug}/courses`} className="text-xs font-medium text-[var(--color-accent)] hover:underline">
                  View all courses
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {/* Courses would come from overview.courses or separate fetch */}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Recent Activity in Spaces</h3>
                <ul className="space-y-3">
{overview?.recentActivity?.length ? (
                      overview.recentActivity.map((a: any) => {
                        // Extract user name from text like "John posted in General"
                        const userName = a.text?.split(" posted in ")?.[0] ?? "Someone";
                        return (
                          <li key={a.id} className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-xs font-semibold text-[var(--color-text-muted)]">
                              {userName.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-[var(--color-text-primary)]">
                                {a.text}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                              {a.time ? new Date(a.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </li>
                        );
                      })
                    ) : (
                    <li className="text-center py-4 text-[var(--color-text-muted)]">
                      No recent activity
                    </li>
                  )}
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Popular This Week</h3>
                <ul className="space-y-2.5">
                  {overview?.popularThisWeek?.length ? (
                    overview.popularThisWeek.map((p: any) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-[var(--color-text-primary)]">{p.title}</span>
                        <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{p.count}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-center py-4 text-[var(--color-text-muted)]">
                      No popular content yet
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <aside className="hidden w-[360px] shrink-0 xl:block">
            <CommunityRightRail showContributors />
          </aside>
        </div>
      </div>
    </div>
  );
}
