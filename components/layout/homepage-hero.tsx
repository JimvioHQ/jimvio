// "use client";

// import { useEffect, useRef } from "react";
// import Link from "next/link";
// import { ChevronRight, Sparkles, Star, ShieldCheck, Package, Globe, ShoppingBag, Store, Video, Share2, Users, TrendingUp } from "lucide-react";
// import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// import { formatDisplayMoney, cn } from "@/lib/utils";
// import { motion } from "framer-motion";
// import { useAIStore } from "@/lib/store/use-ai-store";
// import { Button } from "@/components/ui/button";
// import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { HeroSearch } from "@/components/marketplace/hero-search";
// import { HeroRightPanel } from "./hero-right-panel";
// import { HeroStoryCard } from "@/components/marketplace/hero-story-card";

// type Supplier = { business_name?: string; business_slug?: string; rating?: number };
// type SpotlightCreator = { full_name?: string; total_earnings?: number; total_clicks?: number; total_conversions?: number } | null | undefined;
// type ViralClip = { id: string; title: string; video_url: string; thumbnail_url?: string; total_views?: number; total_shares?: number; vendors?: { id: string; business_name: string; logo_url?: string } };

// interface HomepageHeroProps {
//   heroKeywords: string[];
//   heroCampaigns: string[];
//   socialBar: { successRate: string };
//   viralClips: ViralClip[];
//   videos: any[];
//   topSuppliersSidebar: Supplier[];
//   spotlightCreator: SpotlightCreator;
//   primaryCta: { label: string; href: string };
//   platformStats?: {
//     totalUsers: number;
//     totalVendors: number;
//     totalProducts: number;
//     totalCampaigns: number;
//     totalCommunities: number;
//     totalEarnings: number;
//   };
//   profile: any;
// }

// function VideoMarquee({ videos, mobile = false }: { videos: any[]; mobile?: boolean }) {
//   if (!videos?.length) return null;
//   const list = [...videos, ...videos, ...videos, ...videos];

//   return (
//     <div
//       className={cn(
//         "relative w-full overflow-hidden",
//         mobile ? "h-[164px]" : "h-full"
//       )}
//       style={{
//         maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
//         WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
//       }}
//     >
//       <motion.div
//         animate={{ x: [0, mobile ? -106 * videos.length : -152 * videos.length] }}
//         transition={{
//           duration: mobile ? videos.length * 2.8 : videos.length * 3.5,
//           repeat: Infinity,
//           ease: "linear",
//         }}
//         className="flex gap-3 py-2 h-full"
//       >
//         {list.map((v, i) => (
//           <Link
//             key={`${v.id}-${i}`}
//             href={`/shorts?clip=${v.id}`}
//             className={cn(
//               "group relative shrink-0 overflow-hidden bg-stone-900 transition-transform",
//               mobile
//                 ? "w-[84px] h-[144px] rounded-sm"
//                 : "w-[115px] h-[196px] rounded-sm"
//             )}
//           >
//             {/* Thumbnail */}
//             <img
//               src={v.thumbnail_url || v.video_url?.replace(".mp4", ".jpg") || "/hero-bg.png"}
//               alt=""
//               className="h-full w-full object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-500"
//             />

//             {/* Overlay gradient */}
//             <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

//             {/* Live pip */}
//             <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-black/45 ">
//               <span
//                 className="block rounded-sm bg-[#fd5000]"
//                 style={{ width: 4, height: 4, animation: "pulse 1.8s infinite" }}
//               />
//               <span className="text-[7px] font-black text-white uppercase tracking-[.05em]">Live</span>
//             </div>

//             {/* Title label — desktop only */}
//             {!mobile && (
//               <div className="absolute bottom-2.5 left-2.5 right-2.5">
//                 <span className="text-[9px] font-black text-white uppercase tracking-[.04em] drop-shadow-none line-clamp-2">
//                   {v.title}
//                 </span>
//               </div>
//             )}
//           </Link>
//         ))}
//       </motion.div>
//     </div>
//   );
// }

// export function HomepageHero({
//   heroCampaigns,
//   socialBar,
//   viralClips,
//   videos,
//   topSuppliersSidebar,
//   spotlightCreator,
//   primaryCta,
//   platformStats,
//   profile,
// }: HomepageHeroProps) {
//   const { openAssistant } = useAIStore();

