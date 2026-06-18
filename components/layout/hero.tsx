"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Clapperboard,
  DollarSign,
  Globe,
  Headphones,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { TICKER_ITEMS } from "@/data/dashboard";
import { ApplePayLogo, MastercardLogo, VisaLogo } from "@/components/ui/payment-logos";

const ORANGE = "#fd5000";
const GREEN = "#16a34a";
const BLUE = "#2563eb";
const PURPLE = "#7c3aed";

const TRUST_BADGES = [
  { icon: CheckCircle, label: "Verified", color: "#16a34a" },
  { icon: Lock, label: "Secure Payments", color: "#2563eb" },
  { icon: ShieldCheck, label: "Protected", color: "#2563eb" },
  { icon: Zap, label: "Instant Payouts", color: "#ca8a04" },
  { icon: Globe, label: "Global", color: "#4b5563" },
  { icon: Headphones, label: "24/7 Support", color: "#4b5563" },
] as const;

const PARTNER_LOGOS = [
  { src: "/logos/paypal.png", alt: "PayPal", h: "h-5" },
  { src: "/logos/Payoneer_Master_Logo_OnWhite_RGB.svg", alt: "Payoneer", h: "h-5" },
  { src: "/logos/binance.png", alt: "Binance", h: "h-5" },
  { src: "/logos/flutterwave.png", alt: "Flutterwave", h: "h-4" },
  { src: "/logos/NOWPayments_idKVr3HnXR_1.svg", alt: "NOWPayments", h: "h-4" },
] as const;

const PAYMENT_LOGOS = [
  { id: "visa", node: <VisaLogo /> },
  { id: "mastercard", node: <MastercardLogo /> },
  { id: "apple-pay", node: <ApplePayLogo /> },
] as const;

const EARN_PATHS = [
  { icon: ShoppingBag, label: "Buy & save", href: "/marketplace", color: ORANGE },
  { icon: Store, label: "Sell globally", href: "/dashboard", color: BLUE },
  { icon: DollarSign, label: "Earn commissions", href: "/ugc", color: GREEN },
  { icon: Clapperboard, label: "Create UGC", href: "/ugc", color: PURPLE },
] as const;

function parseActiveCount(raw: string | undefined): number {
  if (!raw) return 8447;
  const n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 8447;
}

function HeroLiveTicker({ onlineCount }: { onlineCount: number }) {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="flex h-10 w-full items-center overflow-hidden bg-[#fd5000]">
      <div className="flex h-full shrink-0 items-center gap-2 bg-[#111] px-4 text-[10px] font-bold uppercase tracking-widest text-white">
        <span className="size-2 animate-pulse rounded-full bg-white" />
        Live
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          className="flex items-center whitespace-nowrap"
          style={{ animation: "marquee 36s linear infinite" }}
        >
          {items.map((item, i) => (
            <span key={`${item.text}-${i}`} className="mx-6 inline-flex items-center gap-2 text-[11px] text-white/95">
              <span className="font-semibold">{item.text}</span>
              <span className="text-white/70">{item.time}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-2 px-4 text-[11px] font-semibold text-white sm:flex">
        <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.8)]" />
        {onlineCount.toLocaleString()} users online
      </div>
    </div>
  );
}

