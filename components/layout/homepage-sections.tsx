
"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight, Star, ShieldCheck, CheckCircle, Ship, Globe,
  DollarSign, Package, Zap, Menu, BarChart2, TrendingUp,
  UserPlus, ArrowRight, Search, Lock, PlayCircle,
} from "lucide-react";
import { cn, formatDisplayMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { stableDiscountPercent, industryCardBackground, INDUSTRY_GRADIENTS } from "@/lib/homepage-helpers";

type LucideIcon = React.FC<React.SVGProps<SVGSVGElement>>;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};
const stagger = {
  show: { transition: { staggerChildren: 0.07 } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1, scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ─── Shared primitives ───────────────────────────────────────── */

/** Ruled eyebrow label — uses a leading tick mark instead of generic uppercase */
function Eyebrow({ text }: { text: string }) {
  return (
    <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
      <span className="inline-block w-4 h-px bg-[#fd5000] flex-shrink-0" />
      {text}
    </p>
  );
}

/** Hard ruled divider — used between sections instead of space alone */
function Rule({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}

/** Orange accent dot — replaces animated blobs */
function AccentDot({ className }: { className?: string }) {
  return <span className={cn("inline-block w-1.5 h-1.5 rounded-full bg-[#fd5000] flex-shrink-0", className)} />;
}

/* ─── TRUST BAR ───────────────────────────────────────────────── */
interface TrustBarItem { title: string; desc: string; }
const TRUST_ICONS: LucideIcon[] = [ShieldCheck, CheckCircle, Ship, DollarSign, Globe];

export function TrustBar({ items }: { items: TrustBarItem[] }) {
  return (
    <motion.div
      initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
      variants={stagger}
      className="relative z-10 bg-background border-y border-border"
    >
      {/* Ticker-style inner rule */}
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {items.map((item, idx) => {
            const Icon = TRUST_ICONS[idx % TRUST_ICONS.length];
            return (
              <motion.div
                key={idx}
                variants={fadeUp}
                className="flex items-center gap-3 py-4 px-5 first:pl-0 last:pr-0 group"
              >
                <div className="shrink-0 w-8 h-8 flex items-center justify-center border border-[#fd5000]/30 bg-[#fd5000]/5 text-[#fd5000] transition-colors group-hover:bg-[#fd5000] group-hover:border-[#fd5000] group-hover:text-white">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground tracking-tight leading-tight truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── RECOMMENDED PICKS HEADER ────────────────────────────────── */
export function RecommendedHeader() {
  return (
    <motion.div
      initial="hidden" whileInView="show" viewport={{ once: true }}
      variants={stagger}
      className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
    >
      <motion.div variants={fadeUp}>
        <Eyebrow text="Hand-Picked Listings" />
        <h2 className="text-[28px] sm:text-[34px] font-black text-foreground leading-tight tracking-tight flex items-center gap-3">
          <span className="inline-flex rounded-sm items-center justify-center w-9 h-9 border border-[#fd5000]/30 bg-[#fd5000]/5">
            <Star className="h-4 w-4 fill-[#fd5000] text-[#fd5000]" />
          </span>
          Recommended Picks
        </h2>
        <p className="mt-2 text-[14px] font-medium text-muted-foreground">
          Curated from verified suppliers — updated as inventory changes.
        </p>
      </motion.div>
      <motion.div variants={fadeUp}>
        <Link
          href="/marketplace"
          className="inline-flex rounded-sm items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors border border-border hover:border-foreground/30 bg-background"
        >
          Browse all <ChevronRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </motion.div>
  );
}

/* ─── CATEGORY SIDEBAR ────────────────────────────────────────── */
interface SidebarCat { icon: React.ReactNode; label: string; slug: string; }

export function CategorySidebar({ cats }: { cats: SidebarCat[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className="sticky top-[calc(var(--navbar-height)+1rem)] bg-background border border-border overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <Eyebrow text="Browse by Category" />
      </div>

      <div className="divide-y divide-border/60">
        {cats.slice(0, 8).map((cat, idx) => (
          <Link
            key={idx}
            href={`/marketplace?cat=${encodeURIComponent(cat.slug)}`}
            className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors group"
          >
            <div className="w-7 h-7 flex items-center justify-center border border-border text-muted-foreground group-hover:border-[#fd5000]/40 group-hover:text-[#fd5000] transition-colors flex-shrink-0">
              {cat.icon}
            </div>
            <span className="text-[13px] font-semibold text-foreground/80 group-hover:text-foreground flex-1 transition-colors">{cat.label}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <Link
          href="/marketplace"
          className="block w-full text-center py-2.5 text-[12px] font-semibold text-[#fd5000] border border-[#fd5000]/30 hover:bg-[#fd5000] hover:text-white transition-all"
        >
          View All Categories
        </Link>
      </div>
    </motion.div>
  );
}

/* ─── FLASH DEALS ─────────────────────────────────────────────── */
export function FlashDeals({ products }: { products: any[] }) {
  return (
    <motion.div
      initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className="bg-background border border-border overflow-hidden rounded-xl"
    >
      {/* Header row — ruled, no card shadows */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between ">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#fd5000] rounded-full flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-white fill-white stroke-none" />
          </div>
          <div>
            <h3 className="text-[18px] font-black text-foreground leading-tight tracking-tight">Flash Trade Deals</h3>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Live · Refreshed daily</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded px-3 py-1 border border-[#fd5000]/30 bg-[#fd5000]/5">
          <AccentDot className="animate-pulse" />
          <span className="text-[10px] font-bold text-[#fd5000] uppercase tracking-wider">High Demand</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-x divide-border">
        {products.slice(0, 5).map((p, i) => {
          const dealPct = stableDiscountPercent(p.id);
          const heat = Math.min(94, 65 + (dealPct % 30));
          const img = p.images?.[0] || null;

          return (
            <motion.div key={p.id} variants={scaleIn} className="group">
              <Link
                href={`/marketplace/${p.slug}`}
                className="block p-4 hover:bg-muted/30 transition-colors border-t border-border md:border-t-0 relative"
              >
                {/* Discount badge — top-left corner, not floating */}
                <div className="absolute rounded-br top-0 left-0 bg-[#fd5000] text-white text-[10px] font-bold px-2 py-0.5 leading-none">
                  -{dealPct}%
                </div>

                {/* Product image */}
                <div className="aspect-square bg-muted flex items-center justify-center mb-3 mt-4 overflow-hidden border border-border/50">
                  {img
                    ? <img src={img} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <Package className="h-8 w-8 text-muted-foreground/30" />
                  }
                </div>

                {/* Product info */}
                <h4 className="text-[13px] font-bold text-foreground line-clamp-1 group-hover:text-[#fd5000] transition-colors tracking-tight mb-1">
                  {p.name || "Refined Goods"}
                </h4>
                <div className="text-[16px] font-black text-foreground tracking-tighter mb-3">
                  {formatDisplayMoney(Number(p.price), (p as any).currency ?? "RWF")}
                </div>

                {/* Heat bar */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold text-[#fd5000] uppercase tracking-widest">{heat}% Sold</span>
                    {heat > 80 && (
                      <span className="text-[9px] font-bold text-[#fd5000]">HOT</span>
                    )}
                  </div>
                  <div className="w-full h-1 bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${heat}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                      className="h-full bg-[#fd5000]"
                    />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─── TRENDING SIDE PANEL ─────────────────────────────────────── */
interface TrendingCat { name: string; slug: string; product_count?: number; }
interface Supplier { business_name?: string; business_slug?: string; rating?: number; }

export function TrendingSidePanel({
  trendingCats, suppliers,
}: { trendingCats: TrendingCat[]; suppliers: Supplier[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="hidden lg:flex flex-col gap-4 "
    >
      {/* Trending Now — dark panel */}
      <div className="bg-stone-900 dark:bg-stone-950 border border-stone-800 overflow-hidden rounded-lg">
        <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.2em] mb-0.5">Hot This Week</p>
            <h3 className="text-[16px] font-bold text-white tracking-tight leading-none">Trending Now</h3>
          </div>
          <AccentDot className="animate-pulse" />
        </div>
        <div className="divide-y divide-stone-800">
          {trendingCats.map((item, i) => (
            <Link
              key={item.slug}
              href={`/marketplace?cat=${encodeURIComponent(item.slug)}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-stone-800/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold text-stone-600 tabular-nums w-4">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13px] font-semibold text-stone-300 group-hover:text-white transition-colors">{item.name}</span>
              </div>
              <span className="text-[10px] text-stone-600 font-bold tabular-nums">
                {item.product_count != null && item.product_count > 0 ? item.product_count : "—"}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Top Suppliers */}
      <div className="bg-background border border-border overflow-hidden rounded-lg">
        <div className="px-5 py-3.5 border-b border-border">
          <Eyebrow text="Top Suppliers" />
        </div>
        <div className="divide-y divide-border/60">
          {suppliers.length === 0 ? (
            <p className="text-[12px] text-muted-foreground px-5 py-4">Suppliers appear as stores join.</p>
          ) : (
            suppliers.map((v, i) => (
              <Link
                key={v.business_slug ?? i}
                href={v.business_slug ? `/vendors/${v.business_slug}` : "/vendors"}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors group"
              >
                {/* Rank */}
                <span className="text-[11px] font-bold text-muted-foreground/40 tabular-nums w-5 flex-shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* Initial avatar */}
                <div className="w-8 h-8 bg-[#fd5000]/10 border border-[#fd5000]/20 text-[#fd5000] text-[12px] font-black flex items-center justify-center flex-shrink-0 group-hover:bg-[#fd5000] group-hover:text-white transition-colors">
                  {(v.business_name ?? "?")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-[#fd5000] transition-colors">{v.business_name}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Star className="h-3 w-3 fill-[#fd5000] text-[#fd5000]" />
                    {Number(v.rating ?? 0).toFixed(1)} · Active
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── INDUSTRIES SECTION ──────────────────────────────────────── */
interface Industry { name: string; slug: string; product_count?: number; image_url?: string | null; }

function pickIcon(slug: string, name: string): LucideIcon {
  const s = `${slug} ${name}`.toLowerCase();
  if (s.includes("elect")) return Zap;
  if (s.includes("fashion") || s.includes("apparel")) return Menu;
  if (s.includes("machin")) return Menu;
  if (s.includes("agri")) return Globe;
  if (s.includes("health")) return ShieldCheck;
  return Package;
}

export function IndustriesSection({ industries }: { industries: Industry[] }) {
  return (
    <motion.section
      initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className="bg-background border border-border overflow-hidden rounded-xl"
    >
      {/* Section header */}
      <div className="px-8 py-5 border-b rounded-md border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div variants={fadeUp} className="rounded-md">
          <Eyebrow text="Browse by Sector" />
          <h2 className="text-[28px] sm:text-[34px] font-bold text-foreground tracking-tight leading-tight flex items-center gap-3">
            <span className="inline-flex rounded-sm items-center justify-center w-9 h-9 border border-border text-muted-foreground">
              <Menu className="h-4 w-4" />
            </span>
            Global Industries
          </h2>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#fd5000] uppercase tracking-[0.15em] hover:gap-3 transition-all">
            All Sections <ChevronRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>

      {/* Industry grid — borderless inner cards, separated by grid lines */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-border">
        {industries.map((cat, i) => {
          const Icon = pickIcon(cat.slug, cat.name);
          const img = industryCardBackground(cat.slug, cat.image_url ?? null);
          const grad = INDUSTRY_GRADIENTS[i % INDUSTRY_GRADIENTS.length];
          const countLabel = cat.product_count != null && cat.product_count > 0
            ? cat.product_count >= 1000
              ? `${Math.round(cat.product_count / 1000)}k+`
              : `${cat.product_count}+`
            : "Explore";

          return (
            <motion.div key={cat.slug} variants={scaleIn}>
              <Link
                href={`/marketplace?cat=${encodeURIComponent(cat.slug)}`}
                className="relative h-[180px] overflow-hidden block group"
              >
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${img}')` }} />
                <div className={cn("absolute inset-0", grad)} />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-[#fd5000]/0 group-hover:bg-[#fd5000]/15 transition-colors duration-300" />
                <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center z-10">
                  <div className="w-9 h-9 border border-white/30 bg-black/20 flex items-center justify-center mb-2 group-hover:border-white/60 transition-colors">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-[14px] font-bold text-white leading-tight">{cat.name}</h4>
                  <p className="text-[10px] text-white/60 font-semibold uppercase tracking-widest mt-1">{countLabel}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

/* ─── AFFILIATE PANEL ─────────────────────────────────────────── */
interface AffiliatePanelProps {
  valueProps: string[];
  campaigns?: string[];
  spotlightCreator?: {
    full_name?: string;
    total_earnings?: number;
    total_clicks?: number;
    total_conversions?: number;
  } | null;
  trendingCats: { name: string }[];
}

export function AffiliatePanel({
  valueProps, campaigns = [], spotlightCreator, trendingCats,
}: AffiliatePanelProps) {
  const chips = campaigns.length > 0 ? campaigns : trendingCats.map(c => c.name);

  return (
    <motion.section
      initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className="border border-border overflow-hidden grid grid-cols-1 lg:grid-cols-2 min-h-[460px] rounded-xl"
    >
      {/* Left — value prop */}
      <motion.div
        variants={fadeUp}
        className="p-8 md:p-12 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-border bg-background"
      >
        <span className="inline-block w-fit px-4 py-1.5 bg-foreground text-background text-[10px] font-black uppercase tracking-[0.2em] mb-6">
          Partner with Jimvio
        </span>
        <h3 className="text-[32px] md:text-[40px] font-black text-foreground leading-tight mb-6 tracking-tight">
          Turn Your Network<br />Into Global Trade
        </h3>
        <p className="text-[15px] text-muted-foreground font-medium leading-relaxed mb-8 max-w-md">
          Earn high-ticket commissions on every bulk deal referred through our creator-friendly B2B ecosystem.
        </p>

        {/* Value props list */}
        <div className="space-y-2.5 mb-10">
          {valueProps.map((t) => (
            <div key={t} className="flex items-center gap-3 text-[14px] font-medium text-foreground">
              <div className="w-5 h-5 flex items-center rounded justify-center bg-[#fd5000] text-white text-[10px] font-black flex-shrink-0">
                ✓
              </div>
              {t}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            className="h-11 px-8 bg-foreground text-background font-bold text-[14px] hover:opacity-85 transition-opacity border-0"
            asChild
          >
            <Link href="/register?role=affiliate">Start Earning →</Link>
          </Button>
          <Button
            variant="outline"
            className="h-11 px-8 border-border text-foreground font-bold text-[14px] hover:bg-muted/50"
            asChild
          >
            <Link href="/dashboard">Creator Hub →</Link>
          </Button>
        </div>
      </motion.div>

      {/* Right — chips + spotlight */}
      <motion.div
        variants={fadeUp}
        className="p-8 md:p-12 flex flex-col justify-center bg-stone-50 dark:bg-stone-900/50"
      >
        {chips.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[22px] font-black text-foreground mb-1 tracking-tight">Active Categories</h3>
            <p className="text-[13px] text-muted-foreground font-medium mb-5">Bridging manufacturers and authentic voices.</p>
            <div className="flex flex-wrap gap-2">
              {chips.map((t, i) => (
                <span
                  key={`${t}-${i}`}
                  className={cn(
                    "px-3 py-1.5 rounded text-[11px] font-bold border capitalize tracking-[0.08em]",
                    i === 0
                      ? "bg-[#fd5000] text-white border-[#fd5000]"
                      : "bg-background text-muted-foreground border-border hover:border-[#fd5000]/40 hover:text-[#fd5000] transition-colors cursor-default"
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Creator spotlight */}
        <div className="border border-border bg-background p-5 flex items-center gap-4 border-l-2 border-l-[#fd5000]">
          {spotlightCreator ? (
            <>
              <Avatar className="h-11 w-11 flex-shrink-0">
                <AvatarFallback className="bg-[#fd5000] text-white font-black text-[15px]">
                  {(spotlightCreator.full_name ?? "C")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-foreground truncate">{spotlightCreator.full_name ?? "Top creator"}</p>
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.1em]">
                  {Number(spotlightCreator.total_conversions ?? 0).toLocaleString()} conversions
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[18px] font-black text-[#fd5000]">
                  {formatDisplayMoney(Number(spotlightCreator.total_earnings ?? 0), "RWF")}
                </div>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.15em]">Earnings</p>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground w-full text-center py-2">
              Be the first top earner — share products you love.
            </p>
          )}
        </div>

        <Button
          className="w-full h-11 mt-6 bg-[#fd5000] hover:bg-orange-600 text-white font-bold text-[14px] border-0"
          asChild
        >
          <Link href="/dashboard">Access Dashboard →</Link>
        </Button>
      </motion.div>
    </motion.section>
  );
}

/* ─── MARKET INTELLIGENCE ─────────────────────────────────────── */
interface MarketCategory { name: string; product_count?: number; }

export function MarketIntelligence({
  categories, trending,
}: { categories: MarketCategory[]; trending: any[] }) {
  const displayCats = categories.length > 0
    ? categories.slice(0, 4)
    : [
      { name: "Electronics", product_count: 80 },
      { name: "Machinery", product_count: 35 },
      { name: "Textiles", product_count: 65 },
      { name: "Health", product_count: 90 },
    ];

  return (
    <motion.div
      initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className="grid grid-cols-1 gap-px lg:grid-cols-2 border border-border bg-border rounded-xl"
    >
      {/* Market Pulse */}
      <motion.div variants={fadeUp} className="bg-background p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 flex items-center justify-center border border-border text-muted-foreground">
            <BarChart2 className="h-4 w-4" />
          </div>
          <h4 className="text-[20px] font-bold text-foreground tracking-tight">Market Pulse</h4>
        </div>

        {/* Ruled separator */}
        <Rule className="mb-6" />

        <div className="space-y-5">
          {displayCats.map((cat, i) => (
            <div key={i} className="space-y-2 group">
              <div className="flex justify-between items-baseline">
                <span className="text-[13px] font-semibold rounded-r text-foreground group-hover:text-[#fd5000] transition-colors">
                  {cat.name}
                </span>
                <span className="text-[11px] font-bold text-emerald-500 tabular-nums">↑ {8 + i}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${60 + i * 10}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: i * 0.12, ease: "easeOut" }}
                  className="h-full bg-[#fd5000] rounded-md"
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Hot Sourcing */}
      <motion.div variants={fadeUp} className="bg-background p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center border border-border text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h4 className="text-[20px] font-bold text-foreground tracking-tight">Hot Sourcing</h4>
          </div>
          <div className="flex items-center gap-1.5">
            <AccentDot className="animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Live</span>
          </div>
        </div>

        <Rule className="mb-5" />

        {/* Category tags — flat, not pill-shaped */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {categories.slice(0, 8).map((cat: any) => (
            <Link key={cat.id} href={`/marketplace?cat=${encodeURIComponent(cat.slug)}`}>
              <span className="inline-flex cursor-pointer rounded border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:border-[#fd5000]/40 hover:text-[#fd5000] hover:bg-[#fd5000]/5 transition-all">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>

        {/* Trending products — ruled list */}
        <div className="divide-y divide-border">
          {trending.slice(0, 3).map((prod: any, i: number) => (
            <Link key={prod.id ?? i} href={`/marketplace/${prod.slug}`} className="group flex gap-3 py-3 first:pt-0 last:pb-0 items-center">
              <div className="w-11 h-11 items-center justify-center flex-shrink-0 bg-muted border rounded-md border-border overflow-hidden">
                {prod.images?.[0]
                  ? <img src={prod.images[0]} className="h-full w-full object-cover" alt="" />
                  : <Package className="h-4 w-4 text-muted-foreground/40 m-auto" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-[12px] font-semibold text-foreground line-clamp-1 group-hover:text-[#fd5000] transition-colors">{prod.name}</h5>
                <p className="text-[11px] text-muted-foreground">{formatDisplayMoney(Number(prod.price ?? 0), (prod as any).currency ?? "RWF")}</p>
              </div>
              <div className="flex-shrink-0 bg-[#fd5000] px-2 py-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wide text-white">Live</span>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── HOW IT WORKS ────────────────────────────────────────────── */
export function HowItWorks() {
  const steps = [
    { icon: <UserPlus className="h-5 w-5" />, num: "01", title: "Digital ID", desc: "One unified account for vendors, buyers, and creators." },
    { icon: <ArrowRight className="h-5 w-5" />, num: "02", title: "AI Search", desc: "Find verified partners in seconds using our neural matching." },
    { icon: <Search className="h-5 w-5" />, num: "03", title: "Smart Contracts", desc: "Automated agreements and secure multi-currency escrow." },
    { icon: <ShieldCheck className="h-5 w-5" />, num: "04", title: "Global Sync", desc: "Real-time tracking and logistics integration across 180 countries." },
  ];

  return (
    <div className="relative overflow-hidden py-16 md:py-24 bg-stone-50 dark:bg-stone-900/60 border-y border-border">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>

          <motion.div variants={fadeUp} className="mb-12">
            <Eyebrow text="How it works" />
            <h2 className="text-[30px] sm:text-[38px] font-bold text-foreground tracking-tight">The Jimvio Protocol</h2>
            <p className="mt-2 text-[15px] font-medium text-muted-foreground max-w-md">
              Simplifying global trade for the modern era
            </p>
          </motion.div>

          {/* Steps — ruled grid, numbered */}
          <div className="grid grid-cols-1 sm:grid-cols-2 rounded-lg lg:grid-cols-4 border border-border divide-x divide-y sm:divide-y-0 divide-border">
            {steps.map((s, idx) => (
              <motion.div key={idx} variants={fadeUp}>
                <div className="p-7 group hover:bg-muted/30 transition-colors h-full">
                  {/* Step number */}
                  <p className="text-[11px] font-bold text-muted-foreground/40 tracking-widest mb-4">{s.num}</p>
                  <div className="w-10 h-10 rounded flex items-center justify-center border border-border text-muted-foreground mb-4 group-hover:border-[#fd5000]/40 group-hover:text-[#fd5000] transition-colors">
                    {s.icon}
                  </div>
                  <h4 className="text-[15px] font-semibold text-foreground mb-2">{s.title}</h4>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-8">
            <Button
              className="h-11 px-10 bg-[#fd5000] hover:bg-orange-600
               text-white text-[13px] font-medium capitalize border-0"
              asChild
            >
              <Link href="/marketplace">Initialize Trade Access →</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── APP PROMO ───────────────────────────────────────────────── */
export function AppPromo() {
  return (
    <div className="relative overflow-hidden py-20 md:py-28 bg-stone-900 dark:bg-stone-950 border-t border-stone-800">
      <motion.div
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="max-w-[1536px] mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-start justify-between gap-16 relative z-10"
      >
        <motion.div variants={fadeUp} className="flex-1 max-w-[580px]">
          <Eyebrow text="Mobile Ecosystem" />
          <h3 className="text-[36px] sm:text-[48px] font-bold text-white mb-5 leading-tight tracking-tight">
            Trade Anywhere.<br />
            <span className="text-[#fd5000]">Global Mastery.</span>
          </h3>
          <p className="text-[15px] text-stone-400 font-medium leading-relaxed mb-10 max-w-[500px]">
            The Jimvio mobile app integrates every facet of the creator-commerce ecosystem into a single high-performance interface.
          </p>

          <Rule className="bg-stone-800 mb-8" />

          {/* Store buttons — hard-edged */}
          <div className="flex flex-wrap gap-3">
            {[
              { name: "App Store", sub: "Available on", icon: <Lock className="h-5 w-5" /> },
              { name: "Google Play", sub: "Get it on", icon: <PlayCircle className="h-5 w-5" /> },
            ].map(btn => (
              <div
                key={btn.name}
                className="flex rounded-sm items-center gap-4 px-6 py-3.5 cursor-pointer transition-all group border border-stone-700 hover:border-[#fd5000]/50 hover:bg-[#fd5000]/5"
              >
                <div className="text-stone-500 group-hover:text-[#fd5000] transition-colors flex-shrink-0">{btn.icon}</div>
                <div>
                  <div className="text-[10px] text-stone-600 font-bold uppercase tracking-[0.2em]">{btn.sub}</div>
                  <div className="text-[16px] font-bold tracking-tight text-white leading-tight mt-0.5">{btn.name}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}


// function CategoryBrowse() {
//     const cats = [
//         { name: "Electronics", count: "2.4K+", icon: Zap },
//         { name: "Fashion", count: "5.1K+", icon: Tag },
//         { name: "Home & Living", count: "1.8K+", icon: Layers },
//         { name: "Health", count: "890+", icon: Heart },
//         { name: "Business", count: "1.2K+", icon: BarChart3 },
//         { name: "Local Vendors", count: "640+", icon: MapPin },
//     ];

//     return (
//         <section className="py-20 sm:py-28" style={{ background: "var(--color-bg)" }}>
//             <div className="max-w-8xl mx-auto px-4 sm:px-6">
//                 <motion.div
//                     initial="hidden"
//                     whileInView="show"
//                     viewport={{ once: true, margin: "-80px" }}
//                     variants={stagger}
//                 >
//                     <motion.div
//                         variants={fadeUp}
//                         className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
//                     >
//                         <div>
//                             <p
//                                 className="text-[11px] font-bold uppercase tracking-widest mb-2"
//                                 style={{ color: "var(--color-accent)" }}
//                             >
//                                 Product categories
//                             </p>
//                             <h2
//                                 className="font-black tracking-tight"
//                                 style={{
//                                     fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
//                                     color: "var(--color-text-primary)",
//                                     letterSpacing: "-0.02em",
//                                 }}
//                             >
//                                 Browse by category
//                             </h2>
//                         </div>
//                         <Link
//                             href="/marketplace"
//                             className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0"
//                             style={{ color: "var(--color-accent)" }}
//                         >
//                             View all products <ChevronRight className="h-4 w-4" />
//                         </Link>
//                     </motion.div>

//                     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
//                         {cats.map(cat => (
//                             <motion.div key={cat.name} variants={fadeUp}>
//                                 <Link
//                                     href={`/marketplace?category=${cat.name.toLowerCase().replace(/ /g, "-")}`}
//                                     className="group flex flex-col items-center text-center p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
//                                     style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
//                                     onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(253,80,0,0.3)")}
//                                     onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
//                                 >
//                                     <div
//                                         className="h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
//                                         style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)" }}
//                                     >
//                                         <cat.icon className="h-5 w-5" />
//                                     </div>
//                                     <p className="text-xs font-bold mb-1 leading-tight" style={{ color: "var(--color-text-primary)" }}>
//                                         {cat.name}
//                                     </p>
//                                     <p className="text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
//                                         {cat.count} items
//                                     </p>
//                                 </Link>
//                             </motion.div>
//                         ))}
//                     </div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// /* ─── Updated type ─── */


// export function AffiliateSpotlight() {
//     const [cards, setCards] = useState<AffiliateCampaign[]>(AFFILIATE_FALLBACK);
//     const [affiliateStats, setAffiliateStats] = useState<AffiliateStats>({
//         affiliateCount: 0,
//         affiliateSkus: 0,
//         totalProducts: 0,
//     });
//     const [maxRate, setMaxRate] = useState(0);

//     useEffect(() => {
//         async function fetchData() {
//             const db = createClient();
//             const { data, count, error } = await db
//                 .from("products")
//                 .select("id, slug, name, product_type, affiliate_commission_rate, price, currency, images, is_featured, status, is_active, affiliate_enabled", { count: "exact" })
//                 .eq("status", "active")
//                 .eq("is_active", true)
//                 .eq("affiliate_enabled", true);

//             if (error) {
//                 console.error("Supabase error:", error);
//                 return;
//             }

//             const spotlight = data ?? [];

//             const fetchedMaxRate = spotlight.reduce(
//                 (m: number, p: any) => Math.max(m, Number(p.affiliate_commission_rate ?? 0)),
//                 0
//             );

//             const displayCampaigns: AffiliateCampaign[] = spotlight.map((p: any) => ({
//                 id: p.id,
//                 slug: p.slug ?? p.id,
//                 title: p.name,
//                 // Capitalise the product_type for display
//                 campaign_type: p.product_type
//                     ? p.product_type.charAt(0).toUpperCase() + p.product_type.slice(1)
//                     : "Affiliate",
//                 commission: Number(p.affiliate_commission_rate ?? DEFAULT_COMMISSION),
//                 price: Number(p.price ?? 0),
//                 currency: p.currency ?? "USD",
//                 image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
//                 is_featured: !!p.is_featured,
//             }));

//             setMaxRate(fetchedMaxRate);
//             setAffiliateStats({
//                 affiliateCount: spotlight.length,
//                 affiliateSkus: spotlight.length,
//                 totalProducts: count ?? spotlight.length,
//             });

//             if (displayCampaigns.length > 0) setCards(displayCampaigns);
//         }
//         fetchData();
//     }, []);

//     const heroRate = maxRate > 0 ? Math.round(maxRate) : DEFAULT_COMMISSION;

//     const statsGrid = [
//         { label: "Active Affiliates", value: affiliateStats.affiliateCount ? formatPlatformCount(affiliateStats.affiliateCount) : "—" },
//         { label: "Affiliate-ready SKUs", value: affiliateStats.affiliateSkus ? formatPlatformCount(affiliateStats.affiliateSkus) : "—" },
//         { label: "Top commission rate", value: maxRate > 0 ? `${Math.round(maxRate)}%` : `${heroRate}%` },
//         { label: "Live products", value: affiliateStats.totalProducts ? formatPlatformCount(affiliateStats.totalProducts) : "—" },
//     ];

//     return (
//         <section
//             className="py-20 sm:py-28"
//             style={{
//                 background: "var(--color-surface)",
//                 borderTop: "1px solid var(--color-border)",
//                 borderBottom: "1px solid var(--color-border)",
//             }}
//         >
//             <div className="max-w-8xl mx-auto px-4 sm:px-6">
//                 <motion.div
//                     initial="hidden"
//                     whileInView="show"
//                     viewport={{ once: true, margin: "-80px" }}
//                     variants={stagger}
//                 >
//                     {/* ── Header ── */}
//                     <motion.div
//                         variants={fadeUp}
//                         className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end mb-12"
//                     >
//                         <div>
//                             <p className="text-[11px] font-bold uppercase tracking-widest mb-2"
//                                 style={{ color: "var(--color-accent)" }}>
//                                 Affiliate program
//                             </p>
//                             <h2
//                                 className="font-black tracking-tight mb-4"
//                                 style={{
//                                     fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
//                                     color: "var(--color-text-primary)",
//                                     letterSpacing: "-0.025em",
//                                 }}
//                             >
//                                 Earn commissions on<br />every product you share
//                             </h2>
//                             <p className="text-base max-w-lg" style={{ color: "var(--color-text-muted)" }}>
//                                 Get your unique affiliate link. Share anywhere. Earn up to{" "}
//                                 <strong style={{ color: "var(--color-accent)" }}>{heroRate}%</strong> on every
//                                 purchase — automatically tracked and paid.
//                             </p>
//                         </div>

//                         {/* Stats sidebar */}
//                         <div
//                             className="flex flex-col gap-4 p-5 rounded-2xl shrink-0 w-full lg:w-56"
//                             style={{ background: "rgba(253,80,0,0.05)", border: "1px solid rgba(253,80,0,0.15)" }}
//                         >
//                             {statsGrid.map(row => (
//                                 <div key={row.label} className="flex items-center justify-between">
//                                     <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{row.label}</span>
//                                     <span className="text-sm font-black" style={{ color: "var(--color-accent)" }}>{row.value}</span>
//                                 </div>
//                             ))}
//                         </div>
//                     </motion.div>
//                     <SwipeableCardGrid
//                         items={cards}
//                         cols={{ sm: 2, lg: 4 }}
//                         renderCard={(c) => (
//                             <motion.div key={c.id} variants={fadeUp} className="relative">

//                                 {/* Featured badge */}
//                                 {c.is_featured && (
//                                     <div
//                                         className="absolute -top-3 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-bold text-white"
//                                         style={{ background: "var(--color-accent)", boxShadow: "0 4px 12px rgba(253,80,0,0.35)" }}
//                                     >
//                                         ⭐ Featured
//                                     </div>
//                                 )}
//                                 <Link
//                                     href={`/marketplace/${c.slug}`}
//                                     className="group flex flex-col rounded-2xl h-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
//                                     style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
//                                     onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(253,80,0,0.35)")}
//                                     onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
//                                 >
//                                     {/* ── Product image / placeholder ── */}
//                                     <div
//                                         className="relative w-full overflow-hidden"
//                                         style={{
//                                             height: "160px",
//                                             background: c.image ? "transparent" : "rgba(253,80,0,0.06)",
//                                             borderBottom: "1px solid var(--color-border)",
//                                         }}
//                                     >
//                                         {c.image ? (
//                                             <img
//                                                 src={c.image}
//                                                 alt={c.title}
//                                                 className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
//                                             />
//                                         ) : (
//                                             <div className="w-full h-full flex items-center justify-center">
//                                                 <Package
//                                                     className="h-10 w-10"
//                                                     style={{ color: "rgba(253,80,0,0.3)" }}
//                                                 />
//                                             </div>
//                                         )}

//                                         {/* Product type pill */}
//                                         <div
//                                             className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
//                                             style={{
//                                                 background: "rgba(0,0,0,0.55)",
//                                                 color: "#fff",
//                                                 backdropFilter: "blur(4px)",
//                                             }}
//                                         >
//                                             {c.campaign_type}
//                                         </div>

//                                         {/* Commission badge */}
//                                         <div
//                                             className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black"
//                                             style={{ background: "var(--color-accent)", color: "#fff" }}
//                                         >
//                                             <DollarSign className="h-3 w-3" />
//                                             {c.commission}% commission
//                                         </div>
//                                     </div>

//                                     {/* ── Card body ── */}
//                                     <div className="flex flex-col flex-1 p-4 gap-3">
//                                         <p
//                                             className="text-sm font-bold leading-snug line-clamp-2"
//                                             style={{ color: "var(--color-text-primary)" }}
//                                         >
//                                             {c.title}
//                                         </p>

//                                         {/* Price row */}
//                                         <div className="flex items-center justify-between">
//                                             <span
//                                                 className="text-lg font-black"
//                                                 style={{ color: "var(--color-text-primary)" }}
//                                             >
//                                                 {c.currency === "USD" ? "$" : c.currency}
//                                                 {c.price.toFixed(2)}
//                                             </span>
//                                             <span
//                                                 className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
//                                                 style={{
//                                                     background: "rgba(253,80,0,0.08)",
//                                                     color: "var(--color-accent)",
//                                                     border: "1px solid rgba(253,80,0,0.18)",
//                                                 }}
//                                             >
//                                                 Affiliate enabled
//                                             </span>
//                                         </div>

//                                         {/* Earnings estimate */}
//                                         <div
//                                             className="flex items-center justify-between p-3 rounded-xl mt-auto"
//                                             style={{ background: "rgba(253,80,0,0.05)", border: "1px solid rgba(253,80,0,0.12)" }}
//                                         >
//                                             <div>
//                                                 <p className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>
//                                                     You earn per sale
//                                                 </p>
//                                                 <p className="text-base font-black" style={{ color: "var(--color-accent)" }}>
//                                                     {c.currency === "USD" ? "$" : c.currency}
//                                                     {((c.price * c.commission) / 100).toFixed(2)}
//                                                 </p>
//                                             </div>
//                                             <div
//                                                 className="flex items-center gap-1 text-xs font-bold transition-all group-hover:gap-2"
//                                                 style={{ color: "var(--color-accent)" }}
//                                             >
//                                                 Get link <ExternalLink className="h-3.5 w-3.5" />
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </Link>
//                             </motion.div>
//                         )}
//                     />

//                     {/* ── CTA ── */}
//                     <motion.div variants={fadeUp} className="flex justify-center mt-9">
//                         <Link
//                             href="/affiliate"
//                             className="inline-flex items-center gap-2.5 h-12 px-8 rounded-2xl text-sm font-bold text-white"
//                             style={{ background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.28)" }}
//                             onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                             onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//                         >
//                             Browse all affiliate products <ArrowRight className="h-4 w-4" />
//                         </Link>
//                     </motion.div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// /* ═══════════════════════════════════════════════
//    HOW IT WORKS
// ═══════════════════════════════════════════════ */
// function HowItWorks() {
//     const steps = [
//         { num: "01", icon: Users, title: "Create your free account", desc: "Sign up in 60 seconds. No credit card required." },
//         { num: "02", icon: Search, title: "Pick your path", desc: "Sell products, become an affiliate, or join communities." },
//         { num: "03", icon: Store, title: "List or promote", desc: "Add your own products or share links to earn commissions." },
//         { num: "04", icon: Wallet, title: "Get paid", desc: "Withdraw earnings directly to your account, any time." },
//     ];

//     return (
//         <section
//             className="py-20 sm:py-28"
//             style={{
//                 background: "var(--color-surface)",
//                 borderTop: "1px solid var(--color-border)",
//                 borderBottom: "1px solid var(--color-border)",
//             }}
//         >
//             <div className="max-w-8xl mx-auto px-4 sm:px-6">
//                 <motion.div
//                     initial="hidden"
//                     whileInView="show"
//                     viewport={{ once: true, margin: "-80px" }}
//                     variants={stagger}
//                 >
//                     <motion.div variants={fadeUp} className="text-center mb-14">
//                         <p
//                             className="text-[11px] font-bold uppercase tracking-widest mb-2"
//                             style={{ color: "var(--color-accent)" }}
//                         >
//                             Simple to start
//                         </p>
//                         <h2
//                             className="font-black tracking-tight mb-3"
//                             style={{
//                                 fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
//                                 color: "var(--color-text-primary)",
//                                 letterSpacing: "-0.025em",
//                             }}
//                         >
//                             From zero to earning<br />in 4 steps
//                         </h2>
//                         <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
//                             No experience needed. Built for anyone ready to grow online.
//                         </p>
//                     </motion.div>

//                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
//                         {steps.map((step, i) => (
//                             <motion.div key={step.num} variants={fadeUp}>
//                                 <div
//                                     className="relative flex flex-col p-6 rounded-2xl h-full"
//                                     style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
//                                 >
//                                     <div
//                                         className="absolute top-4 right-4 text-5xl font-black leading-none select-none"
//                                         style={{ color: "rgba(253,80,0,0.07)" }}
//                                     >
//                                         {step.num}
//                                     </div>
//                                     <div
//                                         className="h-12 w-12 rounded-xl flex items-center justify-center mb-5 z-10"
//                                         style={{
//                                             background: "rgba(253,80,0,0.08)",
//                                             border: "1px solid rgba(253,80,0,0.15)",
//                                             color: "var(--color-accent)",
//                                         }}
//                                     >
//                                         <step.icon className="h-5 w-5" />
//                                     </div>
//                                     <p className="text-base font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
//                                         {step.title}
//                                     </p>
//                                     <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
//                                         {step.desc}
//                                     </p>
//                                     {i < steps.length - 1 && (
//                                         <div
//                                             className="hidden lg:block absolute top-1/2 -right-3 h-2 w-2 rounded-full -translate-y-1/2 z-20"
//                                             style={{ background: "var(--color-border-strong)" }}
//                                         />
//                                     )}
//                                 </div>
//                             </motion.div>
//                         ))}
//                     </div>

//                     <motion.div variants={fadeUp} className="flex justify-center mt-10">
//                         <Link
//                             href="/register"
//                             className="inline-flex items-center gap-2.5 px-9 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
//                             style={{ height: "50px", background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.28)" }}
//                             onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                             onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//                         >
//                             Get started free <ArrowRight className="h-4 w-4" />
//                         </Link>
//                     </motion.div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// /* ═══════════════════════════════════════════════
//    TRUST / STATS
// ═══════════════════════════════════════════════ */
// function TrustSection({ stats: trustStats }: { stats?: HomepageRedesignProps["stats"] }) {
//     const s = trustStats ?? { users: "10K+", earned: "$1M+", secure: "99.9%", countries: "50+" };
//     const items = [
//         { value: s.users, label: "Active users", icon: Users, sub: "and growing daily" },
//         { value: s.earned, label: "Total paid out", icon: DollarSign, sub: "to creators & sellers" },
//         { value: s.secure, label: "Platform uptime", icon: Shield, sub: "always available" },
//         { value: s.countries, label: "Countries", icon: Globe, sub: "worldwide reach" },
//     ];

//     return (
//         <section className="py-20 sm:py-28" style={{ background: "var(--color-bg)" }}>
//             <div className="max-w-8xl mx-auto px-4 sm:px-6">
//                 <motion.div
//                     initial="hidden"
//                     whileInView="show"
//                     viewport={{ once: true, margin: "-80px" }}
//                     variants={stagger}
//                 >
//                     <motion.div variants={fadeUp} className="text-center mb-14">
//                         <p
//                             className="text-[11px] font-bold uppercase tracking-widest mb-2"
//                             style={{ color: "var(--color-accent)" }}
//                         >
//                             By the numbers
//                         </p>
//                         <h2
//                             className="font-black tracking-tight"
//                             style={{
//                                 fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
//                                 color: "var(--color-text-primary)",
//                                 letterSpacing: "-0.025em",
//                             }}
//                         >
//                             Trusted by thousands globally
//                         </h2>
//                     </motion.div>

//                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//                         {items.map(item => (
//                             <motion.div key={item.label} variants={fadeUp}>
//                                 <div
//                                     className="flex flex-col items-center text-center p-7 rounded-2xl"
//                                     style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
//                                 >
//                                     <div
//                                         className="h-12 w-12 rounded-2xl flex items-center justify-center mb-5"
//                                         style={{
//                                             background: "rgba(253,80,0,0.08)",
//                                             border: "1px solid rgba(253,80,0,0.15)",
//                                             color: "var(--color-accent)",
//                                         }}
//                                     >
//                                         <item.icon className="h-5 w-5" />
//                                     </div>
//                                     <p
//                                         className="font-black mb-1"
//                                         style={{
//                                             fontSize: "clamp(2rem, 3vw, 2.75rem)",
//                                             color: "var(--color-text-primary)",
//                                             letterSpacing: "-0.03em",
//                                         }}
//                                     >
//                                         {item.value}
//                                     </p>
//                                     <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
//                                         {item.label}
//                                     </p>
//                                     <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{item.sub}</p>
//                                 </div>
//                             </motion.div>
//                         ))}
//                     </div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// /* ═══════════════════════════════════════════════
//    VENDOR BANNER
// ═══════════════════════════════════════════════ */
// function VendorBanner() {
//     return (
//         <section
//             className="py-16 sm:py-20"
//             style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}
//         >
//             <div className="max-w-8xl mx-auto px-4 sm:px-6">
//                 <motion.div
//                     initial="hidden"
//                     whileInView="show"
//                     viewport={{ once: true, margin: "-80px" }}
//                     variants={stagger}
//                 >
//                     <motion.div
//                         variants={fadeUp}
//                         className="relative overflow-hidden rounded-3xl p-8 sm:p-12"
//                         style={{
//                             background: "linear-gradient(135deg, #0d0600 0%, #1a0800 50%, #0d0600 100%)",
//                             border: "1px solid rgba(253,80,0,0.2)",
//                         }}
//                     >
//                         <div
//                             className="absolute top-0 right-0 w-[400px] h-[300px] pointer-events-none"
//                             style={{ background: "radial-gradient(ellipse at top right, rgba(253,80,0,0.15) 0%, transparent 60%)" }}
//                         />
//                         <div
//                             className="absolute inset-0 opacity-5 pointer-events-none"
//                             style={{
//                                 backgroundImage: "linear-gradient(rgba(253,80,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(253,80,0,0.6) 1px, transparent 1px)",
//                                 backgroundSize: "40px 40px",
//                             }}
//                         />
//                         <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
//                             <div>
//                                 <div className="flex items-center gap-2.5 mb-5">
//                                     <Award className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
//                                     <span
//                                         className="text-xs font-bold uppercase tracking-widest"
//                                         style={{ color: "var(--color-accent)" }}
//                                     >
//                                         For vendors &amp; sellers
//                                     </span>
//                                 </div>
//                                 <h2
//                                     className="font-black text-white tracking-tight mb-4"
//                                     style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)", letterSpacing: "-0.025em" }}
//                                 >
//                                     Ready to reach your<br />
//                                     <span style={{ color: "var(--color-accent)" }}>first 1,000 customers?</span>
//                                 </h2>
//                                 <p className="text-white/60 text-base max-w-lg">
//                                     List your products for free. Access our global network of buyers, affiliates
//                                     and communities ready to share your brand.
//                                 </p>
//                             </div>
//                             <div className="flex flex-col gap-3 shrink-0">
//                                 <Link
//                                     href="/vendor/register"
//                                     className="inline-flex items-center justify-center gap-2.5 px-8 rounded-2xl text-sm font-bold text-white transition-all"
//                                     style={{ height: "50px", background: "var(--color-accent)", boxShadow: "0 6px 20px rgba(253,80,0,0.4)" }}
//                                     onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                                     onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//                                 >
//                                     Open your store <Store className="h-4 w-4" />
//                                 </Link>
//                                 <Link
//                                     href="/marketplace"
//                                     className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-2xl text-sm font-semibold text-white/70 border border-white/10 hover:border-white/25 transition-all"
//                                 >
//                                     Browse marketplace
//                                 </Link>
//                             </div>
//                         </div>
//                     </motion.div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }

// /* ═══════════════════════════════════════════════
//    FINAL CTA
// ═══════════════════════════════════════════════ */
// function FinalCTA() {
//     return (
//         <section className="py-24 sm:py-32" style={{ background: "var(--color-bg)" }}>
//             <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
//                 <motion.div
//                     initial="hidden"
//                     whileInView="show"
//                     viewport={{ once: true, margin: "-80px" }}
//                     variants={stagger}
//                 >
//                     <motion.div variants={fadeUp}>
//                         <div
//                             className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7 text-xs font-bold"
//                             style={{
//                                 background: "rgba(253,80,0,0.08)",
//                                 border: "1px solid rgba(253,80,0,0.18)",
//                                 color: "var(--color-accent)",
//                             }}
//                         >
//                             <Star className="h-3.5 w-3.5" />
//                             Free forever — no credit card needed
//                         </div>
//                     </motion.div>

//                     <motion.h2
//                         variants={fadeUp}
//                         className="font-black tracking-tight mb-5"
//                         style={{
//                             fontSize: "clamp(2.5rem, 5vw, 4rem)",
//                             color: "var(--color-text-primary)",
//                             letterSpacing: "-0.035em",
//                             lineHeight: 1.05,
//                         }}
//                     >
//                         Your growth starts<br />
//                         <span style={{ color: "var(--color-accent)" }}>today.</span>
//                     </motion.h2>

//                     <motion.p
//                         variants={fadeUp}
//                         className="text-base leading-relaxed mb-10 max-w-sm mx-auto"
//                         style={{ color: "var(--color-text-muted)" }}
//                     >
//                         Thousands of vendors and affiliates already growing on Jimvio.
//                         Join for free and see the difference.
//                     </motion.p>

//                     <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
//                         <Link
//                             href="/register"
//                             className="group inline-flex items-center justify-center gap-2.5 px-10 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97]"
//                             style={{ height: "56px", background: "var(--color-accent)", boxShadow: "0 10px 32px rgba(253,80,0,0.32)" }}
//                             onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                             onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
//                         >
//                             Create Free Account
//                             <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
//                         </Link>
//                         <Link
//                             href="/marketplace"
//                             className="inline-flex items-center justify-center gap-2 px-8 rounded-2xl text-base font-semibold transition-all"
//                             style={{ height: "56px", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
//                             onMouseEnter={e => {
//                                 e.currentTarget.style.borderColor = "var(--color-border-strong)";
//                                 e.currentTarget.style.color = "var(--color-text-primary)";
//                             }}
//                             onMouseLeave={e => {
//                                 e.currentTarget.style.borderColor = "var(--color-border)";
//                                 e.currentTarget.style.color = "var(--color-text-secondary)";
//                             }}
//                         >
//                             Explore first
//                         </Link>
//                     </motion.div>

//                     <motion.div variants={fadeUp} className="flex items-center justify-center gap-6 mt-10 flex-wrap">
//                         {[
//                             { icon: CheckCircle, label: "No setup fees" },
//                             { icon: Shield, label: "Secure & private" },
//                             { icon: Globe, label: "Works globally" },
//                         ].map(({ icon: Icon, label }) => (
//                             <div key={label} className="flex items-center gap-1.5">
//                                 <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
//                                 <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
//                                     {label}
//                                 </span>
//                             </div>
//                         ))}
//                     </motion.div>
//                 </motion.div>
//             </div>
//         </section>
//     );
// }