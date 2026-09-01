"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Flame, Hash, Pin, Radio } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { CommunityLetterAvatar } from "@/components/community/community-letter-avatar";
import { CommunityAvatarImage, CommunityCoverImage } from "@/components/community/community-media";
import { safeMediaUrl } from "@/lib/media/optimize-url";

type LiveItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  image?: string | null;
  badge?: string;
};

export type TrendingCommunity = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  tagline: string | null;
  cover_image: string | null;
  avatar_url: string | null;
  member_count: number;
  online_members: number;
  trending_score: number;
  verified: boolean;
  href: string;
  join_href: string;
};

type TrendingTopic = {
  topic: string;
  post_count: number;
  community_count: number;
  growth_pct: number;
  active_users: number;
  live_discussions: number;
};

type PinnedRow = {
  community_id: string;
  community: {
    id: string;
    name: string;
    slug: string;
    avatar_url?: string | null;
    cover_image?: string | null;
    tagline?: string | null;
    member_count?: number | null;
    category?: string | null;
  } | null;
};

type DiscoverPayload = {
  communities?: TrendingCommunity[];
  live?: LiveItem[];
};

function communityTagline(input: {
  tagline?: string | null;
  category?: string | null;
  name?: string | null;
}): string {
  const tagline = input.tagline?.trim();
  if (tagline) return tagline;
  const category = input.category?.trim();
  if (category) return `${category} community`;
  return "Community on Jimvio";
}

