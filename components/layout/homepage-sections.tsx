"use client";

import { useState, useMemo, useEffect, Fragment, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  ShoppingBag, Store, DollarSign, Megaphone, Users, Package,
  ArrowRight, Check, ShieldCheck, Globe, Sparkles,
  Bot, Wand2, Search, Clapperboard, Share2, Star,
  ChevronDown, TrendingUp, Wallet, Target, BarChart3, LineChart,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCurrency } from "@/context/CurrencyContext";
import { getImage, fmtCount, cn } from "@/lib/utils";
import { DEFAULT_PROFILE_IMAGE, resolveProfileImage } from "@/lib/profile-image";
import type { SharedCampaignRow } from "@/components/ugc/campaign-card-shared";
import { UGCPremiumCampaignCard } from "@/components/ugc/workspace/UGCPremiumCampaignCard";
import type { UGCCampaign, UGCCampaignType, UGCPaymentModel, UGCCampaignStatus } from "@/types/ugc";
import { type WorldMapPin } from "@/components/ui/world-map";
import { TakeJimvioDevicesSkeleton } from "@/components/layout/take-jimvio-phones-client";
import { Slider } from "@/components/ui/slider";
import {
  HomepageShowcaseRail,
  ugcShowcaseVisibleCount,
} from "@/components/layout/homepage-showcase-rail";
import {
  AnimatedPlatformStatValue,
  PlatformStatsRotatingBadge,
} from "@/components/platform/platform-stats-provider";
import { HomepageTrendingProductsClient } from "@/components/layout/homepage-trending-products-client";
import type { TrendingProductCardProduct } from "@/components/marketplace/new/TrendingProductsClient";
import { PLATFORM_STATS } from "@/lib/platform-stats";
import { safeMediaUrl } from "@/lib/media/optimize-url";
import { RevealBlock, RevealItem, SectionReveal } from "@/components/motion/section-reveal";
import { jimvioStagger } from "@/lib/motion/jimvio-motion";

const TakeJimvioPhonesClient = dynamic(
  () =>
    import("@/components/layout/take-jimvio-phones-client").then(
      (m) => m.TakeJimvioPhonesClient
    ),
  { ssr: false, loading: () => <TakeJimvioDevicesSkeleton /> }
);

/** Defer dotted-map (~1MB data-URI) out of SSR HTML — identical UI after hydrate. */
const WorldMap = dynamic(
  () => import("@/components/ui/world-map").then((m) => m.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-[var(--color-surface-secondary)]"
        aria-hidden
      />
    ),
  }
);

/* ─── Design tokens (match mockup) ─── */
const ORANGE = "#fd5000";
const GREEN = "#16a34a";
const PURPLE = "#7c3aed";
const BLUE = "#2563eb";
const YELLOW = "#ca8a04";

const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";
const section = "bg-[var(--color-surface)]";
const sectionAlt = "bg-[var(--color-surface-secondary)]";
const cardBase =
  "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)]";
const textPrimary = "text-[var(--color-text-primary)]";
const textMuted = "text-[var(--color-text-muted)]";
const textSecondary = "text-[var(--color-text-secondary)]";

function iconTintStyle(color: string) {
  return { background: `${color}18`, color };
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-8 text-center">
      <h2 className={`text-[26px] font-black tracking-tight sm:text-[30px] ${textPrimary}`}>{children}</h2>
      {sub && <p className={`mx-auto mt-2 max-w-xl text-sm ${textMuted}`}>{sub}</p>}
    </div>
  );
}

/** Single-row horizontal showcase on all breakpoints. */
function HomepageShowcaseLayout({
  children,
  ariaLabel = "Featured items",
}: {
  children: ReactNode[];
  cardMinWidth?: number;
  gap?: string;
  desktopCols?: string;
  ariaLabel?: string;
}) {
  if (!children.length) return null;
  return (
    <HomepageShowcaseRail ariaLabel={ariaLabel} gapPx={14} getVisibleCount={ugcShowcaseVisibleCount}>
      {children}
    </HomepageShowcaseRail>
  );
}

/* ═══ 1. Action Hub ═══ */
export { WhatToDoToday } from "./action-hub";

/* ═══ 2. Trusted strip ═══ */
const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop",
];

/** ISO countries Jimvio serves — real flags via flagcdn.com */
const FEATURED_COUNTRIES = [
  { code: "us", name: "United States" },
  { code: "gb", name: "United Kingdom" },
  { code: "ng", name: "Nigeria" },
  { code: "ke", name: "Kenya" },
  { code: "za", name: "South Africa" },
  { code: "gh", name: "Ghana" },
  { code: "in", name: "India" },
  { code: "br", name: "Brazil" },
  { code: "fr", name: "France" },
  { code: "de", name: "Germany" },
] as const;

function flagSrc(code: string, size: 20 | 40 | 80 = 40) {
  return `https://flagcdn.com/w${size}/${code}.png`;
}

export function TrustedStrip() {
  return (
    <SectionReveal
      as="div"
      className="border-y border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
      threshold={0.2}
    >
      <div className={`${shell} flex flex-wrap items-center justify-center gap-4 py-4 sm:gap-6`}>
        <RevealBlock index={0} className="flex -space-x-2.5">
          {AVATARS.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              width={36}
              height={36}
              loading="lazy"
              decoding="async"
              className="size-8 rounded-full border-2 border-[var(--color-surface)] object-cover sm:size-9"
            />
          ))}
        </RevealBlock>
        <RevealBlock index={1}>
          <PlatformStatsRotatingBadge showLiveDot={false} className="shadow-none" />
        </RevealBlock>
        <RevealBlock index={2} className="flex items-center gap-1">
          {FEATURED_COUNTRIES.map((c) => (
            <img
              key={c.code}
              src={flagSrc(c.code, 40)}
              srcSet={`${flagSrc(c.code, 80)} 2x`}
              alt={c.name}
              title={c.name}
              width={28}
              height={28}
              loading="lazy"
              decoding="async"
              className="size-7 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] object-cover shadow-sm"
            />
          ))}
          <span className="ml-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-neutral-700">
            +{PLATFORM_STATS.countries - FEATURED_COUNTRIES.length}
          </span>
        </RevealBlock>
      </div>
    </SectionReveal>
  );
}

