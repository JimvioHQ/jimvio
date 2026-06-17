"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag, Store, DollarSign, Megaphone, Users, Package,
  ArrowRight, Check, ShieldCheck, Globe, Zap, Sparkles,
  Bot, Wand2, Search, Clapperboard, Play, Instagram, Youtube,
  ChevronDown, Layers, TrendingUp, Wallet,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { getImage, fmtCount } from "@/lib/utils";
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
const cardBase =
  "rounded-2xl border border-[#ececec] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]";

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-8 text-center">
      <h2 className="text-[26px] font-black tracking-tight text-[#111] sm:text-[30px]">{children}</h2>
      {sub && <p className="mx-auto mt-2 max-w-xl text-sm text-[#6b7280]">{sub}</p>}
    </div>
  );
}

/* ═══ 1. What do you want to do today ═══ */
const ACTIONS = [
  { icon: ShoppingBag, title: "Buy Products", desc: "Shop trending products from verified global suppliers.", cta: "Start Buying", href: "/marketplace", tint: "#fff4ed", color: ORANGE },
  { icon: Store, title: "Sell Products", desc: "Launch your store and reach buyers worldwide.", cta: "Start Selling", href: "/dashboard", tint: "#eff6ff", color: BLUE },
  { icon: DollarSign, title: "Earn Commissions", desc: "Promote products and earn on every sale.", cta: "Start Earning", href: "/ugc", tint: "#f0fdf4", color: GREEN },
  { icon: Megaphone, title: "Join Campaigns", desc: "Create content for brands and get paid per view.", cta: "See Campaigns", href: "/ugc", tint: "#f5f3ff", color: PURPLE },
  { icon: Users, title: "Build Communities", desc: "Grow, connect and monetize your audience.", cta: "Start Building", href: "/communities", tint: "#fffbeb", color: YELLOW },
];

