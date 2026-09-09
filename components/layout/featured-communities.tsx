"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { cn, fmtCount } from "@/lib/utils";
import { safeMediaUrl } from "@/lib/media/optimize-url";
import {
  defaultShowcaseVisibleCount,
  HomepageShowcaseRail,
} from "@/components/layout/homepage-showcase-rail";
import { RevealBlock, RevealItem, SectionReveal } from "@/components/motion/section-reveal";

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

function FeaturedCommunityCard({
  community,
  index,
}: {
  community: FeaturedCommunityRow;
  index: number;
}) {
  const tone = categoryTone(community.category, community.name);
  const { hero, avatar } = communityImages(community);
  const heroSrc = safeMediaUrl(hero, 720);
  const avatarSrc = safeMediaUrl(avatar, 96);
  const tagline = community.tagline?.trim() || null;
  const href = `/communities/${community.slug}`;
  const members = community.member_count ?? 0;

  return (
    <RevealItem index={index + 1} className="h-full">
      <Link
        href={href}
        title={community.name}
        className={cn(
          "group flex h-full min-h-[300px] flex-col overflow-hidden rounded-[24px]",
          "border border-[var(--color-border)] bg-white",
          "shadow-[0_2px_10px_rgba(17,24,39,0.04),0_1px_2px_rgba(17,24,39,0.03)]",
          "transition-[transform,border-color] duration-200 ease-out",
          "hover:-translate-y-[2px] hover:border-[var(--color-border-strong)]",
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
              className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              className="flex size-full items-end p-4"
              style={{
                background: `linear-gradient(160deg, ${tone.bg} 0%, #F8FAFC 70%)`,
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
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        <div className="relative flex flex-1 flex-col px-4 pb-4 pt-0">
          <span className="relative z-[1] -mt-7 mb-3 grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-[var(--color-surface-secondary)] shadow-[0_4px_14px_rgba(17,24,39,0.12)]">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- community CDN / Cloudinary
              <img
                src={avatarSrc}
                alt=""
                width={56}
                height={56}
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <Users className="size-5" style={{ color: tone.color }} strokeWidth={1.75} />
            )}
          </span>

          <h3 className="text-[15px] font-bold leading-snug tracking-[-0.02em] text-[#111827] transition-colors group-hover:text-[#FF5A1F] dark:text-[var(--color-text-primary)] sm:text-[16px]">
            <span className="line-clamp-2">{community.name}</span>
          </h3>

          {community.category ? (
            <p
              className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
              style={{ color: tone.color }}
            >
              {community.category}
            </p>
          ) : null}

          {tagline ? (
            <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
              {tagline}
            </p>
          ) : null}

          <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-muted)]">
            <Users className="size-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
            <span className="tabular-nums">{fmtCount(members)}</span> members
          </p>

          <span
            className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-3 text-[13px] font-bold sm:text-[14px]"
            style={{ color: ORANGE }}
          >
            Join Community
            <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-[3px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </span>
        </div>
      </Link>
    </RevealItem>
  );
}

export function FeaturedCommunities({
  communities = [],
  loadError = false,
}: {
  communities: FeaturedCommunityRow[];
  loadError?: boolean;
}) {
  if (loadError) {
    return (
      <section className="bg-[#F8FAFC] py-12 sm:py-16">
        <div className={shell}>
          <h2 className="text-[clamp(1.375rem,3vw,1.75rem)] font-black tracking-[-0.03em] text-[#111827]">
            Featured Communities
          </h2>
          <p className="mt-3 text-[14px] font-medium text-[var(--color-text-muted)]">
            Couldn’t load communities. Retry.
          </p>
        </div>
      </section>
    );
  }

  if (!communities.length) return null;

  return (
    <SectionReveal className="bg-[#F8FAFC] py-12 sm:py-16 lg:py-[4.5rem]">
      <div className={shell}>
        <RevealBlock index={0} className="mb-7 flex items-end justify-between gap-3 sm:mb-8">
          <div>
            <h2 className="text-[clamp(1.375rem,3vw,1.75rem)] font-black tracking-[-0.03em] text-[#111827] dark:text-[var(--color-text-primary)]">
              Featured Communities
            </h2>
            <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)] sm:text-[14px]">
              Real communities building together on Jimvio
            </p>
          </div>
          <Link
            href="/communities"
            className="group inline-flex min-h-11 shrink-0 items-center gap-1 text-[12px] font-bold sm:text-[13px]"
            style={{ color: ORANGE }}
          >
            Explore All{" "}
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-[3px] motion-reduce:group-hover:translate-x-0" />
          </Link>
        </RevealBlock>
        <HomepageShowcaseRail
          ariaLabel="Featured communities"
          gapPx={16}
          getVisibleCount={defaultShowcaseVisibleCount}
        >
          {communities.map((community, index) => (
            <FeaturedCommunityCard key={community.id} community={community} index={index} />
          ))}
        </HomepageShowcaseRail>
      </div>
    </SectionReveal>
  );
}