/* ═══ 3. Platform overview bar ═══ */
const OVERVIEW = [
  { icon: ShoppingBag, title: "Buy Products", desc: "Verified suppliers & secure checkout", color: ORANGE },
  { icon: Store, title: "Sell Products", desc: "Open your store in minutes", color: BLUE },
  { icon: DollarSign, title: "Earn Commissions", desc: "Up to 30% per sale", color: GREEN },
  { icon: Megaphone, title: "Create Campaigns", desc: "Launch and manage UGC", color: PURPLE },
  { icon: Target, title: "Join Campaigns", desc: "Get paid per view", color: BLUE },
  { icon: Users, title: "Build Communities", desc: "Monetize your audience", color: YELLOW },
];

export function PlatformOverviewBar() {
  return (
    <SectionReveal className={`${section} py-8 sm:py-10`}>
      <div className={shell}>
        <RevealBlock index={0}>
          <SectionTitle>Everything You Need In One Platform</SectionTitle>
        </RevealBlock>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {OVERVIEW.map((o, i) => (
            <RevealItem key={o.title} index={i + 1} className="flex items-start gap-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:-translate-y-0.5"
                style={{ background: `${o.color}14`, color: o.color }}
              >
                <o.icon className="size-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[var(--color-text-primary)]">{o.title}</div>
                <div className="text-[11px] leading-snug text-[var(--color-text-muted)]">{o.desc}</div>
              </div>
            </RevealItem>
          ))}
        </div>
      </div>
    </SectionReveal>
  );
}

/* ═══ 4. Choose your journey ═══ */
export { ChooseYourJourney } from "./choose-your-journey";

/* ═══ 5. How Jimvio works ═══ */
const STEPS = [
  {
    step: "01",
    title: "Look around",
    desc: "Check products, open campaigns, and skim communities before you pick a lane.",
    detail: "Marketplace, UGC, and groups live in one app.",
    icon: Search,
    color: ORANGE,
  },
  {
    step: "02",
    title: "Promote & earn",
    desc: "List stock, drop affiliate links, or ship content for a live brief.",
    detail: "Payouts hit your Jimvio wallet.",
    icon: Share2,
    color: GREEN,
  },
  {
    step: "03",
    title: "See what sticks",
    desc: "Watch which links and posts actually convert, then do more of that.",
    detail: "Sales and clicks in one dashboard.",
    icon: BarChart3,
    color: BLUE,
  },
] as const;

function HowJimvioConnector({
  filled,
  fromColor,
  toColor,
  id,
  variant = "horizontal",
}: {
  filled: boolean;
  fromColor: string;
  toColor: string;
  id: string;
  variant?: "horizontal" | "vertical";
}) {
  const strokeColor = filled ? `url(#${id})` : "var(--color-border)";
  const opacity = filled ? 1 : 0.5;

  if (variant === "vertical") {
    return (
      <div className="flex justify-center py-1 md:hidden" aria-hidden>
        <svg
          viewBox="0 0 36 100"
          className="h-14 w-9"
          fill="none"
          style={{ opacity }}
        >
          {filled && (
            <defs>
              <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={fromColor} />
                <stop offset="100%" stopColor={toColor} />
              </linearGradient>
            </defs>
          )}
          <path d="M 6 8 H 30" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 18 8 V 92" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 6 92 H 30" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="hidden min-w-[52px] max-w-[148px] flex-1 items-center justify-center self-center px-1 md:flex"
      aria-hidden
    >
      <svg
        viewBox="0 0 100 36"
        className="h-9 w-full"
        preserveAspectRatio="none"
        fill="none"
        style={{ opacity }}
      >
        {filled && (
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={fromColor} />
              <stop offset="100%" stopColor={toColor} />
            </linearGradient>
          </defs>
        )}
        {/* Top rail */}
        <path d="M 8 6 H 92" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        {/* Left drop */}
        <path d="M 8 6 V 28" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        {/* Right drop */}
        <path d="M 92 6 V 28" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        {/* Feet */}
        <path d="M 3 28 H 13" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 87 28 H 97" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function HowJimvioWorks() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(
      () => setActive((current) => (current + 1) % STEPS.length),
      4200,
    );
    return () => clearInterval(timer);
  }, [paused]);

  const focusStep = (index: number) => {
    setActive(index);
    setPaused(true);
  };

  return (
    <SectionReveal className={`${sectionAlt} py-10 sm:py-14`}>
      <div className={shell}>
        <RevealBlock index={0}>
          <SectionTitle sub="Roughly how it goes — tap a step if you want the detail.">
            How Jimvio works
          </SectionTitle>
        </RevealBlock>

        {/* Showcase cards */}
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5"
          onMouseLeave={() => setPaused(false)}
        >
          {STEPS.map((s, index) => (
            <Fragment key={s.step}>
              {index > 0 && (
                <HowJimvioConnector
                  id={`jimvio-connector-v-${index}`}
                  filled={index <= active}
                  fromColor={STEPS[index - 1].color}
                  toColor={s.color}
                  variant="vertical"
                />
              )}
              <article
                role="button"
                tabIndex={0}
                onClick={() => focusStep(index)}
                onMouseEnter={() => focusStep(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    focusStep(index);
                  }
                }}
                className={cn(
                  "jimvio-reveal-item relative flex h-full cursor-pointer flex-col rounded-2xl border bg-[var(--color-surface)] p-4 transition-all duration-300 sm:p-5",
                  active === index
                    ? "-translate-y-0.5 border-transparent shadow-[0_14px_36px_rgba(0,0,0,0.08)]"
                    : "border-[var(--color-border)] opacity-75 hover:opacity-100",
                )}
                style={
                  {
                    ["--reveal-i" as string]: index + 1,
                    ["--reveal-stagger" as string]: `${jimvioStagger.default}ms`,
                    ...(active === index
                      ? {
                          boxShadow: `0 14px 36px ${s.color}20`,
                          borderColor: `${s.color}35`,
                        }
                      : {}),
                  } as CSSProperties
                }
              >
                <span
                  className={cn(
                    "absolute left-0 top-5 bottom-5 w-1 rounded-r-full transition-all duration-300",
                    active === index ? "opacity-100" : "opacity-35",
                  )}
                  style={{ background: s.color }}
                  aria-hidden
                />

                <div className="mb-4 flex items-center justify-between gap-3 pl-2.5">
                  <span
                    className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold tracking-widest"
                    style={{ color: s.color }}
                  >
                    {s.step}
                  </span>
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-xl transition-transform duration-300",
                      active === index && "scale-110",
                    )}
                    style={{ background: `${s.color}12`, color: s.color }}
                  >
                    <s.icon className="size-[18px]" strokeWidth={2.2} />
                  </span>
                </div>

                <h3 className="pl-2.5 text-[17px] font-bold leading-tight text-[var(--color-text-primary)] sm:text-[18px]">
                  {s.title}
                </h3>
                <p
                  className={cn(
                    "mt-2 flex-1 pl-2.5 text-[13px] leading-relaxed transition-colors duration-300",
                    active === index
                      ? "text-[var(--color-text-secondary)]"
                      : "text-[var(--color-text-muted)]",
                  )}
                >
                  {s.desc}
                </p>

                <p
                  className={cn(
                    "mt-4 border-t pt-3 pl-2.5 text-[11px] font-medium leading-snug transition-opacity duration-300 sm:text-[12px]",
                    active === index ? "opacity-100" : "opacity-70",
                  )}
                  style={{ borderColor: `${s.color}22`, color: s.color }}
                >
                  {s.detail}
                </p>
              </article>
            </Fragment>
          ))}
        </div>

        <p className="mt-5 text-center text-[11px] text-[var(--color-text-muted)] sm:text-[12px]">
          {paused ? "Auto-play paused" : "Showcase auto-advances every few seconds"}
          {" · "}
          <button
            type="button"
            onClick={() => {
              setPaused((p) => !p);
              if (paused) setActive(0);
            }}
            className="font-semibold text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
          >
            {paused ? "Resume showcase" : "Pause"}
          </button>
        </p>
      </div>
    </SectionReveal>
  );
}

