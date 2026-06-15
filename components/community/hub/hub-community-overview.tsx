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
  const communityLevel = overview?.progressBreakdown.communityLevel ?? level;
  const communityProgress = overview?.progressBreakdown.communityProgress ?? 0;
  const memberTopPercent = overview?.progressBreakdown.memberTopPercent ?? 1;
  const userXp = points?.total_points ?? 0;
  const userLevelStart = points?.level_start_xp ?? 0;
  const userLevelNext = points?.next_level_xp ?? userLevelStart + 500;
  const userXpInLevel = Math.max(0, userXp - userLevelStart);
  const userXpSpan = Math.max(1, userLevelNext - userLevelStart);
  const userLevelProgress = Math.min(100, Math.round((userXpInLevel / userXpSpan) * 100));

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-[1fr_300px]">
      {/* ── Main column ── */}
      <div className="min-w-0 space-y-4">
        {/* Hero banner */}
        <HubCard className="overflow-hidden !p-0">
          <div className="relative min-h-[160px] bg-gradient-to-br from-zinc-900 via-zinc-800 to-[#fd5000]/50 sm:min-h-[200px]">
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
        </HubCard>

        {/* Community header card */}
        <HubCard>
          <div className="flex flex-col gap-3">
            {/* Top row — identity left, invite + menu right */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={communityName}
                    className="h-12 w-12 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#fd5000] text-lg font-black text-white">
                    {communityName[0]}
                  </div>
                )}
                <h2 className="text-[16px] font-black">{communityName}</h2>
                <ShieldCheck className="h-4 w-4 shrink-0 text-sky-500" />
                <HubBadge variant="orange">Private Community</HubBadge>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <HubLinkButton href={`${base}/members`} variant="primary">
                  Invite People
                </HubLinkButton>
                <span className="h-5 w-px shrink-0 bg-[var(--color-border)]" aria-hidden />
                <button
                  type="button"
                  aria-label="Community options"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
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
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md bg-[#fd5000] px-2.5 py-1 text-[10px] font-bold text-white">
                    Level {communityLevel}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--color-text-primary)]">
                    {communityProgress}% community progress
                  </span>
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  Top {memberTopPercent}% in community
                </span>
              </div>
              <HubProgressBar value={communityProgress} max={100} />
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--color-text-muted)]">
                <span>
                  {communityProgress}% to community Level {communityLevel + 1}
                </span>
                <span>
                  Your Level {level} · {userLevelProgress}% ({userXpInLevel.toLocaleString()} /{" "}
                  {userXpSpan.toLocaleString()} XP)
                </span>
              </div>
            </div>
          </div>
        </HubCard>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
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
            label="Voice Rooms"
            value={String(overview?.voiceRooms ?? 0)}
            delta={overview?.voiceRoomsDelta ?? undefined}
            icon={<Mic className="h-4 w-4" />}
            accent="#8b5cf6"
          />
          <HubStatCard
            label="Courses"
            value={String(overview?.courseCount ?? 0)}
            delta={overview?.courseCountDelta ?? undefined}
            icon={<GraduationCap className="h-4 w-4" />}
          />
          <HubStatCard
            label="Total Earned"
            value={`$${(overview?.totalEarned ?? 0).toLocaleString()}`}
            delta={overview?.totalEarnedDelta ?? undefined}
            icon={<DollarSign className="h-4 w-4" />}
            accent="#fd5000"
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUICK_LINKS.map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center transition hover:border-[#fd5000]/30 hover:bg-[#fd5000]/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#fd5000]/10 text-[#fd5000]">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold leading-tight">{label}</span>
            </Link>
          ))}
        </div>

        {/* About · Progress · Rules */}
        <div className="grid gap-4 lg:grid-cols-3">
          <HubCard>
            <HubSectionTitle title="About" />
            <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
              {overview?.description ??
                `Welcome to ${communityName}! Connect with creators, join live sessions, complete missions, and grow together.`}
            </p>
            <Link href={`${base}/members`} className="mt-2 inline-block text-[11px] font-semibold text-[#fd5000]">
              Learn more about us →
            </Link>
          </HubCard>

          <HubCard>
            <HubSectionTitle title="Community Progress" />
            <div className="grid grid-cols-2 gap-2 text-center">
              {[
                { label: "Community Level", value: overview?.progressBreakdown.communityLevel ?? level },
                { label: "Progress", value: `${overview?.progressBreakdown.communityProgress ?? 0}%` },
                { label: "Challenges", value: overview?.progressBreakdown.challenges ?? 0 },
                { label: "Top %", value: `${overview?.progressBreakdown.memberTopPercent ?? 1}%` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-md bg-[var(--color-surface-secondary)] p-2">
                  <p className="text-[15px] font-black">{value}</p>
                  <p className="text-[9px] text-[var(--color-text-muted)]">{label}</p>
                </div>
              ))}
            </div>
            <Link href={`${base}/leaderboard`} className="mt-2 inline-block text-[11px] font-semibold text-[#fd5000]">
              View full progress →
            </Link>
          </HubCard>

          <HubCard>
            <HubSectionTitle title="Community Rules" />
            <ol className="space-y-1.5">
              {(overview?.rules ?? []).slice(0, 5).map((rule, i) => (
                <li key={rule} className="flex gap-2 text-[11px] text-[var(--color-text-secondary)]">
                  <span className="font-bold text-[#fd5000]">{i + 1}.</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </HubCard>
        </div>

        {/* Courses */}
        {(overview?.courses.length ?? 0) > 0 && (
          <HubCard>
            <div className="mb-3 flex items-center justify-between">
              <HubSectionTitle title="Courses" />
              <Link href={`${base}/courses`} className="text-[11px] font-semibold text-[#fd5000]">
                View all
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {overview!.courses.map((c) => (
                <Link
                  key={c.id}
                  href={c.href}
                  className="overflow-hidden rounded-md border border-[var(--color-border)] transition hover:border-[#fd5000]/30"
                >
                  <div
                    className="h-24 bg-gradient-to-br from-[#fd5000]/25 to-zinc-800 bg-cover bg-center"
                    style={c.cover_image ? { backgroundImage: `url(${c.cover_image})` } : undefined}
                  />
                  <div className="p-2.5">
                    <p className="text-[12px] font-bold">{c.title}</p>
                    <p className="text-[10px] capitalize text-[var(--color-text-muted)]">
                      {c.difficulty} · {c.total_lessons} lessons
                    </p>
                    <HubProgressBar value={c.progress} max={100} className="mt-2" />
                    <p className="mt-1 text-[9px] text-[var(--color-text-muted)]">{c.progress}% complete</p>
                  </div>
                </Link>
              ))}
            </div>
          </HubCard>
        )}

        {/* Activity + Popular */}
        <div className="grid gap-4 lg:grid-cols-2">
          <HubCard>
            <HubSectionTitle title="Recent Activity in Spaces" />
            {(overview?.recentActivity.length ?? 0) === 0 ? (
              <p className="text-[11px] text-[var(--color-text-muted)]">No recent activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {overview!.recentActivity.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="block rounded-md p-2 hover:bg-[var(--color-surface-secondary)]">
                      <p className="text-[11px] font-medium leading-snug">{item.text}</p>
                      <p className="text-[9px] text-[var(--color-text-muted)]">
                        {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </HubCard>

          <HubCard>
            <HubSectionTitle title="Popular This Week" />
            {(overview?.popularThisWeek.length ?? 0) === 0 ? (
              <p className="text-[11px] text-[var(--color-text-muted)]">Nothing trending yet.</p>
            ) : (
              <ul className="space-y-2">
                {overview!.popularThisWeek.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="flex items-center justify-between rounded-md p-2 hover:bg-[var(--color-surface-secondary)]">
                      <div>
                        <p className="text-[11px] font-bold">{item.title}</p>
                        <p className="text-[9px] text-[var(--color-text-muted)]">{item.meta}</p>
                      </div>
                      <Flame className="h-4 w-4 text-orange-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </HubCard>
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <aside className="hidden min-w-0 space-y-4 xl:block">
        <HubCard>
          <HubSectionTitle title="Community Stats" badge="This Week" />
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Messages", value: (overview?.messagesThisWeek ?? 0).toLocaleString(), delta: null },
              { label: "Members Online", value: (overview?.membersOnline ?? 0).toLocaleString(), delta: overview?.membersOnlineDelta ?? null },
              { label: "Voice Rooms", value: String(overview?.voiceRooms ?? 0), delta: overview?.voiceRoomsDelta ?? null },
              { label: "Courses", value: String(overview?.courseCount ?? 0), delta: overview?.courseCountDelta ?? null },
            ].map(({ label, value, delta }) => (
              <div key={label} className="rounded-md bg-[var(--color-surface-secondary)] p-2.5">
                <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
                <p className="text-[16px] font-black leading-tight text-[var(--color-text-primary)]">{value}</p>
                {delta && <p className="text-[10px] font-semibold text-emerald-600">{delta}</p>}
              </div>
            ))}
          </div>
          <div className="mt-3 flex h-20 items-end gap-1">
            {[40, 55, 35, 70, 50, 65, 80].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-[#fd5000]/20"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#fd5000]" /> Members</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Engagement</span>
          </div>
        </HubCard>

        <HubCard>
          <HubSectionTitle title="AI Community Insights" />
          <div className="space-y-2 text-[11px] text-[var(--color-text-secondary)]">
            <p className="flex gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#fd5000]" />
              Engagement peaks in the evenings — great time to go live.
            </p>
            <p className="flex gap-2">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              {(overview?.membersOnline ?? 0).toLocaleString()} members active now across spaces.
            </p>
          </div>
          <input
            readOnly
            placeholder="Ask AI anything…"
            className="mt-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2 text-[11px] placeholder:text-[var(--color-text-muted)]"
          />
        </HubCard>

        <HubCard>
          <HubSectionTitle title="Active Now" />
          {(overview?.activeMembers.length ?? 0) === 0 ? (
            <p className="text-[11px] text-[var(--color-text-muted)]">No one active right now.</p>
          ) : (
            overview!.activeMembers.map((u) => (
              <div key={u.id} className="flex items-center justify-between border-t border-[var(--color-border)] py-2 first:border-0">
                <div className="flex items-center gap-2">
                  <HubAvatar name={u.name} src={u.avatar_url} size={32} live />
                  <div>
                    <p className="text-[11px] font-semibold">{u.name}</p>
                    <p className="text-[9px] text-emerald-600">{u.status}</p>
                  </div>
                </div>
                <HubBadge variant="live">Active</HubBadge>
              </div>
            ))
          )}
        </HubCard>

        <HubCard>
          <HubSectionTitle title="Upcoming Events" />
          {(overview?.upcomingEvents.length ?? 0) === 0 ? (
            <p className="text-[11px] text-[var(--color-text-muted)]">No upcoming events.</p>
          ) : (
            overview!.upcomingEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between border-t border-[var(--color-border)] py-2 first:border-0">
                <div>
                  <p className="text-[11px] font-bold">{ev.title}</p>
                  <p className="text-[9px] text-[var(--color-text-muted)]">
                    {format(new Date(ev.start_date), "MMM d · h:mm a")}
                  </p>
                </div>
                <HubLinkButton href={ev.href} className="!px-2 !py-1 !text-[10px]">
                  Join
                </HubLinkButton>
              </div>
            ))
          )}
        </HubCard>

        <HubCard>
          <HubSectionTitle title="Top Contributors" />
          {(overview?.topContributors.length ?? 0) === 0 ? (
            <p className="text-[11px] text-[var(--color-text-muted)]">No contributors yet.</p>
          ) : (
            overview!.topContributors.map((u, i) => (
              <div key={u.id} className="flex items-center gap-2 border-t border-[var(--color-border)] py-2 first:border-0">
                <span className="w-4 text-[10px] font-bold text-[var(--color-text-muted)]">{i + 1}</span>
                <HubAvatar name={u.name} src={u.avatar_url} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold">{u.name}</p>
                  <p className="text-[9px] text-[var(--color-text-muted)]">{u.points.toLocaleString()} XP</p>
                </div>
              </div>
            ))
          )}
        </HubCard>

        {(overview?.liveNow ?? 0) > 0 && (
          <HubCard className="!p-0 overflow-hidden">
            <div className="relative aspect-video bg-zinc-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="h-10 w-10 text-white/80" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-2">
                <p className="text-[10px] font-bold text-white">Live in {communityName}</p>
                <p className="text-[9px] text-white/70">{overview?.liveNow} rooms active</p>
              </div>
              <HubBadge variant="live" className="absolute left-2 top-2">LIVE</HubBadge>
            </div>
          </HubCard>
        )}
      </aside>
    </div>
  );
}
