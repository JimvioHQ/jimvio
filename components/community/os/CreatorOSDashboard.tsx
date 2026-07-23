"use client";

import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Calendar,
  Flame,
  GraduationCap,
  Layers,
  MessageSquare,
  Radio,
  ShoppingBag,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildScoreFromOverview,
  CommunityScoreCard,
} from "@/components/community/os/CommunityScoreCard";
import { EventCard, TaskCard } from "@/components/community/os/TaskEventCards";
import { useCreatorOSStore } from "@/lib/community/os";
import { useCollaborationStore } from "@/lib/community/knowledge";
import { KnowledgeCardView } from "@/components/community/knowledge/KnowledgeCardView";
import {
  CommerceDiscovery,
  CommunityStorefront,
  MessageCommerceEmbed,
} from "@/components/community/commerce";
import { useCreatorCommerceStore } from "@/lib/community/commerce";
import { CommunityIntelligenceHost } from "@/components/community/intelligence";

type OverviewLite = {
  totalCommunityXp?: number | null;
  healthScore?: { score: number } | null;
  trustedBadges?: { label: string }[] | null;
  memberCount?: number | null;
  featuredPosts?: {
    id: string;
    title: string | null;
    body: string;
    href: string;
    author: { name: string };
  }[];
  upcomingEvents?: {
    id: string;
    title: string;
    startsAt?: string;
    start_date?: string;
    href?: string;
  }[];
  challenges?: { id: string; title: string; href?: string }[];
  featuredCourse?: { id: string; title: string; href: string } | null;
  activeLiveSession?: {
    href: string;
    title?: string;
  } | null;
  liveNow?: number;
  spacesCount?: number;
  courses?: { id: string; title: string; href: string }[];
  progressBreakdown?: {
    communityLevel?: number;
    communityProgress?: number;
  } | null;
};