/* ═══ 6. Trending Products ═══ */
export function TrendingProductsRow({
  products = [],
  flashDeals,
  total,
  loadError = false,
}: {
  products?: TrendingProductCardProduct[];
  flashDeals?: TrendingProductCardProduct[];
  total?: number;
  loadError?: boolean;
}) {
  if (loadError) {
    return (
      <section className="bg-[#F8FAFC] py-12 sm:py-16">
        <div className={shell}>
          <h2 className="text-[clamp(1.375rem,3vw,1.75rem)] font-black tracking-[-0.03em] text-[#111827]">
            Trending Products
          </h2>
          <p className="mt-3 text-[14px] font-medium text-[var(--color-text-muted)]">
            Couldn’t load products. Retry.
          </p>
        </div>
      </section>
    );
  }

  const trending = products.length > 0 ? products : flashDeals ?? [];
  if (!trending.length) return null;

  return (
    <SectionReveal className="bg-[#F8FAFC] py-12 sm:py-16 lg:py-[4.5rem]">
      <div className={shell}>
        <RevealBlock index={0} className="mb-7 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
          <div>
            <h2 className="text-[clamp(1.375rem,3vw,1.75rem)] font-black tracking-[-0.03em] text-[#111827] dark:text-[var(--color-text-primary)]">
              Trending Products
            </h2>
            <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)] sm:text-[14px]">
              Top selling products right now
            </p>
          </div>
          <Link
            href="/marketplace"
            className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[12px] font-bold sm:text-[13px]"
            style={{ color: "#FF5A1F" }}
          >
            View all{" "}
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-[3px] motion-reduce:group-hover:translate-x-0" />
          </Link>
        </RevealBlock>
        <RevealItem index={1}>
          <HomepageTrendingProductsClient
            initialProducts={trending}
            initialTotal={total ?? trending.length}
          />
        </RevealItem>
      </div>
    </SectionReveal>
  );
}

/* ═══ 7. Featured UGC campaigns ═══ */
function sharedCampaignToUgcCampaign(c: SharedCampaignRow): UGCCampaign {
  const vendor = c.vendor ?? c.vendors;
  const logo = vendor?.business_logo ?? vendor?.logo_url ?? null;
  return {
    id: c.id,
    brand_id: "",
    title: c.title,
    description: null,
    campaign_type: (c.campaign_type as UGCCampaignType) || "ugc",
    payment_model: (c.payment_model as UGCPaymentModel) || "per_views",
    status: (c.status as UGCCampaignStatus) || "active",
    rate_per_1k_views: Number(c.rate_per_1k_views ?? 0),
    fixed_rate: Number(c.fixed_rate ?? 0),
    total_budget: Number(c.total_budget ?? 0),
    spent_budget: Number(c.spent_budget ?? 0),
    max_payout_per_sub: null,
    allowed_platforms: c.allowed_platforms ?? [],
    // spent/budget must match UGC Discover cards — never invent placeholders
    content_guidelines: null,
    min_duration: null,
    max_duration: null,
    required_hashtags: [],
    required_mentions: [],
    required_keywords: [],
    requires_face: false,
    submission_count: Number(c.submission_count ?? 0),
    approved_count: Number(c.approved_count ?? 0),
    total_views_tracked: 0,
    starts_at: null,
    ends_at: c.ends_at ?? null,
    music_track_url: null,
    music_artist_name: null,
    promotion_target: null,
    promotion_target_url: null,
    created_at: c.created_at ?? new Date(0).toISOString(),
    updated_at: c.created_at ?? new Date(0).toISOString(),
    media: (c.media ?? []).map((m, i) => ({
      id: `${c.id}-media-${i}`,
      campaign_id: c.id,
      type: "image" as const,
      url: m.url,
      thumbnail_url: null,
      usage: (m.usage as "banner" | "example" | "ad_creative") || "banner",
      platform_format: null,
      order_index: i,
      created_at: c.created_at ?? new Date(0).toISOString(),
    })),
    vendor: vendor
      ? {
          business_name: vendor.business_name,
          business_logo: logo,
          business_slug: vendor.business_slug,
          verification_status: (["pending", "verified", "rejected", "suspended"].includes(
            String((vendor as { verification_status?: string }).verification_status ?? ""),
          )
            ? ((vendor as { verification_status?: string }).verification_status as
                | "pending"
                | "verified"
                | "rejected"
                | "suspended")
            : null),
        }
      : undefined,
  };
}

