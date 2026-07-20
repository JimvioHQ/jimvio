"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Globe,
  Headphones,
  Lock,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  AmexLogo,
  ApplePayLogo,
  DiscoverLogo,
  GooglePayLogo,
  JcbLogo,
  MastercardLogo,
  UnionPayLogo,
  VisaLogo,
} from "@/components/ui/payment-logos";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

const ORANGE_GRAD = "linear-gradient(90deg, #fd5000 0%, #ff7a33 55%, #ff9a5c 100%)";
const CTA_GRAD = "linear-gradient(135deg, #ff7a33 0%, #fd5000 55%, #e84800 100%)";
const PHRASE_EASE = [0.22, 1, 0.36, 1] as const;
const PHRASE_INTERVAL_MS = 2700;
const STAT_INTERVAL_MS = 4000;
const STAT_TRANSITION_S = 0.4;

const HERO_PHRASES = [
  "Monetize Knowledge",
  "Earn Globally",
  "Grow Your Audience",
  "Create UGC",
  "Sell Products",
  "Build Communities",
  "Launch Campaigns",
  "Start a Business",
  "Buy Products",
  "Grow Your Brand",
  "Make Money Online",
  "Teach Online",
  "Build Your Marketplace",
] as const;

const LONGEST_HERO_PHRASE = HERO_PHRASES.reduce((a, b) =>
  a.length >= b.length ? a : b,
);

const HERO_STATS = [
  { emoji: "🌍", value: "195", label: "Countries" },
  { emoji: "👥", value: "17,238", label: "Users" },
  { emoji: "🏪", value: "85K", label: "Businesses" },
  { emoji: "🛍", value: "285,000", label: "Products" },
] as const;

const LONGEST_HERO_STAT = HERO_STATS.reduce((a, b) =>
  `${a.value} ${a.label}`.length >= `${b.value} ${b.label}`.length ? a : b,
);

const HeroRotatingPhrase = memo(function HeroRotatingPhrase() {
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % HERO_PHRASES.length),
      PHRASE_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="relative mx-auto block w-full max-w-[320px] min-w-0 sm:max-w-full">
      {/* Invisible longest phrase reserves height — prevents CLS; never wraps */}
      <span
        aria-hidden
        className="invisible block whitespace-nowrap bg-clip-text leading-[1.08] text-transparent"
        style={{ backgroundImage: ORANGE_GRAD }}
      >
        {LONGEST_HERO_PHRASE}
      </span>
      <span className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={HERO_PHRASES[index]}
            initial={
              reduced
                ? { opacity: 0 }
                : { y: 14, opacity: 0, filter: "blur(8px)" }
            }
            animate={
              reduced
                ? { opacity: 1 }
                : { y: 0, opacity: 1, filter: "blur(0px)" }
            }
            exit={
              reduced
                ? { opacity: 0 }
                : { y: -14, opacity: 0, filter: "blur(8px)" }
            }
            transition={{ duration: 0.48, ease: PHRASE_EASE }}
            className="block w-full whitespace-nowrap bg-clip-text leading-[1.08] text-transparent"
            style={{ backgroundImage: ORANGE_GRAD }}
          >
            {HERO_PHRASES[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
});

const HeroStatsRotatingBadge = memo(function HeroStatsRotatingBadge() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % HERO_STATS.length),
      STAT_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, []);

  const current = HERO_STATS[index];

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:bg-[var(--color-surface)]">
      <span className="relative flex size-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>

      <span className="relative inline-flex min-h-[18px] items-center overflow-hidden sm:min-h-[20px]">
        <span
          aria-hidden
          className="invisible inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] sm:text-[12px]"
        >
          <span className="inline-block w-[1.15em] text-center">{LONGEST_HERO_STAT.emoji}</span>
          <span className="font-semibold">
            {LONGEST_HERO_STAT.value} {LONGEST_HERO_STAT.label}
          </span>
        </span>

        <span className="absolute inset-0 flex items-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${current.value}-${current.label}`}
              initial={reduced ? { opacity: 0 } : { y: 8, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { y: -8, opacity: 0 }}
              transition={{ duration: STAT_TRANSITION_S, ease: PHRASE_EASE }}
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] sm:text-[12px]"
            >
              <span className="inline-block w-[1.15em] text-center" aria-hidden>
                {current.emoji}
              </span>
              <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                {current.value}
              </span>
              <span className="font-medium text-[var(--color-text-muted)]">
                {current.label}
              </span>
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </div>
  );
});

