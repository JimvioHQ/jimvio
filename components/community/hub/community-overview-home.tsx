"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Check,
  Eye,
  FileText,
  Flame,
  Layers,
  Megaphone,
  Pin,
  Radio,
  Scale,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  communitySpaceHref,
  SPACE_TYPE_LABELS,
  isSpaceType,
} from "@/lib/community/workspace";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import type { CommunityOverviewStats } from "@/services/community/hub-data";

const SPACE_ICON_COLORS = [
  "bg-orange-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
] as const;

function formatCompact(n: number) {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) {
    const v = n / 1000;
    return `${v.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return n.toLocaleString();
}

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function privacyLabel(accessType: string) {
  const t = accessType.toLowerCase();
  if (t === "private" || t === "paid" || t === "premium") return "Private";
  return "Public";
}

function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <h2 className="text-[1.05rem] font-semibold tracking-tight text-gray-900 sm:text-[1.15rem]">
        {title}
      </h2>
      {action}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  iconClass,
  title,
  body,
  chips,
}: {
  icon: typeof FileText;
  iconClass: string;
  title: string;
  body: string;
  chips?: string[];
}) {
  return (
    <section className="rounded-[1.35rem] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] ring-1 ring-gray-100 transition duration-200 hover:shadow-[0_12px_36px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex gap-4">
        <span
          className={cn(
            "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            iconClass
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[1.05rem] font-semibold tracking-tight text-gray-900">
            {title}
          </h3>
          <p className="mt-2.5 max-w-3xl text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
            {body}
          </p>
          {chips && chips.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {chips.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1.5 text-[12px] font-medium text-gray-700 ring-1 ring-gray-100"
                >
                  <Check
                    className="h-3 w-3 text-[var(--color-accent)]"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function EmptySoft({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-gray-50/80 px-5 py-8 text-center text-[13.5px] text-gray-500 ring-1 ring-gray-100">
      {message}
    </div>
  );
}

export function CommunityOverviewHome({
  slug,
  communityName,
  base,
  overview,
  spacesWithRooms,
  canManage,
  onCreateSpace,
}: {
  slug: string;
  communityName: string;
  base: string;
  overview: CommunityOverviewStats | null;
  spacesWithRooms: WorkspaceSpaceRow[];
  canManage: boolean;
  onCreateSpace?: () => void;
}) {
  const announcements = (overview?.featuredPosts ?? []).slice(0, 3);
  const pinnedPost = overview?.featuredPosts?.[0] ?? null;
  const liveSession = overview?.activeLiveSession ?? null;
  const liveNow = overview?.liveNow ?? 0;
  const trending =
    overview?.popularThisWeek?.[0] ??
    overview?.weeklyHighlights?.find(
      (h) => h.kind === "post" || h.kind === "activity"
    ) ??
    null;
  const featuredSpace =
    spacesWithRooms.find((s) => s.is_featured) ?? spacesWithRooms[0] ?? null;

  const activity = [...(overview?.recentActivity ?? [])]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);

  const founder = overview?.founder ?? null;
  const moderators = overview?.moderators ?? [];
  const avatarStack = (overview?.memberAvatars ?? overview?.activeMembers ?? []).slice(
    0,
    8
  );
  const recentMembers = (overview?.activeMembers ?? [])
    .filter((m) => m.id !== founder?.id)
    .slice(0, 4);

  const description = overview?.description?.trim() || null;
  const mission = overview?.missionVision?.mission?.trim() || null;
  const vision = overview?.missionVision?.vision?.trim() || null;
  const rules = (overview?.rules ?? []).map((r) => r.trim()).filter(Boolean);
  const tags = (overview?.tags ?? []).map((t) => t.trim()).filter(Boolean);
  const resourcesChips = [
    ...tags.slice(0, 4),
    ...(overview?.trustedBadges ?? [])
      .filter((b) => b.tone === "learning" || b.tone === "secure")
      .map((b) => b.label)
      .slice(0, 3),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const highlightCards = [
    pinnedPost
      ? {
          id: "pinned",
          eyebrow: "Pinned",
          icon: Pin,
          tone: "bg-amber-50 text-amber-700",
          title: pinnedPost.title?.trim() || pinnedPost.body.slice(0, 72),
          meta: pinnedPost.author?.name
            ? `${pinnedPost.author.name} · ${relativeTime(pinnedPost.created_at)}`
            : relativeTime(pinnedPost.created_at),
          href: pinnedPost.href,
        }
      : null,
    trending
      ? {
          id: "trending",
          eyebrow: "Trending",
          icon: Flame,
          tone: "bg-orange-50 text-[var(--color-accent)]",
          title: trending.title,
          meta: "meta" in trending ? trending.meta : "",
          href: trending.href,
        }
      : null,
    liveSession || liveNow > 0
      ? {
          id: "live",
          eyebrow: "Live now",
          icon: Radio,
          tone: "bg-emerald-50 text-emerald-700",
          title: liveSession?.title || `${liveNow} live session${liveNow === 1 ? "" : "s"}`,
          meta: liveSession
            ? `${liveSession.room_name || "Live"} · ${formatCompact(liveSession.active_count)} watching`
            : "Jump in while energy is high",
          href: liveSession?.href || `${base}/live`,
        }
      : null,
    featuredSpace
      ? {
          id: "space",
          eyebrow: "Featured space",
          icon: Sparkles,
          tone: "bg-sky-50 text-sky-700",
          title: featuredSpace.name,
          meta:
            featuredSpace.description?.trim() ||
            (isSpaceType(featuredSpace.space_type)
              ? SPACE_TYPE_LABELS[featuredSpace.space_type]
              : "Collaboration space"),
          href: communitySpaceHref(slug, featuredSpace.slug),
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    eyebrow: string;
    icon: typeof Pin;
    tone: string;
    title: string;
    meta: string;
    href: string;
  }>;

  const featuredSpaces = spacesWithRooms.slice(0, 6);
  const hasMemberSpotlight =
    Boolean(founder) || moderators.length > 0 || avatarStack.length > 0;

  return (
    <div className="mt-8 space-y-6 sm:mt-10 sm:space-y-8 animate-in fade-in duration-300">
      {/* Highlights */}
      {highlightCards.length > 0 ? (
        <section aria-label="Community highlights">
          <SectionHeading title="Highlights" />
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {highlightCards.map((card) => {
              const Icon = card.icon;
              return (
                <li key={card.id}>
                  <Link
                    href={card.href}
                    className="group flex h-full flex-col rounded-[1.25rem] bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] ring-1 ring-gray-100 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                  >
                    <span
                      className={cn(
                        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        card.tone
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {card.eyebrow}
                    </span>
                    <p className="mt-3 line-clamp-2 text-[14px] font-semibold leading-snug text-gray-900">
                      {card.title}
                    </p>
                    {card.meta ? (
                      <p className="mt-auto pt-2 line-clamp-2 text-[12px] leading-relaxed text-gray-500">
                        {card.meta}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Activity + Members */}
      <div className="grid gap-5 lg:grid-cols-12">
        <section className="rounded-[1.35rem] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] ring-1 ring-gray-100 sm:p-6 lg:col-span-7">
          <SectionHeading
            title="Community Activity"
            action={
              <Link
                href={`${base}/feed`}
                className="text-[12.5px] font-semibold text-[var(--color-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 rounded-sm"
              >
                Open feed →
              </Link>
            }
          />
          {activity.length === 0 ? (
            <EmptySoft message="No discussions yet." />
          ) : (
            <ol className="relative space-y-0">
              {activity.map((item, index) => (
                <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < activity.length - 1 ? (
                    <span
                      className="absolute left-[7px] top-4 bottom-0 w-px bg-gray-100"
                      aria-hidden
                    />
                  ) : null}
                  <span className="relative z-[1] mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/10" />
                  <Link
                    href={item.href || `${base}/feed`}
                    className="min-w-0 flex-1 rounded-xl px-1 py-0.5 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                  >
                    <p className="text-[13.5px] leading-relaxed text-gray-800">
                      {item.text}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-gray-400">
                      {relativeTime(item.time)}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-[1.35rem] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] ring-1 ring-gray-100 sm:p-6 lg:col-span-5">
          <SectionHeading
            title="Member Spotlight"
            action={
              <Link
                href={`${base}/members`}
                className="text-[12.5px] font-semibold text-[var(--color-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 rounded-sm"
              >
                View members →
              </Link>
            }
          />
          {!hasMemberSpotlight ? (
            <EmptySoft message="Members will appear here as the community grows." />
          ) : (
            <div className="space-y-5">
              {avatarStack.length > 0 ? (
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Active members
                  </p>
                  <div className="flex items-center">
                    {avatarStack.map((m, i) => (
                      <span
                        key={m.id}
                        className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-white"
                        style={{ marginLeft: i === 0 ? 0 : -8 }}
                        title={m.name}
                      >
                        {m.avatar_url ? (
                          <Image
                            src={m.avatar_url}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 text-[10px] font-bold text-white">
                            {(m.name.trim()[0] || "?").toUpperCase()}
                          </span>
                        )}
                      </span>
                    ))}
                    {(overview?.memberCount ?? 0) > avatarStack.length ? (
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600 ring-2 ring-white"
                        style={{ marginLeft: -8 }}
                      >
                        +{formatCompact((overview?.memberCount ?? 0) - avatarStack.length)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {founder ? (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Community owner
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="relative h-10 w-10 overflow-hidden rounded-full bg-orange-100">
                      {founder.avatar_url ? (
                        <Image
                          src={founder.avatar_url}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[12px] font-bold text-[var(--color-accent)]">
                          {(founder.name.trim()[0] || "O").toUpperCase()}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-gray-900">
                        {founder.name}
                      </p>
                      <p className="text-[12px] text-gray-500">Owner</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {moderators.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Moderators
                  </p>
                  <ul className="space-y-2">
                    {moderators.slice(0, 3).map((m) => (
                      <li key={m.id} className="flex items-center gap-2.5">
                        <span className="relative h-8 w-8 overflow-hidden rounded-full bg-sky-50">
                          {m.avatar_url ? (
                            <Image
                              src={m.avatar_url}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-sky-700">
                              {(m.name.trim()[0] || "M").toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="truncate text-[13px] font-medium text-gray-800">
                          {m.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {recentMembers.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Recently active
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {recentMembers.map((m) => (
                      <li
                        key={m.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1 text-[12px] font-medium text-gray-700 ring-1 ring-gray-100"
                      >
                        <Users className="h-3 w-3 text-gray-400" aria-hidden />
                        {m.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>

      {/* Featured Spaces */}
      <section aria-label="Featured spaces">
        <SectionHeading
          title="Featured Spaces"
          action={
            <Link
              href={`${base}/spaces`}
              className="text-[12.5px] font-semibold text-[var(--color-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 rounded-sm"
            >
              View all spaces →
            </Link>
          }
        />
        {featuredSpaces.length === 0 ? (
          <div className="rounded-[1.35rem] bg-white px-6 py-10 text-center shadow-[0_8px_30px_rgba(15,23,42,0.04)] ring-1 ring-gray-100">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              <Layers className="h-6 w-6" aria-hidden />
            </span>
            <p className="text-[15px] font-semibold text-gray-900">
              No spaces available yet.
            </p>
            <p className="mt-1.5 text-[13px] text-gray-500">
              Start the first conversation by creating a Space.
            </p>
            {canManage && onCreateSpace ? (
              <button
                type="button"
                onClick={onCreateSpace}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-accent)] px-5 text-[13px] font-semibold text-white transition hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
              >
                Create First Space
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {featuredSpaces.map((space, index) => {
              const href = communitySpaceHref(slug, space.slug);
              const letter = (space.name.trim()[0] || "S").toUpperCase();
              const color = SPACE_ICON_COLORS[index % SPACE_ICON_COLORS.length];
              const visibility = privacyLabel(space.access_type);
              const desc =
                space.description?.trim() ||
                (isSpaceType(space.space_type)
                  ? SPACE_TYPE_LABELS[space.space_type]
                  : null);
              return (
                <li key={space.id}>
                  <Link
                    href={href}
                    className="group flex h-full flex-col rounded-[1.25rem] bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] ring-1 ring-gray-100 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(15,23,42,0.08)] hover:ring-[var(--color-accent)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-[13px] font-bold text-white shadow-sm transition group-hover:scale-[1.03]",
                          color
                        )}
                      >
                        {space.icon && /^https?:\/\//.test(space.icon) ? (
                          <Image
                            src={space.icon}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : space.icon ? (
                          <span className="text-lg leading-none">{space.icon}</span>
                        ) : (
                          letter
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-semibold text-gray-900">
                          {space.name}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              visibility === "Private"
                                ? "bg-violet-50 text-violet-700"
                                : "bg-emerald-50 text-emerald-700"
                            )}
                          >
                            {visibility}
                          </span>
                          {typeof space.member_count === "number" ? (
                            <span className="text-[11px] text-gray-500">
                              {formatCompact(space.member_count)} members
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {desc ? (
                      <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-gray-600">
                        {desc}
                      </p>
                    ) : null}
                    {space.created_at ? (
                      <p className="mt-auto pt-3 text-[11px] text-gray-400">
                        {relativeTime(space.created_at)}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Information cards */}
      <div className="space-y-5">
        <InfoCard
          icon={FileText}
          iconClass="bg-orange-50 text-[var(--color-accent)]"
          title="Description"
          body={
            description ||
            `A place for people who care about ${communityName} — learning, sharing, and building together.`
          }
          chips={tags.slice(0, 4)}
        />

        <InfoCard
          icon={Target}
          iconClass="bg-emerald-50 text-emerald-600"
          title="Mission"
          body={
            mission ||
            overview?.tagline?.trim() ||
            `Help members of ${communityName} learn faster and collaborate with clarity.`
          }
        />

        <InfoCard
          icon={Eye}
          iconClass="bg-sky-50 text-sky-600"
          title="Vision"
          body={
            vision ||
            (overview?.category
              ? `Become the go-to home for ${overview.category.toLowerCase()} creators who want to learn, contribute, and grow together.`
              : `Build a trusted ecosystem where members of ${communityName} turn knowledge into impact.`)
          }
        />

        {rules.length > 0 ? (
          <InfoCard
            icon={Scale}
            iconClass="bg-violet-50 text-violet-600"
            title="Rules"
            body={rules[0]!}
            chips={rules.slice(1, 5)}
          />
        ) : null}

        {resourcesChips.length > 0 ? (
          <InfoCard
            icon={BookOpen}
            iconClass="bg-amber-50 text-amber-700"
            title="Resources"
            body="Topics and resources members explore in this community."
            chips={resourcesChips}
          />
        ) : null}
      </div>

      {/* Announcements */}
      <section className="rounded-[1.35rem] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] ring-1 ring-gray-100 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Megaphone className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-[1.15rem] font-semibold tracking-tight text-gray-900">
              Announcements
            </h2>
          </div>
          <Link
            href={`${base}/feed`}
            className="text-[13px] font-semibold text-[var(--color-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 rounded-sm"
          >
            View all announcements →
          </Link>
        </div>

        {announcements.length === 0 ? (
          <EmptySoft message="Share the first resource." />
        ) : (
          <ul className="grid grid-cols-12 gap-4">
            {announcements.map((post) => (
              <li
                key={post.id}
                className="col-span-12 sm:col-span-6 lg:col-span-4"
              >
                <Link
                  href={post.href}
                  className="flex h-full gap-3.5 rounded-2xl bg-gray-50/70 p-4 ring-1 ring-gray-100 transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white">
                    <Megaphone className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[14px] font-semibold text-gray-900">
                      {post.title?.trim() || post.body.slice(0, 72)}
                    </span>
                    <span className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-gray-500">
                      {post.body}
                    </span>
                    <span className="mt-2 block text-[11px] text-gray-400">
                      {post.author.name}
                      <span className="mx-1">·</span>
                      {relativeTime(post.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
