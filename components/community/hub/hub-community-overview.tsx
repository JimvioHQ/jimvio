"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  Calendar,
  Compass,
  FileText,
  GraduationCap,
  Layers,
  MessageCircle,
  Play,
  Radio,
  Shield,
  Users,
  Video,
} from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";
import { HubAvatar, HubLinkButton } from "./hub-ui";
import { CreateSpaceDialog } from "@/components/community/CreateSpaceDialog";
import { communityRoomHref } from "@/lib/community/workspace";
import { cn } from "@/lib/utils";
import {
  formatUtcDay,
  formatUtcMonth,
  formatUtcTime12,
} from "@/lib/community/format-utc";
import { useRouter } from "next/navigation";

const PersonalizedHome = dynamic(
  () =>
    import("@/components/community/personalization/PersonalizedHome").then(
      (m) => m.PersonalizedHome
    ),
  { ssr: false, loading: () => null }
);

function formatCount(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function EmptyCover({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "C";
  return (
    <div className="absolute inset-0 overflow-hidden bg-zinc-900" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(253,80,0,0.4),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
      <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-dm-sans)] text-[clamp(8rem,28vw,16rem)] font-black tracking-tighter text-white/[0.06]">
        {initial}
      </span>
    </div>
  );
}

function Section({
  title,
  eyebrow,
  action,
  children,
  className,
  id,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-10 animate-in fade-in duration-500",
        className
      )}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-[1.25rem] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[1.4rem]">
            {title}
          </h2>
        </div>
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
  icon: typeof Compass;
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
  return { label: "Resource", Icon: FileText };
}

/**
 * Premium Community Homepage — full-width product surface, not a document.
 * Groups/Channels appear only when intentionally created.
 */