export function FeaturedUGCCampaigns({ campaigns = [] }: { campaigns: SharedCampaignRow[] }) {
  if (!campaigns.length) return null;

  return (
    <SectionReveal className="bg-white py-12 sm:py-16 lg:py-[4.5rem]">
      <div className={shell}>
        <RevealBlock index={0} className="mb-7 flex items-end justify-between gap-3 sm:mb-8">
          <div>
            <h2 className="text-[clamp(1.375rem,3vw,1.75rem)] font-black tracking-[-0.03em] text-[#111827] dark:text-[var(--color-text-primary)]">
              Featured UGC Campaigns
            </h2>
            <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)] sm:text-[14px]">
              Paid creator opportunities live now
            </p>
          </div>
          <Link
            href="/ugc"
            className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[12px] font-bold sm:text-[13px]"
            style={{ color: "#FF5A1F" }}
          >
            Explore All{" "}
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-[3px] motion-reduce:group-hover:translate-x-0" />
          </Link>
        </RevealBlock>
        <HomepageShowcaseLayout
          ariaLabel="Featured UGC campaigns"
          cardMinWidth={188}
          desktopCols="lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          {campaigns.map((c, i) => (
            <RevealItem key={c.id} index={i + 1} className="h-full">
              <UGCPremiumCampaignCard
                campaign={sharedCampaignToUgcCampaign(c)}
                index={i}
                featured
                density="compact"
              />
            </RevealItem>
          ))}
        </HomepageShowcaseLayout>
      </div>
    </SectionReveal>
  );
}

/* ═══ 8. Featured communities ═══ */
export { FeaturedCommunities } from "./featured-communities";

/* ═══ 9. One platform opportunities ═══ */
const OPPS = [
  { title: "Marketplace", color: ORANGE, items: ["Checked suppliers", "Shipping options", "Card & wallet pay"], href: "/marketplace", cta: "Browse" },
  { title: "Affiliate program", color: GREEN, items: ["Up to 30% per sale", "Click tracking", "Wallet payouts"], href: "/affiliates", cta: "How it works" },
  { title: "Vendor center", color: BLUE, items: ["Your own storefront", "Product uploads", "Order inbox"], href: "/", cta: "Open store" },
  { title: "Brand campaigns", color: PURPLE, items: ["Post a brief", "Pick creators", "See submissions"], href: "/ugc/campaign-center/campaigns/new", cta: "Start campaign" },
  { title: "UGC campaigns", color: PURPLE, items: ["Paid per view", "Brand briefs", "Content approvals"], href: "/ugc", cta: "View open briefs" },
  { title: "Communities", color: BLUE, items: ["Free or paid", "Live rooms", "Courses & events"], href: "/communities", cta: "Find a group" },
];

