"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { cn, fmtCount } from "@/lib/utils";
import { safeMediaUrl } from "@/lib/media/optimize-url";
import {
  defaultShowcaseVisibleCount,
  HomepageShowcaseRail,
} from "@/components/layout/homepage-showcase-rail";

const ORANGE = "#FF5A1F";
const GREEN = "#16a34a";
const PURPLE = "#7c3aed";
const BLUE = "#2563eb";
const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

export type FeaturedCommunityRow = {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  member_count?: number | null;
  category?: string | null;
  avatar_url?: string | null;
  cover_image?: string | null;
  image_url?: string | null;
  profiles?:
    | { full_name?: string | null; avatar_url?: string | null }
    | { full_name?: string | null; avatar_url?: string | null }[]
    | null;
};

const CATEGORY_TONE: Record<string, { color: string; bg: string }> = {
  affiliate: { color: GREEN, bg: "#f0fdf4" },
  ecommerce: { color: BLUE, bg: "#eff6ff" },
  creator: { color: PURPLE, bg: "#f5f3ff" },
  ugc: { color: PURPLE, bg: "#f5f3ff" },
  default: { color: ORANGE, bg: "#fff4ed" },
};

function categoryTone(category?: string | null, name?: string) {
  const key = `${category ?? ""} ${name ?? ""}`.toLowerCase();
  if (key.includes("affiliate")) return CATEGORY_TONE.affiliate;
  if (key.includes("ecom") || key.includes("seller")) return CATEGORY_TONE.ecommerce;
  if (key.includes("ugc") || key.includes("creator")) return CATEGORY_TONE.creator;
  return CATEGORY_TONE.default;
}

function communityImages(c: FeaturedCommunityRow) {
  const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
  const avatar = c.avatar_url ?? c.image_url ?? profile?.avatar_url ?? null;
  const cover = c.cover_image ?? null;
  return {
    hero: cover ?? avatar,
    avatar,
  };
}

function FeaturedCommunityCard({ community }: { community: FeaturedCommunityRow }) {
  const tone = categoryTone(community.category, community.name);
  const { hero, avatar } = communityImages(community);
  const heroSrc = safeMediaUrl(hero, 720);
  const avatarSrc = safeMediaUrl(avatar, 96);
  const tagline = community.tagline?.trim() || "Connect with people in your niche.";
  const href = `/communities/${community.slug}`;

  return (
    <Link
      href={href}
      title={community.name}
      className={cn(
        "group flex h-full min-h-[292px] flex-col overflow-hidden rounded-[20px]",
        "border border-[var(--color-border)] bg-[var(--color-surface)]",
        "shadow-[0_2px_10px_rgba(17,24,39,0.04)]",
        "transition-[transform,box-shadow,border-color] duration-200 ease-out",
        "hover:-translate-y-1 hover:border-[var(--color-border-strong)]",
        "hover:shadow-[0_14px_32px_rgba(17,24,39,0.08)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
        "active:translate-y-0 active:scale-[0.995]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[var(--color-surface-secondary)]">
        {heroSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- community CDN / Cloudinary
          <img
            src={heroSrc}
            alt={community.name}
            width={720}
            height={450}
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="flex size-full items-end p-4"
            style={{
              background: `linear-gradient(160deg, ${tone.bg} 0%, var(--color-surface-secondary) 70%)`,
            }}
            aria-hidden
          >
            <span
              className="grid size-10 place-items-center rounded-xl"
              style={{ background: `${tone.color}18`, color: tone.color }}
            >
              <Users className="size-5" strokeWidth={1.75} />
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />

        {community.category ? (
          <span className="absolute left-2.5 top-2.5 max-w-[70%] truncate rounded-full bg-white/92 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#111827] shadow-sm">
            {community.category}
          </span>
        ) : null}

        <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          {fmtCount(community.member_count ?? 0)} members
        </span>
      </div>

      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
        <div className="flex items-start gap-2.5">
          <span className="relative -mt-7 grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-[var(--color-surface)] bg-[var(--color-surface-secondary)] shadow-sm">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- community CDN / Cloudinary
              <img
                src={avatarSrc}
                alt=""
                width={40}
                height={40}
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <Users className="size-4" style={{ color: tone.color }} strokeWidth={1.75} />
            )}
          </span>
          <h3 className="min-h-[2.5em] flex-1 pt-1 text-[14px] font-bold leading-snug tracking-[-0.015em] text-[#111827] transition-colors group-hover:text-[#FF5A1F] dark:text-[var(--color-text-primary)]">
            <span className="line-clamp-2">{community.name}</span>
          </h3>
        </div>

        <p className="mt-2 line-clamp-2 min-h-[2.4em] text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
          {tagline}
        </p>

        <span
          className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-3 text-[13px] font-bold"
          style={{ color: ORANGE }}
        >
          Join Community
          <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        </span>
      </div>
    </Link>
  );
}

export function FeaturedCommunities({
  communities = [],
}: {
  communities: FeaturedCommunityRow[];
}) {
  if (!communities.length) return null;

  return (
    <section className="bg-[var(--color-surface-secondary)] py-12 sm:py-16">
      <div className={shell}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-[20px] font-black tracking-tight text-[var(--color-text-primary)] sm:text-[26px]">
            Featured Communities
          </h2>
          <Link
            href="/communities"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[12px] font-bold sm:text-[13px]"
            style={{ color: ORANGE }}
          >
            Explore All <ArrowRight className="size-3" />
          </Link>
        </div>
        <HomepageShowcaseRail
          ariaLabel="Featured communities"
          gapPx={16}
          getVisibleCount={defaultShowcaseVisibleCount}
        >
          {communities.map((community) => (
            <FeaturedCommunityCard key={community.id} community={community} />
          ))}
        </HomepageShowcaseRail>
      </div>
    </section>
  );
}
