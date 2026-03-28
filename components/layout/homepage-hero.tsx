"use client";

import Link from "next/link";
import { ChevronRight, Sparkles, Star, ShieldCheck, Package, Globe, Users, ShoppingBag } from "lucide-react";
import { ViralStoryRow } from "@/components/marketplace/viral-story-row";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDisplayMoney } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAIStore } from "@/lib/store/use-ai-store";

type TrustBarItem = {
  title: string;
  desc: string;
};

type Supplier = {
  business_name?: string;
  business_slug?: string;
  rating?: number;
};

type SpotlightCreator = {
  full_name?: string;
  total_earnings?: number;
  total_clicks?: number;
  total_conversions?: number;
} | null | undefined;

type ViralClip = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  total_views?: number;
  total_shares?: number;
  vendors?: { id: string; business_name: string; logo_url?: string };
};

interface HomepageHeroProps {
  trustBarItems: TrustBarItem[];
  heroKeywords: string[];
  heroCampaigns: string[];
  socialBar: {
    successRate: string;
  };
  viralClips: ViralClip[];
  topSuppliersSidebar: Supplier[];
  spotlightCreator: SpotlightCreator;
  primaryCta: {
    label: string;
    href: string;
  };
}

export function HomepageHero({
  trustBarItems,
  heroKeywords,
  heroCampaigns,
  socialBar,
  viralClips,
  topSuppliersSidebar,
  spotlightCreator,
  primaryCta,
}: HomepageHeroProps) {
  const { openAssistant } = useAIStore();
  const trustPills = trustBarItems.slice(0, 3);

  return (
    <section className="w-full min-h-screen bg-[#0a0a0a] relative overflow-hidden flex items-center">

      {/* ── BACKGROUND CANVAS ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Radial glow – top right */}
        <div className="absolute -top-32 right-[-10%] w-[700px] h-[700px] rounded-full bg-orange-600/10 blur-[140px]" />
        {/* Radial glow – bottom left */}
        <div className="absolute bottom-0 left-[-5%] w-[500px] h-[500px] rounded-full bg-amber-500/8 blur-[100px]" />
        {/* Thin horizontal rule accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      {/* ── LAYOUT ── */}
      <div className="relative z-10 mx-auto w-full max-w-[1536px] px-6 sm:px-8 lg:px-12 py-20 lg:py-28">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-20 items-start lg:items-center">

          {/* ════════════════════════════════════
              LEFT — CONTENT
          ════════════════════════════════════ */}
          <div className="w-full lg:w-[55%] flex flex-col gap-10">

            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                <Sparkles className="h-3 w-3 text-orange-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                  Verified global sourcing network
                </span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.65 }}
              className="flex flex-col gap-0"
            >
              <h1
                className="font-black leading-[0.95] tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(3rem, 7vw, 6.5rem)" }}
              >
                Source{" "}
                <span
                  className="relative inline-block"
                  style={{
                    WebkitTextStroke: "2px #f97316",
                    color: "transparent",
                  }}
                >
                  products
                </span>
                ,
              </h1>
              <h1
                className="font-black leading-[0.95] tracking-[-0.04em] text-zinc-600"
                style={{ fontSize: "clamp(3rem, 7vw, 6.5rem)" }}
              >
                activate creators,
              </h1>
              <h1
                className="font-black leading-[0.95] tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(3rem, 7vw, 6.5rem)" }}
              >
                scale{" "}
                <span className="italic text-orange-500">globally.</span>
              </h1>
            </motion.div>

            {/* Sub-copy */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="max-w-md text-[15px] sm:text-[17px] leading-relaxed text-zinc-500 font-medium"
            >
              Premium ecosystem for verified suppliers, live catalog, and
              campaign-ready creators. From search to settlement.
            </motion.p>

            {/* Trust pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-wrap gap-5"
            >
              {[
                { icon: ShieldCheck, text: "Verified Only" },
                { icon: Package, text: "Direct Sourcing" },
                { icon: Globe, text: "Global Escrow" },
              ].map((stat) => (
                <div
                  key={stat.text}
                  className="flex items-center gap-2 text-zinc-500 text-[11px] font-bold uppercase tracking-[0.18em]"
                >
                  <div className="h-6 w-6 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <stat.icon size={12} className="text-orange-400" />
                  </div>
                  {stat.text}
                </div>
              ))}
            </motion.div>

            {/* ── AI CTA ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.65 }}
              className="w-full flex flex-col gap-5"
            >
              {/* Main button */}
              <button
                onClick={() => openAssistant()}
                className="group relative w-full overflow-hidden rounded-2xl"
              >
                {/* Gradient border trick */}
                <div className="absolute inset-0 rounded-2xl p-px bg-gradient-to-br from-orange-500 via-amber-400 to-orange-600">
                  <div className="absolute inset-0 rounded-[calc(1rem-1px)] bg-[#0f0f0f]" />
                </div>

                {/* Shimmer sweep */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent z-10" />

                <div className="relative z-20 flex items-center justify-between px-7 py-6">
                  <div className="flex items-center gap-5">
                    {/* Icon orb */}
                    <div className="relative h-12 w-12 shrink-0">
                      <div className="absolute inset-0 rounded-xl bg-orange-500 blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
                      <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="text-left">
                      <h2 className="text-[20px] sm:text-[24px] font-black text-white tracking-tight leading-none mb-1">
                        Activate{" "}
                        <span className="text-orange-400">AI Mode</span>
                      </h2>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                        Intelligent Global Sourcing Assistant
                      </p>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white group-hover:border-orange-500/60 group-hover:bg-orange-500/10 transition-all duration-300">
                    <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>

              {/* Secondary links row */}
              <div className="flex items-center gap-4 px-1">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 text-[13px] font-bold text-zinc-500 hover:text-orange-400 transition-colors"
                >
                  <ShoppingBag size={14} />
                  Browse marketplace manually
                </Link>
                <div className="h-3.5 w-px bg-zinc-800" />
                <Link
                  href={primaryCta.href}
                  className="text-[13px] font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  {primaryCta.label}
                </Link>
              </div>
            </motion.div>
          </div>

          {/* ════════════════════════════════════
              RIGHT — VISUAL WIDGETS
          ════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.75 }}
            className="w-full lg:w-[45%] hidden lg:flex flex-col gap-4"
          >

            {/* ── Card 1: Network Pulse ── */}
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-7 relative overflow-hidden">
              {/* Card inner glow */}
              <div className="absolute top-0 right-0 w-60 h-60 bg-orange-500/5 rounded-full blur-[60px] pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between mb-6">
                <div>
                  <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-orange-500 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Network Pulse
                  </p>
                  <h2 className="text-[24px] font-black text-white tracking-tight leading-tight">
                    Live Ecosystem
                    <br />
                    Activity
                  </h2>
                </div>

                {/* Success rate badge */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 px-5 py-3">
                  <div className="text-[8px] font-black text-orange-400/60 uppercase tracking-wider mb-0.5">
                    SUCCESS
                  </div>
                  <div className="text-[28px] font-black text-orange-400 leading-none tabular-nums">
                    {socialBar.successRate}
                  </div>
                </div>
              </div>

              {/* Campaign tags */}
              <div className="relative z-10 flex flex-wrap gap-2 mb-5">
                {heroCampaigns.slice(0, 3).map((tag, i) => (
                  <span
                    key={`${tag}-${i}`}
                    className="px-3 py-1.5 rounded-lg border border-white/8 bg-white/5 text-[9px] font-black tracking-[0.18em] uppercase text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Viral clips */}
              <div className="relative z-10 rounded-xl overflow-hidden border border-white/5 bg-black/30">
                {viralClips.length > 0 && (
                  <ViralStoryRow clips={viralClips} showHeader={false} />
                )}
              </div>
            </div>

            {/* ── Bottom row: Suppliers + Creator ── */}
            <div className="grid grid-cols-2 gap-4">

              {/* Top Suppliers */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-5 relative overflow-hidden">
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <p className="text-[8px] font-black uppercase tracking-[0.25em] text-orange-500 mb-1">
                    Top suppliers
                  </p>
                  <h3 className="text-[15px] font-black text-white leading-none mb-4">
                    Priority sellers
                  </h3>

                  <div className="flex flex-col gap-2">
                    {topSuppliersSidebar.length > 0 ? (
                      topSuppliersSidebar.slice(0, 3).map((supplier, index) => (
                        <Link
                          key={supplier.business_slug ?? `${index}-supp`}
                          href={
                            supplier.business_slug
                              ? `/vendors/${supplier.business_slug}`
                              : "/vendors"
                          }
                          className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/5 p-2.5 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-[10px] font-black text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                            {(supplier.business_name ?? "S").charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-black text-zinc-200 leading-none mb-0.5">
                              {supplier.business_name ?? "Verified supplier"}
                            </p>
                            <p className="text-[8px] font-bold text-zinc-600">
                              Rank #{index + 1}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 text-[9px] font-black text-orange-400">
                            <Star className="h-2.5 w-2.5 fill-orange-500 text-orange-500" />
                            {Number(supplier.rating ?? 4.8).toFixed(1)}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-white/8 text-[11px] text-zinc-600">
                        Rankings updating...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Creator Spotlight */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-5 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-orange-500/8 rounded-full blur-2xl" />

                <div className="relative z-10 flex flex-col h-full">
                  <p className="text-[8px] font-black uppercase tracking-[0.25em] text-orange-500 mb-3">
                    Creator spotlight
                  </p>

                  {spotlightCreator ? (
                    <>
                      <div className="flex items-center gap-2.5 mb-4">
                        <Avatar className="h-9 w-9 border border-white/10">
                          <AvatarFallback className="bg-zinc-900 text-[11px] font-black text-orange-400 border border-orange-500/20">
                            {(spotlightCreator.full_name ?? "C").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-black text-white leading-none mb-1">
                            {spotlightCreator.full_name ?? "Top creator"}
                          </p>
                          <p className="text-[9px] font-bold text-zinc-500">
                            {(
                              spotlightCreator.total_conversions ?? 0
                            ).toLocaleString()}{" "}
                            conv.
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-amber-600/5 p-3 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.12),transparent_70%)]" />
                        <div className="relative z-10">
                          <div className="text-[8px] font-black uppercase tracking-[0.22em] text-orange-500/70 mb-1">
                            Tracked earnings
                          </div>
                          <div className="text-[20px] font-black tabular-nums text-white tracking-tight">
                            {formatDisplayMoney(
                              Number(spotlightCreator.total_earnings ?? 0),
                              "RWF"
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/8 text-center px-4 py-6 text-[11px] text-zinc-600">
                      Highlights will appear soon.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}