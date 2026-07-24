"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bookmark,
  Compass,
  GraduationCap,
  Layers,
  MessageCircle,
  Radio,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientReady } from "@/lib/community/use-client-ready";
import { useWorkspaceFavorites } from "@/components/community/workspace/shared/useWorkspaceFavorites";
import {
  deriveContinueDiscussion,
  deriveContinueLearning,
  deriveDiscovery,
  deriveNewSinceLastVisit,
  deriveQuickActions,
  deriveRecommendations,
  usePersonalizationStore,
  type PersonalizationInput,
} from "@/lib/community/personalization";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import { BookmarkButton } from "./BookmarkButton";

type CourseLite = {
  id: string;
  title: string;
  href: string;
  progress?: number;
};

type EventLite = {
  id: string;
  title: string;
  href: string;
};

type ModLite = {
  id: string;
  name: string;
  username?: string | null;
};

function RailCard({
  href,
  title,
  meta,
  icon: Icon,
  trailing,
}: {
  href: string;
  title: string;
  meta?: string;
  icon: LucideIcon;
  trailing?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[88px] items-start gap-3 rounded-2xl bg-[var(--color-surface)] p-4",
        "ring-1 ring-[var(--color-border)]/70",
        "transition duration-300 hover:-translate-y-0.5 hover:ring-[var(--color-accent)]/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
          {title}
        </span>
        {meta ? (
          <span className="mt-0.5 block text-[12px] text-[var(--color-text-muted)]">
            {meta}
          </span>
        ) : null}
      </span>
      {trailing}
    </Link>
  );
}

/**
 * Additive personalized home layer — mounts onto Community Overview.
 * Does not replace existing sections.
 */
