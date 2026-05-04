
"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Sparkles, ShoppingBag, TrendingUp, Store, Video, Share2, Users, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAIStore } from "@/lib/store/use-ai-store";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { HeroSearch } from "@/components/marketplace/hero-search";
import { HeroRightPanel } from "./hero-right-panel";
import { HeroStoryCard } from "@/components/marketplace/hero-story-card";

// ─── Types ────────────────────────────────────────────────────────────────────

type Supplier = { business_name?: string; business_slug?: string; rating?: number };
type SpotlightCreator = { full_name?: string; total_earnings?: number; total_clicks?: number; total_conversions?: number } | null | undefined;
type ViralClip = {
  id: string; title: string; video_url: string;
  thumbnail_url?: string; total_views?: number; total_shares?: number;
  vendors?: { id: string; business_name: string; logo_url?: string };
};

interface HomepageHeroProps {
  heroKeywords: string[];
  heroCampaigns: string[];
  socialBar: { successRate: string };
  viralClips: ViralClip[];
  videos: any[];
  topSuppliersSidebar: Supplier[];
  spotlightCreator: SpotlightCreator;
  primaryCta: { label: string; href: string };
  platformStats?: {
    totalUsers: number; totalVendors: number; totalProducts: number;
    totalCampaigns: number; totalCommunities: number; totalEarnings: number;
  };
  profile: any;
}

// ─── Earn options config ──────────────────────────────────────────────────────

function getEarnOptions(stats?: HomepageHeroProps["platformStats"]) {
  return [
    {
      href: "/communities", icon: Users,
      label: "Community program",
      stat: `${stats?.totalCommunities || "12+"} active communities`,
      desc: "Monetize your circle with high-value products.",
      accentColor: "#3b82f6",
    },
    {
      href: "/ugc", icon: Video,
      label: "UGC & clipping",
      stat: `${stats?.totalCampaigns || "150+"} live campaigns`,
      desc: "Turn short-form creativity into currency.",
      accentColor: "#8b5cf6",
    },
    {
      href: "/influencers/program", icon: Share2,
      label: "Become an affiliate",
      stat: "Up to 30% commission",
      desc: "Share curated links and earn on every sale.",
      accentColor: "#ec4899",
    },
    {
      href: "/vendor/register", icon: Store,
      label: "Become a vendor",
      stat: `${stats?.totalVendors || "500+"} verified vendors`,
      desc: "Scale your reach through our creator network.",
      accentColor: "#f97316",
    },
  ];
}

// ─── Start Earn Dialog ────────────────────────────────────────────────────────

// FIX: extracted from inside HomepageHero render — inner component definitions
// cause unnecessary re-creation on every parent render

function StartEarnDialog({
  children,
  className,
  platformStats,
}: {
  children: React.ReactNode;
  className?: string;
  platformStats?: HomepageHeroProps["platformStats"];
}) {
  const options = getEarnOptions(platformStats);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className={className}>{children}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl p-0 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xl)] rounded-2xl overflow-hidden">
        <div className="p-6 sm:p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
          <DialogHeader className="mb-6 text-center">
            <div className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-orange-500/10 border border-orange-500/20">
              <Sparkles className="h-5 w-5 text-orange-500" />
            </div>
            <DialogTitle className="text-xl font-semibold text-[var(--color-text-primary)] tracking-tight">
              How do you want to{" "}
              <span className="text-orange-500">earn?</span>
            </DialogTitle>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-2 max-w-[260px] mx-auto leading-relaxed">
              Join our professional ecosystem to grow your brand and revenue.
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map(({ href, icon: Icon, label, stat, desc, accentColor }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex flex-col gap-3 p-4 rounded-xl group",
                  "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]",
                  "hover:border-[var(--color-border-strong)] transition-colors"
                )}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg border transition-transform group-hover:scale-105"
                  style={{
                    background: `${accentColor}15`,
                    borderColor: `${accentColor}30`,
                    color: accentColor,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{label}</p>
                  <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">{stat}</p>
                  <p className="text-[12px] text-[var(--color-text-muted)] mt-1.5 leading-relaxed">{desc}</p>
                </div>
              </Link>
            ))}
          </div>

          <p className="text-[11px] text-[var(--color-text-muted)] text-center mt-5 pt-4 border-t border-[var(--color-border)]">
            Join {platformStats?.totalUsers?.toLocaleString() || "10,000+"} active members worldwide.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Video marquee ────────────────────────────────────────────────────────────