export function OnePlatformOpportunities() {
  return (
    <section className={`${section} py-12 sm:py-16`}>
      <div className={shell}>
        <SectionTitle>Everything in one place</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
          {OPPS.map((o) => (
            <div key={o.title} className="flex h-full flex-col px-1 sm:px-2">
              <h3 className="mb-2 text-[14px] font-bold text-[var(--color-text-primary)] sm:mb-3 sm:text-[15px]">{o.title}</h3>
              <ul className="flex-1 space-y-1.5 sm:space-y-2">
                {o.items.map((it) => (
                  <li key={it} className="flex items-center gap-2 text-[11px] text-[var(--color-text-secondary)] sm:text-[13px]">
                    <Check className="size-3.5 shrink-0 sm:size-4" style={{ color: GREEN }} strokeWidth={3} />
                    {it}
                  </li>
                ))}
              </ul>
              <Link
                href={o.href}
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold sm:mt-4 sm:text-[12px]"
                style={{ color: o.color }}
              >
                {o.cta} <ArrowRight className="size-3" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ 10. AI growth tools ═══ */
const AI_TOOLS = [
  { icon: Search, title: "Product finder", desc: "Search the catalog and filter by what's moving.", href: "/marketplace" },
  { icon: Wand2, title: "Content drafts", desc: "Rough out captions and scripts before you post.", href: "/ugc" },
  { icon: Bot, title: "Campaign setup", desc: "Walk through budget, brief, and payout rules.", href: "/ugc/campaign-center/campaigns/new" },
  { icon: Users, title: "Creator search", desc: "Find people who already post in your category.", href: "/ugc" },
  { icon: LineChart, title: "Sales snapshot", desc: "See clicks, orders, and what's lagging.", href: "/" },
  { icon: Store, title: "Listing helper", desc: "Tidy titles, prices, and stock on your store.", href: "/" },
];

export function GrowthStack() {
  return (
    <section className={`${sectionAlt} py-12 sm:py-16`}>
      <div className={shell}>
        <SectionTitle>Tools that save you time</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {AI_TOOLS.map((t) => (
            <div key={t.title} className={`flex h-full flex-col p-4 sm:p-5 ${cardBase}`}>
              <span className="mb-3 grid size-9 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400 sm:size-10">
                <t.icon className="size-4 sm:size-5" />
              </span>
              <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] sm:text-[14px]">{t.title}</h3>
              <p className="mt-1 flex-1 text-[11px] leading-relaxed text-[var(--color-text-muted)] sm:text-[12px]">{t.desc}</p>
              <Link href={t.href} className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 sm:text-[12px]">
                Try it <ArrowRight className="size-3" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ 11. Why choose Jimvio ═══ */
const WHY = [
  { icon: ShieldCheck, title: "Checked vendors", desc: "We review suppliers before they list." },
  { icon: Wallet, title: "Wallet payouts", desc: "Earnings land in your Jimvio balance." },
  { icon: Globe, title: "Works across borders", desc: `Buyers and sellers in ${PLATFORM_STATS.countries} countries.` },
  { icon: Sparkles, title: "One login", desc: "Store, affiliates, UGC, and groups together." },
  { icon: Clapperboard, title: "Creator listings", desc: "Brands can find people to work with." },
  { icon: TrendingUp, title: "Campaign stats", desc: "See views, clicks, and what's paying off." },
];

export function WhyChooseJimvio() {
  return (
    <section className={`${section} py-12 sm:py-16`}>
      <div className={shell}>
        <SectionTitle>Why people stick with Jimvio</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {WHY.map((w) => (
            <div key={w.title} className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-orange-500/10 dark:bg-orange-500/15 sm:size-10" style={{ color: ORANGE }}>
                <w.icon className="size-4 sm:size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] sm:text-[14px]">{w.title}</h3>
                <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)] sm:text-[12px]">{w.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ 12. Global network + platform stats (two cards, mockup layout) ═══ */

const GLOBAL_MAP_PINS: WorldMapPin[] = [
  { lat: 40.71, lng: -74.01, color: PURPLE },
  { lat: 51.51, lng: -0.13, color: PURPLE },
  { lat: 48.86, lng: 2.35, color: PURPLE },
  { lat: -23.55, lng: -46.63, color: ORANGE },
  { lat: 6.52, lng: 3.38, color: ORANGE },
  { lat: -26.20, lng: 28.04, color: ORANGE },
  { lat: -1.29, lng: 36.82, color: GREEN },
  { lat: 20.59, lng: 78.96, color: GREEN },
  { lat: 25.20, lng: 55.27, color: GREEN },
  { lat: -33.87, lng: 151.21, color: BLUE },
  { lat: 35.68, lng: 139.69, color: BLUE },
];

function formatPlatformPlus(n: number, prefix = ""): string {
  if (!n || n < 1) return "—";
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2).replace(/\.00$/, "")}M+`;
  if (n >= 10_000) return `${prefix}${(n / 1000).toFixed(1).replace(/\.0$/, "")}K+`;
  if (n >= 1_000) return `${prefix}${Math.round(n / 1000)}K+`;
  return `${prefix}${n}+`;
}

export function GlobalNetworkStats({
  platform,
}: {
  platform?: { totalUsers: number; totalProducts: number; totalEarnings: number; totalVendors: number };
}) {
  const networkRows = [
    { icon: Globe, statKey: "countries" as const, label: "Countries", tint: "#dcfce7", color: GREEN },
    { icon: Users, statKey: "users" as const, label: "Users", tint: "#dcfce7", color: GREEN },
    { icon: Store, statKey: "businesses" as const, label: "Businesses", tint: "#dbeafe", color: BLUE },
    { icon: Package, statKey: "products" as const, label: "Products", tint: "#dbeafe", color: BLUE },
  ];

  const platformStats = [
    { value: formatPlatformPlus(platform?.totalEarnings ?? 0, "$"), label: "Paid out", accent: ORANGE },
    { statKey: "users" as const, label: "Users", accent: PURPLE },
    { statKey: "products" as const, label: "Products", accent: GREEN },
    { statKey: "businesses" as const, label: "Businesses", accent: BLUE },
    { statKey: "countries" as const, label: "Countries", accent: ORANGE },
  ];

  return (
    <section className={`${sectionAlt} py-12 sm:py-16`}>
      <div className={shell}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
          {/* Left card — Global Network */}
          <div className={`min-w-0 flex-1 p-6 sm:p-7 ${cardBase}`}>
            <h2 className="text-[20px] font-black text-[var(--color-text-primary)] sm:text-[22px]">Global Network</h2>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">{PLATFORM_STATS.countries} Countries Connected</p>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="w-full shrink-0 sm:w-[190px]">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-3.5">
                  {networkRows.map((row) => (
                    <div key={row.label} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-lg sm:size-9"
                        style={iconTintStyle(row.color)}
                      >
                        <row.icon className="size-3.5 sm:size-4" strokeWidth={2.2} />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                        <span className="text-[17px] font-black leading-none text-[var(--color-text-primary)] sm:text-[20px]">
                          <AnimatedPlatformStatValue statKey={row.statKey} />
                        </span>
                        <span className="text-[11px] font-medium text-[var(--color-text-muted)] sm:text-[12px]">
                          {row.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <WorldMap pins={GLOBAL_MAP_PINS} showArcs={false} className="rounded-xl" />
              </div>
            </div>
          </div>

          {/* Right card — Platform Stats (compact, content height only) */}
          <div className={`w-full self-start p-5 sm:p-6 lg:w-[min(100%,440px)] lg:shrink-0 ${cardBase}`}>
            <h2 className="text-[18px] font-black text-[var(--color-text-primary)] sm:text-[20px]">Platform Stats</h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {platformStats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-w-[68px] flex-1 flex-col items-center justify-center rounded-lg px-2 py-2.5 text-center"
                  style={{ background: `${stat.accent}18` }}
                >
                  <div className="text-[12px] font-black leading-tight tabular-nums sm:text-[13px]" style={{ color: stat.accent }}>
                    {"value" in stat ? (
                      stat.value
                    ) : (
                      <>
                        <AnimatedPlatformStatValue statKey={stat.statKey} />
                        {stat.statKey === "countries" ? "" : "+"}
                      </>
                    )}
                  </div>
                  <div className="mt-0.5 text-[9px] font-medium text-[var(--color-text-muted)]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ 13. Top creators + earnings calculator ═══ */

type TopCreatorRow = {
  id: string;
  display_name?: string;
  full_name?: string;
  profile_image?: string | null;
  avatar_url?: string | null;
  role?: string;
  earnings?: number;
  total_earnings?: number;
};

const DEMO_CREATORS: TopCreatorRow[] = [
  { id: "demo-1", display_name: "Sarah M.", role: "Affiliate Marketer", earnings: 1240 },
  { id: "demo-2", display_name: "David O.", role: "UGC Creator", earnings: 980 },
  { id: "demo-3", display_name: "Lina K.", role: "Seller", earnings: 2150 },
];

function normalizeCreator(c: TopCreatorRow, index: number) {
  return {
    id: c.id,
    name: c.display_name ?? c.full_name ?? "Creator",
    image: resolveProfileImage(c.profile_image ?? c.avatar_url),
    role: c.role ?? "Creator",
    earnings: Number(c.earnings ?? c.total_earnings ?? 0),
    rank: index + 1,
  };
}

export function TopCreatorsEarnings({ creators = [] }: { creators: TopCreatorRow[] }) {
  const [clicks, setClicks] = useState(5000);
  const [views, setViews] = useState(50000);
  const [commission, setCommission] = useState(15);

  const { low, high } = useMemo(() => {
    const base = (clicks * 0.05 + views / 1000 * 8) * (commission / 10);
    return { low: Math.max(50, Math.round(base * 0.6)), high: Math.max(250, Math.round(base * 2.5)) };
  }, [clicks, views, commission]);

  const list = (creators.length > 0 ? creators : DEMO_CREATORS).map(normalizeCreator);

  const sliders: {
    label: string;
    val: number;
    set: (n: number) => void;
    min: number;
    max: number;
    step: number;
    suffix?: string;
  }[] = [
    { label: "Monthly Clicks", val: clicks, set: setClicks, min: 100, max: 50000, step: 100 },
    { label: "Monthly Views", val: views, set: setViews, min: 1000, max: 500000, step: 1000 },
    { label: "Commission Rate", val: commission, set: setCommission, min: 5, max: 30, step: 1, suffix: "%" },
  ];

  return (
    <section className={`${section} py-12 sm:py-16`}>
      <div className={shell}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className={`p-6 ${cardBase}`}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-[18px] font-black text-[var(--color-text-primary)]">Top Creators This Month</h3>
              <Link href="/creators" className="shrink-0 text-[12px] font-bold" style={{ color: ORANGE }}>
                View Leaderboard <ArrowRight className="inline size-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {list.slice(0, 3).map((c, i) => (
                <div key={c.id} className={`flex items-center gap-3 rounded-xl p-3 ${i === 0 ? "bg-[var(--color-surface-secondary)]" : ""}`}>
                  <img
                    src={safeMediaUrl(c.image, 128)}
                    alt={c.name}
                    width={44}
                    height={44}
                    className="size-11 shrink-0 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.src = DEFAULT_PROFILE_IMAGE; }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-[var(--color-text-primary)]">{c.name}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">{c.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-black" style={{ color: GREEN }}>
                      ${fmtCount(c.earnings)}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">this month</div>
                  </div>
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-black text-white"
                    style={{ background: i === 0 ? ORANGE : i === 1 ? BLUE : GREEN }}
                  >
                    {c.rank}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-6 ${cardBase}`}>
            <h3 className="text-[18px] font-black text-[var(--color-text-primary)]">How Much Could You Earn?</h3>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">Adjust the sliders to estimate your potential.</p>

            {sliders.map((s) => (
              <div key={s.label} className="mt-5">
                <div className="mb-2 flex justify-between text-[12px] font-semibold text-[var(--color-text-secondary)]">
                  <span>{s.label}</span>
                  <span className="text-[var(--color-text-primary)]">
                    {fmtCount(s.val)}
                    {s.suffix ?? ""}
                  </span>
                </div>
                <Slider
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={[s.val]}
                  onValueChange={(v) => s.set(v[0] ?? s.min)}
                  className="py-1 [--color-accent:#7c3aed]"
                />
              </div>
            ))}

            <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#a855f7] p-6 text-center text-white">
              <div className="text-[12px] font-semibold opacity-90">Potential Earnings</div>
              <div className="mt-1 text-[32px] font-black leading-none">
                ${low.toLocaleString()} – ${high.toLocaleString()}+
              </div>
              <Link
                href="/ugc"
                className="mt-4 inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] px-5 py-2 text-[13px] font-bold text-violet-600 dark:text-violet-400"
              >
                Start Earning Now <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ 14. First 30 minutes ═══ */
type OnboardStep = {
  title: string;
  desc: string;
  detail: string;
  minute: string;
  href: string;
};

const ONBOARD_CREATORS: OnboardStep[] = [
  {
    title: "Create account",
    desc: "Sign up with email or Google.",
    detail: "No card needed. One account works for buying, selling, and creating.",
    minute: "0–5 min",
    href: "/register",
  },
  {
    title: "Pick a path",
    desc: "Buyer, seller, creator, or community owner.",
    detail: "Choose what you want to do first. You can add other roles later from the dashboard.",
    minute: "5–10 min",
    href: "/",
  },
  {
    title: "Finish your profile",
    desc: "Add a photo, bio, and payout details.",
    detail: "Creators need a short bio and payment method. Sellers add store name and logo.",
    minute: "10–15 min",
    href: "/identity/settings",
  },
  {
    title: "Make your first move",
    desc: "Share a link, list a product, or join a campaign.",
    detail: "Grab an affiliate link, publish a listing, or apply to a UGC brief — pick one and ship it.",
    minute: "15–22 min",
    href: "/ugc",
  },
  {
    title: "Check results",
    desc: "Track clicks, sales, and earnings.",
    detail: "Open your wallet and analytics. See what worked, then repeat or scale from there.",
    minute: "22–30 min",
    href: "/",
  },
];

const ONBOARD_BRANDS: OnboardStep[] = [
  {
    title: "Create account",
    desc: "Register your brand in minutes.",
    detail: "Use your business email. Verification unlocks campaign tools and vendor features.",
    minute: "0–5 min",
    href: "/register",
  },
  {
    title: "Set campaign goals",
    desc: "Budget, audience, platforms, and payout model.",
    detail: "Decide per-view or fixed pay, which platforms you need, and how much budget to allocate.",
    minute: "5–12 min",
    href: "/ugc/campaign-center/campaigns/new",
  },
  {
    title: "Launch a campaign",
    desc: "Write the brief and publish.",
    detail: "Add examples, hashtags, and deliverables so creators know exactly what to submit.",
    minute: "12–20 min",
    href: "/ugc/campaign-center/campaigns/new",
  },
  {
    title: "Review submissions",
    desc: "Approve content and track views.",
    detail: "Check posts against your brief, approve the good ones, and monitor spend in real time.",
    minute: "20–26 min",
    href: "/ugc/campaign-center/campaigns",
  },
  {
    title: "Scale what works",
    desc: "Increase budget or spin up another campaign.",
    detail: "Double down on creators and formats that perform. Clone a winning campaign to move faster.",
    minute: "26–30 min",
    href: "/ugc/campaign-center/campaigns/new",
  },
];

export function First30Minutes() {
  const [tab, setTab] = useState<"creators" | "brands">("creators");
  const [activeStep, setActiveStep] = useState(0);
  const steps = tab === "creators" ? ONBOARD_CREATORS : ONBOARD_BRANDS;
  const current = steps[activeStep];
  const progress = ((activeStep + 1) / steps.length) * 100;

  useEffect(() => {
    setActiveStep(0);
  }, [tab]);

  return (
    <section className={`${sectionAlt} py-12 sm:py-16`}>
      <div className={shell}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start lg:gap-12">
          <div>
            <h2 className="text-[22px] font-black tracking-tight text-[var(--color-text-primary)] sm:text-[26px]">
              Your first 30 minutes on Jimvio
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
              A realistic setup path with time estimates. Pick your role and follow the steps.
            </p>

            <nav
              aria-label="Onboarding path"
              className="mt-6 flex gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {(
                [
                  { id: "creators" as const, label: "For creators" },
                  { id: "brands" as const, label: "For brands" },
                ] as const
              ).map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-pressed={active}
                    className={cn(
                      "h-10 shrink-0 border-b-2 px-3 text-[13px] font-medium transition-colors sm:px-4",
                      active
                        ? "border-[var(--color-text-primary)] text-[var(--color-text-primary)]"
                        : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-[12px] text-[var(--color-text-muted)]">
                <span>
                  Step <span className="font-semibold text-[var(--color-text-primary)]">{activeStep + 1}</span> of {steps.length}
                </span>
                <span className="font-medium tabular-nums text-[var(--color-text-primary)]">{current.minute}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-md bg-[var(--color-surface)]">
                <div
                  className="h-full rounded-md transition-all duration-300"
                  style={{ width: `${progress}%`, background: ORANGE }}
                />
              </div>
            </div>

            <div className="mt-6 rounded-md bg-[var(--color-surface)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {current.minute}
              </p>
              <h3 className="mt-1 text-[16px] font-bold text-[var(--color-text-primary)]">{current.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">{current.detail}</p>
              <Link
                href={current.href}
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-md px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: ORANGE }}
              >
                {tab === "creators" ? "Start this step" : "Open brand tools"}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="min-w-0">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 lg:gap-2">
              {steps.map((step, i) => {
                const selected = activeStep === i;
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setActiveStep(i)}
                    aria-pressed={selected}
                    className={cn(
                      "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md px-3 py-3 text-left transition-colors",
                      selected
                        ? "bg-[var(--color-surface)]"
                        : "bg-transparent hover:bg-[var(--color-surface)]/70"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-md text-[12px] font-bold tabular-nums",
                        selected
                          ? "text-white"
                          : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                      )}
                      style={selected ? { background: ORANGE } : undefined}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-[var(--color-text-primary)]">{step.title}</span>
                      <span className="mt-0.5 block text-[12px] text-[var(--color-text-muted)]">{step.desc}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-medium tabular-nums text-[var(--color-text-muted)]">
                      {step.minute}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ 15. FAQ ═══ */
type FaqTopic = "all" | "start" | "earn" | "sell" | "ugc";

const FAQ_TOPICS: { id: FaqTopic; label: string }[] = [
  { id: "all", label: "All" },
  { id: "start", label: "Getting started" },
  { id: "earn", label: "Earnings" },
  { id: "sell", label: "Selling" },
  { id: "ugc", label: "UGC" },
];

const FAQS: { topic: Exclude<FaqTopic, "all">; q: string; a: string }[] = [
  {
    topic: "start",
    q: "Does it cost anything to sign up?",
    a: "No. Creating an account is free. Fees only apply when you complete a sale or receive a paid payout.",
  },
  {
    topic: "earn",
    q: "When do I get paid?",
    a: "Earnings hit your wallet after sales or approved campaign work. Once you pass the minimum, request a payout — most clear within a day.",
  },
  {
    topic: "earn",
    q: "How do affiliate commissions work?",
    a: "Grab a product link, share it, and earn the rate shown on that listing when someone buys. Rates vary by product, up to 30% on some items.",
  },
  {
    topic: "sell",
    q: "Can I open a store here?",
    a: `Yes. List physical or digital products, set your prices, and ship to buyers in ${PLATFORM_STATS.countries} countries from your vendor dashboard.`,
  },
  {
    topic: "ugc",
    q: "How do UGC campaigns pay?",
    a: "Each campaign lists its rate upfront — per view or per approved post. Submit your content on the allowed platforms and track earnings in your dashboard.",
  },
  {
    topic: "ugc",
    q: "Do I need a big following to join a campaign?",
    a: "Not always. Brands set their own requirements. Check the brief on each campaign before you join.",
  },
  {
    topic: "start",
    q: "Is my money safe on Jimvio?",
    a: "Payments run through secure processors. Vendors go through verification, and transactions are tracked in your account.",
  },
];

export function FAQSection() {
  const [topic, setTopic] = useState<FaqTopic>("all");
  const [open, setOpen] = useState<Set<number>>(new Set());

  const filtered = useMemo(
    () => (topic === "all" ? FAQS : FAQS.filter((f) => f.topic === topic)),
    [topic]
  );

  useEffect(() => {
    setOpen(new Set());
  }, [topic]);

  const toggle = (index: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <section className={`${section} py-12 sm:py-16`}>
      <div className={shell}>
        <h2 className="text-[22px] font-black tracking-tight text-[var(--color-text-primary)] sm:text-[26px]">
          Common questions
        </h2>
        <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
          Filter by topic, open what you need.
        </p>

        <nav
          aria-label="Filter FAQ by topic"
          className="mt-6 flex gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {FAQ_TOPICS.map((t) => {
            const active = topic === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTopic(t.id)}
                aria-pressed={active}
                className={cn(
                  "h-10 shrink-0 border-b-2 px-3 text-[13px] font-medium transition-colors sm:px-4",
                  active
                    ? "border-[var(--color-text-primary)] text-[var(--color-text-primary)]"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-6">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--color-text-muted)]">
              Nothing in this topic yet. Try another filter.
            </p>
          ) : (
            filtered.map((f, i) => {
              const isOpen = open.has(i);
              return (
                <div key={f.q}>
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    aria-expanded={isOpen}
                    className="grid w-full grid-cols-[1fr_auto] items-start gap-3 py-4 text-left transition-colors hover:bg-[var(--color-surface-secondary)]/50"
                  >
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold leading-snug text-[var(--color-text-primary)]">
                        {f.q}
                      </span>
                      {isOpen && (
                        <span className="mt-2 block text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                          {f.a}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={cn(
                        "mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <p className="mt-4 text-[13px] text-[var(--color-text-muted)]">
          Can&apos;t find what you&apos;re looking for?{" "}
          <Link href="/help" className="font-semibold text-[var(--color-text-primary)] underline-offset-2 hover:underline">
            Browse help articles
          </Link>
          {" "}or{" "}
          <Link href="/contact" className="font-semibold text-[var(--color-text-primary)] underline-offset-2 hover:underline">
            contact support
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

/* ═══ 16. Trusted brands ═══ */
const BRANDS = [
  { src: "/logos/binance.png", h: "h-6" },
  { src: "/logos/flutterwave.png", h: "h-5" },
  { src: "/logos/paypal.png", h: "h-5" },
  { src: "/logos/Payoneer_Master_Logo_OnWhite_RGB.svg", h: "h-5" },
  { src: "/logos/Afrigo-Logo.png", h: "h-6" },
];

export function TrustedBrands() {
  return (
    <section className={`border-t border-[var(--color-border)] ${section} py-10`}>
      <div className={shell}>
        <p className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
          Trusted by leading brands &amp; platforms
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {BRANDS.map((b) => (
            <img
              key={b.src}
              src={b.src}
              alt=""
              width={88}
              height={24}
              loading="lazy"
              decoding="async"
              className={`${b.h} w-auto object-contain opacity-50 grayscale dark:opacity-70 dark:invert`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


/* ═══ 17. Take Jimvio everywhere ═══ */
export function TakeJimvioEverywhere() {
  const features = [
    "Shop & sell on the go",
    "Track earnings in real time",
    "Join campaigns from your phone",
  ];

  return (
    <section className="relative w-full overflow-hidden" style={{ background: ORANGE }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 0%, transparent 45%), radial-gradient(circle at 80% 80%, #000 0%, transparent 40%)",
        }}
      />

      <div className={`relative ${shell} py-10 sm:py-14`}>
        <div className="flex flex-col gap-8 sm:gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          {/* Top on mobile — copy */}
          <div className="w-full shrink-0 text-left text-white lg:max-w-[300px]">
            <h2 className="text-[28px] font-black leading-tight tracking-tight sm:text-[34px]">
              Take Jimvio
              <br />
              Everywhere
            </h2>
            <p className="mt-2 text-[14px] font-medium text-white/95">Available on Android &amp; iOS</p>
            <ul className="mt-5 space-y-2.5">
              {features.map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-[13px] font-medium text-white/95">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/20">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Middle on mobile — phone preview */}
          <TakeJimvioPhonesClient />

          {/* Bottom on mobile — download */}
          <div className="w-full shrink-0 lg:hidden">
            <span className="mb-3 block text-[15px] font-bold text-white">Download the App</span>
            <div className="flex flex-row flex-wrap items-center justify-start gap-3">
              <a
                href="#"
                aria-label="Download on the App Store"
                className="inline-flex shrink-0 transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/app-store-badge.svg"
                  alt="Download on the App Store"
                  width={180}
                  height={60}
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-auto sm:h-11"
                />
              </a>
              <a
                href="#"
                aria-label="Get it on Google Play"
                className="inline-flex shrink-0 transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/google-play-badge.svg"
                  alt="Get it on Google Play"
                  width={200}
                  height={60}
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-auto sm:h-11"
                />
              </a>
            </div>
          </div>

          {/* Right — download (desktop) */}
          <div className="hidden w-full shrink-0 flex-col items-start lg:flex lg:max-w-[220px]">
            <span className="mb-3 text-[15px] font-bold text-white">Download the App</span>
            <div className="flex w-full max-w-[220px] flex-col gap-3">
              <a
                href="#"
                aria-label="Download on the App Store"
                className="block transition-opacity hover:opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/app-store-badge.svg"
                  alt="Download on the App Store"
                  width={180}
                  height={60}
                  loading="lazy"
                  decoding="async"
                  className="h-11 w-auto"
                />
              </a>
              <a
                href="#"
                aria-label="Get it on Google Play"
                className="block transition-opacity hover:opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/google-play-badge.svg"
                  alt="Get it on Google Play"
                  width={200}
                  height={60}
                  loading="lazy"
                  decoding="async"
                  className="h-11 w-auto"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