function HeroPrimaryCTA() {
  const [pending, setPending] = React.useState(false);

  return (
    <Link
      href="/register"
      onClick={() => setPending(true)}
      aria-busy={pending}
      className={cn(
        "group relative inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-full px-7 text-[13px] font-bold text-white sm:h-[50px] sm:w-auto sm:px-8 sm:text-[14px]",
        "shadow-[0_10px_28px_rgba(253,80,0,0.28)] transition-[transform,box-shadow,opacity] duration-200 ease-out will-change-transform",
        "hover:scale-[1.02] hover:shadow-[0_14px_36px_rgba(253,80,0,0.36)] active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/45 focus-visible:ring-offset-2",
        pending && "pointer-events-none opacity-85",
      )}
      style={{ background: CTA_GRAD }}
    >
      <span
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/18 to-transparent opacity-90"
        aria-hidden
      />
      <span className="relative flex items-center gap-2">
        {pending ? (
          <span
            className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            aria-hidden
          />
        ) : null}
        Start earning for Free
        <ArrowRight className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function HeroSecondaryCTA() {
  return (
    <Link
      href="/marketplace"
      className={cn(
        "group inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-7 text-[13px] font-bold text-[var(--color-text-primary)] sm:h-[50px] sm:w-auto sm:px-8 sm:text-[14px]",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out will-change-transform",
        "hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] active:translate-y-0 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-muted)]/30 focus-visible:ring-offset-2",
      )}
    >
      Browse Marketplace
      <ArrowRight className="size-4 shrink-0 opacity-55 transition-[transform,opacity] duration-200 group-hover:translate-x-0.5 group-hover:opacity-80" />
    </Link>
  );
}

const TRUST_BADGES = [
  { icon: CheckCircle, label: "Verified", color: "#16a34a" },
  { icon: Lock, label: "Secure Payments", color: "#2563eb" },
  { icon: ShieldCheck, label: "Protected", color: "#7c3aed" },
  { icon: Zap, label: "Instant Payouts", color: "#fd5000" },
  { icon: Globe, label: "Global", color: "#6b7280" },
  { icon: Headphones, label: "24/7 Support", color: "#2563eb" },
] as const;

const PARTNER_IMG_LOGOS = [
  { src: "/logos/paypal.png", alt: "PayPal", h: "h-5" },
  { src: "/logos/Payoneer_Master_Logo_OnWhite_RGB.svg", alt: "Payoneer", h: "h-5" },
  { src: "/logos/binance.png", alt: "Binance Pay", h: "h-5" },
  { src: "/logos/flutterwave.png", alt: "Flutterwave", h: "h-4" },
  { src: "/logos/NOWPayments_idKVr3HnXR_1.svg", alt: "NOWPayments", h: "h-4" },
] as const;

function PartnerLogoTrack({ suffix }: { suffix: string }) {
  return (
    <>
      <span className="inline-flex shrink-0 items-center opacity-70">
        <ApplePayLogo className="h-5" />
      </span>
      {PARTNER_IMG_LOGOS.map((logo) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${logo.alt}-${suffix}`}
          src={logo.src}
          alt={logo.alt}
          width={88}
          height={20}
          decoding="async"
          loading="lazy"
          className={`${logo.h} w-auto shrink-0 object-contain opacity-60 dark:opacity-70 dark:brightness-0 dark:invert`}
        />
      ))}
      <span className="inline-flex shrink-0 items-center opacity-80">
        <VisaLogo className="h-5" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-80">
        <MastercardLogo className="h-6" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-80">
        <GooglePayLogo className="h-5" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-80">
        <ApplePayLogo className="h-5" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-80">
        <AmexLogo className="h-5" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-80">
        <DiscoverLogo className="h-5" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-80">
        <UnionPayLogo className="h-5" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-80">
        <JcbLogo className="h-5" />
      </span>
    </>
  );
}

const HeroPartnerStrip = memo(function HeroPartnerStrip() {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="mx-auto w-full max-w-8xl px-4 sm:px-6">
      <p className="mb-5 text-center text-[11px] font-medium tracking-[0.01em] text-[var(--color-text-muted)] sm:mb-6 sm:text-[12px]">
        Trusted by 17,238 creators and businesses worldwide
      </p>

      <div className="group relative min-h-[28px] overflow-hidden sm:min-h-[32px]">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[var(--color-surface)] to-transparent sm:w-16"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--color-surface)] to-transparent sm:w-16"
          aria-hidden
        />

        <div
          className={cn(
            "flex w-max items-center gap-12 sm:gap-16",
            !reduced &&
              "animate-[hero-partner-marquee_90s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none",
          )}
          style={{ willChange: reduced ? undefined : "transform" }}
        >
          <div className="flex items-center gap-12 sm:gap-16">
            <PartnerLogoTrack suffix="a" />
          </div>
          <div className="flex items-center gap-12 sm:gap-16" aria-hidden>
            <PartnerLogoTrack suffix="b" />
          </div>
        </div>
      </div>
    </div>
  );
});

const HeroTrustBadges = memo(function HeroTrustBadges() {
  return (
    <div className="mx-auto flex w-full max-w-8xl flex-wrap items-center justify-center gap-x-4 gap-y-3 px-4 sm:gap-x-5 sm:gap-y-3.5 sm:px-6 lg:gap-x-7">
      {TRUST_BADGES.map(({ icon: Icon, label, color }) => (
        <div key={label} className="inline-flex items-center gap-1.5 sm:gap-2">
          <span
            className="inline-flex size-[18px] shrink-0 items-center justify-center rounded-md sm:size-6"
            style={{ background: `${color}14`, color }}
          >
            <Icon className="size-3 shrink-0 sm:size-3.5" strokeWidth={2.35} />
          </span>
          <span className="whitespace-nowrap text-[10px] font-medium text-[var(--color-text-muted)] sm:text-[12px]">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
});

const HERO_NOISE_TEXTURE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const HeroPremiumBackground = memo(function HeroPremiumBackground({
  reduced,
}: {
  reduced: boolean;
}) {
  const auroraTransition = useMemo(
    () => ({ duration: 32, repeat: Infinity, ease: "easeInOut" as const }),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[var(--color-bg)]" />
      <div className="absolute inset-0 bg-[var(--color-surface)]/90" />

      <div className="absolute left-1/2 top-[18%] h-[min(420px,55vw)] w-[min(640px,80vw)] -translate-x-1/2 rounded-full bg-[rgba(255,90,31,0.03)] blur-[120px]" />

      <motion.div
        className="absolute left-1/2 top-[12%] h-[min(480px,58vw)] w-[min(720px,88vw)] -translate-x-1/2 rounded-full opacity-40 blur-[140px]"
        style={{ background: "rgba(255,90,31,0.035)" }}
        animate={reduced ? undefined : { x: [0, -12, 10, 0], y: [0, -10, 8, 0] }}
        transition={auroraTransition}
      />

      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-soft-light"
        style={{ backgroundImage: HERO_NOISE_TEXTURE }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 62%, rgba(15,23,42,0.015) 100%)",
        }}
      />
    </div>
  );
});

export function Hero() {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="w-full max-w-[100dvw] overflow-x-hidden bg-[var(--color-surface)]">
      <section className="relative flex w-full flex-col overflow-hidden">
        <HeroPremiumBackground reduced={reduced} />

        {/* Upper hero — tight top spacing under navbar (no full-viewport vertical centering) */}
        <div className="relative z-10 mx-auto flex w-full max-w-[820px] flex-col items-center px-4 pt-7 text-center sm:px-6 sm:pt-12 lg:pt-14">
          <HeroStatsRotatingBadge />

          <h1
            className={cn(
              "mt-5 flex w-full flex-col items-center gap-1.5 font-black tracking-tight text-[var(--color-text-primary)] sm:gap-2.5",
              /* Mobile: sized so longest phrase ("Build Your Marketplace") stays 1 line in ~320px */
              "text-[clamp(1.4rem,4.8vw+0.45rem,1.7rem)]",
              /* Desktop unchanged */
              "sm:text-[clamp(2.15rem,6.2vw,3.85rem)]",
            )}
            style={{
              letterSpacing: "-0.038em",
              lineHeight: 1.06,
            }}
          >
            <span className="block whitespace-nowrap">The platform to</span>
            <HeroRotatingPhrase />
            <span className="block whitespace-nowrap">Anywhere.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-[700px] text-[14px] leading-[1.5] tracking-[0.01em] text-[var(--color-text-muted)] sm:mt-6 sm:text-[16px] sm:leading-[1.5]">
            Sell products. Promote offers. Create content.
            <br />
            Build your community. Grow your audience — all in one place.
          </p>

          <div className="mt-5 flex w-full max-w-md flex-col items-stretch gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-3.5">
            <HeroPrimaryCTA />
            <HeroSecondaryCTA />
          </div>
        </div>

        {/* Lower hero — trust badges + Trusted by / payment marquee */}
        <div className="relative z-10 w-full pb-1.5 pt-8 sm:pb-2 sm:pt-9 lg:pb-2.5">
          <HeroTrustBadges />

          <div className="mt-8 w-full sm:mt-10">
            <HeroPartnerStrip />
          </div>
        </div>
      </section>
    </div>
  );
}
