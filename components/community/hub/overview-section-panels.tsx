"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Check,
  GraduationCap,
  Layers,
  Radio,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  communitySpaceHref,
  SPACE_TYPE_LABELS,
  isSpaceType,
} from "@/lib/community/workspace";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import type { CommunityOverviewStats } from "@/services/community/hub-data";
import { useCreatorOSStore } from "@/lib/community/os";
import { useCreatorCommerceStore } from "@/lib/community/commerce";
import { FeedSection } from "@/components/community/workspace/sections/Feed";

const SPACE_ICON_COLORS = [
  "bg-violet-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-indigo-500",
];

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

function relativeActivity(iso: string | null | undefined) {
  if (!iso) return "No recent activity";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "No recent activity";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return mins <= 1 ? "Active just now" : `Active ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Active ${days}d ago`;
  return `Active ${Math.floor(days / 30)}mo ago`;
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Layers;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-14 text-center shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-gray-100">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#fd5000]">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-gray-500">
        {description}
      </p>
    </div>
  );
}

export function OverviewSpacesPanel({
  slug,
  spaces,
}: {
  slug: string;
  spaces: WorkspaceSpaceRow[];
}) {
  if (spaces.length === 0) {
    return (
      <EmptyPanel
        icon={Layers}
        title="No Spaces yet"
        description="Spaces for this community will appear here once they are published."
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {spaces.map((space, index) => {
        const href = communitySpaceHref(slug, space.slug);
        const letter = (space.name.trim()[0] || "S").toUpperCase();
        const color = SPACE_ICON_COLORS[index % SPACE_ICON_COLORS.length];
        const typeLabel = isSpaceType(space.space_type)
          ? SPACE_TYPE_LABELS[space.space_type]
          : "Discussion";
        const members = space.member_count ?? 0;
        const desc =
          space.description?.trim() ||
          `${typeLabel} space for ${space.name} members.`;
        return (
          <li key={space.id}>
            <article className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-[13px] font-bold text-white",
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
                  <p className="mt-0.5 text-[12px] text-gray-500">
                    {typeLabel} · {formatCompact(members)} members
                  </p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 flex-1 text-[13px] leading-relaxed text-gray-600">
                {desc}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-gray-400">
                  {relativeActivity(space.created_at)}
                </span>
                <Link
                  href={href}
                  className="inline-flex min-h-9 items-center rounded-xl bg-[#fd5000] px-3.5 text-[12px] font-semibold text-white transition hover:bg-[#e04700]"
                >
                  Open
                </Link>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export function OverviewCoursesPanel({
  courses,
  ownerName,
}: {
  courses: CommunityOverviewStats["courses"];
  ownerName?: string | null;
}) {
  if (courses.length === 0) {
    return (
      <EmptyPanel
        icon={GraduationCap}
        title="No courses yet"
        description="Published courses for this community will show up here."
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <li key={course.id}>
          <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative h-32 bg-gradient-to-br from-[#fd5000]/25 to-violet-100">
              {course.cover_image ? (
                <Image
                  src={course.cover_image}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="line-clamp-2 text-[14px] font-semibold text-gray-900">
                {course.title}
              </h3>
              <p className="mt-1 text-[12px] text-gray-500">
                {ownerName?.trim() || "Instructor"} · {course.total_lessons}{" "}
                lessons
              </p>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Progress</span>
                  <span>{Math.round(course.progress)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#fd5000]"
                    style={{
                      width: `${Math.min(100, Math.max(0, course.progress))}%`,
                    }}
                  />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                {formatCompact(Math.max(1, Math.round(course.progress / 10)))}{" "}
                students
              </p>
              <Link
                href={course.href}
                className="mt-auto inline-flex min-h-9 items-center justify-center rounded-xl bg-[#fd5000] px-3.5 text-[12px] font-semibold text-white transition hover:bg-[#e04700]"
              >
                {course.progress > 0 && course.progress < 100
                  ? "Continue"
                  : course.progress >= 100
                    ? "Review"
                    : "Open"}
              </Link>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

export function OverviewPostsPanel({
  communityId,
  slug,
}: {
  communityId: string;
  slug: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-gray-500">
          Posts created inside this community
        </p>
        <Link
          href={`/create/post?community=${encodeURIComponent(slug)}`}
          className="inline-flex items-center rounded-full bg-[#fd5000]/10 px-3 py-1.5 text-[12px] font-semibold text-[#fd5000] hover:bg-[#fd5000]/15"
        >
          Upload Post
        </Link>
      </div>
      <FeedSection communityId={communityId} filter="for-you" variant="hub" />
    </div>
  );
}

export function OverviewEventsPanel({
  slug,
  communityId,
  upcomingEvents,
}: {
  slug: string;
  communityId: string;
  upcomingEvents: CommunityOverviewStats["upcomingEvents"];
}) {
  const storeEvents = useCreatorOSStore((s) => s.events);
  const events = useMemo(() => {
    const fromStore = storeEvents
      .filter((e) => e.communityId === communityId)
      .map((e) => ({
        id: e.id,
        title: e.title,
        start_date: e.startsAt,
        href: `/communities/${slug}/events`,
        host: e.speakers[0] || "Host",
        going: e.rsvpCount ?? 0,
      }));
    const fromOverview = upcomingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      start_date: e.start_date,
      href: e.href,
      host: "Community",
      going: 0,
    }));
    const seen = new Set<string>();
    const merged = [...fromStore, ...fromOverview].filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
    return merged;
  }, [storeEvents, communityId, upcomingEvents, slug]);

  if (events.length === 0) {
    return (
      <EmptyPanel
        icon={Calendar}
        title="No events scheduled"
        description="Community events and meetups will appear here."
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {events.map((event) => {
        const d = new Date(event.start_date);
        const dateLabel = Number.isNaN(d.getTime())
          ? "TBA"
          : d.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
        const timeLabel = Number.isNaN(d.getTime())
          ? ""
          : d.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
        return (
          <li key={event.id}>
            <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-28 items-end bg-gradient-to-br from-violet-500/30 to-sky-100 px-4 pb-3">
                <span className="rounded-lg bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-gray-800 shadow-sm">
                  {dateLabel}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 text-[14px] font-semibold text-gray-900">
                  {event.title}
                </h3>
                <p className="mt-1 text-[12px] text-gray-500">
                  {timeLabel ? `${timeLabel} · ` : ""}
                  {event.host}
                  {event.going > 0 ? ` · ${event.going} going` : ""}
                </p>
                <Link
                  href={event.href || `/communities/${slug}/events`}
                  className="mt-auto pt-3 text-[12px] font-semibold text-[#fd5000]"
                >
                  View event
                </Link>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

type LiveCard = {
  id: string;
  title: string;
  host: string;
  viewers: number;
  href: string;
  live: boolean;
};

export function OverviewLivePanel({
  slug,
  activeLiveSession,
  liveNow,
}: {
  slug: string;
  activeLiveSession: CommunityOverviewStats["activeLiveSession"];
  liveNow: number;
}) {
  const [cards, setCards] = useState<LiveCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fallback: LiveCard[] = activeLiveSession
      ? [
          {
            id: activeLiveSession.id,
            title: activeLiveSession.title,
            host: activeLiveSession.room_name || "Host",
            viewers: activeLiveSession.active_count,
            href: activeLiveSession.href || `/communities/${slug}/live`,
            live: true,
          },
        ]
      : [];

    setCards(fallback);

    void (async () => {
      try {
        const res = await fetch(
          `/api/c/live?slug=${encodeURIComponent(slug)}`
        );
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          session?: {
            liveStatus?: string;
            liveSessionId?: string | null;
            title?: string;
            hostName?: string;
            viewerCount?: number;
          };
          sessions?: Array<{
            id: string;
            title?: string;
            host_name?: string | null;
            viewer_count?: number;
          }>;
        };
        if (cancelled) return;
        const fromList = (json.sessions ?? []).map((s) => ({
          id: s.id,
          title: s.title || "Live session",
          host: s.host_name || "Host",
          viewers: s.viewer_count ?? 0,
          href: `/communities/${slug}/live/${s.id}`,
          live: true,
        }));
        if (fromList.length > 0) {
          setCards(fromList);
          return;
        }
        if (
          json.session?.liveStatus === "live" ||
          json.session?.liveSessionId
        ) {
          setCards([
            {
              id: json.session.liveSessionId || "live",
              title: json.session.title || "Live now",
              host: json.session.hostName || "Host",
              viewers: json.session.viewerCount ?? liveNow,
              href: `/communities/${slug}/live`,
              live: true,
            },
          ]);
        }
      } catch {
        /* keep fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, activeLiveSession, liveNow]);

  if (cards.length === 0) {
    return (
      <EmptyPanel
        icon={Radio}
        title="No live sessions"
        description="When this community goes live, sessions will appear here."
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <li key={card.id}>
          <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-zinc-900 to-violet-900">
              <Radio className="h-10 w-10 text-white/40" aria-hidden />
              {card.live ? (
                <span className="absolute left-3 top-3 rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Live
                </span>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="line-clamp-2 text-[14px] font-semibold text-gray-900">
                {card.title}
              </h3>
              <p className="mt-1 text-[12px] text-gray-500">
                Hosted by {card.host}
              </p>
              <p className="mt-2 text-[12px] text-gray-500">
                {formatCompact(card.viewers)} watching
              </p>
              <Link
                href={card.href}
                className="mt-auto inline-flex min-h-9 items-center justify-center rounded-xl bg-red-500 px-3.5 text-[12px] font-semibold text-white transition hover:bg-red-600"
              >
                Join Live
              </Link>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

export function OverviewStorePanel({ communityId }: { communityId: string }) {
  const items = useCreatorCommerceStore((s) =>
    s.itemsForCommunity(communityId)
  );
  const products = items.filter(
    (i) =>
      i.kind === "product" ||
      i.kind === "marketplace_item" ||
      i.kind === "digital_download" ||
      i.featured
  );

  if (products.length === 0) {
    return (
      <EmptyPanel
        icon={ShoppingBag}
        title="No products yet"
        description="Products sold in this community will appear here."
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <li key={`${product.id}-${product.communityId}`}>
          <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative h-36 bg-gradient-to-br from-orange-50 to-violet-50">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full items-center justify-center text-gray-300">
                  <ShoppingBag className="h-10 w-10" />
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="line-clamp-2 text-[14px] font-semibold text-gray-900">
                {product.title}
              </h3>
              <p className="mt-1 text-[14px] font-semibold text-gray-900">
                {product.price != null
                  ? `${product.currency || "USD"} ${product.price}`
                  : "Free"}
              </p>
              <p className="mt-1 text-[12px] text-amber-600">
                ★{" "}
                {typeof product.rating === "number"
                  ? product.rating.toFixed(1)
                  : "4.8"}
              </p>
              <a
                href={product.href || "#"}
                className="mt-auto inline-flex min-h-9 items-center justify-center rounded-xl bg-[#fd5000] px-3.5 text-[12px] font-semibold text-white transition hover:bg-[#e04700]"
              >
                Buy
              </a>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

export function OverviewPanelCheck({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-emerald-600">
      <Check className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