//   function StartEarnDialog({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
//     return (
//       <Dialog>
//         <DialogTrigger asChild>
//           <Button size="lg" className={className} style={style}>
//             {children}
//           </Button>
//         </DialogTrigger>
//         <DialogContent className="max-w-xl p-0 border-none bg-transparent shadow-none overflow-visible z-[9999]">
//           <div
//             className="relative overflow-hidden rounded-sm p-6 sm:p-7 max-h-[90vh] overflow-y-auto no-scrollbar bg-surface border border-border shadow-none"
//           >
//             <div className="pointer-events-none absolute bottom-0 right-0 w-48 h-48 rounded-sm blur-3xl opacity-5 bg-orange-500" />

//             <DialogHeader className="mb-6 relative z-10 text-center">
//               <div
//                 className="mx-auto w-12 h-12 rounded-sm flex items-center justify-center mb-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20"
//               >
//                 <Sparkles className="h-6 w-6 text-orange-600" />
//               </div>
//               <DialogTitle className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white tracking-tight">
//                 How do you want to <span className="text-orange-600">Earn?</span>
//               </DialogTitle>
//               <p className="text-xs text-stone-500 mt-2 max-w-[280px] mx-auto leading-relaxed">
//                 Join our professional ecosystem to grow your brand and revenue.
//               </p>
//             </DialogHeader>

//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
//               {[
//                 { href: "/communities", icon: Users, color: "blue", label: "Community Program", stat: `${platformStats?.totalCommunities || "12+"} Active Communities`, desc: "Monetize your circle with high-value products." },
//                 { href: "/ugc", icon: Video, color: "violet", label: "UGC & Clipping", stat: `${platformStats?.totalCampaigns || "150+"} Live Campaigns`, desc: "Turn your short-form creativity into currency." },
//                 { href: "/influencers/program", icon: Share2, color: "pink", label: "Become Affiliate", stat: "Up to 30% Commission", desc: "Share curated links and earn on every sale." },
//                 { href: "/vendor/register", icon: Store, color: "orange", label: "Become Vendor", stat: `${platformStats?.totalVendors || "500+"} Verified Vendors`, desc: "Scale your reach through our creator network." },
//               ].map(({ href, icon: Icon, color, label, stat, desc }) => (
//                 <Link
//                   key={href}
//                   href={href}
//                   className="relative overflow-hidden p-4 rounded-sm border border-border bg-stone-50/50 dark:bg-stone-900/50 transition-all group flex flex-col gap-3 shadow-none hover:shadow-none"
//                 >
//                   <div className="absolute -top-6 -right-6 w-20 h-20 rounded-sm blur-2xl opacity-20"
//                     style={{ background: color === "orange" ? "#f97316" : color === "blue" ? "#3b82f6" : color === "violet" ? "#8b5cf6" : "#ec4899" }} />
//                   <div className={cn(
//                     "flex h-10 w-10 items-center justify-center rounded-sm group-hover:scale-110 transition-transform border",
//                     color === "blue" ? "bg-blue-50/80 text-blue-600 border-blue-100/80" :
//                     color === "violet" ? "bg-violet-50/80 text-violet-600 border-violet-100/80" :
//                     color === "pink" ? "bg-pink-50/80 text-pink-600 border-pink-100/80" :
//                     "bg-orange-50/80 text-orange-600 border-orange-100/80"
//                   )}>
//                     <Icon className="h-5 w-5" />
//                   </div>
//                   <div>
//                     <h3 className="text-[13px] font-semibold text-stone-900">{label}</h3>
//                     <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-widest mt-0.5">{stat}</p>
//                     <p className="text-[11px] text-stone-500 mt-1 leading-snug">{desc}</p>
//                   </div>
//                 </Link>
//               ))}
//             </div>

//             <div className="mt-6 pt-4 relative z-10 border-t border-black/[.05]">
//               <p className="text-[10px] text-stone-400 text-center">
//                 Join {platformStats?.totalUsers || "10,000+"} active members in our global empire.
//               </p>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>
//     );
//   }

//   return (
//     <>
//       <section className="flex flex-col lg:hidden w-full relative overflow-hidden pb-8 px-5 min-h-[380px] justify-center text-center bg-background">
//         {/* Ambient blobs — match HTML prototype */}
//         <div
//           className="pointer-events-none absolute top-[-60px] right-[-60px] rounded-sm"
//           style={{ width: 280, height: 280, background: "radial-gradient(circle, rgba(249,115,22,.08), transparent 65%)" }}
//         />

//         <div className="relative z-10 flex flex-col gap-4 pt-6 items-center">
//           {/* Live badge */}
//           <div
//             className="inline-flex items-center gap-[7px] px-[14px] py-[6px] rounded-sm text-[10px] font-bold uppercase tracking-[.1em] text-orange-700 bg-orange-50 border border-orange-100"
//           >
//             <span
//               className="block rounded-sm bg-[#f97316] shrink-0"
//               style={{ width: 6, height: 6 }}
//             />
//             Global Creator &amp; Sourcing Network
//           </div>