export function HubCommunityOverview() {
  const router = useRouter();
  const {
    communityId,
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
    ownerName,
  } = useWorkspace();

  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  useEffect(() => {
    if (!communityId || !slug) return;
    void fetch("/api/c/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        communityId,
        path: `/communities/${slug}`,
      }),
    }).catch(() => {
      /* best-effort resume tracking */
    });
  }, [communityId, slug]);

  const base = `/communities/${slug}`;
  const cover = overview?.coverImage ?? coverUrl;
  const logo = overview?.avatarUrl ?? avatarUrl;
  const members = overview?.memberCount ?? memberCount ?? 0;
  const desc =
    overview?.description?.trim() ||
    `A place for people who care about ${communityName} — learning, sharing, and building together.`;
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
    communityTagline ||
    `Help members of ${communityName} learn faster and collaborate with clarity.`;
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

  const hasGroups = spacesWithRooms.length > 0;
  const canManage = Boolean(isOwner || isAdmin);

  const resourcesRooms = useMemo(
    () =>
      spacesWithRooms.flatMap((space) =>
        space.rooms
          .filter(
            (room) =>
              room.room_type === "resources" ||
              /resource|library|files|guide/i.test(room.name)
          )
          .map((room) => ({
            ...room,
            spaceSlug: space.slug,
            spaceName: space.name,
          }))
      ),
    [spacesWithRooms]
  );

  const liveChannels = useMemo(
    () =>
      spacesWithRooms.flatMap((space) =>
        space.rooms
          .filter((room) => room.room_type === "live" || room.room_type === "voice")
          .map((room) => ({
            ...room,
            spaceSlug: space.slug,
            spaceName: space.name,
          }))
      ),
    [spacesWithRooms]
  );

  const moderators = overview?.moderators ?? [];
  const founder = overview?.founder;
  const founderName = founder?.name ?? ownerName ?? "Owner";
  const rules = overview?.rules ?? [];

  const startCards = useMemo(() => {
    const cards: StartCard[] = [
      {
        id: "feed",
        title: "Explore the feed",
        description: "See what’s happening across the community.",
        href: `${base}/feed`,
        icon: Compass,
      },
      {
        id: "members",
        title: "Meet members",
        description: "Browse people and introduce yourself.",
        href: `${base}/members`,
        icon: Users,
      },
    ];
    if (rules.length > 0) {
      cards.push({
        id: "rules",
        title: "Read the rules",
        description: "Know how we collaborate here.",
        href: "#community-rules",
        icon: BookOpen,
      });
    }
    if (publishedCourses[0]) {
      cards.push({
        id: "course",
        title: "Start learning",
        description: publishedCourses[0].title,
        href: publishedCourses[0].href,
        icon: Play,
      });
    }
    if (isLive) {
      cards.push({
        id: "live",
        title: "Join Live now",
        description: "A session is happening right now.",
        href: overview?.activeLiveSession?.href ?? `${base}/live`,
        icon: Radio,
      });
    } else if (resourcesRooms[0]) {
      cards.push({
        id: "resources",
        title: "Browse resources",
        description: "Guides, files, and shared assets.",
        href: communityRoomHref(
          slug,
          resourcesRooms[0].spaceSlug,
          resourcesRooms[0].slug
        ),
        icon: FileText,
      });
    } else {
      cards.push({
        id: "about",
        title: "Learn about us",
        description: "Mission, audience, and how we work.",
        href: "#about",
        icon: MessageCircle,
      });
    }
    return cards.slice(0, 5);
  }, [
    base,
    rules.length,
    publishedCourses,
    isLive,
    overview?.activeLiveSession?.href,
    resourcesRooms,
    slug,
  ]);

  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
      {canManage && communityId ? (
        <CreateSpaceDialog
          open={createGroupOpen}
          onOpenChange={setCreateGroupOpen}
          communityId={communityId}
          onCreated={() => router.refresh()}
        />
      ) : null}

      {/* Full-bleed hero */}
      <section
        aria-labelledby="community-welcome-heading"
        className="relative w-full overflow-hidden border-b border-[var(--color-border)]/60"
      >
        <div className="relative aspect-[21/9] min-h-[220px] w-full sm:min-h-[280px] lg:min-h-[320px]">
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <EmptyCover name={communityName} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(253,80,0,0.18),transparent_45%)]" />

          <div className="absolute inset-x-0 bottom-0 px-4 pb-8 pt-16 sm:px-6 sm:pb-10 lg:px-10">
            <div className="mx-auto grid w-full max-w-[1400px] grid-cols-12 gap-6">
              <div className="col-span-12 flex flex-col gap-5 lg:col-span-8">
                <div className="flex items-end gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 ring-white/30 sm:h-20 sm:w-20">
                    {logo ? (
                      <Image
                        src={logo}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/10 text-2xl font-bold text-white">
                        {communityName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                      Community
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h1
                        id="community-welcome-heading"
                        className="truncate text-[1.85rem] font-semibold tracking-[-0.03em] text-white sm:text-[2.35rem]"
                      >
                        {communityName}
                      </h1>
                      {verified && (
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#3b82f6] text-white"
                          title="Verified community"
                        >
                          <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 max-w-2xl text-[14px] text-white/80 sm:text-[15px]">
                      {communityTagline}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/75">
                  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 backdrop-blur-sm">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {formatCount(members)} members
                  </span>
                  <span className="inline-flex min-h-9 items-center rounded-full bg-white/10 px-3 backdrop-blur-sm">
                    {isPrivate ? "Private" : "Public"}
                  </span>
                  {isLive ? (
                    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-red-500/90 px-3 font-semibold text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                      Live now
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="col-span-12 flex flex-wrap items-center gap-2 lg:col-span-4 lg:justify-end lg:self-end">
                <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-emerald-500/15 px-4 text-[13px] font-medium text-emerald-100 ring-1 ring-emerald-400/30 backdrop-blur-sm">
                  Joined · {roleLabel}
                </span>
                {isLive ? (
                  <HubLinkButton
                    href={overview?.activeLiveSession?.href ?? `${base}/live`}
                    className="!min-h-11 !rounded-full !bg-red-500 !px-5 hover:!bg-red-600"
                  >
                    Join live
                  </HubLinkButton>
                ) : (
                  <HubLinkButton
                    href={
                      spacesWithRooms[0]?.rooms[0]
                        ? communityRoomHref(
                            slug,
                            spacesWithRooms[0].slug,
                            spacesWithRooms[0].rooms[0].slug
                          )
                        : `${base}/feed`
                    }
                    className="!min-h-11 !rounded-full !px-5"
                  >
                    Jump in
                  </HubLinkButton>
                )}
                {canManage ? (
                  <HubLinkButton
                    href={`/dashboard/communities/${encodeURIComponent(slug)}`}
                    variant="secondary"
                    className="!min-h-11 !rounded-full !px-5 !bg-white/10 !text-white !ring-1 !ring-white/25 hover:!bg-white/15"
                  >
                    Owner Console
                  </HubLinkButton>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        {/* Foundation empty states */}
        {!hasGroups ? (
          <section className="mb-16 sm:mb-20">
            <div className="overflow-hidden rounded-[1.75rem] bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]/70">
              <div className="grid grid-cols-12 gap-0">
                <div className="col-span-12 flex flex-col justify-center gap-5 p-8 sm:p-10 lg:col-span-7 lg:p-14">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                    <Layers className="h-7 w-7" aria-hidden />
                  </span>
                  {canManage ? (
                    <>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                          Get started
                        </p>
                        <h2 className="mt-2 text-[1.6rem] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[1.85rem]">
                          Welcome to your new Community
                        </h2>
                        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                          Create your first Group to organize members. Then add
                          Channels inside that Group for discussion, resources,
                          and live sessions.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setCreateGroupOpen(true)}
                          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent)] px-6 text-[14px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                        >
                          Create your first Group
                        </button>
                        <HubLinkButton
                          href={`/dashboard/communities/${encodeURIComponent(slug)}`}
                          variant="secondary"
                          className="!min-h-12 !rounded-full !px-5"
                        >
                          Open Owner Console
                        </HubLinkButton>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                          Coming soon
                        </p>
                        <h2 className="mt-2 text-[1.6rem] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[1.85rem]">
                          This community is being prepared
                        </h2>
                        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                          No Groups have been published yet. Check back soon —
                          your host is setting things up.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`${base}/feed`}
                          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent)] px-6 text-[14px] font-semibold text-white transition hover:opacity-90"
                        >
                          Browse the feed
                        </Link>
                        <Link
                          href={`${base}/members`}
                          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] px-6 text-[14px] font-semibold text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)] transition hover:bg-[var(--color-surface)]"
                        >
                          Meet members
                        </Link>
                      </div>
                    </>
                  )}
                </div>
                <div className="col-span-12 hidden bg-gradient-to-br from-[var(--color-accent)]/12 via-transparent to-[var(--color-surface-secondary)] lg:col-span-5 lg:block" />
              </div>
            </div>
          </section>
        ) : null}

        {/* Additive intelligence layer — does not replace homepage sections */}
        {communityId && membership ? (
          <div className="mb-16 sm:mb-20">
            <PersonalizedHome
              communityId={communityId}
              communitySlug={slug}
              spacesWithRooms={spacesWithRooms}
              courses={publishedCourses.map((c) => ({
                id: c.id,
                title: c.title,
                href: c.href,
                progress: c.progress,
              }))}
              upcomingEvents={upcomingEvents.map((e) => ({
                id: e.id,
                title: e.title,
                href: e.href,
              }))}
              isLive={isLive}
              liveHref={overview?.activeLiveSession?.href ?? `${base}/live`}
              liveTitle={overview?.activeLiveSession?.title ?? null}
              moderators={moderators.map((m) => ({
                id: m.id,
                name: m.name,
                username: m.username ?? null,
              }))}
              base={base}
            />
          </div>
        ) : null}

        <div className="space-y-16 sm:space-y-20 lg:space-y-24">
          {/* About / Mission / Audience — single composition */}
          <Section id="about" eyebrow="Identity" title="About this community">
            <div className="overflow-hidden rounded-[1.5rem] bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]/70">
              <div className="grid grid-cols-12 divide-y divide-[var(--color-border)]/60 md:divide-x md:divide-y-0">
                <div className="col-span-12 space-y-2 p-6 sm:p-7 md:col-span-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                    About
                  </p>
                  <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                    {desc}
                  </p>
                </div>
                <div className="col-span-12 space-y-2 p-6 sm:p-7 md:col-span-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                    Mission
                  </p>
                  <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                    {mission}
                  </p>
                </div>
                <div className="col-span-12 space-y-2 p-6 sm:p-7 md:col-span-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                    Who it&apos;s for
                  </p>
                  <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                    {audience}
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Start Here */}
          <Section eyebrow="Onboarding" title="Start Here">
            <ul className="grid grid-cols-12 gap-4 sm:gap-5">
              {startCards.map((card) => {
                const Icon = card.icon;
                return (
                  <li
                    key={card.id}
                    className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3"
                  >
                    <Link
                      href={card.href}
                      className={cn(
                        "group flex h-full min-h-[132px] flex-col rounded-2xl bg-[var(--color-surface)] p-5",
                        "ring-1 ring-[var(--color-border)]/70",
                        "transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-30px_rgba(0,0,0,0.3)] hover:ring-[var(--color-accent)]/30",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                      )}
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] transition group-hover:scale-[1.03]">
                        <Icon className="h-[18px] w-[18px]" aria-hidden />
                      </span>
                      <span className="mt-4 text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
                        {card.title}
                      </span>
                      <span className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                        {card.description}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* Featured Resources */}
          {resourcesRooms.length > 0 ? (
            <Section eyebrow="Library" title="Featured Resources">
              <ul className="grid grid-cols-12 gap-4 sm:gap-5">
                {resourcesRooms.slice(0, 6).map((room) => {
                  const kind = resourceKind(room.name, room.room_type);
                  const Icon = kind.Icon;
                  return (
                    <li
                      key={room.id}
                      className="col-span-12 sm:col-span-6 lg:col-span-4"
                    >
                      <Link
                        href={communityRoomHref(slug, room.spaceSlug, room.slug)}
                        className={cn(
                          "group flex min-h-[104px] items-start gap-4 rounded-2xl bg-[var(--color-surface)] p-5",
                          "ring-1 ring-[var(--color-border)]/70",
                          "transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-28px_rgba(0,0,0,0.28)] hover:ring-[var(--color-accent)]/30",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                        )}
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                            {kind.label}
                          </span>
                          <span className="mt-0.5 block truncate text-[15px] font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                            {room.name}
                          </span>
                          <span className="mt-1 block text-[12px] text-[var(--color-text-muted)]">
                            In {room.spaceName}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Section>
          ) : null}

          {/* Featured Courses */}
          {publishedCourses.length > 0 ? (
            <Section
              eyebrow="Learning"
              title="Featured Courses"
              action={
                <Link
                  href={`${base}/courses`}
                  className="min-h-10 text-[13px] font-semibold text-[var(--color-accent)] hover:underline"
                >
                  View all
                </Link>
              }
            >
              <ul className="grid grid-cols-12 gap-4 sm:gap-5">
                {publishedCourses.slice(0, 6).map((course) => (
                  <li
                    key={course.id}
                    className="col-span-12 sm:col-span-6 lg:col-span-4"
                  >
                    <Link
                      href={course.href}
                      className="group flex h-full min-h-[140px] flex-col overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-30px_rgba(0,0,0,0.28)] hover:ring-[var(--color-accent)]/30"
                    >
                      <div className="relative aspect-[16/9] bg-[var(--color-surface-secondary)]">
                        {course.cover_image ? (
                          <Image
                            src={course.cover_image}
                            alt=""
                            fill
                            className="object-cover transition duration-500 group-hover:scale-[1.03]"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[var(--color-accent)]">
                            <GraduationCap className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
                          {course.title}
                        </p>
                        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                          {course.total_lessons} lessons
                          {course.difficulty ? ` · ${course.difficulty}` : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 ? (
            <Section
              eyebrow="Calendar"
              title="Upcoming Events"
              action={
                <Link
                  href={`${base}/events`}
                  className="min-h-10 text-[13px] font-semibold text-[var(--color-accent)] hover:underline"
                >
                  View all
                </Link>
              }
            >
              <ul className="grid grid-cols-12 gap-4 sm:gap-5">
                {upcomingEvents.slice(0, 6).map((event) => (
                  <li
                    key={event.id}
                    className="col-span-12 sm:col-span-6 lg:col-span-4"
                  >
                    <Link
                      href={event.href}
                      className="flex min-h-[108px] items-center gap-4 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border)]/70 transition hover:-translate-y-0.5 hover:ring-[var(--color-accent)]/30"
                    >
                      <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          {formatUtcMonth(event.start_date)}
                        </span>
                        <span className="text-[18px] font-semibold leading-none">
                          {formatUtcDay(event.start_date)}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold text-[var(--color-text-primary)]">
                          {event.title}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)]">
                          <Calendar className="h-3.5 w-3.5" aria-hidden />
                          {formatUtcTime12(event.start_date)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {/* Live Sessions */}
          {isLive || liveChannels.length > 0 ? (
            <Section
              eyebrow="Broadcast"
              title="Live Sessions"
              action={
                <Link
                  href={`${base}/live`}
                  className="min-h-10 text-[13px] font-semibold text-[var(--color-accent)] hover:underline"
                >
                  Open Live
                </Link>
              }
            >
              <div className="grid grid-cols-12 gap-4 sm:gap-5">
                {isLive ? (
                  <Link
                    href={overview?.activeLiveSession?.href ?? `${base}/live`}
                    className="col-span-12 flex min-h-[120px] items-center gap-5 rounded-2xl bg-gradient-to-br from-red-500/10 via-[var(--color-surface)] to-[var(--color-surface)] p-6 ring-1 ring-red-500/20 transition hover:-translate-y-0.5 sm:col-span-6 lg:col-span-5"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500 text-white">
                      <Radio className="h-6 w-6" aria-hidden />
                    </span>
                    <span>
                      <span className="text-[11px] font-bold uppercase tracking-wide text-red-600">
                        Live now
                      </span>
                      <span className="mt-1 block text-[16px] font-semibold text-[var(--color-text-primary)]">
                        {overview?.activeLiveSession?.title ?? "Join the live session"}
                      </span>
                      <span className="mt-1 block text-[13px] text-[var(--color-text-muted)]">
                        Jump in while it’s happening
                      </span>
                    </span>
                  </Link>
                ) : null}
                {liveChannels.slice(0, 3).map((room) => (
                  <Link
                    key={room.id}
                    href={communityRoomHref(slug, room.spaceSlug, room.slug)}
                    className="col-span-12 flex min-h-[120px] flex-col justify-center rounded-2xl bg-[var(--color-surface)] p-6 ring-1 ring-[var(--color-border)]/70 transition hover:-translate-y-0.5 hover:ring-[var(--color-accent)]/30 sm:col-span-6 lg:col-span-3"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                      {room.room_type === "voice" ? "Voice" : "Live"}
                    </span>
                    <span className="mt-1 text-[15px] font-semibold text-[var(--color-text-primary)]">
                      {room.name}
                    </span>
                    <span className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                      {room.spaceName}
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Meet the Team */}
          <Section eyebrow="People" title="Meet the Team">
            <ul className="grid grid-cols-12 gap-4 sm:gap-5">
              <li className="col-span-12 sm:col-span-6 lg:col-span-3">
                <div className="flex h-full min-h-[140px] flex-col items-start rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border)]/70">
                  <HubAvatar
                    src={founder?.avatar_url}
                    name={founderName}
                    size={48}
                  />
                  <p className="mt-4 text-[15px] font-semibold text-[var(--color-text-primary)]">
                    {founderName}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-[var(--color-accent)]">
                    Founder
                  </p>
                </div>
              </li>
              {moderators.slice(0, 7).map((mod) => (
                <li
                  key={mod.id}
                  className="col-span-12 sm:col-span-6 lg:col-span-3"
                >
                  <div className="flex h-full min-h-[140px] flex-col items-start rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border)]/70">
                    <HubAvatar
                      src={mod.avatar_url}
                      name={mod.name}
                      size={48}
                    />
                    <p className="mt-4 text-[15px] font-semibold text-[var(--color-text-primary)]">
                      {mod.name}
                    </p>
                    <p className="mt-0.5 text-[12px] font-medium text-[var(--color-text-muted)]">
                      {mod.role ?? "Moderator"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          {/* Community Rules */}
          {rules.length > 0 ? (
            <Section
              id="community-rules"
              eyebrow="Guidelines"
              title="Community Rules"
            >
              <ul className="grid grid-cols-12 gap-4 sm:gap-5">
                {rules.map((rule, index) => (
                  <li
                    key={`${index}-${rule.slice(0, 24)}`}
                    className="col-span-12 sm:col-span-6 lg:col-span-4"
                  >
                    <div className="flex min-h-[96px] gap-3 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border)]/70">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                        <Shield className="h-4 w-4" aria-hidden />
                      </span>
                      <p className="text-[13.5px] leading-relaxed text-[var(--color-text-secondary)]">
                        <span className="mr-1.5 font-semibold text-[var(--color-text-primary)]">
                          {index + 1}.
                        </span>
                        {rule}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
