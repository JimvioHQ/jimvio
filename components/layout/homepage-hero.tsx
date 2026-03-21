import Link from "next/link";
import { ChevronRight, Sparkles, Star } from "lucide-react";
import { HeroSearch, type HeroSearchCategory } from "@/components/marketplace/hero-search";
import { ViralStoryRow } from "@/components/marketplace/viral-story-row";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type HeroStat = {
  value: string;
  label: string;
  detail: string;
};

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
  heroSearchCategories: HeroSearchCategory[];
  heroKeywords: string[];
  heroStats: HeroStat[];
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
  heroSearchCategories,
  heroKeywords,
  heroStats,
  heroCampaigns,
  socialBar,
  viralClips,
  topSuppliersSidebar,
  spotlightCreator,
  primaryCta,
}: HomepageHeroProps) {
  const trustPills = trustBarItems.slice(0, 3);

  return (
    <section className="w-full pt-0">
      <div className="home-hero-stage relative w-full overflow-hidden rounded-none">
        <div className="home-hero-grid pointer-events-none absolute inset-0 opacity-[0.5]" />
        <div className="pointer-events-none absolute -top-28 right-[-4rem] h-72 w-72 rounded-full bg-[#f97316]/12 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-5rem] left-[-3rem] h-80 w-80 rounded-full bg-[#433360]/8 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),transparent)]" />

        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 py-9 sm:px-6 sm:py-11 lg:min-h-[min(640px,85vh)] lg:px-8 lg:py-12 xl:min-h-[700px] xl:px-10">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:items-start lg:gap-10 xl:gap-14">
            {/* ── Left: narrative + search ── */}
            <div className="max-w-2xl lg:max-w-none">
              <div className="inline-flex w-fit items-center gap-2.5 rounded-full border border-[#f97316]/25 bg-[#fff7ed]/90 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#433360] sm:text-[11px]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f97316] opacity-35" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                </span>
                Verified global sourcing network
              </div>

              <h1 className="font-outfit mt-7 text-balance text-[2.5rem] font-black leading-[0.92] tracking-[-0.035em] text-[var(--color-text-primary)] sm:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem]">
                <span className="block">Source products,</span>
                <span className="block text-[#433360]/85">activate creators,</span>
                <span className="mt-1 block bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] bg-clip-text text-transparent">
                  grow across borders.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-[15px] font-medium leading-relaxed text-[#4b5563] sm:text-[17px]">
                Verified suppliers, live catalog, and campaign-ready creators — one place to go from search to deal flow.
              </p>

              {trustPills.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {trustPills.map((item) => (
                    <span
                      key={item.title}
                      className="rounded-lg border border-[#ebe8f2] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#433360]/80"
                    >
                      {item.title}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#ea580c]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Smart search
                </div>
                <HeroSearch categories={heroSearchCategories} />
              </div>

              {heroKeywords.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.26em] text-[#9ca3af]">Trending</span>
                  {heroKeywords.map((keyword) => (
                    <Link
                      key={keyword}
                      href={`/marketplace?q=${encodeURIComponent(keyword)}`}
                      className="rounded-full border border-[#ebe8f2] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#433360]/85 transition-all hover:border-[#f97316]/40 hover:bg-[#fff7ed] hover:text-[#ea580c]"
                    >
                      {keyword}
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="h-[3.25rem] rounded-2xl bg-gradient-to-r from-[#f97316] to-[#ea580c] px-8 text-[15px] font-black text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Link href="/marketplace" className="gap-2">
                    Explore marketplace
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="secondary"
                  size="lg"
                  className="h-[3.25rem] rounded-2xl border border-[#ebe8f2] bg-white px-8 text-[15px] font-black text-[var(--color-text-primary)] hover:bg-[#fafafa]"
                >
                  <Link href={primaryCta.href}>{primaryCta.label}</Link>
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[#6b7280]">
                <Link href="/register?role=vendor" className="font-semibold text-[#433360] underline-offset-4 transition-colors hover:text-[#f97316] hover:underline">
                  Open supplier store
                </Link>
                <span className="hidden text-[#d1d5db] sm:inline" aria-hidden>
                  ·
                </span>
                <Link href="/register?role=influencer" className="font-semibold text-[#433360] underline-offset-4 transition-colors hover:text-[#f97316] hover:underline">
                  Become a creator
                </Link>
              </div>

              <div className="home-hero-stat-strip mt-10 border-t border-[#ebe8f2] pt-8">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="min-w-0">
                    <div className="text-[1.75rem] font-black tabular-nums tracking-tight text-[var(--color-text-primary)] sm:text-[2rem]">{stat.value}</div>
                    <div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#ea580c]">{stat.label}</div>
                    <p className="mt-2 max-w-[14rem] text-[12px] leading-snug text-[#6b7280] sm:text-[13px]">{stat.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: live network bento ── */}
            <div className="relative lg:sticky lg:top-[var(--navbar-height)]">
              <div className="grid gap-4">
                <div className="home-hero-panel overflow-hidden rounded-[1.75rem] p-5 sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ea580c]">Marketplace pulse</p>
                      <h2 className="font-outfit mt-2 text-[1.375rem] font-black leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-[1.625rem]">
                        What the network is watching
                      </h2>
                      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#6b7280]">
                        Live clips and active themes — updated as campaigns run.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 rounded-2xl border border-[#f97316]/25 bg-gradient-to-br from-[#fff7ed] to-white px-4 py-3 text-right">
                      <div className="text-[1.5rem] font-black tabular-nums leading-none text-[var(--color-text-primary)]">{socialBar.successRate}</div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ea580c]">Match success</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {heroCampaigns.map((chip, index) => (
                      <span
                        key={`${chip}-${index}`}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] sm:text-[11px]",
                          index === 0
                            ? "bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white"
                            : "border border-[#ebe8f2] bg-[#fafafa] text-[#433360]/85"
                        )}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-[#ebe8f2] bg-[#fafafa]">
                    <div className="p-3 sm:p-4">
                      {viralClips.length > 0 ? (
                        <ViralStoryRow clips={viralClips} showHeader={false} />
                      ) : (
                        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-[#ebe8f2] bg-white px-4 text-center">
                          <div className="max-w-sm">
                            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ea580c]">Live clips</div>
                            <p className="mt-2 text-[13px] leading-relaxed text-[#6b7280]">
                              Creator and supplier stories will show here when campaigns go live.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="home-hero-panel flex flex-col rounded-[1.5rem] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#ea580c]">Top suppliers</p>
                        <h3 className="font-outfit mt-1.5 text-[1.125rem] font-black text-[var(--color-text-primary)]">Priority sellers</h3>
                      </div>
                      <Link
                        href="/vendors"
                        className="shrink-0 text-[11px] font-black uppercase tracking-[0.18em] text-[#9ca3af] transition-colors hover:text-[#f97316]"
                      >
                        View all
                      </Link>
                    </div>

                    <div className="mt-4 flex flex-1 flex-col gap-2.5">
                      {topSuppliersSidebar.length > 0 ? (
                        topSuppliersSidebar.map((supplier, index) => (
                          <Link
                            key={supplier.business_slug ?? supplier.business_name ?? index}
                            href={supplier.business_slug ? `/vendors/${supplier.business_slug}` : "/vendors"}
                            className="group flex items-center gap-3 rounded-xl border border-[#ebe8f2] bg-[#fafafa] px-3 py-2.5 transition-all hover:border-[#f97316]/35 hover:bg-[#fff7ed]/80"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] text-sm font-black text-[#ea580c] ring-1 ring-[#f97316]/20">
                              {(supplier.business_name ?? "S").charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-black text-[var(--color-text-primary)]">{supplier.business_name ?? "Verified supplier"}</p>
                              <p className="text-[10px] font-medium text-[#9ca3af]">Rank {index + 1}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5 text-[#ea580c]">
                              <Star className="h-3 w-3 fill-current" />
                              <span className="text-[11px] font-black">{Number(supplier.rating ?? 4.8).toFixed(1)}</span>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="flex flex-1 items-center rounded-xl border border-dashed border-[#ebe8f2] bg-[#fafafa] px-3 py-6 text-center text-[12px] text-[#6b7280]">
                          Rankings appear as verified stores grow.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="home-hero-panel flex flex-col rounded-[1.5rem] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#ea580c]">Creator spotlight</p>
                    {spotlightCreator ? (
                      <>
                        <div className="mt-3 flex items-center gap-3">
                          <Avatar className="h-11 w-11 border border-[#ebe8f2] ring-2 ring-[#f97316]/20">
                            <AvatarFallback className="bg-[#f97316] text-sm font-black text-white">
                              {(spotlightCreator.full_name ?? "C").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-outfit text-[15px] font-black text-[var(--color-text-primary)]">{spotlightCreator.full_name ?? "Top creator"}</p>
                            <p className="text-[11px] font-medium text-[#6b7280]">
                              {Number(spotlightCreator.total_clicks ?? 0).toLocaleString()} clicks ·{" "}
                              {Number(spotlightCreator.total_conversions ?? 0).toLocaleString()} conv.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-[#f97316]/20 bg-gradient-to-br from-[#fff7ed] to-white p-3.5">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ea580c]">Tracked earnings</div>
                          <div className="font-outfit mt-1 text-[1.375rem] font-black tabular-nums text-[var(--color-text-primary)]">
                            RWF {Number(spotlightCreator.total_earnings ?? 0).toLocaleString()}
                          </div>
                        </div>

                        <Link
                          href="/affiliates"
                          className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#433360]/70 transition-colors hover:text-[#f97316]"
                        >
                          Start earning
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </>
                    ) : (
                      <div className="mt-3 flex flex-1 flex-col justify-center rounded-xl border border-dashed border-[#ebe8f2] bg-[#fafafa] px-3 py-5 text-[12px] leading-relaxed text-[#6b7280]">
                        Creator highlights will appear when campaigns convert.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
