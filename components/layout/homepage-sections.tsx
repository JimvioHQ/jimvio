"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import Link from "next/link";
import {
  ShoppingBag, Store, DollarSign, Megaphone, Users, Package,
  ArrowRight, Check, ShieldCheck, Globe, Zap, Sparkles,
  Bot, Wand2, Search, Clapperboard, Play, Instagram, Youtube, Share2,
  ChevronDown, Layers, TrendingUp, Wallet, Target, Award, BarChart3, LineChart,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { getImage, fmtCount, cn } from "@/lib/utils";
import { DEFAULT_PROFILE_IMAGE, resolveProfileImage } from "@/lib/profile-image";
import type { SharedCampaignRow } from "@/components/ugc/campaign-card-shared";
import { WorldMap, type WorldMapPin } from "@/components/ui/world-map";
import { TakeJimvioPhonesClient } from "@/components/layout/take-jimvio-phones-client";
import { Slider } from "@/components/ui/slider";

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

/* ═══ 1. What do you want to do today ═══ */
const ACTIONS = [
  { icon: ShoppingBag, title: "Buy Products", desc: "Shop trending products from verified global suppliers.", cta: "Start Buying", href: "/marketplace", color: ORANGE },
  { icon: Store, title: "Sell Products", desc: "Launch your store and reach buyers worldwide.", cta: "Start Selling", href: "/dashboard", color: BLUE },
  { icon: DollarSign, title: "Earn Commissions", desc: "Promote products and earn on every sale.", cta: "Start Earning", href: "/affiliates", color: GREEN },
  { icon: Megaphone, title: "Create Campaigns", desc: "Launch UGC campaigns and reach creators worldwide.", cta: "Launch Campaign", href: "/dashboard/campaigns/new", color: PURPLE },
  { icon: Target, title: "Join Campaigns", desc: "Create content for brands and get paid per view.", cta: "Join Campaigns", href: "/ugc", color: BLUE },
  { icon: Users, title: "Build Communities", desc: "Grow, connect and monetize your audience.", cta: "Start Building", href: "/communities", color: YELLOW },
];

export function WhatToDoToday() {
  return (
    <section className={`${section} py-10 sm:py-14`}>
      <div className={shell}>
        <SectionTitle sub="Choose your path and dive into your goals.">What Do You Want To Do Today?</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
          {ACTIONS.map((a) => (
            <div key={a.title} className={`flex h-full flex-col p-3 sm:p-5 ${cardBase}`}>
              <span
                className="mb-3 grid size-9 place-items-center rounded-xl sm:mb-4 sm:size-11"
                style={iconTintStyle(a.color)}
              >
                <a.icon className="size-4 sm:size-5" strokeWidth={2.2} />
              </span>
              <h3 className="text-[12px] font-bold leading-tight text-[var(--color-text-primary)] sm:text-[15px]">{a.title}</h3>
              <p className="mt-1 flex-1 text-[11px] leading-snug text-[var(--color-text-muted)] sm:text-[13px]">{a.desc}</p>
              <Link
                href={a.href}
                className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-bold transition-opacity hover:opacity-80 sm:mt-4 sm:gap-1 sm:text-[13px]"
                style={{ color: a.color }}
              >
                {a.cta} <ArrowRight className="size-3 sm:size-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

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

export function TrustedStrip({ usersLabel = "977K+", countriesLabel = "50+" }: { usersLabel?: string; countriesLabel?: string }) {
  const moreLabel = countriesLabel.endsWith("+")
    ? `+${countriesLabel.slice(0, -1)}`
    : countriesLabel;

  return (
    <div className="border-y border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
      <div className={`${shell} flex flex-wrap items-center justify-center gap-4 py-4 sm:gap-6`}>
        <div className="flex -space-x-2.5">
          {AVATARS.map((src, i) => (
            <img key={i} src={src} alt="" className="size-8 rounded-full border-2 border-[var(--color-surface)] object-cover sm:size-9" />
          ))}
        </div>
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Trusted by <b className="text-[var(--color-text-primary)]">{usersLabel} users</b> in{" "}
          <b className="text-[var(--color-text-primary)]">{countriesLabel} countries</b>
        </p>
        <div className="flex items-center gap-1">
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
            {moreLabel}
          </span>
        </div>
      </div>
    </div>
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
    <section className={`${section} py-8 sm:py-10`}>
      <div className={shell}>
        <SectionTitle>Everything You Need In One Platform</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {OVERVIEW.map((o) => (
            <div key={o.title} className="flex items-start gap-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg"
                style={{ background: `${o.color}14`, color: o.color }}
              >
                <o.icon className="size-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[var(--color-text-primary)]">{o.title}</div>
                <div className="text-[11px] leading-snug text-[var(--color-text-muted)]">{o.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ 4. Choose your journey ═══ */
const JOURNEYS = [
  {
    role: "Buyer",
    icon: ShoppingBag,
    color: ORANGE,
    metric: "Protected checkout",
    tagline: "Browse verified suppliers and track every order in one place.",
    items: ["Verified sellers", "Order tracking", "Buyer protection"],
    cta: "Browse marketplace",
    href: "/marketplace",
  },
  {
    role: "Seller",
    icon: Store,
    color: BLUE,
    metric: "Your own storefront",
    tagline: "List products, manage orders, and get paid without a separate tool stack.",
    items: ["Store dashboard", "Inventory & orders", "Fast payouts"],
    cta: "Open your store",
    href: "/dashboard",
  },
  {
    role: "Affiliate",
    icon: DollarSign,
    color: GREEN,
    metric: "Up to 30% commission",
    tagline: "Share referral links and earn when your audience buys.",
    items: ["Custom links", "Real-time stats", "Wallet withdrawals"],
    cta: "Start earning",
    href: "/affiliates",
  },
  {
    role: "Brand",
    icon: Award,
    color: BLUE,
    metric: "UGC at scale",
    tagline: "Launch campaigns, brief creators, and track performance from one hub.",
    items: ["Campaign builder", "Creator matching", "ROI tracking"],
    cta: "Launch a campaign",
    href: "/dashboard/campaigns/new",
  },
  {
    role: "Creator",
    icon: Clapperboard,
    color: PURPLE,
    metric: "Paid per campaign",
    tagline: "Join brand briefs, publish content, and get paid for results.",
    items: ["Campaign marketplace", "Per-view payouts", "Creator dashboard"],
    cta: "Find campaigns",
    href: "/ugc",
  },
  {
    role: "Community Owner",
    icon: Users,
    color: YELLOW,
    metric: "Recurring revenue",
    tagline: "Run memberships, live sessions, and paid spaces for your audience.",
    items: ["Public or private", "Subscriptions", "Live & courses"],
    cta: "Build community",
    href: "/communities",
  },
] as const;

export function ChooseYourJourney() {
  return (
    <section className={`border-t border-[var(--color-border)] ${section} py-10 sm:py-14`}>
      <div className={shell}>
        <SectionTitle sub="One account — sell, earn, create, or buy depending on what you need right now.">
          Choose Your Journey
        </SectionTitle>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {JOURNEYS.map((j) => (
            <Link
              key={j.role}
              href={j.href}
              className="group relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] sm:p-5"
            >
              <span
                className="absolute bottom-0 left-0 top-0 w-1 rounded-r-full transition-all duration-200 group-hover:w-1.5"
                style={{ background: j.color }}
                aria-hidden
              />

              <j.icon
                className="pointer-events-none absolute -bottom-5 -right-5 size-[88px] opacity-[0.05] transition-transform duration-300 group-hover:scale-110 sm:size-[100px]"
                style={{ color: j.color }}
                strokeWidth={1.25}
                aria-hidden
              />

              <div className="relative pl-2.5 sm:pl-3">
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105 sm:size-12"
                    style={{ background: `${j.color}14`, color: j.color }}
                  >
                    <j.icon className="size-5 sm:size-[22px]" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h3 className="text-[16px] font-bold leading-tight text-[var(--color-text-primary)] sm:text-[17px]">
                      {j.role}
                    </h3>
                    <p
                      className="mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide sm:text-[11px]"
                      style={{ background: `${j.color}12`, color: j.color }}
                    >
                      {j.metric}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-text-secondary)] sm:mt-3.5 sm:text-[13px]">
                  {j.tagline}
                </p>

                <ul className="mt-3 space-y-1.5 sm:mt-4">
                  {j.items.map((it) => (
                    <li
                      key={it}
                      className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] sm:text-[12px]"
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: j.color }}
                        aria-hidden
                      />
                      {it}
                    </li>
                  ))}
                </ul>

                <span
                  className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold transition-all group-hover:gap-2 sm:mt-5 sm:text-[13px]"
                  style={{ color: j.color }}
                >
                  {j.cta}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ 5. How Jimvio works ═══ */
const STEPS = [
  {
    step: "01",
    title: "Discover",
    desc: "Explore products, brand campaigns, and communities before you commit to a path.",
    detail: "Marketplace, UGC, and communities in one place.",
    icon: Search,
    color: ORANGE,
  },
  {
    step: "02",
    title: "Promote & earn",
    desc: "Sell inventory, share affiliate links, or publish creator content tied to live campaigns.",
    detail: "Payouts land in your Jimvio wallet.",
    icon: Share2,
    color: GREEN,
  },
  {
    step: "03",
    title: "Scale",
    desc: "Track what converts, double down on winners, and grow store revenue or audience income.",
    detail: "Dashboard analytics on every channel.",
    icon: BarChart3,
    color: BLUE,
  },
] as const;

function HowJimvioConnector({
  filled,
  fromColor,
  toColor,
}: {
  filled: boolean;
  fromColor: string;
  toColor: string;
}) {
  return (
    <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]" aria-hidden>
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
          filled ? "w-full" : "w-0",
        )}
        style={{ background: `linear-gradient(90deg, ${fromColor}, ${toColor})` }}
      />
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
    <section className={`${sectionAlt} py-10 sm:py-14`}>
      <div className={shell}>
        <SectionTitle sub="Three steps from browsing to earning — tap a step to follow the flow.">
          How Jimvio Works
        </SectionTitle>

        {/* Desktop interactive connector rail */}
        <div className="mb-6 hidden md:flex md:items-center md:gap-0">
          {STEPS.map((s, index) => (
            <Fragment key={s.step}>
              {index > 0 && (
                <HowJimvioConnector
                  filled={index <= active}
                  fromColor={STEPS[index - 1].color}
                  toColor={s.color}
                />
              )}
              <button
                type="button"
                onClick={() => focusStep(index)}
                onMouseEnter={() => focusStep(index)}
                aria-pressed={active === index}
                aria-label={`Step ${s.step}: ${s.title}`}
                className={cn(
                  "relative z-10 flex shrink-0 flex-col items-center gap-2 rounded-2xl border px-4 py-3 transition-all duration-300",
                  active === index
                    ? "scale-105 border-transparent bg-[var(--color-surface)] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]/60 opacity-80 hover:opacity-100",
                )}
                style={
                  active === index
                    ? { boxShadow: `0 8px 28px ${s.color}22` }
                    : undefined
                }
              >
                <span
                  className="grid size-11 place-items-center rounded-xl transition-colors duration-300"
                  style={{
                    background: active === index ? `${s.color}18` : `${s.color}10`,
                    color: s.color,
                  }}
                >
                  <s.icon className="size-5" strokeWidth={2.2} />
                </span>
                <span
                  className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-bold tracking-widest"
                  style={{ color: s.color }}
                >
                  {s.step}
                </span>
                <span className="text-[12px] font-bold text-[var(--color-text-primary)]">{s.title}</span>
              </button>
            </Fragment>
          ))}
        </div>

        {/* Showcase cards */}
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5"
          onMouseLeave={() => setPaused(false)}
        >
          {STEPS.map((s, index) => (
            <article
              key={s.step}
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
                "relative flex h-full cursor-pointer flex-col rounded-2xl border bg-[var(--color-surface)] p-4 transition-all duration-300 sm:p-5",
                active === index
                  ? "-translate-y-0.5 border-transparent shadow-[0_14px_36px_rgba(0,0,0,0.08)]"
                  : "border-[var(--color-border)] opacity-75 hover:opacity-100",
              )}
              style={
                active === index
                  ? {
                      boxShadow: `0 14px 36px ${s.color}20`,
                      borderColor: `${s.color}35`,
                    }
                  : undefined
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
    </section>
  );
}

/* ═══ 6. Trending products ═══ */
export function TrendingProductsRow({ products = [] }: { products: any[] }) {
  const { formatMoney } = useCurrency();
  if (!products.length) return null;

  return (
    <section className={`${sectionAlt} py-12 sm:py-16`}>
      <div className={shell}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[22px] font-black text-[var(--color-text-primary)] sm:text-[26px]">Trending Products</h2>
          <Link href="/marketplace" className="inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: ORANGE }}>
            View Marketplace <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {products.slice(0, 8).map((p) => {
            const verified = p.vendors?.verification_status === "verified";
            return (
              <Link
                key={p.id}
                href={`/marketplace/${p.slug}`}
                className={`w-[168px] shrink-0 overflow-hidden sm:w-[190px] ${cardBase}`}
              >
                <div className="flex aspect-square items-center justify-center bg-[var(--color-surface-secondary)] p-3">
                  <img src={getImage(p.images)} alt={p.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                </div>
                <div className="p-3">
                  <h4 className="line-clamp-2 text-[12px] font-semibold leading-snug text-[var(--color-text-primary)]">{p.name}</h4>
                  <div className="mt-1.5 text-[15px] font-black" style={{ color: GREEN }}>
                    {formatMoney(p.price, p.currency)}
                  </div>
                  {verified && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold" style={{ color: GREEN }}>
                      <Check className="size-3" strokeWidth={3} /> Verified Supplier
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══ 7. Featured UGC campaigns ═══ */
const PLATFORM_ICON: Record<string, typeof Play> = {
  tiktok: Play,
  instagram: Instagram,
  youtube: Youtube,
  x: Share2,
};

function campaignVendorLogo(vendor: SharedCampaignRow["vendor"] | SharedCampaignRow["vendors"]) {
  return vendor?.business_logo ?? vendor?.logo_url ?? null;
}

function campaignPlatforms(c: SharedCampaignRow) {
  return (c.allowed_platforms ?? []).map((p) => p.toLowerCase()).filter(Boolean);
}

function formatCampaignType(type?: string) {
  return (type ?? "ugc").replace(/_/g, " ");
}

function campaignDaysLeft(endsAt?: string | null) {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000));
}

export function FeaturedUGCCampaigns({ campaigns = [] }: { campaigns: SharedCampaignRow[] }) {
  const { formatMoney } = useCurrency();
  const list = campaigns.slice(0, 4);
  if (!list.length) return null;

  return (
    <section className={`${section} py-12 sm:py-16`}>
      <div className={shell}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[22px] font-black text-[var(--color-text-primary)] sm:text-[26px]">Featured UGC Campaigns</h2>
          <Link href="/ugc" className="text-[13px] font-bold" style={{ color: ORANGE }}>
            View All Campaigns →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((c) => {
            const platforms = campaignPlatforms(c);
            const primaryPlatform = platforms[0];
            const PrimaryIcon = primaryPlatform ? (PLATFORM_ICON[primaryPlatform] ?? Clapperboard) : Clapperboard;
            const joined = c.approved_count ?? c.submission_count ?? 0;
            const budgetPct = Math.min(100, ((c.spent_budget ?? 0) / (c.total_budget || 1)) * 100);
            const daysLeft = campaignDaysLeft(c.ends_at);
            const isFixed = c.payment_model === "fixed_per_content";
            const payAmount = isFixed
              ? formatMoney(c.fixed_rate ?? 0, "USD")
              : formatMoney(c.rate_per_1k_views, "USD");
            const payLabel = isFixed ? "Pay Per Post" : "Pay Per View";
            const vendor = c.vendor ?? c.vendors;
            const logoUrl = campaignVendorLogo(vendor);

            return (
              <Link key={c.id} href={`/ugc/${c.id}`} className={`flex flex-col overflow-hidden ${cardBase}`}>
                <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-neutral-900 text-white dark:bg-neutral-800">
                    <PrimaryIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold capitalize text-[var(--color-text-primary)]">
                      {primaryPlatform ?? "Multi-platform"}
                    </div>
                    <div className="truncate text-[11px] capitalize text-[var(--color-text-muted)]">
                      {formatCampaignType(c.campaign_type)}
                    </div>
                  </div>
                  {platforms.length > 0 && (
                    <div className="flex shrink-0 items-center gap-1">
                      {platforms.slice(0, 4).map((p) => {
                        const PlatformIcon = PLATFORM_ICON[p] ?? Clapperboard;
                        return (
                          <span
                            key={p}
                            className="grid size-6 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
                            title={p}
                          >
                            <PlatformIcon className="size-3 text-[var(--color-text-muted)]" />
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-[14px] font-bold text-[var(--color-text-primary)]">{c.title}</h3>
                  <div className="mt-2 space-y-1 text-[11px] text-[var(--color-text-muted)]">
                    <div>Budget: <b className="text-[var(--color-text-primary)]">{formatMoney(c.total_budget, "USD")}</b></div>
                    <div>{payLabel}: <b style={{ color: GREEN }}>{payAmount}</b></div>
                  </div>
                  {vendor && (
                    <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] font-bold dark:bg-green-500/15" style={{ color: GREEN }}>
                      <Check className="size-3" /> Brand Verified
                    </span>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt=""
                        className="size-8 shrink-0 rounded-full border border-[var(--color-border)] object-cover"
                      />
                    ) : (
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-surface-secondary)] text-[11px] font-bold text-[var(--color-text-muted)]">
                        {(vendor?.business_name ?? "B").slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                        <div className="h-full rounded-full" style={{ width: `${budgetPct}%`, background: ORANGE }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-[var(--color-text-muted)]">
                        <span>{joined} joined · {Math.round(budgetPct)}% used</span>
                        <span>
                          {daysLeft !== null
                            ? daysLeft === 0
                              ? "Ends today"
                              : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                            : "Open"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══ 8. Featured communities ═══ */
type CommunityRow = {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  member_count?: number;
  category?: string;
  avatar_url?: string | null;
  cover_image?: string | null;
  image_url?: string | null;
  profiles?:
    | { full_name?: string | null; avatar_url?: string | null }
    | { full_name?: string | null; avatar_url?: string | null }[]
    | null;
};

const COMMUNITY_ICONS: Record<string, { icon: typeof Users; color: string; bg: string }> = {
  affiliate: { icon: DollarSign, color: GREEN, bg: "#f0fdf4" },
  ecommerce: { icon: Store, color: BLUE, bg: "#eff6ff" },
  ugc: { icon: Clapperboard, color: PURPLE, bg: "#f5f3ff" },
  digital: { icon: Layers, color: ORANGE, bg: "#fff4ed" },
};

function communityStyle(name: string) {
  const n = name.toLowerCase();
  if (n.includes("affiliate")) return COMMUNITY_ICONS.affiliate;
  if (n.includes("ecom") || n.includes("seller")) return COMMUNITY_ICONS.ecommerce;
  if (n.includes("ugc") || n.includes("creator")) return COMMUNITY_ICONS.ugc;
  return COMMUNITY_ICONS.digital;
}

function communityProfileImage(c: CommunityRow): string | null {
  const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
  return c.avatar_url ?? c.image_url ?? c.cover_image ?? profile?.avatar_url ?? null;
}

export function FeaturedCommunities({ communities = [] }: { communities: CommunityRow[] }) {
  const list = (communities.length > 0 ? communities : [
    { id: "1", name: "Affiliate Hub", slug: "affiliate-hub", member_count: 12400, tagline: "Learn, share and earn together." },
    { id: "2", name: "Ecommerce Sellers", slug: "ecommerce-sellers", member_count: 8900, tagline: "Scale your online store." },
    { id: "3", name: "UGC Creators", slug: "ugc-creators", member_count: 15600, tagline: "Create content, get paid." },
    { id: "4", name: "Digital Products", slug: "digital-products", member_count: 6700, tagline: "Courses, tools and templates." },
  ]).slice(0, 4);

  return (
    <section className={`${sectionAlt} py-12 sm:py-16`}>
      <div className={shell}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[22px] font-black text-[var(--color-text-primary)] sm:text-[26px]">Featured Communities</h2>
          <Link href="/communities" className="text-[13px] font-bold" style={{ color: ORANGE }}>
            Explore All <ArrowRight className="inline size-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((c) => {
            const style = communityStyle(c.name);
            const Icon = style.icon;
            const profileImage = communityProfileImage(c);
            return (
              <Link key={c.id} href={`/communities/${c.slug}`} className={`p-5 ${cardBase}`}>
                {profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImage}
                    alt={c.name}
                    className="mb-4 size-12 rounded-2xl border border-[var(--color-border)] object-cover"
                  />
                ) : (
                  <span
                    className="mb-4 grid size-12 place-items-center rounded-2xl"
                    style={{ background: style.bg, color: style.color }}
                  >
                    <Icon className="size-6" />
                  </span>
                )}
                <h3 className="text-[15px] font-bold text-[var(--color-text-primary)]">{c.name}</h3>
                <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{fmtCount(c.member_count ?? 0)} members</p>
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-muted)]">{c.tagline ?? "Connect with like-minded people."}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: ORANGE }}>
                  Join Community <ArrowRight className="size-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══ 9. One platform opportunities ═══ */
const OPPS = [
  { title: "Marketplace", color: ORANGE, items: ["Verified suppliers", "Global shipping", "Secure payments"], href: "/marketplace", cta: "Explore" },
  { title: "Affiliate Program", color: GREEN, items: ["Up to 30% commission", "Real-time analytics", "Instant payouts"], href: "/affiliates", cta: "Learn More" },
  { title: "Vendor Center", color: BLUE, items: ["Open your store", "Manage products", "Track orders"], href: "/dashboard", cta: "Open Store" },
  { title: "Brand Growth", color: PURPLE, items: ["Launch campaigns", "Creator network", "Performance insights"], href: "/dashboard/campaigns/new", cta: "Grow Brand" },
  { title: "UGC Campaigns", color: PURPLE, items: ["Paid per view", "Brand partnerships", "Content rewards"], href: "/ugc", cta: "View Campaigns" },
  { title: "Communities", color: BLUE, items: ["Free & paid tiers", "Live rooms", "Courses & events"], href: "/communities", cta: "Join Now" },
];

export function OnePlatformOpportunities() {
  return (
    <section className={`${section} py-12 sm:py-16`}>
      <div className={shell}>
        <SectionTitle>One Platform. Endless Opportunities.</SectionTitle>
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
  { icon: Search, title: "AI Product Finder", desc: "Discover winning products before they trend.", href: "/marketplace" },
  { icon: Wand2, title: "AI Content Generator", desc: "Create posts, captions and scripts instantly.", href: "/ugc" },
  { icon: Bot, title: "AI Campaign Builder", desc: "Build high-converting campaigns in minutes.", href: "/dashboard/campaigns/new" },
  { icon: Users, title: "AI Creator Matching", desc: "Match with the right creators for your brand.", href: "/ugc" },
  { icon: LineChart, title: "AI Performance Analytics", desc: "Analyze demand, pricing and competition.", href: "/dashboard" },
  { icon: Store, title: "AI Vendor Assistant", desc: "Optimize listings, pricing and inventory.", href: "/dashboard" },
];

export function GrowthStack() {
  return (
    <section className={`${sectionAlt} py-12 sm:py-16`}>
      <div className={shell}>
        <SectionTitle>AI Powered Growth Tools</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {AI_TOOLS.map((t) => (
            <div key={t.title} className={`flex h-full flex-col p-4 sm:p-5 ${cardBase}`}>
              <span className="mb-3 grid size-9 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400 sm:size-10">
                <t.icon className="size-4 sm:size-5" />
              </span>
              <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] sm:text-[14px]">{t.title}</h3>
              <p className="mt-1 flex-1 text-[11px] leading-relaxed text-[var(--color-text-muted)] sm:text-[12px]">{t.desc}</p>
              <Link href={t.href} className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 sm:text-[12px]">
                Try Now <ArrowRight className="size-3" />
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
  { icon: ShieldCheck, title: "Trusted & Secure", desc: "Every vendor verified. Every payment protected." },
  { icon: Wallet, title: "Fast Payouts", desc: "Get your earnings quickly with instant transfers." },
  { icon: Globe, title: "Global Reach", desc: "Buy, sell and earn across 50+ countries." },
  { icon: Sparkles, title: "All-in-one Platform", desc: "Marketplace, affiliate, UGC and communities in one place." },
  { icon: Clapperboard, title: "Creator Marketplace", desc: "Connect with creators ready to promote your brand." },
  { icon: TrendingUp, title: "Brand Growth Network", desc: "Scale campaigns with data-driven creator partnerships." },
];

export function WhyChooseJimvio() {
  return (
    <section className={`${section} py-12 sm:py-16`}>
      <div className={shell}>
        <SectionTitle>Why People Choose Jimvio</SectionTitle>
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

function formatNetworkCount(n: number, fallback: string): string {
  if (!n) return fallback;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

function formatPlatformPlus(n: number, fallback: string, prefix = ""): string {
  if (!n) return fallback;
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M+`;
  if (n >= 10_000) return `${prefix}${(n / 1_000).toFixed(1)}K+`;
  if (n >= 1_000) return `${prefix}${Math.round(n / 1_000)}K+`;
  return `${prefix}${n}+`;
}

export function GlobalNetworkStats({
  platform,
  countriesLabel = "50+",
}: {
  platform?: { totalUsers: number; totalProducts: number; totalEarnings: number; totalVendors: number };
  countriesLabel?: string;
}) {
  const networkRows = [
    { icon: Globe, value: countriesLabel, label: "Countries", tint: "#dcfce7", color: GREEN },
    { icon: Users, value: formatNetworkCount(platform?.totalUsers ?? 0, "977K"), label: "Users", tint: "#dcfce7", color: GREEN },
    { icon: Store, value: formatNetworkCount(platform?.totalVendors ?? 0, "12.4K"), label: "Businesses", tint: "#dbeafe", color: BLUE },
    { icon: Package, value: formatNetworkCount(platform?.totalProducts ?? 0, "250K"), label: "Products", tint: "#dbeafe", color: BLUE },
  ];

  const platformStats = [
    { value: formatPlatformPlus(platform?.totalEarnings ?? 0, "$1.24M+", "$"), label: "Paid Out", accent: ORANGE, bg: "#ffedd5" },
    { value: formatPlatformPlus(platform?.totalUsers ?? 0, "977K+"), label: "Users", accent: PURPLE, bg: "#f3e8ff" },
    { value: formatPlatformPlus(platform?.totalProducts ?? 0, "250K+"), label: "Products", accent: GREEN, bg: "#dcfce7" },
    { value: formatPlatformPlus(platform?.totalVendors ?? 0, "12.4K+"), label: "Businesses", accent: BLUE, bg: "#dbeafe" },
    { value: countriesLabel.endsWith("+") ? countriesLabel : `${countriesLabel}+`, label: "Countries", accent: ORANGE, bg: "#ffedd5" },
  ];

  return (
    <section className={`${sectionAlt} py-12 sm:py-16`}>
      <div className={shell}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
          {/* Left card — Global Network */}
          <div className={`min-w-0 flex-1 p-6 sm:p-7 ${cardBase}`}>
            <h2 className="text-[20px] font-black text-[var(--color-text-primary)] sm:text-[22px]">Global Network</h2>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">{countriesLabel} Countries Connected</p>

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
                          {row.value}
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
                  <div className="text-[12px] font-black leading-tight sm:text-[13px]" style={{ color: stat.accent }}>
                    {stat.value}
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
                    src={c.image}
                    alt={c.name}
                    className="size-11 shrink-0 rounded-full object-cover"
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
    href: "/dashboard",
  },
  {
    title: "Finish your profile",
    desc: "Add a photo, bio, and payout details.",
    detail: "Creators need a short bio and payment method. Sellers add store name and logo.",
    minute: "10–15 min",
    href: "/dashboard/settings",
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
    href: "/dashboard",
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
    href: "/dashboard/campaigns/new",
  },
  {
    title: "Launch a campaign",
    desc: "Write the brief and publish.",
    detail: "Add examples, hashtags, and deliverables so creators know exactly what to submit.",
    minute: "12–20 min",
    href: "/dashboard/campaigns/new",
  },
  {
    title: "Review submissions",
    desc: "Approve content and track views.",
    detail: "Check posts against your brief, approve the good ones, and monitor spend in real time.",
    minute: "20–26 min",
    href: "/dashboard/vendor/campaigns",
  },
  {
    title: "Scale what works",
    desc: "Increase budget or spin up another campaign.",
    detail: "Double down on creators and formats that perform. Clone a winning campaign to move faster.",
    minute: "26–30 min",
    href: "/dashboard/campaigns/new",
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
    a: "Yes. List physical or digital products, set your prices, and ship to buyers in 50+ countries from your vendor dashboard.",
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
            <img key={b.src} src={b.src} alt="" className={`${b.h} w-auto object-contain opacity-50 grayscale dark:opacity-70 dark:invert`} />
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
