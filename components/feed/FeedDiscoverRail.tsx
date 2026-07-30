"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Flame, Hash, Pin, Radio, Sparkles, Users } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { CommunityLetterAvatar } from "@/components/community/community-letter-avatar";
import { safeMediaUrl } from "@/lib/media/optimize-url";

type LiveItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  image?: string | null;
  badge?: string;
};

type TrendingCommunity = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  cover_image: string | null;
  avatar_url: string | null;
  member_count: number;
  online_members: number;
  trending_score: number;
  verified: boolean;
  href: string;
  join_href: string;
};

type RecommendedHit = {
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
  imageUrl?: string | null;
  score?: number;
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
    member_count?: number | null;
    category?: string | null;
  } | null;
};

type DiscoverPayload = {
  communities?: TrendingCommunity[];
  live?: LiveItem[];
};

function CommunityMiniCard({
  href,
  joinHref,
  name,
  category,
  cover,
  logo,
  memberCount,
  onlineMembers,
  verified,
}: {
  href: string;
  joinHref?: string;
  name: string;
  category?: string | null;
  cover?: string | null;
  logo?: string | null;
  memberCount?: number;
  onlineMembers?: number;
  verified?: boolean;
}) {
  const coverSrc = safeMediaUrl(cover, 320);
  const logoSrc = safeMediaUrl(logo, 96);
  return (
    <article
      className={cn(
        "group flex w-[168px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#F3F4F6] bg-[#F9FAFB]",
        "transition hover:-translate-y-0.5 hover:border-[#fd5000]/35 hover:shadow-md"
      )}
    >
      <Link href={href} className="relative block">
        <div className="relative h-[72px] w-full bg-[#EEE]">
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt=""
              fill
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="168px"
              loading="lazy"
              unoptimized
            />
          ) : (
            <CommunityLetterAvatar
              name={name}
              className="absolute inset-0 bg-[#FFF1EB]"
              textClassName="text-3xl font-black text-[#fd5000]/80"
            />
          )}
          {category ? (
            <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
              {category}
            </span>
          ) : null}
        </div>
        <div className="relative px-2.5">
          <div className="absolute -top-4 left-2.5 h-8 w-8 overflow-hidden rounded-lg border-2 border-[#F9FAFB] bg-white shadow-sm">
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt=""
                width={32}
                height={32}
                className="h-full w-full object-cover"
                loading="lazy"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#FFF1EB] text-[11px] font-bold text-[#fd5000]">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="px-2.5 pb-2 pt-5">
          <div className="flex items-start gap-1">
            <p className="line-clamp-2 min-w-0 flex-1 text-[12px] font-semibold leading-snug text-[#111827]">
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
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-[#6B7280]">
            {typeof memberCount === "number" ? (
              <span className="inline-flex items-center gap-0.5">
                <Users className="h-3 w-3" />
                {formatNumber(memberCount)}
              </span>
            ) : null}
            {onlineMembers && onlineMembers > 0 ? (
              <>
                <span aria-hidden className="text-[#D1D5DB]">
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {formatNumber(onlineMembers)} online
                </span>
              </>
            ) : null}
          </div>
        </div>
      </Link>
      {joinHref ? (
        <div className="mt-auto border-t border-[#F3F4F6] px-2.5 py-2">
          <Link
            href={joinHref}
            className="block h-7 rounded-lg bg-[#fd5000] text-center text-[11px] font-semibold leading-7 text-white transition hover:bg-[#e44800]"
          >
            Join
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function FeedDiscoverRail() {
  const [data, setData] = useState<DiscoverPayload | null>(null);
  const [recommended, setRecommended] = useState<RecommendedHit[]>([]);
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [pins, setPins] = useState<PinnedRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch("/api/c/hub/discover", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/discover/recommendations?entity=community&limit=8", {
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/c/hub/topics?limit=12", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/c/pins", { cache: "no-store" }).then((r) =>
        r.status === 401 ? null : r.ok ? r.json() : null
      ),
    ])
      .then(([discover, reco, topicPayload, pinPayload]) => {
        if (cancelled) return;
        if (discover) setData(discover);
        const shelf = reco?.shelves?.find?.(
          (s: { entityType?: string }) => s.entityType === "community"
        );
        setRecommended(shelf?.items ?? []);
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
    recommended.length > 0 ||
    communities.length > 0 ||
    topics.length > 0 ||
    live.length > 0;
  if (!hasAny) return null;

  return (
    <div className="space-y-3">
      {pins.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[#E8EAED] bg-white/90 shadow-[0_1px_2px_rgba(17,24,39,0.04)] backdrop-blur">
          <div className="flex items-center gap-2 border-b border-[#F3F4F6] px-4 py-2.5">
            <Pin className="h-4 w-4 text-[#fd5000]" />
            <h2 className="text-[13px] font-bold text-[#111827]">Pinned</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-hide">
            {pins.map((pin) => {
              const c = pin.community;
              if (!c) return null;
              return (
                <CommunityMiniCard
                  key={pin.community_id}
                  href={`/communities/${c.slug}`}
                  name={c.name}
                  category={c.category}
                  logo={c.avatar_url}
                  memberCount={c.member_count ?? undefined}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {recommended.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[#E8EAED] bg-white/90 shadow-[0_1px_2px_rgba(17,24,39,0.04)] backdrop-blur">
          <div className="flex items-center gap-2 border-b border-[#F3F4F6] px-4 py-2.5">
            <Sparkles className="h-4 w-4 text-[#fd5000]" />
            <h2 className="text-[13px] font-bold text-[#111827]">
              Recommended for You
            </h2>
          </div>
          <div className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-hide">
            {recommended.slice(0, 8).map((item) => (
              <CommunityMiniCard
                key={item.id}
                href={item.href}
                joinHref={`${item.href}/subscribe`}
                name={item.title}
                logo={item.imageUrl}
              />
            ))}
          </div>
        </section>
      ) : null}

      {communities.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[#E8EAED] bg-white/90 shadow-[0_1px_2px_rgba(17,24,39,0.04)] backdrop-blur">
          <div className="flex items-center gap-2 border-b border-[#F3F4F6] px-4 py-2.5">
            <Flame className="h-4 w-4 text-[#fd5000]" />
            <h2 className="text-[13px] font-bold text-[#111827]">
              🔥 Trending Communities
            </h2>
          </div>
          <div className="flex gap-2.5 overflow-x-auto px-3 py-3 scrollbar-hide">
            {communities.slice(0, 8).map((community) => (
              <CommunityMiniCard
                key={community.id}
                href={community.href}
                joinHref={community.join_href}
                name={community.name}
                category={community.category}
                cover={community.cover_image}
                logo={community.avatar_url}
                memberCount={community.member_count}
                onlineMembers={community.online_members}
                verified={community.verified}
              />
            ))}
          </div>
        </section>
      ) : null}

      {topics.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[#E8EAED] bg-white/90 shadow-[0_1px_2px_rgba(17,24,39,0.04)] backdrop-blur">
          <div className="flex items-center gap-2 border-b border-[#F3F4F6] px-4 py-2.5">
            <Hash className="h-4 w-4 text-[#fd5000]" />
            <h2 className="text-[13px] font-bold text-[#111827]">
              Trending Topics
            </h2>
          </div>
          <div className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-hide">
            {topics.map((topic) => (
              <Link
                key={topic.topic}
                href={`/communities/explore?search=${encodeURIComponent(`#${topic.topic}`)}`}
                className={cn(
                  "w-[148px] shrink-0 rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] p-3",
                  "transition hover:-translate-y-0.5 hover:border-[#fd5000]/35 hover:shadow-md"
                )}
              >
                <p className="truncate text-[13px] font-bold text-[#111827]">
                  #{topic.topic}
                </p>
                <p className="mt-1 text-[10px] text-[#6B7280]">
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
        <section className="overflow-hidden rounded-2xl border border-[#E8EAED] bg-white/90 shadow-[0_1px_2px_rgba(17,24,39,0.04)] backdrop-blur">
          <div className="flex items-center gap-2 border-b border-[#F3F4F6] px-4 py-2.5">
            <Radio className="h-4 w-4 text-[#fd5000]" />
            <h2 className="text-[13px] font-bold text-[#111827]">Live now</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-hide">
            {live.slice(0, 8).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "group flex w-[148px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#F3F4F6] bg-[#F9FAFB]",
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
                  <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[#111827]">
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