function CommunityMiniCard({
  href,
  name,
  tagline,
  category,
  cover,
  logo,
  verified,
}: {
  href: string;
  name: string;
  tagline?: string | null;
  category?: string | null;
  cover?: string | null;
  logo?: string | null;
  verified?: boolean;
}) {
  const coverSrc = safeMediaUrl(cover, 320);
  const logoSrc = safeMediaUrl(logo, 96);
  const description = communityTagline({ tagline, category, name });

  return (
    <article
      className={cn(
        "group flex w-[168px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]",
        "shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-[transform,box-shadow,border-color] duration-200 motion-reduce:transition-none",
        "hover:-translate-y-0.5 hover:border-[#FF5A1F]/35 hover:shadow-md active:scale-[0.98] motion-reduce:active:scale-100"
      )}
    >
      <Link href={href} className="relative flex flex-col">
        <div className="relative h-[84px] w-full bg-[var(--color-surface-secondary)]">
          {coverSrc ? (
            <CommunityCoverImage
              name={name}
              src={cover}
              sizes="168px"
              imageClassName="transition duration-300 group-hover:scale-105"
            />
          ) : (
            <CommunityLetterAvatar
              name={name}
              className="absolute inset-0 bg-[#FFF1EB]"
              textClassName="text-3xl font-black text-[#fd5000]/80"
            />
          )}
        </div>

        <div className="relative px-3">
          <div className="absolute -top-5 left-3 h-10 w-10 overflow-hidden rounded-xl border-[2.5px] border-[var(--color-surface)] bg-[var(--color-surface)] shadow-sm ring-1 ring-black/5">
            {logoSrc ? (
              <CommunityAvatarImage name={name} src={logo} size={40} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#FFF1EB] text-[12px] font-bold text-[#fd5000]">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="px-3 pb-3.5 pt-7">
          <div className="flex items-start gap-1">
            <p className="line-clamp-2 min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug tracking-tight text-[var(--color-text-primary)]">
              {name}
            </p>
            {verified ? (
              <BadgeCheck
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3b82f6]"
                fill="currentColor"
                strokeWidth={0}
                aria-label="Verified community"
              />
            ) : null}
          </div>
          <p className="mt-1 truncate text-[11px] leading-snug text-[var(--color-text-muted)]">
            {description}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function FeedDiscoverRail({
  initialCommunities = [],
}: {
  initialCommunities?: TrendingCommunity[];
}) {
  const [data, setData] = useState<DiscoverPayload | null>(
    initialCommunities.length ? { communities: initialCommunities } : null,
  );
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [pins, setPins] = useState<PinnedRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch("/api/c/hub/discover", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/c/hub/topics?limit=12", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/c/pins", { cache: "no-store" }).then((r) =>
        r.status === 401 ? null : r.ok ? r.json() : null
      ),
    ])
      .then(([discover, topicPayload, pinPayload]) => {
        if (cancelled) return;
        if (discover) {
          const nextCommunities =
            Array.isArray(discover.communities) && discover.communities.length > 0
              ? discover.communities
              : initialCommunities;
          setData({
            communities: nextCommunities,
            live: discover.live ?? [],
          });
        }
        setTopics(topicPayload?.topics ?? []);
        setPins(pinPayload?.pins ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const communities = data?.communities ?? [];
  const live = data?.live ?? [];
  const hasAny =
    pins.length > 0 ||
    communities.length > 0 ||
    topics.length > 0 ||
    live.length > 0;
  if (!hasAny) return null;

  return (
    <div className="space-y-3">
      {pins.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 shadow-[0_1px_2px_rgba(17,24,39,0.04)] backdrop-blur">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
            <Pin className="h-4 w-4 text-[#fd5000]" />
            <h2 className="text-[13px] font-bold text-[var(--color-text-primary)]">Pinned</h2>
          </div>
          <div className="flex gap-2.5 overflow-x-auto overscroll-x-contain px-3 py-3 scrollbar-hide snap-x snap-mandatory">
            {pins.map((pin) => {
              const c = pin.community;
              if (!c) return null;
              return (
                <CommunityMiniCard
                  key={pin.community_id}
                  href={`/communities/${c.slug}`}
                  name={c.name}
                  tagline={c.tagline}
                  category={c.category}
                  cover={c.cover_image}
                  logo={c.avatar_url}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {communities.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 shadow-[0_1px_2px_rgba(17,24,39,0.04)] backdrop-blur">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
            <Flame className="h-4 w-4 text-[#fd5000]" />
            <h2 className="text-[13px] font-bold text-[var(--color-text-primary)]">
              🔥 Trending Communities
            </h2>
          </div>
          <div className="flex gap-2.5 overflow-x-auto overscroll-x-contain px-3 py-3 scrollbar-hide snap-x snap-mandatory">
            {communities.slice(0, 8).map((community) => (
              <CommunityMiniCard
                key={community.id}
                href={community.href}
                name={community.name}
                tagline={community.tagline}
                category={community.category}
                cover={community.cover_image}
                logo={community.avatar_url}
                verified={community.verified}
              />
            ))}
          </div>
        </section>
      ) : null}

      {topics.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 shadow-[0_1px_2px_rgba(17,24,39,0.04)] backdrop-blur">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
            <Hash className="h-4 w-4 text-[#fd5000]" />
            <h2 className="text-[13px] font-bold text-[var(--color-text-primary)]">
              Trending Topics
            </h2>
          </div>
          <div className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-hide">
            {topics.map((topic) => (
              <Link
                key={topic.topic}
                href={`/communities/explore?search=${encodeURIComponent(`#${topic.topic}`)}`}
                className={cn(
                  "w-[148px] min-w-0 shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3",
                  "transition hover:-translate-y-0.5 hover:border-[#fd5000]/35 hover:shadow-md"
                )}
              >
                <p className="min-w-0 break-words text-[13px] font-bold text-[var(--color-text-primary)]">
                  #{topic.topic}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                  {formatNumber(topic.post_count)} posts ·{" "}
                  {formatNumber(topic.community_count)} communities
                </p>
                <div className="mt-2 flex flex-wrap gap-1 text-[9px] font-semibold">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5",
                      topic.growth_pct >= 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    )}
                  >
                    {topic.growth_pct >= 0 ? "+" : ""}
                    {Math.round(topic.growth_pct)}%
                  </span>
                  <span className="rounded-md bg-[#EEE] px-1.5 py-0.5 text-[#4B5563]">
                    {formatNumber(topic.active_users)} active
                  </span>
                  {topic.live_discussions > 0 ? (
                    <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[#fd5000]">
                      {formatNumber(topic.live_discussions)} live
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {live.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 shadow-[0_1px_2px_rgba(17,24,39,0.04)] backdrop-blur">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
            <Radio className="h-4 w-4 text-[#fd5000]" />
            <h2 className="text-[13px] font-bold text-[var(--color-text-primary)]">Live now</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-hide">
            {live.slice(0, 8).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "group flex w-[148px] min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
                  "transition hover:-translate-y-0.5 hover:border-[#fd5000]/35 hover:shadow-md"
                )}
              >
                <div className="relative h-20 w-full bg-[#EEE]">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      sizes="148px"
                      loading="lazy"
                      unoptimized
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-[#fd5000]">
                      <Flame className="h-5 w-5" />
                    </div>
                  )}
                  {item.badge ? (
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 min-w-0 break-words text-[12px] font-semibold leading-snug text-[var(--color-text-primary)]">
                    {item.title}
                  </p>
                  {item.subtitle ? (
                    <p className="mt-0.5 truncate text-[10px] text-[#6B7280]">
                      {item.subtitle}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
