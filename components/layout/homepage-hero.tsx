import Link from "next/link";
import { ChevronRight, Sparkles, Star, ShieldCheck, Package, Globe } from "lucide-react";
import { HeroSearch, type HeroSearchCategory } from "@/components/marketplace/hero-search";
import { ViralStoryRow } from "@/components/marketplace/viral-story-row";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDisplayMoney } from "@/lib/utils";

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
  const statIcons = [ShieldCheck, Package, Globe] as const;

  return (
    <section className="w-full pt-0">
      <div className="home-hero-stage relative w-full overflow-hidden rounded-none">
        <div className="home-hero-grid pointer-events-none absolute inset-0 opacity-[0.5]" />
        <div className="pointer-events-none absolute -top-28 right-[-4rem] h-72 w-72 rounded-full bg-[#f97316]/12 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-5rem] left-[-3rem] h-80 w-80 rounded-full bg-[#433360]/8 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),transparent)]" />

        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 sm:py-11 lg:min-h-[min(640px,85vh)] lg:px-8 lg:py-12 xl:min-h-[700px] xl:px-10">
          {/* Mobile: headline → pulse → search → stats → suppliers. Desktop: two columns. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:grid-rows-[auto_auto_auto_auto] lg:items-start lg:gap-x-10 lg:gap-y-8 xl:gap-x-14">
            {/* 1 — Headline + trust */}
            <div className="order-1 max-w-2xl lg:col-start-1 lg:row-start-1 lg:max-w-none">
              <div className="inline-flex w-fit items-center gap-2.5 rounded-full border border-[#f97316]/25 bg-[#fff7ed]/90 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#433360] sm:text-[11px]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f97316] opacity-35" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                </span>
                Verified global sourcing network
              </div>

              <h1 className="font-outfit mt-5 text-balance text-[2.125rem] font-black leading-[0.95] tracking-[-0.035em] text-[var(--color-text-primary)] min-[400px]:text-[2.4rem] sm:mt-7 sm:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem]">
                <span className="block">Source products,</span>
                <span className="block text-[#433360]/85">activate creators,</span>
                <span className="mt-1 block bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] bg-clip-text text-transparent">
                  grow across borders.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-[15px] font-medium leading-relaxed text-[#4b5563] sm:mt-6 sm:text-[17px]">
                Verified suppliers, live catalog, and campaign-ready creators — one place to go from search to deal flow.
              </p>

              {trustPills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
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
            </div>

            {/* 2 — Marketplace pulse (above search on mobile for stronger hook) */}
            <div className="order-2 lg:sticky lg:top-[calc(var(--navbar-height)+0.5rem)] lg:col-start-2 lg:row-span-3 lg:row-start-1">
              <div className="home-hero-panel relative overflow-hidden rounded-[1.35rem] border border-[#ebe8f2] p-4 shadow-[0_24px_56px_-32px_rgba(67,51,96,0.28)] sm:rounded-[1.75rem] sm:p-6 lg:shadow-[0_20px_50px_-28px_rgba(67,51,96,0.18)]">
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#f97316]/15 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-[#433360]/10 blur-2xl" />
                <div className="relative">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ea580c] sm:text-[11px]">Marketplace pulse</p>
                      <h2 className="font-outfit mt-1.5 text-[1.35rem] font-black leading-[1.12] tracking-tight text-[var(--color-text-primary)] sm:mt-2 sm:text-[1.625rem] sm:leading-tight">
                        What the network is watching
                      </h2>
                      <p className="mt-2 max-w-md text-[12px] leading-relaxed text-[#6b7280] sm:text-[13px]">
                        Live clips and active themes — updated as campaigns run.
                      </p>
                    </div>
                    <div className="flex w-full shrink-0 flex-row items-center justify-between gap-3 rounded-2xl border border-[#f97316]/35 bg-gradient-to-br from-[#fff7ed] via-white to-[#fffbf7] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] sm:w-auto sm:flex-col sm:items-end sm:justify-start sm:py-3 sm:text-right">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ea580c] sm:order-2 sm:text-[9px]">Match success</div>
                      <div className="text-[1.85rem] font-black tabular-nums leading-none text-[var(--color-text-primary)] sm:order-1 sm:text-[1.5rem]">
                        {socialBar.successRate}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-5 sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
                    {heroCampaigns.map((chip, index) => (
                      <span
                        key={`${chip}-${index}`}
                        className={cn(
                          "shrink-0 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] sm:text-[11px] sm:tracking-[0.16em]",
                          index === 0
                            ? "bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white shadow-md shadow-[#f97316]/25"
                            : "border border-[#ebe8f2] bg-[#fafafa] text-[#433360]/85"
                        )}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[1.15rem] border border-[#ebe8f2] bg-[#fafafa] sm:mt-5 sm:rounded-[1.35rem]">
                    <div className="p-3 sm:p-4">
                      {viralClips.length > 0 ? (
                        <ViralStoryRow clips={viralClips} showHeader={false} />
                      ) : (
                        <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-[#ebe8f2] bg-white px-4 text-center sm:min-h-[200px]">
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
              </div>
            </div>

            {/* 3 — Search + CTAs */}
            <div className="order-3 max-w-2xl space-y-3 lg:col-start-1 lg:row-start-2 lg:max-w-none">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#ea580c]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Smart search
              </div>
              <HeroSearch categories={heroSearchCategories} />

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

              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
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
            </div>

            {/* 4 — Stats */}
            <div className="order-4 border-t border-[#ebe8f2] pt-7 sm:pt-8 lg:col-start-1 lg:row-start-3">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#9ca3af] lg:mb-0">
                Platform snapshot
              </p>
              <div className="home-hero-stat-strip">
                {heroStats.map((stat, i) => {
                  const Icon = statIcons[i % statIcons.length];
                  const isThird = i === 2;
                  return (
                    <div
                      key={stat.label}
                      className={cn("home-hero-stat-card min-w-0", isThird && "home-hero-stat-card--wide")}
                    >
                      <div className="flex items-start gap-2.5 sm:block sm:gap-0">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] shadow-inner shadow-[#f97316]/10 ring-1 ring-[#f97316]/20 sm:hidden"
                          aria-hidden
                        >
                          <Icon className="h-5 w-5 text-[#ea580c]" strokeWidth={2.25} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[1.5rem] font-black tabular-nums leading-none tracking-tight text-[var(--color-text-primary)] sm:text-[1.75rem] lg:text-[2rem]">
                            {stat.value}
                          </div>
                          <div className="mt-1.5 text-[9px] font-black uppercase leading-tight tracking-[0.18em] text-[#ea580c] sm:mt-1.5 sm:text-[10px] sm:tracking-[0.22em]">
                            {stat.label}
                          </div>
                          <p className="mt-1.5 max-w-none text-[11px] leading-snug text-[#6b7280] sm:mt-2 sm:max-w-[14rem] sm:text-[12px] md:text-[13px]">
                            {stat.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5 — Suppliers + creator */}
            <div className="order-5 lg:col-start-2 lg:row-start-4">
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <div className="home-hero-panel flex flex-col rounded-[1.35rem] p-4 shadow-[0_16px_40px_-28px_rgba(67,51,96,0.14)] sm:rounded-[1.5rem] sm:p-5 sm:shadow-none">
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

                  <div className="home-hero-panel flex flex-col rounded-[1.35rem] p-4 shadow-[0_16px_40px_-28px_rgba(67,51,96,0.14)] sm:rounded-[1.5rem] sm:p-5 sm:shadow-none">
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
                            {formatDisplayMoney(Number(spotlightCreator.total_earnings ?? 0), "RWF")}
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
    </section>
  );
}