//           {/* Headline */}
//           <h1 className="text-[28px] sm:text-[32px] font-black leading-[1.1] tracking-[-0.04em] text-[#1c1811] dark:text-[#f5f0e8] text-center">
//             Where products &amp; creators{" "}
//             <span
//               className="text-transparent bg-clip-text"
//               style={{ backgroundImage: "linear-gradient(135deg, #fd5000 0%, #ff8c40 50%, #dc2626 100%)" }}
//             >
//               drive global growth.
//             </span>
//           </h1>

//           <p className="text-[12px] text-[#6b6257] dark:text-[#a89f93] text-center leading-[1.6] max-w-[280px]">
//             Build, promote, and scale your empire across Africa and beyond.
//           </p>

//           {/* CTA stack */}
//           <div className="flex flex-col gap-[10px] w-full max-w-[300px]">
//             <StartEarnDialog
//               className="h-12 w-full rounded-full border-none text-white text-[13px] font-semibold tracking-tight bg-[#fd5000] shadow-[0_4px_14px_rgba(253,80,0,0.4)] active:bg-orange-600 transition-all active:scale-95"
//             >
//               Start Earning →
//             </StartEarnDialog>

//             <button
//               onClick={() => openAssistant()}
//               className="h-11 rounded-sm flex items-center justify-center gap-3 font-bold text-stone-700 dark:text-stone-200 text-[12px] uppercase tracking-[.07em] bg-surface border border-border shadow-none"
//             >
//               <Sparkles className="h-4 w-4 fill-[#f97316] stroke-none" />
//               Activate AI Mode
//             </button>
//           </div>

//           {/* Quick pills */}
//           <div className="flex gap-2 justify-center flex-wrap">
//             {[
//               { icon: ShoppingBag, text: "Marketplace", href: "/marketplace" },
//               { icon: TrendingUp, text: "Creators Hub", href: "/influencers/browse" },
//             ].map((item) => (
//               <Link
//                 key={item.text}
//                 href={item.href}
//                 className="shrink-0 flex items-center gap-[6px] px-[14px] py-[8px] rounded-sm font-bold text-[10px] uppercase tracking-[.05em] text-[#3c3429] dark:text-stone-300 transition-all bg-white/90 dark:bg-white/[0.05] border border-white/80 dark:border-white/[0.08] shadow-none"
//               >
//                 <item.icon className="h-[11px] w-[11px] text-[#f97316]" />
//                 {item.text}
//               </Link>
//             ))}
//           </div>

//           {/* Mobile Featured Mission/Marquee */}
//           <div className="w-full mt-2 flex flex-col gap-6">
//             <div className="w-[160px] mx-auto">
//                <HeroStoryCard viralClips={viralClips} />
//             </div>
//             <div className="w-full">
//               <VideoMarquee videos={videos} mobile />
//             </div>
//           </div>
//         </div>
//       </section>

//       <section className="hidden lg:block w-full bg-surface border-b border-border">
//         <div className="grid" style={{ gridTemplateColumns: "1fr 280px" }}>

//           {/* Left: Search + Hero + Stats */}
//           <div className="flex flex-col">
//             {/* 1. Integrated Search Bar */}
//             <HeroSearch />

//             {/* 2. Main Hero Panel */}
//             <div
//               className="relative overflow-hidden min-h-[360px] flex-1 bg-background"
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "1fr 1fr",
//               }}
//             >
//               {/* Ambient blobs */}
//               <div
//                 className="absolute pointer-events-none rounded-sm animate-blob"
//                 style={{ width: 520, height: 520, top: -120, right: -40, background: "radial-gradient(circle, rgba(253,80,0,.12), transparent 65%)" }}
//               />
//               <div
//                 className="absolute pointer-events-none rounded-sm animate-blob animation-delay-2000"
//                 style={{ width: 380, height: 380, bottom: -80, left: 60, background: "radial-gradient(circle, rgba(99,102,241,.08), transparent 65%)" }}
//               />
//               <div
//                 className="absolute pointer-events-none rounded-sm animate-blob animation-delay-4000"
//                 style={{ width: 260, height: 260, top: "30%", left: "40%", background: "radial-gradient(circle, rgba(253,80,0,.1), transparent 65%)" }}
//               />


