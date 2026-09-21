"use client";

import React, { memo, useEffect, useRef, useState } from "react";
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
import {
  jimvioDuration,
  jimvioEase,
  jimvioStagger,
} from "@/lib/motion/jimvio-motion";

const ORANGE_GRAD = "linear-gradient(90deg, #fd5000 0%, #ff7a33 55%, #ff9a5c 100%)";
const CTA_GRAD = "linear-gradient(135deg, #ff7a33 0%, #fd5000 55%, #e84800 100%)";
const PHRASE_EASE = jimvioEase;
const PHRASE_INTERVAL_MS = 2800;
const STAT_INTERVAL_MS = 4200;
const STAT_TRANSITION_S = 0.28;

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

function useInViewActive(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setActive(false);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setActive(Boolean(entry?.isIntersecting)),
      { threshold: 0.05, rootMargin: "40px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, ref]);

  return active;
}

const HeroRotatingPhrase = memo(function HeroRotatingPhrase({
  play,
}: {
  play: boolean;
}) {
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!play || reduced) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % HERO_PHRASES.length),
      PHRASE_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [play, reduced]);

  return (
    <span className="relative mx-auto block w-full max-w-[320px] min-w-0 sm:max-w-full">
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
            initial={reduced ? { opacity: 0 } : { y: 10, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: -10, opacity: 0 }}
            transition={{ duration: 0.32, ease: PHRASE_EASE }}
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

const HeroStatsRotatingBadge = memo(function HeroStatsRotatingBadge({
  play,
}: {
  play: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!play || reduced) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % HERO_STATS.length),
      STAT_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [play, reduced]);

  const current = HERO_STATS[index];

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:bg-[var(--color-surface)]">
      <span className="relative flex size-2 shrink-0" aria-hidden>
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
              initial={reduced ? { opacity: 0 } : { y: 6, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { y: -6, opacity: 0 }}
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
        "shadow-[0_10px_28px_rgba(253,80,0,0.28)] transition-[transform,box-shadow,opacity] duration-150 ease-out",
        "hover:scale-[1.015] hover:shadow-[0_12px_32px_rgba(253,80,0,0.32)] active:scale-[0.98]",
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
        <ArrowRight className="size-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
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
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,background-color,border-color] duration-150 ease-out",
        "hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] active:translate-y-0 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-muted)]/30 focus-visible:ring-offset-2",
      )}
    >
      Browse Marketplace
      <ArrowRight className="size-4 shrink-0 opacity-55 transition-[transform,opacity] duration-150 group-hover:translate-x-0.5 group-hover:opacity-80" />
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
  { src: "/logos/Flutterwave-main.svg", alt: "Flutterwave", h: "h-4" },
  { src: "/logos/NOWPayments_idKVr3HnXR_1.svg", alt: "NOWPayments", h: "h-4" },
  { src: "/logos/Afrigo-Logo.png", alt: "AfriGo", h: "h-5" },
] as const;

