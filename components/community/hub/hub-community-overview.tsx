"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  Check,
  Compass,
  FileText,
  GraduationCap,
  Hash,
  Lock,
  MessageCircle,
  Play,
  Shield,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";
import { HubAvatar, HubLinkButton, HubProgressBar } from "./hub-ui";
import { GroupCard } from "@/components/community/workspace/group/GroupCard";
import { ChannelCard } from "@/components/community/workspace/channel/ChannelCard";
import {
  communityGroupHref,
  communityRoomHref,
  mapRoomToChannel,
  mapSpaceToGroup,
} from "@/lib/community/workspace";
import { cn } from "@/lib/utils";
import {
  formatUtcDay,
  formatUtcMonth,
  formatUtcTime12,
} from "@/lib/community/format-utc";

function formatCount(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function EmptyCover({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "C";
  return (
    <div className="absolute inset-0 overflow-hidden bg-zinc-900" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(253,80,0,0.35),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(255,255,255,0.08),transparent_50%)]" />
      <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-dm-sans)] text-[clamp(6rem,22vw,12rem)] font-black tracking-tighter text-white/[0.07]">
        {initial}
      </span>
    </div>
  );
}

function Section({
  title,
  action,
  children,
  className,
  id,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-8 space-y-5 animate-in fade-in duration-300", className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[16px]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

type StartCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Hash;
};

function resourceKind(name: string, roomType: string) {
  if (roomType === "course" || /course|lesson/i.test(name)) {
    return { label: "Course", Icon: GraduationCap };
  }
  if (/video|watch|recording/i.test(name)) {
    return { label: "Video", Icon: Video };
  }
  if (/guide|handbook|wiki/i.test(name)) {
    return { label: "Guide", Icon: BookOpen };
  }
  return { label: "PDF", Icon: FileText };
}

/**
 * Premium member landing — calm, minimal, world-class.
 * Analytics stay in Owner Console only.
 */
export function HubCommunityOverview() {
  const {
    communityName,
    slug,
    memberCount,
    avatarUrl,
    coverUrl,
    tagline,
    isPrivate,
    membership,
    isOwner,
    isAdmin,
    overview,
    spacesWithRooms,
    ownerId,
    userId,
    ownerName,
  } = useWorkspace();

  const [showAllGroups, setShowAllGroups] = useState(false);

  const base = `/communities/${slug}`;
  const cover = overview?.coverImage ?? coverUrl;
  const logo = overview?.avatarUrl ?? avatarUrl;
  const members = overview?.memberCount ?? memberCount ?? 0;
  const desc =
    overview?.description?.trim() ||
    `Welcome to ${communityName}. Learn together, share resources, and collaborate with creators.`;
  const communityTagline = overview?.tagline ?? tagline ?? "Create · Grow · Earn";
  const verified = overview?.isVerified ?? false;
  const roleLabel = isOwner
    ? "Owner"
    : isAdmin
      ? "Moderator"
      : membership?.role
        ? membership.role.charAt(0).toUpperCase() + membership.role.slice(1)
        : "Member";

  const isLive = Boolean(
    overview?.activeLiveSession || (overview?.liveNow ?? 0) > 0
  );

  const mission =
    overview?.missionVision?.mission?.trim() ||
    pinnedWelcomeFallback(overview?.tagline, communityName);
  const audience =
    overview?.missionVision?.vision?.trim() ||
    (overview?.category
      ? `People exploring ${overview.category.toLowerCase()} who want to learn, contribute, and grow together.`
      : `Members who want a clear place to learn, ask questions, and collaborate inside ${communityName}.`);

  const upcomingEvents = overview?.upcomingEvents ?? [];
  const publishedCourses =
    overview?.courses?.length
      ? overview.courses
      : overview?.featuredCourse
        ? [overview.featuredCourse]
        : [];

  const roleInput = { userId, ownerId, membership };

  const collaborationSpaces = useMemo(
    () => spacesWithRooms,
    [spacesWithRooms]
  );

  const featuredGroups = collaborationSpaces;
  const visibleGroups = showAllGroups
    ? featuredGroups
    : featuredGroups.slice(0, 4);

  const generalRoom = useMemo(() => {
    for (const space of spacesWithRooms) {
      const hit = space.rooms.find(
        (r) =>
          /general/i.test(r.name) ||
          /general/i.test(r.slug) ||
          r.room_type === "chat"
      );
      if (hit) return { spaceId: space.id, room: hit };
    }
    return null;
  }, [spacesWithRooms]);

  const resourcesRooms = useMemo(
    () =>
      spacesWithRooms.flatMap((space) =>
        space.rooms
          .filter(
            (room) =>
              room.room_type === "resources" ||
              /resource|library|files|guide/i.test(room.name)
          )
          .map((room) => ({ ...room, spaceId: space.id, spaceName: space.name }))
      ),
    [spacesWithRooms]
  );

  const featuredChannels = useMemo(
    () =>
      spacesWithRooms
        .flatMap((space) =>
          space.rooms
            .filter(
              (room) =>
                room.room_type !== "resources" &&
                !/announcement/i.test(room.name ?? "") &&
                !/welcome/i.test(room.slug ?? "")
            )
            .map((room) => ({ ...room, spaceId: space.id, spaceName: space.name }))
        )
        .slice(0, 6),
    [spacesWithRooms]
  );

  const moderators = overview?.moderators ?? [];
  const founder = overview?.founder;
  const founderName = founder?.name ?? ownerName ?? "Owner";
  const rules = overview?.rules ?? [];

  const startCards = useMemo(() => {
    const cards: StartCard[] = [];
    if (generalRoom) {
      cards.push({
        id: "general",
        title: "Join General",
        description: "Start in the main conversation space.",
        href: communityRoomHref(slug, generalRoom.spaceId, generalRoom.room.id),
        icon: Hash,
      });
    } else {
      cards.push({
        id: "feed",
        title: "Explore the feed",
        description: "See what’s happening across the community.",
        href: `${base}/feed`,
        icon: Compass,
      });
    }
    if (rules.length > 0) {
      cards.push({
        id: "rules",
        title: "Read Rules",
        description: "Know how we collaborate here.",
        href: "#community-rules",
        icon: BookOpen,
      });
    }
    cards.push({
      id: "intro",
      title: "Introduce Yourself",
      description: "Say hello and meet the team.",
      href: generalRoom
        ? communityRoomHref(slug, generalRoom.spaceId, generalRoom.room.id)
        : `${base}/members`,
      icon: MessageCircle,
    });
    if (resourcesRooms[0]) {
      cards.push({
        id: "resources",
        title: "Browse Resources",
        description: "Guides, files, and shared assets.",
        href: communityRoomHref(
          slug,
          resourcesRooms[0].spaceId,
          resourcesRooms[0].id
        ),
        icon: FileText,
      });
    }
    if (publishedCourses[0]) {
      cards.push({
        id: "course",
        title: "Watch Getting Started",
        description: publishedCourses[0].title,
        href: publishedCourses[0].href,
        icon: Play,
      });
    } else if (isLive) {
      cards.push({
        id: "live",
        title: "Join Live Now",
        description: "A session is happening right now.",
        href: overview?.activeLiveSession?.href ?? `${base}/live`,
        icon: Video,
      });
    }
    return cards.slice(0, 5);
  }, [
    generalRoom,
    rules.length,
    resourcesRooms,
    publishedCourses,
    isLive,
    overview?.activeLiveSession?.href,
    slug,
    base,
  ]);

  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
      <div className="mx-auto w-full max-w-[880px] px-4 pb-24 pt-6 sm:px-6 sm:pb-28 sm:pt-10 lg:px-8">
        {/* Welcome hero */}
        <section
          aria-labelledby="community-welcome-heading"
          className="overflow-hidden rounded-[1.75rem] bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]/60 animate-in fade-in duration-500"
        >
          <div className="relative aspect-[2.5/1] min-h-[148px] w-full sm:aspect-[2.9/1] sm:min-h-[188px]">
            {cover ? (
              <Image
                src={cover}
                alt=""
                fill
                priority
                sizes="(max-width: 880px) 100vw, 880px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <EmptyCover name={communityName} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                Welcome
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <h1
                  id="community-welcome-heading"
                  className="truncate text-[1.7rem] font-semibold tracking-[-0.03em] text-white sm:text-[2.05rem]"
                >
                  {communityName}
                </h1>
                {verified && (
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#3b82f6] text-white"
                    title="Verified community"
                    aria-label="Verified community"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                )}
              </div>
              <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-white/75">
                {communityTagline}
              </p>
            </div>
          </div>

          <div className="px-5 pb-7 pt-0 sm:px-7 sm:pb-9">
            <div className="-mt-10 flex flex-col gap-5 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-end gap-4">
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl border-[3px] border-[var(--color-surface)] bg-[var(--color-surface-secondary)] sm:h-[88px] sm:w-[88px]">
                  {logo ? (
                    <Image
                      src={logo}
                      alt={`${communityName} logo`}
                      fill
                      sizes="88px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#fd5000] to-[#ff7a30] text-2xl font-bold text-white">
                      {communityName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 pb-1 text-[12px] text-[var(--color-text-muted)]">
                  <span>{formatCount(members)} members</span>
                  <span aria-hidden> · </span>
                  <span className="inline-flex items-center gap-1">
                    {(isPrivate || overview?.isPrivate) && (
                      <Lock className="h-3 w-3" aria-hidden />
                    )}
                    {isPrivate || overview?.isPrivate ? "Private" : "Public"}
                  </span>
                  {overview?.category && (
                    <>
                      <span aria-hidden> · </span>
                      <span>{overview.category}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 text-[12px] font-medium text-emerald-700">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  Joined · {roleLabel}
                </span>
                {(isOwner || isAdmin) && (
                  <HubLinkButton
                    href={`/dashboard/communities/${encodeURIComponent(slug)}`}
                    variant="secondary"
                    className="!min-h-10 !rounded-full !px-4"
                  >
                    Owner Console
                  </HubLinkButton>
                )}
              </div>
            </div>

            <div className="mt-8 max-w-2xl space-y-6">
              <div>
                <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  About
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                  {desc}
                </p>
              </div>
              {mission && (
                <div>
                  <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    Mission
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                    {mission}
                  </p>
                </div>
              )}
              <div>
                <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  Who this community is for
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                  {audience}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-14 space-y-16 sm:mt-16 sm:space-y-20">
          {/* Start Here */}
          {startCards.length > 0 && (
            <Section title="Start Here">
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {startCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <li key={card.id}>
                      <Link
                        href={card.href}
                        className={cn(
                          "group flex min-h-[108px] flex-col rounded-2xl bg-[var(--color-surface)] p-4",
                          "ring-1 ring-[var(--color-border)]/70",
                          "transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-28px_rgba(0,0,0,0.28)] hover:ring-[var(--color-accent)]/30",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                        )}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] transition group-hover:scale-[1.03]">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="mt-3 text-[14px] font-semibold tracking-tight text-[var(--color-text-primary)]">
                          {card.title}
                        </span>
                        <span className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
                          {card.description}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {/* Featured Groups */}
          {featuredGroups.length > 0 && (
            <Section
              title="Featured Groups"
              action={
                featuredGroups.length > 4 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllGroups((v) => !v)}
                    className="min-h-10 text-[12px] font-semibold text-[var(--color-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    {showAllGroups ? "Show less" : "View all"}
                  </button>
                ) : featuredGroups[0] ? (
                  <Link
                    href={communityGroupHref(slug, featuredGroups[0].id)}
                    className="min-h-10 text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
                  >
                    Open
                  </Link>
                ) : null
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {visibleGroups.map((space, index) => {
                  const group = mapSpaceToGroup(space, roleInput, {
                    memberCount: members,
                    onlineCount: overview?.membersOnline
                      ? Math.max(
                          1,
                          Math.round(
                            overview.membersOnline /
                              Math.max(spacesWithRooms.length, 1)
                          )
                        )
                      : 0,
                    featured: index === 0,
                    tags: space.access_type === "paid" ? ["Premium"] : ["Open"],
                  });
                  return (
                    <GroupCard
                      key={space.id}
                      group={group}
                      href={communityGroupHref(slug, space.id)}
                      category={group.tags[0]}
                      latestUpdate={
                        space.rooms[0]
                          ? `Latest · ${space.rooms[0].name}`
                          : undefined
                      }
                      isOwner={Boolean(isOwner)}
                    />
                  );
                })}
              </div>
            </Section>
          )}

          {/* Featured Channels — horizontal rail */}
          {featuredChannels.length > 0 && (
            <Section title="Featured Channels">
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide sm:-mx-0 sm:px-0">
                {featuredChannels.map((room) => {
                  const channel = mapRoomToChannel(room, roleInput);
                  return (
                    <ChannelCard
                      key={room.id}
                      layout="rail"
                      channel={{
                        ...channel,
                        description:
                          channel.description ||
                          `In ${room.spaceName}`,
                        pinnedCount:
                          /announce|pin|important/i.test(room.name) ? 1 : 0,
                      }}
                      href={communityRoomHref(slug, room.spaceId, room.id)}
                      onlineCount={
                        overview?.membersOnline
                          ? Math.max(0, Math.min(12, overview.membersOnline))
                          : 0
                      }
                      className="w-[min(300px,85vw)] shrink-0 snap-start"
                    />
                  );
                })}
              </div>
            </Section>
          )}

          {/* Featured Resources */}
          {resourcesRooms.length > 0 && (
            <Section title="Featured Resources">
              <ul className="grid gap-3 sm:grid-cols-2">
                {resourcesRooms.slice(0, 6).map((room) => {
                  const kind = resourceKind(room.name, room.room_type);
                  const Icon = kind.Icon;
                  return (
                    <li key={room.id}>
                      <Link
                        href={communityRoomHref(slug, room.spaceId, room.id)}
                        className={cn(
                          "group flex min-h-[88px] items-start gap-3.5 rounded-2xl bg-[var(--color-surface)] p-4",
                          "ring-1 ring-[var(--color-border)]/70",
                          "transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-28px_rgba(0,0,0,0.28)] hover:ring-[var(--color-accent)]/30",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                        )}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                          <Icon className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                            {kind.label}
                          </span>
                          <span className="mt-0.5 block truncate text-[14px] font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                            {room.name}
                          </span>
                          <span className="mt-0.5 block text-[12px] text-[var(--color-text-muted)]">
                            {room.spaceName}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {/* Featured Courses */}
          {publishedCourses.length > 0 && (
            <Section
              title="Featured Courses"
              action={
                <Link
                  href={`${base}/courses`}
                  className="min-h-10 text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
                >
                  All courses
                </Link>
              }
            >
              <div className="space-y-3">
                {publishedCourses.slice(0, 3).map((course) => (
                  <Link
                    key={course.id}
                    href={course.href}
                    className="group flex flex-col overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-28px_rgba(0,0,0,0.28)] hover:ring-[var(--color-accent)]/30 sm:flex-row focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    <div
                      className="relative h-32 w-full shrink-0 bg-gradient-to-br from-[#fd5000]/25 to-zinc-900 sm:h-auto sm:min-h-[132px] sm:w-44"
                      style={
                        course.cover_image
                          ? {
                              backgroundImage: `url(${course.cover_image})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    />
                    <div className="flex flex-1 flex-col justify-center px-5 py-4">
                      <h3 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                        {course.title}
                      </h3>
                      <p className="mt-1 text-[12px] capitalize text-[var(--color-text-muted)]">
                        {course.difficulty} · {course.total_lessons} lessons
                      </p>
                      <HubProgressBar
                        value={course.progress}
                        max={100}
                        className="mt-3"
                      />
                      <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">
                        {course.progress}% complete
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <Section title="Upcoming Events">
              <ul className="space-y-1">
                {upcomingEvents.map((ev) => (
                  <li key={ev.id}>
                    <Link
                      href={ev.href}
                      className="flex min-h-14 items-center gap-4 rounded-2xl px-3 py-3 transition hover:bg-[var(--color-surface-secondary)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                    >
                      <div className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                        <span className="text-[9px] font-semibold uppercase leading-none">
                          {formatUtcMonth(ev.start_date)}
                        </span>
                        <span className="mt-0.5 text-[15px] font-bold leading-none">
                          {formatUtcDay(ev.start_date)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-[var(--color-text-primary)]">
                          {ev.title}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                          {formatUtcTime12(ev.start_date)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Live Now */}
          {isLive && (
            <Section title="Live Now">
              <Link
                href={overview?.activeLiveSession?.href ?? `${base}/live`}
                className="flex flex-col gap-4 overflow-hidden rounded-2xl bg-zinc-950 p-5 transition hover:opacity-95 sm:flex-row sm:items-center sm:p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                <div className="relative flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800 sm:h-28 sm:w-44">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(253,80,0,0.35),transparent_60%)]" />
                  <Play className="relative h-9 w-9 text-white/90" fill="currentColor" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
                    Happening now
                  </p>
                  <h3 className="mt-1 text-[17px] font-semibold text-white">
                    {overview?.activeLiveSession?.title ??
                      `Live in ${communityName}`}
                  </h3>
                  <p className="mt-1 text-[13px] text-white/55">
                    {overview?.activeLiveSession?.room_name ?? "Live room"}
                  </p>
                  <span className="mt-4 inline-flex min-h-10 items-center rounded-full bg-white px-4 text-[12px] font-semibold text-zinc-900">
                    Join live
                  </span>
                </div>
              </Link>
            </Section>
          )}

          {/* Meet the Team */}
          {(founder || moderators.length > 0) && (
            <Section title="Meet the Team">
              <ul className="grid gap-2 sm:grid-cols-2">
                {founder && (
                  <li className="flex items-center gap-3 rounded-2xl px-3 py-3">
                    <HubAvatar
                      name={founderName}
                      src={founder.avatar_url}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                        {founderName}
                      </p>
                      <p className="text-[12px] text-[var(--color-text-muted)]">
                        Owner
                      </p>
                    </div>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                  </li>
                )}
                {!founder && ownerName && (
                  <li className="flex items-center gap-3 rounded-2xl px-3 py-3">
                    <HubAvatar name={ownerName} src={null} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                        {ownerName}
                      </p>
                      <p className="text-[12px] text-[var(--color-text-muted)]">
                        Owner
                      </p>
                    </div>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                  </li>
                )}
                {moderators.slice(0, 6).map((mod) => {
                  const role =
                    /mentor/i.test(mod.status ?? "") || /mentor/i.test(mod.name)
                      ? "Mentor"
                      : "Moderator";
                  return (
                    <li
                      key={mod.id}
                      className="flex items-center gap-3 rounded-2xl px-3 py-3"
                    >
                      <HubAvatar name={mod.name} src={mod.avatar_url} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                          {mod.name}
                        </p>
                        <p className="text-[12px] text-[var(--color-text-muted)]">
                          {role}
                        </p>
                      </div>
                      {role === "Mentor" ? (
                        <Users className="h-3.5 w-3.5 text-violet-500" aria-hidden />
                      ) : (
                        <Shield className="h-3.5 w-3.5 text-sky-500" aria-hidden />
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {/* Rules — linked from Start Here */}
          {rules.length > 0 && (
            <Section id="community-rules" title="Community Rules">
              <ol className="space-y-3">
                {rules.map((rule, i) => (
                  <li
                    key={`${i}-${rule}`}
                    className="flex gap-3 text-[14px] leading-relaxed text-[var(--color-text-secondary)]"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[11px] font-semibold text-[var(--color-accent)]">
                      {i + 1}
                    </span>
                    <span className="pt-1">{rule}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function pinnedWelcomeFallback(
  tagline: string | null | undefined,
  communityName: string
) {
  if (tagline?.trim()) return tagline.trim();
  return `Help members of ${communityName} learn faster and collaborate with clarity.`;
}
