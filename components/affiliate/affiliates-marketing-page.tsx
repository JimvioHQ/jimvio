import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  DollarSign,
  Globe,
  Link2,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImage } from "@/lib/utils";
import type { ResolvedPlatformSettings } from "@/lib/platform-settings-shared";

const SHELL = "mx-auto w-full max-w-8xl px-4 sm:px-6";

type SpotlightProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  rate: number;
  commission: string;
  avgEarning: number;
  engagement: number;
  currency: string;
  image: string;
  price: number;
};

type TopEarner = {
  id: string;
  user_id: string;
  total_conversions?: number | null;
  total_earnings?: number | null;
};

type AffiliatesMarketingPageProps = {
  heroRate: number;
  statsRow: { label: string; value: string }[];
  topProducts: SpotlightProduct[];
  topEarners: TopEarner[];
  maxEarning: number;
  settings: ResolvedPlatformSettings;
  isLoggedIn: boolean;
  hasAffiliateAccount: boolean;
};

const TESTIMONIALS = [
  {
    quote:
      "I promote three SKUs from one dashboard. Clicks, conversions, and payouts are all in one place — no spreadsheet chaos.",
    name: "Kevin A.",
    role: "Tech reviewer",
    highlight: "12 conversions in week one",
  },
  {
    quote:
      "Rates are listed on every product before I share. I know exactly what a sale is worth before posting.",
    name: "Sonia L.",
    role: "Lifestyle creator",
    highlight: "Focuses on high-commission SKUs",
  },
];

const FAQ = [
  {
    q: "How much can I earn per sale?",
    a: "Commission is set per product — typically 5–30% depending on the listing. The rate and estimated earnings are shown before you generate a link.",
  },
  {
    q: "When do I get paid?",
    a: "Earnings move to your available balance after orders are confirmed. Withdraw once you reach the platform minimum payout threshold.",
  },
  {
    q: "Do I need approval to start?",
    a: "Create a free account, activate affiliate access, and start sharing tracked links. No upfront fees.",
  },
  {
    q: "How are referrals tracked?",
    a: "Every affiliate link carries your unique code. Clicks and conversions are attributed automatically when a purchase completes.",
  },
];

function formatMoney(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
      {children}
    </p>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}

