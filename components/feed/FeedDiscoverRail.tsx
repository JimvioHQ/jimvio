"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Flame, Pin } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { CommunityLetterAvatar } from "@/components/community/community-letter-avatar";
import { CommunityAvatarImage, CommunityCoverImage } from "@/components/community/community-media";
import { safeMediaUrl } from "@/lib/media/optimize-url";

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
  is_free?: boolean;
  monthly_price?: number | null;
  currency?: string | null;
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
  memberCount,
  isFree,
  monthlyPrice,
  currency,
}: {
  href: string;
  name: string;
  tagline?: string | null;
  category?: string | null;
  cover?: string | null;
  logo?: string | null;
  verified?: boolean;
  memberCount?: number;
  isFree?: boolean;
  monthlyPrice?: number | null;
  currency?: string | null;
}) {
  // Prefer cover, then logo — avoid letter placeholders when any real image exists.
  const heroSrc = cover || logo || null;
  const coverSrc = safeMediaUrl(heroSrc, 320);
  const logoSrc = safeMediaUrl(logo, 96);
  const description = communityTagline({ tagline, category, name });
  const members =
    typeof memberCount === "number" && Number.isFinite(memberCount)
      ? formatNumber(memberCount)
      : null;
  const price =
    isFree === false
      ? (() => {
          const n = Number(monthlyPrice);
          if (!Number.isFinite(n) || n <= 0) return "Paid";
          const symbol = (currency || "USD").toUpperCase() === "USD" ? "$" : `${currency} `;
          return `${symbol}${Math.round(n)}/mo`;
        })()
      : null;

  return (
    <article
      className={cn(
        "group flex w-[172px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]",
        "shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-[transform,box-shadow,border-color] duration-200 motion-reduce:transition-none",
        "hover:-translate-y-0.5 hover:border-[#FF5A1F]/35 hover:shadow-md active:scale-[0.98] motion-reduce:active:scale-100"
      )}
    >
      <Link href={href} className="relative flex flex-col">
        <div className="relative h-[88px] w-full bg-[var(--color-surface-secondary)]">
          {coverSrc ? (
            <CommunityCoverImage
              name={name}
              src={heroSrc}
              sizes="172px"
              imageClassName="transition duration-300 group-hover:scale-105"
            />
          ) : (
            <CommunityLetterAvatar
              name={name}
              className="absolute inset-0 bg-[#FFF1EB]"
              textClassName="text-3xl font-black text-[#fd5000]/80"
            />
          )}
          {price ? (
            <span className="absolute right-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              {price}
            </span>
          ) : null}
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
          {members ? (
            <p className="mt-1.5 text-[11px] font-medium tabular-nums text-[var(--color-text-secondary)]">
              {members} members
            </p>
          ) : null}
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
  const [pins, setPins] = useState<PinnedRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch("/api/c/hub/discover", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/c/pins", { cache: "no-store" }).then((r) =>
        r.status === 401 ? null : r.ok ? r.json() : null
      ),
    ])
      .then(([discover, pinPayload]) => {
        if (cancelled) return;
        if (discover) {
          // Prefer discover payload even when empty — never fall back to
          // SSR editorial seed cards after honesty filters clear the rail.
          setData({
            communities: Array.isArray(discover.communities)
              ? discover.communities
              : [],
          });
        }
        setPins(pinPayload?.pins ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const communities = data?.communities ?? [];
  const hasAny = pins.length > 0 || communities.length > 0;
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
                memberCount={community.member_count}
                isFree={community.is_free}
                monthlyPrice={community.monthly_price}
                currency={community.currency}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