function SectionShell({
  title,
  icon: Icon,
  children,
  href,
  empty,
}: {
  title: string;
  icon: typeof Sparkles;
  children: React.ReactNode;
  href?: string;
  empty?: boolean;
}) {
  if (empty) return null;
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          <Icon className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          {title}
        </h3>
        {href && (
          <Link
            href={href}
            className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
          >
            View all
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Community Home → Creator Collaboration OS dashboard.
 * Reuses overview data + OS/knowledge stores — no duplicate fetches.
 */
export function CreatorOSDashboard({
  base,
  communityId,
  communityName,
  overview,
  userId,
  isStaff,
}: {
  base: string;
  communityId: string;
  communityName: string;
  overview: OverviewLite | null | undefined;
  userId?: string | null;
  isStaff?: boolean;
}) {
  const tasks = useCreatorOSStore((s) =>
    s.tasks.filter((t) => t.communityId === communityId).slice(0, 5)
  );
  const events = useCreatorOSStore((s) =>
    s.events.filter((e) => e.communityId === communityId).slice(0, 4)
  );
  const cards = useCollaborationStore((s) =>
    s.cards.filter((c) => c.communityId === communityId).slice(0, 4)
  );
  const marketplacePicks = useCreatorCommerceStore((s) =>
    s.featuredForCommunity(communityId).slice(0, 4)
  );

  const score = buildScoreFromOverview({
    totalCommunityXp:
      overview?.totalCommunityXp ??
      (overview?.progressBreakdown?.communityLevel
        ? overview.progressBreakdown.communityLevel * 500
        : 0),
    healthScore: overview?.healthScore,
    trustedBadges: overview?.trustedBadges,
    memberCount: overview?.memberCount,
  });

  const posts = overview?.featuredPosts?.slice(0, 4) ?? [];
  const challenges = overview?.challenges?.slice(0, 3) ?? [];
  const courses = overview?.courses?.slice(0, 4) ?? [];
  const ovEvents = overview?.upcomingEvents?.slice(0, 3) ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            Creator OS
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-[var(--color-text-primary)] sm:text-xl">
            Welcome back to {communityName}
          </h2>
          <p className="mt-1 max-w-xl text-[13px] text-[var(--color-text-muted)]">
            Learn, collaborate, build, sell, launch, teach, mentor, and earn —
            in one workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              [`${base}/feed`, "Feed", MessageSquare],
              [`${base}?section=spaces`, "Groups", Layers],
              [`${base}/live`, "Live", Radio],
              [`${base}/courses`, "Learn", GraduationCap],
            ] as const
          ).map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)]",
                "bg-[var(--color-surface)] px-3 py-1.5 text-[12px] font-semibold",
                "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </header>

      <CommunityScoreCard breakdown={score} />

      <CommunityIntelligenceHost
        communityId={communityId}
        communityName={communityName}
        base={base}
        overview={overview}
        compact
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionShell
          title="Continue learning"
          icon={GraduationCap}
          href={`${base}/courses`}
          empty={courses.length === 0 && !overview?.featuredCourse}
        >
          <ul className="space-y-2">
            {(overview?.featuredCourse
              ? [overview.featuredCourse, ...courses]
              : courses
            )
              .slice(0, 4)
              .map((c) => (
                <li key={c.id}>
                  <Link
                    href={c.href}
                    className="block rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/40"
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
          </ul>
        </SectionShell>

        <SectionShell
          title="Active groups"
          icon={Layers}
          href={`${base}?section=spaces`}
        >
          <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3 text-[13px] text-[var(--color-text-muted)]">
            {overview?.spacesCount
              ? `${overview.spacesCount} spaces ready — open Groups to enter a mini workspace.`
              : "Create or join a space to collaborate in channels, knowledge, and resources."}
          </p>
        </SectionShell>

        <SectionShell
          title="Trending discussions"
          icon={Flame}
          href={`${base}/feed`}
          empty={posts.length === 0}
        >
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={p.href}
                  className="block rounded-lg border border-[var(--color-border)] px-3 py-2"
                >
                  <p className="line-clamp-2 text-sm font-medium text-[var(--color-text-primary)]">
                    {p.title || p.body.slice(0, 100)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                    {p.author.name}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </SectionShell>

        <SectionShell
          title="Knowledge highlights"
          icon={BookOpen}
          empty={cards.length === 0}
        >
          <div className="grid gap-2">
            {cards.map((c) => (
              <KnowledgeCardView key={c.id} card={c} compact />
            ))}
          </div>
        </SectionShell>

        <SectionShell title="Live sessions" icon={Radio} href={`${base}/live`}>
          {overview?.activeLiveSession || (overview?.liveNow ?? 0) > 0 ? (
            <Link
              href={overview?.activeLiveSession?.href ?? `${base}/live`}
              className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-3 text-sm font-semibold text-red-600"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              {overview?.activeLiveSession?.title ?? "Live now — join session"}
            </Link>
          ) : (
            <p className="text-[13px] text-[var(--color-text-muted)]">
              No live sessions right now. Check Live for upcoming studios.
            </p>
          )}
        </SectionShell>

        <SectionShell
          title="Upcoming events"
          icon={Calendar}
          empty={events.length === 0 && ovEvents.length === 0}
        >
          <div className="space-y-2">
            {events.map((e) => (
              <EventCard key={e.id} event={e} userId={userId} canManage={isStaff} />
            ))}
            {ovEvents.map((e) => (
              <Link
                key={e.id}
                href={e.href ?? `${base}/events`}
                className="block rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium"
              >
                {e.title}
              </Link>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          title="Challenges"
          icon={Target}
          empty={challenges.length === 0}
        >
          <ul className="space-y-2">
            {challenges.map((c) => (
              <li key={c.id}>
                <Link
                  href={c.href ?? `${base}/missions`}
                  className="block rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </SectionShell>

        <SectionShell title="Marketplace picks" icon={ShoppingBag}>
          {marketplacePicks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3 text-[13px] text-[var(--color-text-muted)]">
              Feature products and offers from chat — they appear here on the
              community shelf.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {marketplacePicks.map((p) => (
                <MessageCommerceEmbed
                  key={`${p.id}-${p.createdAt}`}
                  embed={p}
                  compact
                />
              ))}
            </div>
          )}
        </SectionShell>

        <div className="lg:col-span-2">
          <CommunityStorefront
            communityId={communityId}
            base={base}
            communityName={communityName}
            courses={courses}
          />
        </div>

        <div className="lg:col-span-2">
          <CommerceDiscovery base={base} />
        </div>

        <SectionShell title="Creator opportunities" icon={Briefcase}>
          <ul className="space-y-1.5 text-[13px] text-[var(--color-text-secondary)]">
            <li>· Share a product in chat and sell in-conversation</li>
            <li>· Attach a course or booking offer</li>
            <li>· Generate affiliate links and track earnings</li>
            <li>· Feature offers on the community storefront</li>
          </ul>
        </SectionShell>

        <SectionShell
          title="Your tasks"
          icon={Sparkles}
          empty={tasks.length === 0}
        >
          <div className="space-y-2">
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} canManage={!!userId} />
            ))}
          </div>
        </SectionShell>

        <SectionShell title="Community activity" icon={Users} href={`${base}/feed`}>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Latest posts, lives, and member joins appear in Feed and Latest
            Activity below.
          </p>
        </SectionShell>
      </div>
    </div>
  );
}