export function AffiliatesMarketingPage({
  heroRate,
  statsRow,
  topProducts,
  topEarners,
  maxEarning,
  settings,
  isLoggedIn,
  hasAffiliateAccount,
}: AffiliatesMarketingPageProps) {
  const valueProps =
    settings.marketing.affiliate_value_props.length > 0
      ? settings.marketing.affiliate_value_props
      : [
          "Competitive rates on every eligible SKU",
          "Tracked links with real-time click data",
          "Payouts when you hit the platform minimum",
        ];

  const minPayout = settings.fees.min_payout_rwf;
  const primaryCtaHref = hasAffiliateAccount
    ? "/dashboard/links"
    : isLoggedIn
      ? "/dashboard/activate/affiliate"
      : "/register?role=affiliate";
  const primaryCtaLabel = hasAffiliateAccount
    ? "Open affiliate dashboard"
    : isLoggedIn
      ? "Activate affiliate access"
      : "Start earning — it's free";

  const showcaseProduct = topProducts[0];
  const exampleSale = showcaseProduct
    ? showcaseProduct.avgEarning
    : Math.round(50 * (heroRate / 100));

  return (
    <div className="min-h-screen bg-[var(--color-bg)] font-sans">
      {/* Hero */}
      <section className="border-b border-[var(--color-border)]">
        <div className={`${SHELL} py-14 sm:py-20 lg:py-24`}>
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <SectionEyebrow>Jimvio affiliate program</SectionEyebrow>
              <h1 className="text-[clamp(2.2rem,5vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-[var(--color-text-primary)]">
                Earn when people buy
                <span className="text-[var(--color-accent)]"> products you trust</span>
              </h1>
              <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-[var(--color-text-muted)]">
                Share tracked links to verified marketplace products. Earn up to{" "}
                <strong className="font-semibold text-[var(--color-text-primary)]">
                  {heroRate}%
                </strong>{" "}
                per confirmed sale — rates are transparent on every listing.
              </p>

              <ul className="mt-6 space-y-2.5">
                {valueProps.slice(0, 3).map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-[14px] text-[var(--color-text-secondary)]"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  className="h-11 rounded-lg bg-[var(--color-accent)] px-7 font-semibold text-white shadow-none hover:bg-[var(--color-accent-hover)]"
                  asChild
                >
                  <Link href={primaryCtaHref}>
                    {primaryCtaLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-lg border-[var(--color-border)] font-medium"
                  asChild
                >
                  <Link href="/marketplace">Browse affiliate products</Link>
                </Button>
              </div>
              <p className="mt-3 text-[12px] text-[var(--color-text-muted)]">
                No credit card · Min. payout from {formatMoney(minPayout, "RWF")}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                Live program snapshot
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {statsRow.map((s) => (
                  <StatTile key={s.label} label={s.label} value={s.value} />
                ))}
              </div>

              {showcaseProduct && (
                <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    Example earning
                  </p>
                  <p className="mt-2 text-[15px] font-semibold text-[var(--color-text-primary)] line-clamp-1">
                    {showcaseProduct.name}
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[12px] text-[var(--color-text-muted)]">Per sale</p>
                      <p className="text-xl font-bold tabular-nums text-[var(--color-accent)]">
                        {formatMoney(exampleSale, showcaseProduct.currency)}
                      </p>
                    </div>
                    <span className="rounded-md bg-[var(--color-accent-light)] px-2 py-1 text-[12px] font-semibold text-[var(--color-accent)]">
                      {showcaseProduct.commission} rate
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
        <div className={`${SHELL} py-8`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {settings.marketing.trust_bar.slice(0, 4).map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5"
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                <div>
                  <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-text-muted)]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={`${SHELL} py-16 sm:py-20`}>
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionEyebrow>How it works</SectionEyebrow>
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Three steps to your first commission
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-[var(--color-text-muted)]">
            Sign up, pick products with clear rates, share your link — Jimvio handles tracking and payouts.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Globe,
              step: "01",
              title: "Choose products",
              desc: "Filter the marketplace for affiliate-enabled SKUs. Commission % and estimated earnings are visible upfront.",
            },
            {
              icon: Link2,
              step: "02",
              title: "Share tracked links",
              desc: "Post on social, drop in your newsletter, or send directly. Every click is logged to your dashboard.",
            },
            {
              icon: Wallet,
              step: "03",
              title: "Withdraw earnings",
              desc: "Commissions credit after confirmed orders. Cash out once you pass the minimum payout threshold.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.step}
                className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7"
              >
                <span
                  aria-hidden
                  className="absolute right-4 top-4 text-[64px] font-black leading-none text-[var(--color-text-primary)] opacity-[0.04]"
                >
                  {item.step}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-light)]">
                  <Icon className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[var(--color-text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                  {item.desc}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Products */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
        <div className={`${SHELL} py-16 sm:py-20`}>
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionEyebrow>Opportunities</SectionEyebrow>
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
                Products affiliates promote now
              </h2>
            </div>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--color-accent)] hover:underline"
            >
              View full catalog <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center text-[14px] text-[var(--color-text-muted)]">
              Affiliate-enabled products are loading into the catalog. Check back soon or browse the marketplace.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {topProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/marketplace/${p.slug}`}
                  className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:border-[var(--color-accent)]/35 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-secondary)]">
                    <Image
                      src={p.image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 100vw, 25vw"
                      unoptimized
                    />
                    <span className="absolute right-2.5 top-2.5 rounded-md bg-[var(--color-surface)]/95 px-2 py-1 text-[12px] font-bold text-[var(--color-accent)] backdrop-blur-sm">
                      {p.commission}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                      {p.category}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                      {p.name}
                    </h3>
                    <div className="mt-3 flex items-center justify-between text-[12px]">
                      <span className="text-[var(--color-text-muted)]">Est. per sale</span>
                      <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                        {formatMoney(p.avgEarning, p.currency)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[12px]">
                      <span className="text-[var(--color-text-muted)]">Sales signal</span>
                      <span className="font-medium tabular-nums text-[var(--color-text-primary)]">
                        {p.engagement.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why + testimonials */}
      <section className={`${SHELL} py-16 sm:py-20`}>
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <SectionEyebrow>Why Jimvio</SectionEyebrow>
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Built for promoters, not just sellers
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
              One platform for marketplace products, communities, and creator campaigns — with affiliate tooling that stays out of your way.
            </p>
            <div className="mt-6 space-y-4">
              {[
                {
                  icon: BarChart3,
                  title: "Transparent rates",
                  desc: "Commission is listed on every product before you share.",
                },
                {
                  icon: Zap,
                  title: "Fast link creation",
                  desc: "Generate tracked links from your dashboard in seconds.",
                },
                {
                  icon: DollarSign,
                  title: "Real payout path",
                  desc: `Withdraw after you reach ${formatMoney(minPayout, "RWF")} in confirmed earnings.`,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-light)]">
                      <Icon className="h-4 w-4 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                        {item.title}
                      </p>
                      <p className="text-[13px] text-[var(--color-text-muted)]">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Affiliate voices
            </p>
            <div className="mt-4 space-y-4">
              {TESTIMONIALS.map((t) => (
                <figure
                  key={t.name}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-4"
                >
                  <blockquote className="text-[14px] leading-relaxed text-[var(--color-text-primary)]">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                    <span className="text-[var(--color-text-muted)]">
                      <span className="font-medium text-[var(--color-text-primary)]">{t.name}</span>
                      {" · "}
                      {t.role}
                    </span>
                    <span className="rounded-md bg-[var(--color-accent-light)] px-2 py-0.5 font-medium text-[var(--color-accent)]">
                      {t.highlight}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
        <div className={`${SHELL} py-16 sm:py-20`}>
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionEyebrow>Leaderboard</SectionEyebrow>
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                Top earners on Jimvio
              </h2>
            </div>
            <p className="max-w-sm text-[13px] text-[var(--color-text-muted)]">
              Ranked by confirmed affiliate earnings. Anonymized for privacy.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {topEarners.length > 0 ? (
              topEarners.map((aff, idx) => {
                const earning = Number(aff.total_earnings ?? 0);
                const barPct = maxEarning > 0 ? (earning / maxEarning) * 100 : 0;
                return (
                  <div
                    key={aff.id}
                    className="relative flex items-center gap-4 border-b border-[var(--color-border)] px-5 py-4 last:border-0"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-[var(--color-accent)]/5"
                      style={{ width: `${barPct}%` }}
                    />
                    <span className="relative z-10 w-8 text-center text-[13px] font-bold text-[var(--color-text-muted)]">
                      {idx + 1}
                    </span>
                    <div className="relative z-10 min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                        Affiliate #{aff.user_id.slice(0, 6).toUpperCase()}
                      </p>
                      <p className="text-[12px] text-[var(--color-text-muted)]">
                        {aff.total_conversions || 0} conversions
                      </p>
                    </div>
                    <p className="relative z-10 text-[15px] font-bold tabular-nums text-[var(--color-text-primary)]">
                      {formatMoney(earning, "RWF")}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-14 text-center text-[14px] text-[var(--color-text-muted)]">
                No earnings recorded yet —{" "}
                <Link href={primaryCtaHref} className="font-semibold text-[var(--color-accent)] hover:underline">
                  be the first
                </Link>
                .
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`${SHELL} py-16 sm:py-20`}>
        <div className="mb-8">
          <SectionEyebrow>FAQ</SectionEyebrow>
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Common questions
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {FAQ.map((item) => (
            <div
              key={item.q}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{item.q}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className={`${SHELL} pb-20 sm:pb-24`}>
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-text-primary)] px-6 py-12 sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--color-accent)]/20 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-bg)] sm:text-4xl">
                Your audience is already shopping.
                <span className="text-[var(--color-accent)]"> Get paid when they buy.</span>
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-bg)]/70">
                Join the Jimvio affiliate program — free to start, {heroRate}% top rates on eligible products, and a dashboard built for real promoters.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Button
                size="lg"
                className="h-11 rounded-lg bg-[var(--color-accent)] px-8 font-semibold text-white hover:bg-[var(--color-accent-hover)]"
                asChild
              >
                <Link href={primaryCtaHref}>
                  {primaryCtaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Link
                href="/dashboard/affiliate/analytics"
                className="text-center text-[12px] text-[var(--color-bg)]/60 hover:text-[var(--color-bg)]"
              >
                Already active? View analytics →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