export function WhatToDoToday() {
  return (
    <section className="bg-white py-10 sm:py-14">
      <div className={shell}>
        <SectionTitle sub="Choose your path and dive into your goals.">What Do You Want To Do Today?</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ACTIONS.map((a) => (
            <div key={a.title} className={`flex flex-col p-5 ${cardBase}`}>
              <span
                className="mb-4 grid size-11 place-items-center rounded-xl"
                style={{ background: a.tint, color: a.color }}
              >
                <a.icon className="size-5" strokeWidth={2.2} />
              </span>
              <h3 className="text-[15px] font-bold text-[#111]">{a.title}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-snug text-[#6b7280]">{a.desc}</p>
              <Link
                href={a.href}
                className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold transition-opacity hover:opacity-80"
                style={{ color: a.color }}
              >
                {a.cta} <ArrowRight className="size-3.5" />
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
    <div className="border-y border-[#f0f0f0] bg-[#fafafa]">
      <div className={`${shell} flex flex-wrap items-center justify-center gap-4 py-4 sm:gap-6`}>
        <div className="flex -space-x-2.5">
          {AVATARS.map((src, i) => (
            <img key={i} src={src} alt="" className="size-8 rounded-full border-2 border-white object-cover sm:size-9" />
          ))}
        </div>
        <p className="text-center text-sm text-[#4b5563]">
          Trusted by <b className="text-[#111]">{usersLabel} users</b> in{" "}
          <b className="text-[#111]">{countriesLabel} countries</b>
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
              className="size-7 rounded-full border border-[#e5e7eb] bg-white object-cover shadow-sm"
            />
          ))}
          <span className="ml-1 rounded-full bg-[#111] px-2 py-0.5 text-[10px] font-bold text-white">
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
  { icon: Megaphone, title: "Join Campaigns", desc: "Get paid per view", color: PURPLE },
  { icon: Users, title: "Build Communities", desc: "Monetize your audience", color: YELLOW },
];

export function PlatformOverviewBar() {
  return (
    <section className="bg-white py-8">
      <div className={shell}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {OVERVIEW.map((o) => (
            <div key={o.title} className="flex items-start gap-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg"
                style={{ background: `${o.color}14`, color: o.color }}
              >
                <o.icon className="size-4" strokeWidth={2.2} />
              </span>
              <div>
                <div className="text-[13px] font-bold text-[#111]">{o.title}</div>
                <div className="text-[11px] leading-snug text-[#9ca3af]">{o.desc}</div>
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
    title: "I'm a Buyer",
    photo: "https://images.unsplash.com/photo-1483985988350-763728e1935b?w=400&h=280&fit=crop",
    items: ["Shop verified products", "Track every order", "Buyer protection"],
    cta: "Start as Buyer",
    href: "/marketplace",
    color: ORANGE,
  },
  {
    title: "I'm a Seller",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=280&fit=crop",
    items: ["Open your store", "Reach global buyers", "Powerful seller tools"],
    cta: "Start as Seller",
    href: "/dashboard",
    color: GREEN,
  },
  {
    title: "I'm an Affiliate",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=280&fit=crop",
    items: ["Promote & earn", "High commissions", "Instant payouts"],
    cta: "Start as Affiliate",
    href: "/ugc",
    color: YELLOW,
  },
  {
    title: "I'm a Creator",
    photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=280&fit=crop",
    items: ["Get paid per view", "Brand campaigns", "Grow your audience"],
    cta: "Start as Creator",
    href: "/ugc",
    color: PURPLE,
  },
  {
    title: "I'm a Community Owner",
    photo: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=280&fit=crop",
    items: ["Build your space", "Monetize members", "Host live events"],
    cta: "Start Community",
    href: "/communities",
    color: BLUE,
  },
];

export function ChooseYourJourney() {
  return (
    <section className="bg-[#fafafa] py-12 sm:py-16">
      <div className={shell}>
        <SectionTitle sub="Whoever you are, there's a place for you on Jimvio.">Choose Your Journey</SectionTitle>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {JOURNEYS.map((j) => (
            <div key={j.title} className={`overflow-hidden ${cardBase}`}>
              <img src={j.photo} alt={j.title} className="h-36 w-full object-cover" />
              <div className="flex flex-col p-4">
                <h3 className="text-[15px] font-bold text-[#111]">{j.title}</h3>
                <ul className="my-3 space-y-1.5">
                  {j.items.map((it) => (
                    <li key={it} className="flex items-center gap-2 text-[12px] text-[#4b5563]">
                      <Check className="size-3.5 shrink-0" style={{ color: j.color }} strokeWidth={3} />
                      {it}
                    </li>
                  ))}
                </ul>
                <Link
                  href={j.href}
                  className="mt-auto flex w-full items-center justify-center gap-1 rounded-xl py-2.5 text-[13px] font-bold text-white"
                  style={{ background: j.color }}
                >
                  {j.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ 5. How Jimvio works ═══ */
const STEPS = [
  { n: 1, title: "Discover", desc: "Find products, campaigns and opportunities you love.", color: ORANGE },
  { n: 2, title: "Promote & Earn", desc: "Share or sell and get paid instantly.", color: GREEN },
  { n: 3, title: "Scale", desc: "Build your income and build your brand.", color: PURPLE },
];

export function HowJimvioWorks() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className={shell}>
        <SectionTitle>How Jimvio Works</SectionTitle>
        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-4">
          <div className="pointer-events-none absolute left-[20%] right-[20%] top-7 hidden h-px border-t-2 border-dashed border-[#e5e7eb] md:block" />
          {STEPS.map((s) => (
            <div key={s.n} className="relative flex flex-col items-center text-center">
              <span
                className="relative z-10 mb-4 grid size-14 place-items-center rounded-full text-lg font-black text-white shadow-md"
                style={{ background: s.color }}
              >
                {s.n}
              </span>
              <h3 className="text-[16px] font-bold text-[#111]">{s.title}</h3>
              <p className="mt-1.5 max-w-[220px] text-[13px] leading-relaxed text-[#6b7280]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ 6. Trending products ═══ */
export function TrendingProductsRow({ products = [] }: { products: any[] }) {
  const { formatMoney } = useCurrency();
  if (!products.length) return null;

  return (
    <section className="bg-[#fafafa] py-12 sm:py-16">
      <div className={shell}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[22px] font-black text-[#111] sm:text-[26px]">Trending Products</h2>
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
                <div className="flex aspect-square items-center justify-center bg-[#f8f8f8] p-3">
                  <img src={getImage(p.images)} alt={p.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                </div>
                <div className="p-3">
                  <h4 className="line-clamp-2 text-[12px] font-semibold leading-snug text-[#111]">{p.name}</h4>
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
};

export function FeaturedUGCCampaigns({ campaigns = [] }: { campaigns: SharedCampaignRow[] }) {
  const { formatMoney } = useCurrency();
  const list = campaigns.slice(0, 4);
  if (!list.length) return null;

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className={shell}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[22px] font-black text-[#111] sm:text-[26px]">Featured UGC Campaigns</h2>
          <Link href="/ugc" className="text-[13px] font-bold" style={{ color: ORANGE }}>
            View All Campaigns →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((c) => {
            const platform = (c.allowed_platforms?.[0] ?? "tiktok").toLowerCase();
            const Icon = PLATFORM_ICON[platform] ?? Clapperboard;
            const joined = c.approved_count ?? c.submission_count ?? 0;
            const cap = 100;
            const pct = Math.min(100, (joined / cap) * 100);
            const vendor = c.vendor ?? c.vendors;

            return (
              <Link key={c.id} href={`/ugc/${c.id}`} className={`flex flex-col overflow-hidden ${cardBase}`}>
                <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-4 py-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-[#111] text-white">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold capitalize text-[#111]">{platform}</div>
                    <div className="truncate text-[11px] text-[#9ca3af]">{c.campaign_type ?? "UGC"}</div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-[14px] font-bold text-[#111]">{c.title}</h3>
                  <div className="mt-2 space-y-1 text-[11px] text-[#6b7280]">
                    <div>Budget: <b className="text-[#111]">{formatMoney(c.total_budget, "USD")}</b></div>
                    <div>Pay Per View: <b style={{ color: GREEN }}>{formatMoney(c.rate_per_1k_views, "USD")}</b></div>
                  </div>
                  {vendor && (
                    <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-md bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-bold" style={{ color: GREEN }}>
                      <Check className="size-3" /> Brand Verified
                    </span>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-full bg-[#f3f4f6] text-[11px] font-bold text-[#6b7280]">
                      {(vendor?.business_name ?? "B").slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#f3f4f6]">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ORANGE }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-[#9ca3af]">
                        <span>{joined} / {cap} joined</span>
                        <span>4 days left</span>
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
    <section className="bg-[#fafafa] py-12 sm:py-16">
      <div className={shell}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[22px] font-black text-[#111] sm:text-[26px]">Featured Communities</h2>
          <Link href="/communities" className="text-[13px] font-bold" style={{ color: ORANGE }}>
            Explore Communities →
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
                    className="mb-4 size-12 rounded-2xl border border-[#ececec] object-cover"
                  />
                ) : (
                  <span
                    className="mb-4 grid size-12 place-items-center rounded-2xl"
                    style={{ background: style.bg, color: style.color }}
                  >
                    <Icon className="size-6" />
                  </span>
                )}
                <h3 className="text-[15px] font-bold text-[#111]">{c.name}</h3>
                <p className="mt-1 text-[12px] text-[#9ca3af]">{fmtCount(c.member_count ?? 0)} members</p>
                <p className="mt-2 text-[12px] leading-relaxed text-[#6b7280]">{c.tagline ?? "Connect with like-minded people."}</p>
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
  { title: "Marketplace", color: ORANGE, items: ["Verified suppliers", "Global shipping", "Secure payments"] },
  { title: "Affiliate Program", color: GREEN, items: ["Up to 30% commission", "Real-time analytics", "Instant payouts"] },
  { title: "UGC Campaigns", color: PURPLE, items: ["Paid per view", "Brand partnerships", "Content rewards"] },
  { title: "Communities", color: BLUE, items: ["Free & paid tiers", "Live rooms", "Courses & events"] },
];

export function OnePlatformOpportunities() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className={shell}>
        <SectionTitle>One Platform. Endless Opportunities.</SectionTitle>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {OPPS.map((o) => (
            <div key={o.title} className="px-2">
              <h3 className="mb-3 text-[15px] font-bold text-[#111]">{o.title}</h3>
              <ul className="space-y-2">
                {o.items.map((it) => (
                  <li key={it} className="flex items-center gap-2 text-[13px] text-[#4b5563]">
                    <Check className="size-4 shrink-0" style={{ color: GREEN }} strokeWidth={3} />
                    {it}
                  </li>
                ))}
              </ul>
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
  { icon: TrendingUp, title: "AI Product Research", desc: "Analyze demand, pricing and competition.", href: "/marketplace" },
  { icon: Bot, title: "AI Campaign Assistant", desc: "Match with the best brand campaigns for you.", href: "/ugc" },
];

export function GrowthStack() {
  return (
    <section className="bg-[#fafafa] py-12 sm:py-16">
      <div className={shell}>
        <SectionTitle>AI Powered Growth Tools</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AI_TOOLS.map((t) => (
            <div key={t.title} className={`p-5 ${cardBase}`}>
              <span className="mb-3 grid size-10 place-items-center rounded-xl bg-[#f5f3ff] text-[#7c3aed]">
                <t.icon className="size-5" />
              </span>
              <h3 className="text-[14px] font-bold text-[#111]">{t.title}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6b7280]">{t.desc}</p>
              <Link href={t.href} className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#7c3aed]">
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
];

export function WhyChooseJimvio() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className={shell}>
        <SectionTitle>Why People Choose Jimvio</SectionTitle>
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          {WHY.map((w) => (
            <div key={w.title} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff4ed]" style={{ color: ORANGE }}>
                <w.icon className="size-5" />
              </span>
              <div>
                <h3 className="text-[14px] font-bold text-[#111]">{w.title}</h3>
                <p className="mt-0.5 text-[12px] text-[#6b7280]">{w.desc}</p>
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
    <section className="bg-[#fafafa] py-12 sm:py-16">
      <div className={shell}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
          {/* Left card — Global Network */}
          <div className={`min-w-0 flex-1 p-6 sm:p-7 ${cardBase}`}>
            <h2 className="text-[20px] font-black text-[#111] sm:text-[22px]">Global Network</h2>
            <p className="mt-1 text-[13px] text-[#6b7280]">{countriesLabel} Countries Connected</p>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="w-full shrink-0 sm:w-[190px]">
                <div className="space-y-3.5">
                  {networkRows.map((row) => (
                    <div key={row.label} className="flex items-center gap-3">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-lg"
                        style={{ background: row.tint, color: row.color }}
                      >
                        <row.icon className="size-4" strokeWidth={2.2} />
                      </span>
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className="text-[20px] font-black leading-none text-[#111]">{row.value}</span>
                        <span className="text-[12px] font-medium text-[#6b7280]">{row.label}</span>
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
            <h2 className="text-[18px] font-black text-[#111] sm:text-[20px]">Platform Stats</h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {platformStats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-w-[68px] flex-1 flex-col items-center justify-center rounded-lg px-2 py-2.5 text-center"
                  style={{ background: stat.bg }}
                >
                  <div className="text-[12px] font-black leading-tight sm:text-[13px]" style={{ color: stat.accent }}>
                    {stat.value}
                  </div>
                  <div className="mt-0.5 text-[9px] font-medium text-[#6b7280]">{stat.label}</div>
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
  { id: "demo-1", display_name: "Amara K.", profile_image: AVATARS[0], role: "UGC Creator", earnings: 4820 },
  { id: "demo-2", display_name: "David O.", profile_image: AVATARS[1], role: "Affiliate", earnings: 3150 },
  { id: "demo-3", display_name: "Lina M.", profile_image: AVATARS[2], role: "Seller", earnings: 6240 },
];

function normalizeCreator(c: TopCreatorRow, index: number) {
  return {
    id: c.id,
    name: c.display_name ?? c.full_name ?? "Creator",
    image: c.profile_image ?? c.avatar_url ?? AVATARS[index % AVATARS.length],
    role: c.role ?? "Creator",
    earnings: Number(c.earnings ?? c.total_earnings ?? 0),
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
    <section className="bg-white py-12 sm:py-16">
      <div className={shell}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className={`p-6 ${cardBase}`}>
            <h3 className="text-[18px] font-black text-[#111]">Top Creators This Month</h3>
            <div className="mt-5 space-y-4">
              {list.slice(0, 3).map((c, i) => (
                <div key={c.id} className={`flex items-center gap-3 rounded-xl p-3 ${i === 0 ? "bg-[#fafafa]" : ""}`}>
                  <img src={c.image} alt={c.name} className="size-11 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-[#111]">{c.name}</div>
                    <div className="text-[11px] text-[#9ca3af]">{c.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-black" style={{ color: GREEN }}>
                      ${fmtCount(c.earnings)}
                    </div>
                    <div className="text-[10px] text-[#9ca3af]">this month</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-6 ${cardBase}`}>
            <h3 className="text-[18px] font-black text-[#111]">How Much Could You Earn?</h3>
            <p className="mt-1 text-[12px] text-[#6b7280]">Adjust the sliders to estimate your potential.</p>

            {sliders.map((s) => (
              <div key={s.label} className="mt-5">
                <div className="mb-2 flex justify-between text-[12px] font-semibold text-[#4b5563]">
                  <span>{s.label}</span>
                  <span className="text-[#111]">
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
                className="mt-4 inline-flex items-center gap-1 rounded-full bg-white px-5 py-2 text-[13px] font-bold text-[#7c3aed]"
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
const ONBOARD = [
  { title: "Create Account", desc: "Sign up free in under a minute." },
  { title: "Choose Path", desc: "Pick buyer, seller, creator or community." },
  { title: "Complete Profile", desc: "Set up your store or creator profile." },
  { title: "Start Earning", desc: "Promote, sell or create your first content." },
  { title: "Scale Business", desc: "Grow income and build your brand." },
];

export function First30Minutes() {
  return (
    <section className="bg-[#fafafa] py-12 sm:py-16">
      <div className={shell}>
        <SectionTitle>Your First 30 Minutes On Jimvio</SectionTitle>
        <div className="relative">
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-5 hidden h-px border-t-2 border-dashed border-[#e5e7eb] lg:block" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {ONBOARD.map((s, i) => (
              <div key={s.title} className="relative flex flex-col items-center text-center">
                <span
                  className="relative z-10 mb-3 grid size-10 place-items-center rounded-full text-sm font-black text-white"
                  style={{ background: ORANGE }}
                >
                  {i + 1}
                </span>
                <h3 className="text-[13px] font-bold text-[#111]">{s.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[#6b7280]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ 15. FAQ ═══ */
const FAQS = [
  { q: "How do payouts work?", a: "Earnings are tracked in real time. Once you reach the minimum threshold, payouts are sent instantly to your preferred method." },
  { q: "Is Jimvio free to join?", a: "Yes — creating an account is completely free. You only pay fees on successful transactions." },
  { q: "How do I earn commissions?", a: "Share your affiliate link for any product. When someone buys, you earn up to 30% commission." },
  { q: "Can I sell my own products?", a: "Absolutely. Open a store, list products, and reach buyers across 50+ countries." },
  { q: "How do UGC campaigns work?", a: "Brands post campaigns. You create content and get paid per view or per approved submission." },
  { q: "When do I get paid?", a: "Payouts are processed as soon as your balance hits the minimum — usually within 24 hours." },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className={shell}>
        <SectionTitle>Frequently Asked Questions</SectionTitle>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className={`overflow-hidden ${cardBase}`}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="text-[13px] font-bold text-[#111]">{f.q}</span>
                  <ChevronDown
                    className="size-4 shrink-0 text-[#9ca3af] transition-transform"
                    style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                  />
                </button>
                {isOpen && (
                  <p className="border-t border-[#f0f0f0] px-4 py-3 text-[12px] leading-relaxed text-[#6b7280]">
                    {f.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
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
    <section className="border-t border-[#f0f0f0] bg-white py-10">
      <div className={shell}>
        <p className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-[#9ca3af]">
          Trusted by leading brands &amp; platforms
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {BRANDS.map((b) => (
            <img key={b.src} src={b.src} alt="" className={`${b.h} w-auto object-contain opacity-50 grayscale`} />
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
    <section className="w-full" style={{ background: ORANGE }}>
      <div className={`${shell} py-10 sm:py-14`}>
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          {/* Left — copy */}
          <div className="w-full shrink-0 text-white lg:max-w-[300px] lg:text-left">
            <h2 className="text-[28px] font-black leading-tight tracking-tight sm:text-[32px]">
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

          {/* Center — phone mockups (Android interactive + iOS static) */}
          <TakeJimvioPhonesClient />

          {/* Right — download */}
          <div className="flex w-full shrink-0 flex-col items-center lg:max-w-[220px] lg:items-start">
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