function PartnerLogoTrack({ suffix }: { suffix: string }) {
  return (
    <div className="flex items-center gap-10 sm:gap-14 md:gap-16">
      {PARTNER_IMG_LOGOS.map((logo) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${logo.alt}-${suffix}`}
          src={logo.src}
          alt={logo.alt}
          width={96}
          height={24}
          decoding="async"
          loading="lazy"
          className={`${logo.h} w-auto shrink-0 object-contain opacity-[0.55] grayscale transition-opacity duration-200 dark:opacity-70 dark:brightness-0 dark:invert`}
        />
      ))}
      <span className="inline-flex shrink-0 items-center opacity-75">
        <VisaLogo className="h-5" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-75">
        <MastercardLogo className="h-6" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-75">
        <ApplePayLogo className="h-5" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-75">
        <GooglePayLogo className="h-5" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-75">
        <AmexLogo className="h-5" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-75">
        <DiscoverLogo className="h-5" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-75">
        <UnionPayLogo className="h-5" />
      </span>
      <span className="inline-flex shrink-0 items-center opacity-75">
        <JcbLogo className="h-5" />
      </span>
    </div>
  );
}

const HeroPartnerStrip = memo(function HeroPartnerStrip({
  play,
}: {
  play: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const animate = !reduced && play;

  return (
    <div className="mx-auto w-full max-w-8xl px-4 sm:px-6">
      <p className="mb-6 text-center text-[12px] font-medium tracking-[-0.01em] text-[var(--color-text-muted)] sm:mb-7 sm:text-[13px]">
        Trusted by{" "}
        <span className="font-semibold tabular-nums text-[#111827] dark:text-[var(--color-text-primary)]">
          17,238
        </span>{" "}
        creators and businesses worldwide
      </p>

      <div
        className="group relative min-h-[32px] overflow-hidden sm:min-h-[36px]"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        }}
      >
        <div
          className={cn(
            "flex w-max items-center",
            animate &&
              "animate-[hero-partner-marquee_120s_linear_infinite] motion-reduce:animate-none sm:animate-[hero-partner-marquee_95s_linear_infinite]",
            "group-hover:[animation-play-state:paused]",
            !play && "[animation-play-state:paused]",
          )}
        >
          <div className="flex shrink-0 items-center pr-10 sm:pr-14 md:pr-16">
            <PartnerLogoTrack suffix="a" />
          </div>
          <div className="flex shrink-0 items-center pr-10 sm:pr-14 md:pr-16" aria-hidden>
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

const HeroPremiumBackground = memo(function HeroPremiumBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft dissolve into the shared Home canvas — no hard white slab */}
      <div
        className="absolute left-1/2 top-[14%] h-[min(380px,50vw)] w-[min(620px,82vw)] -translate-x-1/2 rounded-full opacity-80"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,90,31,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 58%, rgba(15,23,42,0.012) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-24"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(248,250,252,0.55) 100%)",
        }}
      />
    </div>
  );
});

const HERO_ENTER = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: jimvioDuration.reveal / 1000,
      ease: jimvioEase,
      delay: i * (jimvioStagger.tight / 1000),
    },
  }),
} as const;

const HERO_ENTER_REDUCED = {
  hidden: { opacity: 0 },
  show: (i: number) => ({
    opacity: 1,
    transition: { duration: 0.2, delay: i * 0.03 },
  }),
} as const;

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInViewActive(sectionRef, !reduced);
  const enter = reduced ? HERO_ENTER_REDUCED : HERO_ENTER;

  return (
    <div className="w-full max-w-[100dvw] overflow-x-hidden bg-transparent">
      <section ref={sectionRef} className="relative flex w-full flex-col overflow-hidden">
        <HeroPremiumBackground />

        <div className="relative z-10 mx-auto flex w-full max-w-[820px] flex-col items-center px-4 pt-7 text-center sm:px-6 sm:pt-12 lg:pt-14">
          <motion.div custom={0} variants={enter} initial="hidden" animate="show">
            <HeroStatsRotatingBadge play={inView} />
          </motion.div>

          <h1
            className={cn(
              "mt-5 flex w-full flex-col items-center gap-1.5 font-black tracking-tight text-[var(--color-text-primary)] sm:gap-2.5",
              "text-[clamp(1.4rem,4.8vw+0.45rem,1.7rem)]",
              "sm:text-[clamp(2.15rem,6.2vw,3.85rem)]",
            )}
            style={{
              letterSpacing: "-0.038em",
              lineHeight: 1.06,
            }}
          >
            <motion.span
              custom={1}
              variants={enter}
              initial="hidden"
              animate="show"
              className="block whitespace-nowrap"
            >
              The platform to
            </motion.span>
            <motion.span
              custom={2}
              variants={enter}
              initial="hidden"
              animate="show"
              className="block w-full"
            >
              <HeroRotatingPhrase play={inView} />
            </motion.span>
            <motion.span
              custom={3}
              variants={enter}
              initial="hidden"
              animate="show"
              className="block whitespace-nowrap"
            >
              Anywhere.
            </motion.span>
          </h1>

          <motion.p
            custom={4}
            variants={enter}
            initial="hidden"
            animate="show"
            className="mx-auto mt-4 max-w-[700px] text-[14px] leading-[1.5] tracking-[0.01em] text-[var(--color-text-muted)] sm:mt-6 sm:text-[16px] sm:leading-[1.5]"
          >
            Sell products. Promote offers. Create content.
            <br />
            Build your community. Grow your audience — all in one place.
          </motion.p>

          <motion.div
            custom={5}
            variants={enter}
            initial="hidden"
            animate="show"
            className="mt-5 flex w-full max-w-md flex-col items-stretch gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-3.5"
          >
            <HeroPrimaryCTA />
            <HeroSecondaryCTA />
          </motion.div>
        </div>

        <div className="relative z-10 w-full pb-6 pt-9 sm:pb-8 sm:pt-10 lg:pb-10">
          <motion.div custom={6} variants={enter} initial="hidden" animate="show">
            <HeroTrustBadges />
          </motion.div>

          <motion.div
            custom={7}
            variants={enter}
            initial="hidden"
            animate="show"
            className="mt-9 w-full sm:mt-11"
          >
            <HeroPartnerStrip play={inView} />
          </motion.div>
        </div>
      </section>
    </div>
  );
}