export function PersonalizedHome({
  communityId,
  communitySlug,
  spacesWithRooms,
  courses = [],
  upcomingEvents = [],
  isLive = false,
  liveHref,
  liveTitle,
  moderators = [],
  base,
}: {
  communityId: string;
  communitySlug: string;
  spacesWithRooms: WorkspaceSpaceRow[];
  courses?: CourseLite[];
  upcomingEvents?: EventLite[];
  isLive?: boolean;
  liveHref?: string | null;
  liveTitle?: string | null;
  moderators?: ModLite[];
  base: string;
}) {
  const ready = useClientReady();
  const { isFavorite } = useWorkspaceFavorites();
  const visits = usePersonalizationStore((s) => s.visits);
  const bookmarks = usePersonalizationStore((s) => s.bookmarks);
  const activity = usePersonalizationStore((s) => s.activity);
  const continueLearning = usePersonalizationStore((s) => s.continueLearning);
  const lastCommunityVisitAt = usePersonalizationStore(
    (s) => s.lastCommunityVisitAt
  );
  const markCommunitySeen = usePersonalizationStore((s) => s.markCommunitySeen);

  useEffect(() => {
    if (!ready || !communityId) return;
    markCommunitySeen(communityId);
  }, [ready, communityId, markCommunitySeen]);

  const favoriteGroupIds = useMemo(
    () =>
      spacesWithRooms
        .filter((s) => isFavorite("group", s.id))
        .map((s) => s.id),
    [spacesWithRooms, isFavorite]
  );
  const favoriteChannelIds = useMemo(
    () =>
      spacesWithRooms.flatMap((s) =>
        s.rooms.filter((r) => isFavorite("channel", r.id)).map((r) => r.id)
      ),
    [spacesWithRooms, isFavorite]
  );

  const input: PersonalizationInput = useMemo(
    () => ({
      communityId,
      communitySlug,
      spacesWithRooms,
      visits: ready ? visits : [],
      bookmarks: ready ? bookmarks : [],
      continueLearning: ready ? continueLearning : [],
      favoriteGroupIds,
      favoriteChannelIds,
      courses,
      upcomingEvents,
      liveHref,
      liveTitle,
      isLive,
      moderators,
      lastSeenAt: lastCommunityVisitAt[communityId] ?? null,
    }),
    [
      communityId,
      communitySlug,
      spacesWithRooms,
      ready,
      visits,
      bookmarks,
      continueLearning,
      favoriteGroupIds,
      favoriteChannelIds,
      courses,
      upcomingEvents,
      liveHref,
      liveTitle,
      isLive,
      moderators,
      lastCommunityVisitAt,
    ]
  );

  const continueDiscuss = useMemo(
    () => deriveContinueDiscussion(input),
    [input]
  );
  const continueLearn = useMemo(() => deriveContinueLearning(input), [input]);
  const recommendations = useMemo(
    () => deriveRecommendations(input),
    [input]
  );
  const discovery = useMemo(() => deriveDiscovery(input), [input]);
  const newSince = useMemo(() => deriveNewSinceLastVisit(input), [input]);
  const quickActions = useMemo(() => deriveQuickActions(input), [input]);
  const personalActivity = useMemo(
    () =>
      (ready ? activity : []).filter((a) => a.communityId === communityId).slice(0, 6),
    [ready, activity, communityId]
  );
  const saved = useMemo(
    () =>
      (ready ? bookmarks : [])
        .filter((b) => b.communityId === communityId)
        .slice(0, 6),
    [ready, bookmarks, communityId]
  );

  const unreadAnnouncements = useMemo(() => {
    return spacesWithRooms.flatMap((s) =>
      s.rooms
        .filter(
          (r) => r.room_type === "posts" || /announcement/i.test(r.name)
        )
        .map((r) => ({
          id: r.id,
          title: r.name,
          href: `/communities/${communitySlug}/groups/${s.slug}/channels/${r.slug}`,
          spaceName: s.name,
        }))
    ).slice(0, 3);
  }, [spacesWithRooms, communitySlug]);

  const hasSignal =
    continueDiscuss.length > 0 ||
    continueLearn.length > 0 ||
    recommendations.length > 0 ||
    quickActions.length > 0 ||
    discovery.groups.length > 0 ||
    personalActivity.length > 0 ||
    saved.length > 0 ||
    newSince.length > 0 ||
    unreadAnnouncements.length > 0 ||
    isLive;

  if (!ready || !hasSignal) return null;

  return (
    <section
      aria-label="Personalized for you"
      className="space-y-12 sm:space-y-14 animate-in fade-in duration-500"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          For you
        </p>
        <h2 className="mt-1 text-[1.25rem] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[1.4rem]">
          Continue where you left off
        </h2>
      </div>

      {/* Quick actions */}
      {quickActions.length > 0 ? (
        <div className="flex flex-wrap gap-2.5">
          {quickActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[13px] font-semibold transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
                action.tone === "accent" &&
                  "bg-[var(--color-accent)] text-white hover:opacity-90",
                action.tone === "live" &&
                  "bg-red-500 text-white hover:opacity-90",
                action.tone === "neutral" &&
                  "bg-[var(--color-surface)] text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-accent)]/30"
              )}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-4 sm:gap-5">
        {/* Continue learning */}
        {continueLearn.length > 0 ? (
          <div className="col-span-12 lg:col-span-6 space-y-3">
            <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              Continue Learning
            </h3>
            <ul className="space-y-2.5">
              {continueLearn.map((item) => (
                <li key={item.id}>
                  <RailCard
                    href={item.href}
                    title={item.title}
                    meta={
                      typeof item.progress === "number"
                        ? `${Math.round(item.progress)}% complete · Continue reading`
                        : "Continue reading"
                    }
                    icon={GraduationCap}
                    trailing={
                      <BookmarkButton
                        id={item.id}
                        kind={item.kind === "guide" ? "knowledge" : item.kind}
                        communityId={communityId}
                        title={item.title}
                        href={item.href}
                        size="sm"
                      />
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Continue discussion */}
        {continueDiscuss.length > 0 ? (
          <div className="col-span-12 lg:col-span-6 space-y-3">
            <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              Continue Discussion
            </h3>
            <ul className="space-y-2.5">
              {continueDiscuss.map((item) => (
                <li key={`${item.kind}:${item.id}`}>
                  <RailCard
                    href={item.href}
                    title={item.title}
                    meta={item.subtitle ?? "Recently visited channel"}
                    icon={MessageCircle}
                    trailing={
                      <BookmarkButton
                        id={item.id}
                        kind="channel"
                        communityId={communityId}
                        title={item.title}
                        href={item.href}
                        size="sm"
                      />
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Unread announcements */}
        {unreadAnnouncements.length > 0 ? (
          <div className="col-span-12 lg:col-span-6 space-y-3">
            <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              Unread announcements
            </h3>
            <ul className="space-y-2.5">
              {unreadAnnouncements.map((a) => (
                <li key={a.id}>
                  <RailCard
                    href={a.href}
                    title={a.title}
                    meta={`Pinned by moderators · ${a.spaceName}`}
                    icon={Sparkles}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* New since last visit */}
        {newSince.length > 0 ? (
          <div className="col-span-12 lg:col-span-6 space-y-3">
            <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              New since your last visit
            </h3>
            <ul className="space-y-2.5">
              {newSince.map((item) => (
                <li key={item.id}>
                  <RailCard
                    href={item.href}
                    title={item.title}
                    meta={item.label}
                    icon={BookOpen}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Smart recommendations */}
      {recommendations.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                Recommended
              </p>
              <h3 className="mt-1 text-[16px] font-semibold text-[var(--color-text-primary)]">
                Suggested for you
              </h3>
            </div>
          </div>
          <ul className="grid grid-cols-12 gap-3 sm:gap-4">
            {recommendations.slice(0, 6).map((rec) => (
              <li key={rec.id} className="col-span-12 sm:col-span-6 lg:col-span-4">
                <RailCard
                  href={rec.href}
                  title={rec.title}
                  meta={rec.reason}
                  icon={
                    rec.kind === "group"
                      ? Layers
                      : rec.kind === "course"
                        ? GraduationCap
                        : rec.kind === "creator"
                          ? Users
                          : rec.kind === "event"
                            ? Compass
                            : MessageCircle
                  }
                  trailing={
                    <BookmarkButton
                      id={rec.id.replace(/^[^:]+:/, "")}
                      kind={rec.kind}
                      communityId={communityId}
                      title={rec.title}
                      href={rec.href}
                      size="sm"
                    />
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Discovery */}
      {(discovery.groups.length > 0 || discovery.channels.length > 0) && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
              Discovery
            </p>
            <h3 className="mt-1 text-[16px] font-semibold text-[var(--color-text-primary)]">
              Trending in this community
            </h3>
          </div>
          <div className="grid grid-cols-12 gap-4">
            {discovery.groups.length > 0 ? (
              <div className="col-span-12 lg:col-span-4 space-y-2.5">
                <p className="text-[12px] font-semibold text-[var(--color-text-muted)]">
                  Trending Groups
                </p>
                {discovery.groups.map((g) => (
                  <RailCard
                    key={g.id}
                    href={g.href}
                    title={g.title}
                    meta={g.meta}
                    icon={TrendingUp}
                  />
                ))}
              </div>
            ) : null}
            {discovery.discussions.length > 0 ? (
              <div className="col-span-12 lg:col-span-4 space-y-2.5">
                <p className="text-[12px] font-semibold text-[var(--color-text-muted)]">
                  Top Discussions
                </p>
                {discovery.discussions.map((c) => (
                  <RailCard
                    key={c.id}
                    href={c.href}
                    title={c.title}
                    meta={c.meta}
                    icon={MessageCircle}
                  />
                ))}
              </div>
            ) : null}
            {discovery.resources.length > 0 || discovery.creators.length > 0 ? (
              <div className="col-span-12 lg:col-span-4 space-y-2.5">
                <p className="text-[12px] font-semibold text-[var(--color-text-muted)]">
                  {discovery.resources.length > 0
                    ? "Popular Resources"
                    : "Featured Creators"}
                </p>
                {(discovery.resources.length > 0
                  ? discovery.resources
                  : discovery.creators
                ).map((item) => (
                  <RailCard
                    key={item.id}
                    href={item.href}
                    title={item.title}
                    meta={item.meta}
                    icon={
                      "kind" in item && item.kind === "creator"
                        ? Users
                        : BookOpen
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
          {isLive && liveHref ? (
            <Link
              href={liveHref}
              className="flex min-h-[72px] items-center gap-4 rounded-2xl bg-gradient-to-r from-red-500/15 via-[var(--color-surface)] to-[var(--color-surface)] px-5 ring-1 ring-red-500/20 transition hover:-translate-y-0.5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500 text-white">
                <Radio className="h-5 w-5" />
              </span>
              <span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-red-600">
                  Live now
                </span>
                <span className="mt-0.5 block text-[15px] font-semibold text-[var(--color-text-primary)]">
                  {liveTitle ?? "Join the live session"}
                </span>
              </span>
            </Link>
          ) : null}
        </div>
      )}

      {/* Bookmarks + personal activity */}
      <div className="grid grid-cols-12 gap-4 sm:gap-5">
        {saved.length > 0 ? (
          <div className="col-span-12 lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                Saved items
              </h3>
              <Link
                href="/communities/bookmarks"
                className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
              >
                All bookmarks
              </Link>
            </div>
            <ul className="space-y-2.5">
              {saved.map((b) => (
                <li key={`${b.kind}:${b.id}`}>
                  <RailCard
                    href={b.href}
                    title={b.title}
                    meta={b.subtitle ?? b.kind}
                    icon={Bookmark}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {personalActivity.length > 0 ? (
          <div className="col-span-12 lg:col-span-6 space-y-3">
            <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              Your recent activity
            </h3>
            <ul className="space-y-2">
              {personalActivity.map((a) => (
                <li key={a.id}>
                  {a.href ? (
                    <Link
                      href={a.href}
                      className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                    >
                      <span className="font-medium text-[var(--color-text-primary)]">
                        You {a.verb}
                      </span>
                      <span className="truncate">{a.title}</span>
                    </Link>
                  ) : (
                    <div className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-[var(--color-text-secondary)]">
                      <span className="font-medium text-[var(--color-text-primary)]">
                        You {a.verb}
                      </span>
                      <span className="truncate">{a.title}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="col-span-12 lg:col-span-6 rounded-2xl bg-[var(--color-surface)] p-5 ring-1 ring-[var(--color-border)]/70">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              Your activity appears here
            </p>
            <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
              Joins, saves, downloads, and replies stay private to you — never a
              community-wide feed.
            </p>
            <Link
              href={`${base}/feed`}
              className="mt-4 inline-flex min-h-10 items-center text-[13px] font-semibold text-[var(--color-accent)] hover:underline"
            >
              Explore the feed
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