function VideoMarquee({ videos, mobile = false }: { videos: any[]; mobile?: boolean }) {
  if (!videos?.length) return null;
  // Quadruple to ensure seamless loop regardless of clip count
  const list = [...videos, ...videos, ...videos, ...videos];

  return (
    <div
      className={cn("relative w-full overflow-hidden", mobile ? "h-[164px]" : "h-full")}
      style={{
        maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <motion.div
        animate={{ x: [0, mobile ? -106 * videos.length : -152 * videos.length] }}
        transition={{
          duration: mobile ? videos.length * 2.8 : videos.length * 3.5,
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex gap-3 py-2 h-full"
      >
        {list.map((v, i) => (
          <Link
            key={`${v.id}-${i}`}
            href={`/shorts?clip=${v.id}`}
            aria-label={v.title}
            className={cn(
              "group relative shrink-0 overflow-hidden transition-opacity",
              "bg-[var(--color-surface-secondary)]",
              mobile ? "w-[84px] h-[144px] rounded-md" : "w-[115px] h-[196px] rounded-md"
            )}
          >
            <img
              src={v.thumbnail_url || v.video_url?.replace(".mp4", ".jpg") || "/hero-bg.png"}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
            />
            {/* Gradient scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Live pip */}
            <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
              <span className="block h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[8px] font-semibold text-white">Live</span>
            </div>

            {!mobile && v.title && (
              <p className="absolute bottom-2.5 left-2.5 right-2.5 text-[10px] font-semibold text-white line-clamp-2 leading-tight">
                {v.title}
              </p>
            )}
          </Link>
        ))}
      </motion.div>
    </div>
  );
}

const QUICK_LINKS = [
  { icon: ShoppingBag, text: "Explore marketplace", href: "/marketplace" },
  { icon: LayoutDashboard, text: "Creators hub", href: "/influencers/browse" },
];

// ─── Hero component ───────────────────────────────────────────────────────────

export function HomepageHero({
  heroCampaigns,
  viralClips,
  videos,
  topSuppliersSidebar,
  spotlightCreator,
  primaryCta,
  platformStats,
  profile,
}: HomepageHeroProps) {
  const { openAssistant } = useAIStore();

  const earnCta = (
    <StartEarnDialog
      platformStats={platformStats}
      className={cn(
        "h-11 px-7 rounded-full border-none text-white text-[13px] font-semibold",
        "bg-orange-500 hover:bg-orange-600 active:scale-[0.97] transition-all",
        "shadow-[0_4px_14px_rgba(249,115,22,0.35)]"
      )}
    >
      Start earning free →
    </StartEarnDialog>
  );

  // ── Mobile ─────────────────────────────────────────────────────────────────

  const MobileHero = (
    <section className="flex flex-col lg:hidden w-full relative overflow-hidden pb-8 px-5 pt-8 bg-[var(--color-surface)]">
      <div className="flex flex-col gap-4 items-center text-center">

        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
          <span className="block h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
          Global creator &amp; sourcing network
        </div>

        {/* Headline */}
        <h1 className="text-[26px] sm:text-[30px] font-semibold leading-tight tracking-tight text-[var(--color-text-primary)]">
          Where products &amp; creators{" "}
          <span className="text-orange-500">drive global growth.</span>
        </h1>

        <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed max-w-[280px]">
          Build, promote, and scale your business across Africa and beyond.
        </p>

        {/* CTA stack */}
        <div className="flex flex-col gap-2.5 w-full max-w-[300px]">
          {earnCta}
          <button
            onClick={() => openAssistant()}
            className={cn(
              "h-10 rounded-xl flex items-center justify-center gap-2",
              "text-[12px] font-semibold text-[var(--color-text-secondary)]",
              "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]",
              "hover:border-[var(--color-border-strong)] transition-colors"
            )}
          >
            <Sparkles className="h-4 w-4 text-orange-500" />
            Activate AI mode
          </button>
        </div>

        {/* Quick nav pills */}
        <div className="flex gap-2 justify-center flex-wrap">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.text}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl",
                "text-[11px] font-semibold text-[var(--color-text-secondary)]",
                "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]",
                "hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]",
                "transition-colors"
              )}
            >
              <item.icon className="h-[11px] w-[11px] text-orange-500" />
              {item.text}
            </Link>
          ))}
        </div>

        {/* Story card + marquee */}
        <div className="w-full mt-2 flex flex-col gap-5">
          <div className="w-[160px] mx-auto">
            <HeroStoryCard viralClips={viralClips} />
          </div>
          <VideoMarquee videos={videos} mobile />
        </div>
      </div>
    </section>
  );

  // ── Desktop ────────────────────────────────────────────────────────────────

  const DesktopHero = (
    <section className="hidden lg:block w-full bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <div className="grid" style={{ gridTemplateColumns: "1fr 280px" }}>

        {/* Left: search + main panel */}
        <div className="flex flex-col">
          <HeroSearch />

          <div
            className="relative overflow-hidden min-h-[360px] flex-1 bg-[var(--color-bg)]"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}
          >
            {/* Left column: copy + CTAs */}
            <div className="relative z-10 flex flex-col justify-center gap-5 px-12 py-8">

              {/* Live badge */}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 w-fit px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20"
              >
                <span className="block h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                Global creator &amp; sourcing network
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.45 }}
              >
                <h1 className="text-[40px] font-semibold leading-tight tracking-tight text-[var(--color-text-primary)]">
                  Where products &amp; creators
                  <br />
                  <span className="text-orange-500">drive global growth.</span>
                </h1>
                <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed max-w-[400px]">
                  The high-performance ecosystem for professional suppliers and verified creators. Scale your empire across Africa and beyond.
                </p>
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="flex items-center gap-2.5"
              >
                {earnCta}
                <button
                  onClick={() => openAssistant()}
                  title="AI sourcing assistant"
                  aria-label="Open AI sourcing assistant"
                  className={cn(
                    "h-11 w-11 rounded-xl flex items-center justify-center",
                    "bg-[var(--color-surface)] border border-[var(--color-border)]",
                    "text-[var(--color-text-muted)] hover:text-orange-500",
                    "hover:border-orange-500/30 transition-colors"
                  )}
                >
                  <Sparkles className="h-[18px] w-[18px]" />
                </button>
              </motion.div>

              {/* Quick nav pills */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="flex gap-2 flex-wrap"
              >
                {QUICK_LINKS.map((item) => (
                  <Link
                    key={item.text}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-lg",
                      "text-[12px] font-semibold text-[var(--color-text-secondary)]",
                      "bg-[var(--color-surface)] border border-[var(--color-border)]",
                      "hover:border-orange-500/30 hover:text-[var(--color-text-primary)]",
                      "transition-colors"
                    )}
                  >
                    <item.icon className="h-[13px] w-[13px] text-orange-500" />
                    {item.text}
                    <ChevronRight className="h-3 w-3 opacity-40" />
                  </Link>
                ))}
              </motion.div>
            </div>

            {/* Right column: story card + marquee */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="relative z-10 flex items-center gap-8 pr-12 py-8 overflow-hidden"
            >
              <div className="w-[180px] shrink-0">
                <HeroStoryCard viralClips={viralClips} />
              </div>
              <div className="flex-1 h-full">
                <VideoMarquee videos={videos} />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right: dashboard actions panel */}
        <HeroRightPanel profile={profile} />
      </div>
    </section>
  );

  return (
    <>
      {MobileHero}
      {DesktopHero}
    </>
  );
}