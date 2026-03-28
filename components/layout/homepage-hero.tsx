import Link from "next/link";
import { ChevronRight, Sparkles, Star, ShieldCheck, Package, Globe, Tag } from "lucide-react";
import { HeroSearch } from "@/components/marketplace/hero-search";
import { ViralStoryRow } from "@/components/marketplace/viral-story-row";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDisplayMoney } from "@/lib/utils";

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
  const trustPills = trustBarItems.slice(0, 3);
  const statIcons = [ShieldCheck, Package, Globe] as const;

  return (
    <section className="w-full pt-0 bg-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      <div className="pointer-events-none absolute -top-32 right-[-2rem] h-[500px] w-[500px] rounded-full bg-[#f97316]/10 blur-[100px]" />
      <div className="pointer-events-none absolute top-40 left-[-4rem] h-[400px] w-[400px] rounded-full bg-[#433360]/5 blur-[100px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white via-white/80 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-[1536px] px-4 py-8 sm:px-6 lg:py-10">
        {/* Simple 2-column flex layout container */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 xl:gap-16 items-start">
          
          {/* ================================================== */}
          {/* LEFT COLUMN: Core Interactions (Headline, Search, Stats) */}
          {/* ================================================== */}
          <div className="w-full lg:w-[58%] xl:w-[60%] flex flex-col gap-8 sm:gap-10">
            
            {/* 1. Headline & Trust */}
            <div className="flex flex-col items-start w-full">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f97316]/20 bg-[#fff7ed] px-3 py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-[#ea580c] shadow-sm">
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f97316] opacity-35" />
                  <span className="relative inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#f97316]" />
                </span>
                Verified global sourcing network
              </div>

              <h1 className="text-balance text-[2.75rem] sm:text-[4.25rem] lg:text-[4.75rem] xl:text-[5.5rem] font-black leading-[0.92] tracking-tighter text-zinc-900">
                <span className="block mb-1">Source products,</span>
                <span className="block text-zinc-400 mb-2">activate creators,</span>
                <span className="block bg-gradient-to-r from-[#f97316] to-[#ea580c] bg-clip-text text-transparent italic tracking-[-0.03em]">
                  scale globally.
                </span>
              </h1>

              <p className="mt-4 sm:mt-6 max-w-lg text-[14px] sm:text-[16px] font-medium leading-relaxed text-zinc-500">
                Verified suppliers, live catalog, and campaign-ready creators — one place to go from search to deal flow.
              </p>

              {trustPills.length > 0 && (
                <div className="mt-5 hidden sm:flex flex-wrap gap-2">
                  {trustPills.map((item, index) => (
                    <span
                      key={`${index}-${item.title}`}
                      className="rounded-lg border border-zinc-200 bg-white shadow-sm px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500"
                    >
                      {item.title}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Search & CTAs */}
            <div className="w-full space-y-5 pt-2">
              <HeroSearch />
              <div className="flex flex-col sm:flex-row gap-3.5 pt-4">
                <Button
                  asChild
                  className="w-full sm:w-auto h-14 sm:h-16 rounded-full bg-zinc-900 hover:bg-black px-10 text-[15px] font-black text-white shadow-2xl shadow-black/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Link href="/marketplace" className="flex items-center gap-2">
                    Explore Marketplace <ChevronRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full sm:w-auto h-14 sm:h-16 rounded-full border border-zinc-200 bg-white px-10 text-[15px] font-black text-zinc-900 shadow-sm hover:bg-zinc-50"
                >
                  <Link href={primaryCta.href}>{primaryCta.label}</Link>
                </Button>
              </div>
            </div>

            {/* 3. Stats Block */}


          </div>

          {/* ================================================== */}
          {/* RIGHT COLUMN: Visual Widgets (Hidden seamlessly on mobile) */}
          {/* ================================================== */}
          <div className="w-full hidden sm:flex lg:w-[42%] xl:w-[40%] flex-col gap-6 lg:sticky lg:top-[calc(var(--navbar-height)+2rem)]">
            
            {/* Widget 1: Live Pulse / Carousel */}
            <div className="w-full overflow-hidden rounded-2xl border border-zinc-100 bg-white p-6 shadow-xl shadow-zinc-200/40 relative">
              <div className="absolute top-0 right-0 h-32 w-32 bg-[#f97316]/5 blur-3xl rounded-full pointer-events-none" />
              
              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-[#ea580c]">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live Pulse
                  </p>
                  <h2 className="mt-1 text-[24px] xl:text-[28px] font-black text-zinc-900 leading-tight tracking-tight">
                    What the network is watching
                  </h2>
                </div>
                {/* Match success badge */}
                <div className="flex flex-col items-start xl:items-end rounded-xl border border-orange-100 bg-orange-50/50 px-3 py-2 shrink-0">
                  <div className="text-[8px] font-black uppercase tracking-[0.2em] text-orange-600">Match success</div>
                  <div className="text-[22px] font-black tabular-nums text-orange-600 leading-none">
                    {socialBar.successRate}
                  </div>
                </div>
              </div>

              {/* Campaign tags */}
              <div className="mt-4 flex gap-2 flex-wrap">
                {heroCampaigns.map((chip, index) => (
                  <span
                    key={`${index}-${chip}`}
                    className={cn(
                      "shrink-0 rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap",
                      index === 0
                        ? "bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white shadow-sm"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-default"
                    )}
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {/* Viral Clips Carousel */}
              <div className="mt-5 rounded-xl border border-zinc-100 bg-zinc-50 overflow-hidden">
                <div className="p-4">
                  {viralClips.length > 0 ? (
                    <ViralStoryRow clips={viralClips} showHeader={false} />
                  ) : (
                    <div className="flex min-h-[140px] items-center justify-center rounded-xl bg-white/50 text-center p-4">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Network Processing</div>
                        <p className="mt-1 text-[12px] font-medium text-zinc-500">Live viral clips will appear here.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Widget 2: Suppliers + Creators Side-by-Side (or stacked on narrow desktop cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              
              {/* Top Suppliers */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ea580c]">Top suppliers</p>
                    <h3 className="text-[17px] font-black text-zinc-900 leading-none mt-1 tracking-tight">Priority sellers</h3>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {topSuppliersSidebar.length > 0 ? (
                    topSuppliersSidebar.map((supplier, index) => (
                      <Link
                        key={supplier.business_slug ?? `${index}-supp`}
                        href={supplier.business_slug ? `/vendors/${supplier.business_slug}` : "/vendors"}
                        className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2.5 hover:bg-white hover:border-[#f97316]/30 transition-all group"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-black text-[#ea580c] group-hover:bg-[#f97316] group-hover:text-white transition-colors">
                          {(supplier.business_name ?? "S").charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-black text-zinc-900">{supplier.business_name ?? "Verified supplier"}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Rank #{index + 1}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5 text-[#ea580c] bg-orange-50 px-1.5 py-0.5 rounded text-[10px] font-black">
                          <Star className="h-2.5 w-2.5 fill-[#f97316] text-[#f97316]" />
                          {Number(supplier.rating ?? 4.8).toFixed(1)}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-[11px] text-zinc-500">
                      Rankings updating...
                    </div>
                  )}
                </div>
              </div>

              {/* Creator Spotlight */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ea580c] mb-3">Creator spotlight</p>
                {spotlightCreator ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-10 w-10 border border-zinc-200">
                        <AvatarFallback className="bg-zinc-800 text-[12px] font-black text-white">
                          {(spotlightCreator.full_name ?? "C").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-black text-zinc-900 leading-none mb-1 tracking-tight">{spotlightCreator.full_name ?? "Top creator"}</p>
                        <p className="text-[9px] font-bold text-zinc-500">
                          {(spotlightCreator.total_conversions ?? 0).toLocaleString()} conv.
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto rounded-xl border border-orange-100 bg-orange-50 p-3 relative overflow-hidden">
                      <div className="absolute right-0 bottom-0 text-[50px] leading-none opacity-5 font-black tracking-tighter">$</div>
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ea580c]">Tracked earnings</div>
                      <div className="mt-1 text-[22px] font-black tabular-nums text-zinc-900 tracking-tight">
                        {formatDisplayMoney(Number(spotlightCreator.total_earnings ?? 0), "RWF")}
                      </div>
                    </div>

                    <Link
                      href="/affiliates"
                      className="mt-3 inline-flex w-fit items-center gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#f97316] transition-colors"
                    >
                      Start earning <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-center px-4 py-6 text-[11px] text-zinc-500">
                    Highlights will appear soon.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