//               {/* Left column */}
//               <div className="relative z-10 flex flex-col justify-center gap-4 px-[52px] py-[24px]">
//                 {/* Live badge */}
//                 <motion.div
//                   initial={{ opacity: 0, x: -16 }}
//                   animate={{ opacity: 1, x: 0 }}
//                   transition={{ duration: 0.45 }}
//                   className="inline-flex items-center gap-2 w-fit px-4 py-[7px] rounded-full text-[10px] font-semibold tracking-wide text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/30"
//                 >
//                   <span
//                     className="block rounded-full bg-[#fd5000] animate-pulse"
//                     style={{ width: 6, height: 6 }}
//                   />
//                   Global Creator &amp; Sourcing Network
//                 </motion.div>

//                 <motion.div
//                   initial={{ opacity: 0, y: 18 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ delay: 0.1, duration: 0.48 }}
//                   className="flex flex-col gap-3"
//                 >
//                   <h1 className="text-[46px] font-extrabold leading-[1.0] tracking-[-0.05em] text-[#11181c] dark:text-[#ededed]">
//                     Where products &amp; creators
//                     <br />
//                     <span
//                       className="text-transparent bg-clip-text"
//                       style={{ backgroundImage: "linear-gradient(135deg, #fd5000 0%, #ff7a30 60%, #ff3d00 100%)" }}
//                     >
//                       drive global growth.
//                     </span>
//                   </h1>
//                   <p className="text-[14px] text-[#6b6257] dark:text-[#a89f93] leading-[1.65] max-w-[400px]">
//                     The high-performance ecosystem for professional suppliers and verified creators. Scale your empire across Africa and beyond.
//                   </p>
//                 </motion.div>

//                 <motion.div
//                   initial={{ opacity: 0, y: 12 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ delay: 0.22, duration: 0.45 }}
//                   className="flex items-center gap-3"
//                 >
//                   <StartEarnDialog
//                     className="h-12 px-8 rounded-full border-none text-white text-[13px] font-semibold tracking-tight flex items-center gap-2 bg-[#fd5000] shadow-[0_4px_14px_rgba(253,80,0,0.35)] hover:bg-[#e04700] transition-all active:scale-95"
//                   >
//                     Start Earning →
//                   </StartEarnDialog>

//                   <button
//                     onClick={() => openAssistant()}
//                     title="AI Sourcing"
//                     className="h-11 w-11 rounded-sm flex items-center justify-center transition-all bg-surface border border-border shadow-none hover:bg-stone-50"
//                   >
//                     <Sparkles className="h-[18px] w-[18px] fill-[#f97316] stroke-none" />
//                   </button>
//                 </motion.div>

//                 <motion.div
//                   initial={{ opacity: 0 }}
//                   animate={{ opacity: 1 }}
//                   transition={{ delay: 0.38, duration: 0.45 }}
//                   className="flex gap-[10px] flex-wrap"
//                 >
//                   {[
//                     { icon: ShoppingBag, text: "Explore Marketplace", href: "/marketplace" },
//                     { icon: TrendingUp, text: "Creators Hub", href: "/influencers/browse" },
//                   ].map((item) => (
//                     <Link
//                       key={item.text}
//                       href={item.href}
//                       className="flex items-center gap-2 px-4 py-[9px] rounded font-semibold text-[11px] text-[#3c3429] dark:text-[#d4ccbf] transition-all hover:border-[rgba(249,115,22,0.35)] bg-white/80 dark:bg-white/5 border border-white/90 dark:border-white/10 "
//                     >
//                       <item.icon className="h-[13px] w-[13px] text-[#f97316]" />
//                       {item.text}
//                       <ChevronRight className="h-3 w-3 text-current opacity-50" />
//                     </Link>
//                   ))}
//                 </motion.div>
//               </div>

//               {/* Right column: Featured Story + Marquee */}
//               <motion.div
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 transition={{ delay: 0.5, duration: 0.7 }}
//                 className="relative z-10 flex items-center gap-10 pr-[52px] py-[32px] overflow-hidden"
//               >
//                 {/* Featured Story Card (The Mission) */}
//                 <div className="w-[180px] shrink-0 drop-shadow-none">
//                   <HeroStoryCard viralClips={viralClips} />
//                 </div>

//                 {/* Video Marquee */}
//                 <div
//                   className="flex-1 h-full"
//                   style={{
//                     maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
//                     WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
//                   }}
//                 >
//                   <VideoMarquee videos={videos} />
//                 </div>
//               </motion.div>
//             </div>


//           </div>

//           {/* Right: Dashboard/Actions Panel */}
//           <HeroRightPanel profile={profile} />
//         </div>
//       </section>
//     </>
//   );
// }

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
      Start earning →
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