function HeroPartnerStrip() {
  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] py-6">
      <div className="mx-auto max-w-8xl px-4 sm:px-6">
        <p className="mb-4 text-center text-[12px] font-medium text-[var(--color-text-muted)]">
          Trusted by 10,000+ creators and businesses worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          {PARTNER_LOGOS.map((logo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={logo.alt}
              src={logo.src}
              alt={logo.alt}
              className={`${logo.h} w-auto object-contain opacity-70 dark:opacity-80 dark:brightness-0 dark:invert`}
            />
          ))}
          <div className="flex items-center gap-4">
            {PAYMENT_LOGOS.map((logo) => (
              <span key={logo.id} className="inline-flex shrink-0 items-center">
                {logo.node}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroHighlightCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
      <span
        className="mb-3 grid size-9 place-items-center rounded-xl"
        style={{ background: `${color}18`, color }}
      >
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
      <div className="text-[18px] font-black leading-tight text-[var(--color-text-primary)]">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium text-[var(--color-text-muted)]">{label}</div>
    </div>
  );
}

function HeroValuePanel({ activeCount }: { activeCount: number }) {
  const formattedActive = activeCount >= 1000
    ? `${(activeCount / 1000).toFixed(1).replace(/\.0$/, "")}K+`
    : `${activeCount}+`;

  return (
    <div className="relative mx-auto w-full max-w-[480px] lg:mx-0 lg:max-w-none">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[32px] opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle at 30% 20%, rgba(253,80,0,0.18), transparent 55%), radial-gradient(circle at 80% 80%, rgba(124,58,237,0.12), transparent 50%)" }}
      />

      <div className="relative space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <HeroHighlightCard icon={DollarSign} label="Affiliate commission" value="Up to 30%" color={GREEN} />
          <HeroHighlightCard icon={Globe} label="Countries served" value="50+" color={BLUE} />
          <HeroHighlightCard icon={Zap} label="Average payout" value="Within 24h" color={ORANGE} />
          <HeroHighlightCard icon={Users} label="Active right now" value={formattedActive} color={PURPLE} />
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400">
                <TrendingUp className="size-4" />
              </span>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Earning snapshot
                </div>
                <div className="text-[13px] font-bold text-[var(--color-text-primary)]">Active affiliate month</div>
              </div>
            </div>
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:bg-green-500/15 dark:text-green-400">
              Live
            </span>
          </div>

          <div className="text-[28px] font-black leading-none text-[var(--color-text-primary)]">$1,240+</div>
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
            Typical monthly earnings for creators who promote 3+ products
          </p>

          <div className="mt-4 space-y-2.5">
            {[
              { label: "Marketplace sales", amount: "+$680", pct: 72 },
              { label: "UGC campaigns", amount: "+$410", pct: 48 },
              { label: "Affiliate links", amount: "+$150", pct: 28 },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="text-[var(--color-text-secondary)]">{row.label}</span>
                  <span className="font-bold text-[var(--color-text-primary)]">{row.amount}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                  <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: ORANGE }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {EARN_PATHS.map((path) => (
            <Link
              key={path.label}
              href={path.href}
              className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2.5 text-[11px] font-bold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]"
            >
              <span
                className="grid size-7 shrink-0 place-items-center rounded-lg"
                style={{ background: `${path.color}18`, color: path.color }}
              >
                <path.icon className="size-3.5" />
              </span>
              {path.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const [activeCount, setActiveCount] = useState(9313);
  const [onlineCount, setOnlineCount] = useState(8447);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hero-data")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const users = parseActiveCount(d.stats?.totalUsers);
        setActiveCount(Math.max(users, 1200));
        setOnlineCount(Math.floor(users * 0.9));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-[var(--color-surface)]">
      <section className="relative overflow-hidden pt-10 pb-8 sm:pt-14 sm:pb-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(253,80,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(253,80,0,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-8xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="text-center lg:text-left">
              <div className="mb-6 flex justify-center lg:justify-start">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)]">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                  {activeCount.toLocaleString()} people active now
                </span>
              </div>

              <h1
                className="font-black leading-[1.06] tracking-tight text-[var(--color-text-primary)]"
                style={{ fontSize: "clamp(2.25rem, 4.8vw, 3.75rem)", letterSpacing: "-0.03em" }}
              >
                The platform to
                <br />
                <span style={{ color: ORANGE }}>Earn Commissions</span>
                <br />
                Anywhere.
              </h1>

              <p className="mx-auto mt-5 max-w-[520px] text-[15px] leading-relaxed text-[var(--color-text-muted)] sm:text-base lg:mx-0">
                Sell products. Promote offers. Create content. Build your community. Grow your audience — all in one
                place.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-full px-6 text-[14px] font-bold text-white transition-opacity hover:opacity-90 sm:w-auto"
                  style={{ background: ORANGE }}
                >
                  Start earning for Free
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-6 text-[14px] font-bold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)] sm:w-auto"
                >
                  Browse Marketplace
                  <ArrowRight className="size-4 opacity-60" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 lg:justify-start">
                {TRUST_BADGES.map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span
                      className="grid size-7 place-items-center rounded-lg"
                      style={{ background: `${color}18`, color }}
                    >
                      <Icon className="size-3.5" strokeWidth={2.4} />
                    </span>
                    <span className="text-[12px] font-medium text-[var(--color-text-muted)]">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <HeroValuePanel activeCount={activeCount} />
          </div>
        </div>
      </section>

      <HeroLiveTicker onlineCount={onlineCount} />
      <HeroPartnerStrip />
    </div>
  );
}
