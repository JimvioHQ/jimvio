"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle,
  Globe,
  Headphones,
  Lock,
  Megaphone,
  Package,
  Percent,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Video,
  Zap,
  MessageCircle,
  Trophy,
  Tag,
} from "lucide-react";
import { TICKER_ITEMS } from "@/data/dashboard";
import { ApplePayLogo, MastercardLogo, VisaLogo } from "@/components/ui/payment-logos";
import { useAIStore } from "@/lib/store/use-ai-store";
import { JimvioAIMascot } from "@/components/ui/jimvio-ai-mascot";
import { useIsMobile, usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { PlatformStatsRotatingBadge, usePlatformStats } from "@/components/platform/platform-stats-provider";
import { cn } from "@/lib/utils";
import {
  formatPlatformStat,
  getPlatformStatsLaunchSnapshot,
} from "@/lib/platform-stats";

const ORANGE = "var(--color-accent)";
const HERO_PHRASES = [
  "Earn Commissions",
  "Create Campaigns",
  "Build Communities",
  "Sell Products",
  "Grow Audience",
  "Launch Brands",
  "Create UGC",
  "Host Live Events",
  "Monetize Knowledge",
  "Earn Globally",
] as const;

const LONGEST_HERO_PHRASE = HERO_PHRASES.reduce((a, b) =>
  a.length >= b.length ? a : b,
);

const PHRASE_EASE = [0.22, 1, 0.36, 1] as const;

function HeroRotatingPhrase() {
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % HERO_PHRASES.length),
      2500,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="relative block w-full min-w-0 max-w-full">
      <span
        aria-hidden
        className="invisible block break-words leading-[1.08] [overflow-wrap:anywhere] md:whitespace-nowrap"
        style={{ color: ORANGE }}
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
                : { y: 18, opacity: 0, filter: "blur(10px)" }
            }
            animate={
              reduced
                ? { opacity: 1 }
                : { y: 0, opacity: 1, filter: "blur(0px)" }
            }
            exit={
              reduced
                ? { opacity: 0 }
                : { y: -18, opacity: 0, filter: "blur(10px)" }
            }
            transition={{ duration: 0.48, ease: PHRASE_EASE }}
            className="block w-full min-w-0 max-w-full break-words leading-[1.08] [overflow-wrap:anywhere] md:whitespace-nowrap"
            style={{ color: ORANGE }}
          >
            {HERO_PHRASES[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

function HeroPrimaryCTA() {
  const [pending, setPending] = React.useState(false);

  return (
    <Link
      href="/register"
      onClick={() => setPending(true)}
      aria-busy={pending}
      className={cn(
        "group relative inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-[13px] font-bold text-white sm:h-[48px] sm:w-auto sm:px-7 sm:text-[14px]",
        "shadow-[0_8px_24px_rgba(253,80,0,0.26)] transition-[transform,box-shadow,opacity] duration-200 ease-out will-change-transform",
        "hover:scale-[1.02] hover:shadow-[0_12px_32px_rgba(253,80,0,0.34)] active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45 focus-visible:ring-offset-2",
        pending && "pointer-events-none opacity-85",
      )}
      style={{ background: ORANGE }}
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/16 to-transparent opacity-80" aria-hidden />
      <span className="relative flex items-center gap-2">
        {pending ? (
          <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
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
        "group inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-6 text-[13px] font-bold text-[var(--color-text-primary)] sm:h-[48px] sm:w-auto sm:px-7 sm:text-[14px]",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out will-change-transform",
        "hover:scale-[1.01] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.06)] active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-muted)]/30 focus-visible:ring-offset-2",
      )}
    >
      Browse Marketplace
      <ArrowRight className="size-4 shrink-0 opacity-55 transition-[transform,opacity] duration-200 group-hover:translate-x-0.5 group-hover:opacity-80" />
    </Link>
  );
}

const TRUST_BADGES = [
  { icon: Users, label: "10k+ Creators", color: ORANGE },
  { icon: Globe, label: "500+ Communities", color: ORANGE },
  { icon: ShieldCheck, label: "100+ Partner Brands", color: ORANGE },
  { icon: Package, label: "5,000+ Products", color: ORANGE },
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

function HeroLiveTicker({ onlineCount }: { onlineCount: number }) {
  const reduced = usePrefersReducedMotion();
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="mx-auto w-full max-w-8xl px-4 sm:px-6">
      <div className="flex h-11 w-full items-center overflow-hidden bg-[var(--color-accent)] sm:h-10">
        <div className="flex h-full shrink-0 items-center pl-2 sm:pl-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E53935] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white shadow-[0_2px_10px_rgba(229,57,53,0.38)]">
            <motion.span
              className="size-[7px] shrink-0 rounded-full bg-[#22C55E]"
              animate={
                reduced
                  ? undefined
                  : {
                      scale: [1, 1.18, 1],
                      boxShadow: [
                        "0 0 0 0 rgba(34,197,94,0.4)",
                        "0 0 6px 2px rgba(34,197,94,0.65)",
                        "0 0 0 0 rgba(34,197,94,0.4)",
                      ],
                    }
              }
              transition={reduced ? undefined : { duration: 1.75, repeat: Infinity, ease: "easeInOut" }}
            />
            Live
          </div>
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
    </div>
  );
}

function HeroPartnerStrip() {
  const marqueeLogos = [...PARTNER_LOGOS, ...PAYMENT_LOGOS.map((logo) => ({ ...logo, alt: logo.id }))];
  const items = [...marqueeLogos, ...marqueeLogos];

  return (
    <div className="bg-[var(--color-surface)] py-5 sm:py-6">
      <div className="mx-auto max-w-8xl px-4 sm:px-6">
        <p className="mb-5 text-center text-[11px] font-medium tracking-[0.01em] text-[var(--color-text-muted)] sm:mb-5 sm:text-[12px]">
          Trusted by {formatPlatformStat("users", getPlatformStatsLaunchSnapshot().users)} creators and businesses worldwide
        </p>

        <div className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--color-surface)] to-transparent sm:w-16"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--color-surface)] to-transparent sm:w-16"
            aria-hidden
          />

          <div
            className="flex w-max items-center gap-6 sm:gap-12 md:gap-16 motion-reduce:animate-none"
            style={{ animation: "hero-partner-marquee 42s linear infinite" }}
          >
            {items.map((logo, i) => {
              if ("src" in logo) {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${logo.alt}-${i}`}
                    src={logo.src}
                    alt={logo.alt}
                    className={`${logo.h} w-auto shrink-0 object-contain opacity-60 transition-opacity duration-200 hover:opacity-80 dark:opacity-70 dark:brightness-0 dark:invert dark:hover:opacity-90`}
                  />
                );
              }

              return (
                <span key={`${logo.id}-${i}`} className="inline-flex shrink-0 items-center opacity-75">
                  {logo.node}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const HERO_AI_FEATURES = [
  {
    label: "Find Profitable Products",
    mobileLabel: "Find Profitable\nProducts",
    query: "What are the most profitable products to promote on Jimvio right now?",
    icon: Search,
  },
  {
    label: "Top Commissions",
    mobileLabel: "Top\nCommissions",
    query: "Which affiliate products have the highest commission rates today?",
    icon: Percent,
  },
  {
    label: "Launch & Sell Products",
    mobileLabel: "Launch & Sell\nProducts",
    query: "How do I launch and sell products on Jimvio as a new vendor?",
    icon: Store,
  },
  {
    label: "Paid Creator Opportunities",
    mobileLabel: "Paid Creator\nOpportunities",
    query: "What UGC campaigns are paying creators the most right now?",
    icon: Video,
  },
  {
    label: "High-Converting Campaigns",
    mobileLabel: "High-Converting\nCampaigns",
    query: "Show me high-converting campaigns I can join as a creator.",
    icon: Megaphone,
  },
  {
    label: "Trending Winning Products",
    mobileLabel: "Trending Winning\nProducts",
    query: "What trending products are winning sales this week on Jimvio?",
    icon: TrendingUp,
  },
  {
    label: "Host Live Events",
    mobileLabel: "Host Live\nEvents",
    query: "How can I host live events and monetize my audience on Jimvio?",
    icon: Radio,
  },
  {
    label: "Monetize Knowledge",
    mobileLabel: "Monetize\nKnowledge",
    query: "How do I sell courses and monetize my knowledge on Jimvio?",
    icon: BookOpen,
  },
] as const;

const AI_STAGGER = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.04 },
  },
} as const;

const AI_FADE_UP = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: PHRASE_EASE },
  },
} as const;

const AI_ROBOT_ENTER = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.78, ease: PHRASE_EASE, delay: 0.42 },
  },
} as const;

const AI_DESCRIPTION =
  "Jimvio AI helps you earn, sell, create, grow, and manage everything on Jimvio — from affiliate commissions and UGC campaigns to products, communities, live events, and courses.";

const AMBIENT_PARTICLES = [
  { left: "8%", top: "14%", size: 3, duration: 11, delay: 0 },
  { left: "22%", top: "62%", size: 2, duration: 9, delay: 1.4 },
  { left: "48%", top: "8%", size: 2.5, duration: 10.5, delay: 0.7 },
  { left: "72%", top: "28%", size: 2, duration: 8.5, delay: 2.1 },
  { left: "90%", top: "54%", size: 3, duration: 12, delay: 1.1 },
  { left: "58%", top: "78%", size: 2, duration: 9.5, delay: 0.3 },
] as const;

function HeroAIAmbientLayer({ reduced }: { reduced: boolean }) {
  if (reduced) return null;

  return (
    <>
      <motion.div
        className="pointer-events-none absolute -left-8 top-1/4 h-40 w-40 rounded-full bg-[var(--color-accent)]/10 blur-3xl"
        animate={{ x: [0, 18, -12, 0], y: [0, -14, 8, 0], opacity: [0.35, 0.6, 0.4, 0.35] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute right-0 top-1/3 h-48 w-48 rounded-full bg-[#ff8c42]/12 blur-3xl"
        animate={{ x: [0, -16, 10, 0], y: [0, 12, -8, 0], opacity: [0.3, 0.55, 0.38, 0.3] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      {AMBIENT_PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute rounded-full bg-[var(--color-accent)]/50"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [0, -10, 0], opacity: [0.15, 0.4, 0.15] }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
          aria-hidden
        />
      ))}
    </>
  );
}

function HeroAISparkles({ reduced }: { reduced: boolean }) {
  const [sparkles, setSparkles] = useState<{ id: number; left: number; top: number }[]>([]);

  useEffect(() => {
    if (reduced) return;

    let id = 0;
    const interval = setInterval(() => {
      const next = {
        id: id++,
        left: 10 + Math.random() * 80,
        top: 8 + Math.random() * 75,
      };
      setSparkles((prev) => [...prev.slice(-4), next]);
      setTimeout(() => {
        setSparkles((prev) => prev.filter((s) => s.id !== next.id));
      }, 900);
    }, 2400);

    return () => clearInterval(interval);
  }, [reduced]);

  if (reduced) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden>
      <AnimatePresence>
        {sparkles.map((s) => (
          <motion.span
            key={s.id}
            className="absolute text-[var(--color-accent)]"
            style={{ left: `${s.left}%`, top: `${s.top}%` }}
            initial={{ opacity: 0, scale: 0.3, rotate: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.3, 1.15, 0.4], rotate: 45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.09 9.91L24 12L14.09 14.09L12 24L9.91 14.09L0 12L9.91 9.91L12 0Z" />
            </svg>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

function HeroAIDescriptionTypewriter() {
  const reduced = usePrefersReducedMotion();
  const [displayed, setDisplayed] = useState(reduced ? AI_DESCRIPTION : "");

  useEffect(() => {
    if (reduced) {
      setDisplayed(AI_DESCRIPTION);
      return;
    }

    let charIndex = 0;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const schedule = (delay: number, fn: () => void) => {
      timeout = setTimeout(() => {
        if (!cancelled) fn();
      }, delay);
    };

    const typeNext = () => {
      if (charIndex <= AI_DESCRIPTION.length) {
        setDisplayed(AI_DESCRIPTION.slice(0, charIndex));
        if (charIndex < AI_DESCRIPTION.length) {
          const ch = AI_DESCRIPTION.charAt(charIndex);
          const delay = ch === " " || ch === "," ? 36 : ch === "—" ? 48 : 26;
          charIndex += 1;
          schedule(delay, typeNext);
        } else {
          schedule(6000, () => {
            charIndex = 0;
            setDisplayed("");
            schedule(320, typeNext);
          });
        }
      }
    };

    schedule(500, typeNext);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [reduced]);

  const textClass =
    "m-0 w-full break-words text-[14px] font-medium leading-[1.65] tracking-[0.01em] text-[#4B5563] [overflow-wrap:break-word] lg:text-[15px] lg:leading-[1.75] lg:max-w-[18.5rem]";

  return (
    <div className="relative w-full min-w-0 max-w-[90vw] lg:w-[18.5rem] lg:max-w-[18.5rem]">
      <p aria-hidden className={`invisible ${textClass}`}>
        {AI_DESCRIPTION}
      </p>
      <p className={`absolute inset-0 ${textClass}`}>{displayed}</p>
    </div>
  );
}

const HeroAILogo = memo(function HeroAILogo() {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="relative inline-flex flex-row items-center gap-3 sm:gap-4">
      <div className="relative grid size-9 shrink-0 place-items-center sm:size-11">
        {!reduced && (
          <motion.span
            className="pointer-events-none absolute -inset-[5px] rounded-[14px] sm:-inset-[6px] sm:rounded-[17px]"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(253,80,0,0.5) 32deg, rgba(255,140,66,0.28) 48deg, transparent 68deg, transparent 360deg)",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 1.25px), #000 calc(100% - 1.25px))",
              mask:
                "radial-gradient(farthest-side, transparent calc(100% - 1.25px), #000 calc(100% - 1.25px))",
              willChange: "transform",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            aria-hidden
          />
        )}

        <motion.span
          className="relative z-10 grid size-full place-items-center overflow-hidden rounded-xl text-white shadow-[0_6px_20px_rgba(253,80,0,0.24)] sm:rounded-[13px]"
          style={{
            background: "linear-gradient(135deg, var(--color-accent) 0%, #ff8c42 35%, #ff5e8a 65%, #c850c0 85%, var(--color-accent) 100%)",
            backgroundSize: "220% 220%",
          }}
          animate={
            reduced
              ? undefined
              : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
          }
          transition={reduced ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[var(--color-accent)]/45 blur-lg"
            animate={reduced ? undefined : { opacity: [0.2, 0.55, 0.2] }}
            transition={reduced ? undefined : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <Sparkles
            className="relative z-10 size-[18px] sm:size-[22px]"
            strokeWidth={2.25}
            style={{ shapeRendering: "geometricPrecision" }}
          />
        </motion.span>
      </div>

      <h2
        className="relative m-0 whitespace-nowrap text-[18px] font-black leading-none tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[28px] lg:text-[30px]"
      >
        Jimvio <span className="text-[var(--color-accent)]">AI</span>
        {!reduced && (
          <motion.span
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent"
            animate={{ x: ["-150%", "350%"] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
            aria-hidden
          />
        )}
      </h2>
    </div>
  );
});

const HERO_AI_CTA_SPARKLES = [
  { left: "7%", top: "20%", size: 2.5, delay: 0 },
  { left: "91%", top: "24%", size: 2, delay: 0.7 },
  { left: "93%", top: "66%", size: 2.5, delay: 1.5 },
  { left: "5%", top: "70%", size: 2, delay: 2.2 },
] as const;

function HeroAICTAButton({ onClick }: { onClick: () => void }) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial="rest"
      animate="rest"
      whileHover={reduced ? undefined : "hover"}
      whileTap={reduced ? undefined : "tap"}
      variants={{
        rest: { scale: 1 },
        hover: { scale: 1.03 },
        tap: { scale: 0.98 },
      }}
      transition={{ type: "spring", stiffness: 460, damping: 30 }}
      className="relative inline-flex h-[56px] w-full min-w-[min(100%,360px)] max-w-[400px] items-center justify-center gap-2.5 overflow-visible rounded-full px-7 text-[14px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-offset-2 sm:text-[15px]"
    >
      {/* Ambient glow — soft pulse + hover boost */}
      <motion.span
        className="pointer-events-none absolute -inset-2 rounded-full bg-[var(--color-accent)]/25 blur-[18px]"
        animate={reduced ? undefined : { opacity: [0.26, 0.4, 0.26] }}
        transition={reduced ? undefined : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.span
        className="pointer-events-none absolute -inset-2 rounded-full bg-[#FF7A1F]/30 blur-[20px]"
        variants={{
          rest: { opacity: 0 },
          hover: { opacity: 0.38 },
          tap: { opacity: 0.32 },
        }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        aria-hidden
      />

      {/* Button surface */}
      <span className="absolute inset-0 overflow-hidden rounded-full shadow-[0_10px_32px_rgba(255,90,31,0.28)]">
        <span
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, #FF8C42 0%, #FF7A1F 48%, var(--color-accent) 100%)",
          }}
          aria-hidden
        />

        {/* Glass layer + top inner highlight */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.07) 36%, transparent 58%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.48), inset 0 -1px 0 rgba(0,0,0,0.05)",
          }}
          aria-hidden
        />

        {/* Shimmer sweep — left → right every 4s */}
        {!reduced ? (
          <motion.span
            className="pointer-events-none absolute inset-y-0 w-[42%]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
            }}
            animate={{ x: ["-130%", "280%"] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 0.4,
            }}
            aria-hidden
          />
        ) : null}
      </span>

      {/* Floating edge sparkles */}
      {!reduced
        ? HERO_AI_CTA_SPARKLES.map((sparkle, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute rounded-full bg-white/75"
              style={{
                left: sparkle.left,
                top: sparkle.top,
                width: sparkle.size,
                height: sparkle.size,
              }}
              animate={{
                opacity: [0.15, 0.7, 0.15],
                y: [0, -2.5, 0],
                scale: [0.9, 1.08, 0.9],
              }}
              transition={{
                duration: 3.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: sparkle.delay,
              }}
              aria-hidden
            />
          ))
        : null}

      <Sparkles className="relative z-10 size-4" strokeWidth={2.1} />
      <span className="relative z-10 tracking-[-0.01em]">Ask Jimvio AI Anything</span>
      <motion.span
        className="relative z-10 flex items-center"
        variants={{
          rest: { x: 0 },
          hover: { x: 4 },
          tap: { x: 2 },
        }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
      >
        <ArrowRight className="size-4" />
      </motion.span>
    </motion.button>
  );
}

function HeroAIFeatureCard({
  label,
  mobileLabel,
  query,
  icon: Icon,
  onSelect,
  index,
}: {
  label: string;
  mobileLabel: string;
  query: string;
  icon: React.ElementType;
  onSelect: (query: string) => void;
  index: number;
}) {
  const reduced = usePrefersReducedMotion();
  const { isMobile } = useIsMobile("sm");

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(query)}
      className="group relative flex h-[50px] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-0.5 py-1 text-center shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2 sm:h-[48px] sm:flex-row sm:gap-2.5 sm:rounded-lg sm:px-4 sm:py-2 sm:text-left sm:shadow-[0_2px_8px_rgba(15,23,42,0.05)] sm:hover:border-[var(--color-accent)]/35 sm:hover:shadow-[0_8px_24px_rgba(253,80,0,0.12)]"
      whileHover={isMobile || reduced ? undefined : { y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <span
        className="pointer-events-none absolute inset-0 hidden rounded-xl opacity-0 transition-opacity duration-[250ms] group-hover:opacity-100 sm:block sm:rounded-lg"
        style={{
          background: "radial-gradient(ellipse at 30% 50%, rgba(253,80,0,0.06) 0%, transparent 70%)",
          boxShadow: "inset 0 0 0 1px rgba(253,80,0,0.14)",
        }}
        aria-hidden
      />
      <motion.span
        className="relative z-10 grid size-4 shrink-0 place-items-center rounded-md bg-[var(--color-accent)]/[0.07] text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/10 sm:size-7"
        animate={reduced || isMobile ? undefined : { scale: [1, 1.05, 1] }}
        transition={
          reduced || isMobile
            ? undefined
            : { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.18 }
        }
      >
        <Icon
          className="size-2.5 transition-transform duration-[250ms] sm:size-3 sm:group-hover:scale-110"
          strokeWidth={2.1}
        />
      </motion.span>
      <span className="relative z-10 flex h-[20px] w-full min-w-0 items-center justify-center overflow-hidden text-center text-[9px] font-medium leading-[1.05] tracking-[-0.01em] text-[var(--color-text-primary)] whitespace-pre-line line-clamp-2 sm:hidden">
        {mobileLabel}
      </span>
      <span className="relative z-10 hidden min-w-0 flex-1 text-left text-[11px] font-medium leading-[1.1] tracking-[-0.01em] text-[var(--color-text-primary)] [overflow-wrap:normal] [word-break:normal] line-clamp-2 hyphens-none sm:block">
        {label}
      </span>
    </motion.button>
  );
}

function CreatorWorkspaceShowcase() {
  const [activeTab, setActiveTab] = useState<"all" | "community" | "shop" | "ugc">("all");
  const [earnings, setEarnings] = useState(14258.90);
  const [recentOrders, setRecentOrders] = useState([
    { id: 1, text: "LUT Pack V2 sale", amount: "+$29.00", time: "Just now", icon: Tag, color: ORANGE },
    { id: 2, text: "Community monthly sub", amount: "+$49.00", time: "2 min ago", icon: Users, color: ORANGE },
    { id: 3, text: "Aura Cosmetics UGC payout", amount: "+$350.00", time: "15 min ago", icon: Award, color: ORANGE },
  ]);

  // Live earnings ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setEarnings((prev) => prev + (Math.random() > 0.4 ? Number((Math.random() * 2.5).toFixed(2)) : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Periodic new orders ticker simulation
  useEffect(() => {
    const products = ["Digital Planner", "LUT Pack V2", "eBook: Brand Deals", "Creator Hub VIP"];
    const prices = ["+$19.00", "+$29.00", "+$39.00", "+$49.00"];
    const icons = [Tag, Tag, BookOpen, Users];
    const colors = [ORANGE, ORANGE, ORANGE, ORANGE];

    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * products.length);
      const newOrder = {
        id: Date.now(),
        text: `${products[idx]} sale`,
        amount: prices[idx],
        time: "Just now",
        icon: icons[idx],
        color: colors[idx],
      };
      setRecentOrders((prev) => [newOrder, ...prev.slice(0, 2)]);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-[620px] mx-auto rounded-3xl border border-gray-200/50 dark:border-white/10 bg-gray-50/40 dark:bg-zinc-950/40 backdrop-blur-xl p-4 overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.04),_0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.35),_0_1px_3px_rgba(0,0,0,0.2)] transition-all">
      {/* Decorative gradients */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header - Creator Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/50 dark:border-white/10 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 rounded-full overflow-hidden border border-orange-500/30 bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-lg">
            SJ
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-900 dark:text-white text-sm">Sarah Jenkins</span>
              <span className="h-4 w-4 bg-[var(--color-accent)] text-white rounded-full flex items-center justify-center text-[9px] font-black" title="Verified Creator">✓</span>
            </div>
            <span className="text-xs text-gray-500">SaaS & Design Creator</span>
          </div>
        </div>

        {/* Action Toggles */}
        <div className="relative flex gap-1 bg-gray-200/50 dark:bg-white/5 p-1 rounded-xl text-xs">
          {(["all", "community", "shop", "ugc"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const label = tab === "all" ? "Overview" : tab === "community" ? "Communities" : tab === "shop" ? "Storefront" : "UGC Campaigns";
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative px-3 py-1.5 rounded-lg font-bold transition-colors duration-200 text-xs cursor-pointer select-none"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-zinc-800 shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 ${isActive ? "text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-950 dark:hover:text-white"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Workspace Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
        {/* Earnings Card */}
        {(activeTab === "all" || activeTab === "shop") && (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl border border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Revenue Dashboard</span>
                <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                  <TrendingUp className="h-3.5 w-3.5" /> +24.8%
                </span>
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                ${earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-gray-400">Real-time earnings ticker</span>
            </div>

            {/* Sparkline chart */}
            <div className="h-20 w-full mt-4 relative">
              <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                <motion.path
                  key={`chart-${activeTab}`}
                  d="M 0 25 Q 15 15 30 20 T 60 10 T 80 18 T 100 5"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.8, ease: "easeOut" }}
                />
                <motion.path
                  key={`fill-${activeTab}`}
                  d="M 0 25 Q 15 15 30 20 T 60 10 T 80 18 T 100 5 L 100 30 L 0 30 Z"
                  fill="url(#sparkline-grad)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.12 }}
                  transition={{ duration: 0.8, delay: 1.2 }}
                />
                <defs>
                  <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] border-t border-gray-100 dark:border-white/5 pt-2 mt-2">
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-orange-500" />
                <span className="text-gray-500">Shop: 58%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-green-500" />
                <span className="text-gray-500">Comm: 26%</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Community Hub Card */}
        {(activeTab === "all" || activeTab === "community") && (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl border border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white">Community (2.1k members)</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)]/15 dark:bg-[var(--color-accent)]/20 px-2 py-0.5 text-[9px] font-bold text-[var(--color-accent)]">
                  <span className="relative size-1.5 flex shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-1.5 bg-[var(--color-accent)]"></span>
                  </span>
                  LIVE
                </span>
              </div>
              <div className="rounded-xl overflow-hidden bg-gradient-to-r from-[var(--color-accent)] to-[#ff8c42] h-16 w-full relative flex items-end p-2 mb-3">
                <div className="text-white font-black text-xs drop-shadow-md">The Creative Guild</div>
              </div>
              <div className="space-y-1.5">
                {[
                  { name: "#announcements", icon: Megaphone, count: 0 },
                  { name: "#q-and-a", icon: MessageCircle, count: 4 },
                  { name: "#ugc-challenges", icon: Trophy, count: 12 },
                ].map((channel, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 p-1 rounded-md transition-colors cursor-pointer">
                    <div className="flex items-center gap-1.5">
                      <channel.icon className="h-3.5 w-3.5 text-gray-400" />
                      <span>{channel.name}</span>
                    </div>
                    {channel.count > 0 && (
                      <span className="bg-[var(--color-accent)] text-white rounded-full px-1.5 py-0.2 text-[9px] font-bold">
                        {channel.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Marketplace Sales Ticker */}
        {(activeTab === "all" || activeTab === "shop") && (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl border border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-white mb-3">Recent Sales Feed</div>
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {recentOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-100/50 dark:bg-white/5 text-xs"
                    >
                      <span
                        className="p-1.5 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${order.color}15`, color: order.color }}
                      >
                        <order.icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-800 dark:text-gray-200">{order.text}</p>
                        <p className="text-[9px] text-gray-400">{order.time}</p>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-xs">{order.amount}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

{/* UGC Brand Campaigns */}
        {(activeTab === "all" || activeTab === "ugc") && (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl border border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-white mb-2">UGC & Brand Partnerships</div>
              <div className="border border-gray-100 dark:border-white/5 rounded-xl p-3 bg-gray-50/50 dark:bg-zinc-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Aura Cosmetics Review</span>
                  <span className="rounded-full bg-[var(--color-accent)]/15 dark:bg-[var(--color-accent)]/20 px-2 py-0.5 text-[8px] font-bold text-[var(--color-accent)] uppercase">
                    Approved
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">Film a 30s Reels reviewing the Hydra Skin Elixir.</p>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-white/5 text-[10px]">
                  <span className="text-gray-400">Payout Reward</span>
                  <span className="font-bold text-[var(--color-accent)]">$250.00</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}


const HERO_BG_PARTICLES = [
  { left: "62%", top: "18%", size: 2.5, duration: 30, delay: 0, driftX: 8, driftY: -14 },
  { left: "74%", top: "42%", size: 2, duration: 34, delay: 1.4, driftX: -6, driftY: -12 },
  { left: "86%", top: "24%", size: 2, duration: 32, delay: 0.8, driftX: 7, driftY: -16 },
  { left: "70%", top: "64%", size: 1.5, duration: 36, delay: 2.2, driftX: -5, driftY: -10 },
  { left: "92%", top: "58%", size: 2, duration: 38, delay: 1.6, driftX: -4, driftY: -11 },
] as const;

const HERO_NOISE_TEXTURE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

function HeroPremiumBackground({ reduced }: { reduced: boolean }) {
  const auroraTransition = useMemo(
    () => ({ duration: 32, repeat: Infinity, ease: "easeInOut" as const }),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[var(--color-bg)]" />
      <div className="absolute inset-0 bg-[var(--color-surface)]/80" />

      <div className="absolute -right-[12%] top-[6%] h-[min(460px,56vw)] w-[min(460px,56vw)] rounded-full bg-[rgba(253,80,0,0.035)] blur-[128px]" />
      <div className="absolute right-[2%] top-[22%] h-[min(320px,40vw)] w-[min(320px,40vw)] rounded-full bg-[rgba(253,140,66,0.025)] blur-[108px]" />

      <motion.div
        className="absolute -right-[14%] top-[12%] h-[min(520px,62vw)] w-[min(520px,62vw)] rounded-full opacity-40 blur-[140px]"
        style={{ background: "rgba(253,80,0,0.04)" }}
        animate={reduced ? undefined : { x: [0, -18, 12, 0], y: [0, -12, 10, 0] }}
        transition={auroraTransition}
      />
      <motion.div
        className="absolute right-[0%] top-[24%] h-[min(420px,50vw)] w-[min(420px,50vw)] rounded-full opacity-35 blur-[130px]"
        style={{ background: "rgba(253,140,66,0.03)" }}
        animate={reduced ? undefined : { x: [0, -14, 10, 0], y: [0, 10, -8, 0] }}
        transition={{ ...auroraTransition, duration: 38 }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 88% 34%, rgba(253,80,0,0.04) 0%, transparent 46%)",
        }}
      />

      <motion.div
        className="absolute right-[2%] top-[10%] hidden h-[min(500px,58vw)] w-[min(500px,58vw)] rounded-full lg:block"
        style={{
          background:
            "radial-gradient(circle, rgba(253,80,0,0.04) 0%, rgba(253,140,66,0.03) 42%, transparent 74%)",
          filter: "blur(90px)",
        }}
        animate={reduced ? undefined : { opacity: [0.45, 0.62, 0.45], scale: [0.99, 1.01, 0.99] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0">
        {HERO_BG_PARTICLES.map((particle, index) => (
          <motion.span
            key={index}
            className="absolute rounded-full bg-[var(--color-accent)]/15"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
            }}
            animate={
              reduced
                ? undefined
                : {
                    x: [0, particle.driftX, 0],
                    y: [0, particle.driftY, 0],
                    opacity: [0.08, 0.2, 0.08],
                  }
            }
            transition={
              reduced
                ? undefined
                : {
                    duration: particle.duration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: particle.delay,
                  }
            }
          />
        ))}
        {!reduced &&
          [
            { left: "68%", top: "28%", delay: 0 },
            { left: "82%", top: "52%", delay: 5.1 },
          ].map((sparkle, index) => (
            <motion.span
              key={`sparkle-${index}`}
              className="absolute text-[var(--color-accent)]/12"
              style={{ left: sparkle.left, top: sparkle.top }}
              animate={{ opacity: [0.06, 0.18, 0.06], scale: [0.9, 1.02, 0.9] }}
              transition={{
                duration: 10 + index,
                repeat: Infinity,
                ease: "easeInOut",
                delay: sparkle.delay,
              }}
            >
              <Sparkles className="size-2.5" strokeWidth={2} />
            </motion.span>
          ))}
      </div>

      <div
        className="absolute inset-0 opacity-[0.01] mix-blend-soft-light"
        style={{ backgroundImage: HERO_NOISE_TEXTURE }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 68%, rgba(15,23,42,0.01) 100%)",
        }}
      />
    </div>
  );
}

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const { stats } = usePlatformStats();
  const onlineCount = Math.floor(stats.users * 0.9);

  return (
    <div className="w-full max-w-[100dvw] overflow-x-hidden bg-[var(--color-surface)]">
      <section className="relative w-full overflow-visible bg-[var(--color-surface)] pt-5 pb-6 sm:pt-8 sm:pb-10">
        <HeroPremiumBackground reduced={reduced} />

        <div className="relative z-10 mx-auto w-full min-w-0 max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-full min-w-0 max-w-3xl">
              <div className="flex justify-center">
                <PlatformStatsRotatingBadge className="mb-3 sm:mb-4" />
              </div>

              <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[var(--color-accent)] dark:bg-orange-950/30">
                Create. Connect. Earn.
              </div>
              <h1
                className="mx-auto flex w-full min-w-0 max-w-full flex-col space-y-1 overflow-visible font-black tracking-tight text-[var(--color-text-primary)] text-balance sm:space-y-2"
                style={{
                  fontSize: "clamp(2.25rem, 6vw, 4.5rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                }}
              >
                <span>Turn Your Passion</span>
                <span style={{ color: ORANGE }}>Into Income.</span>
              </h1>

              <p className="mx-auto mt-4 w-full min-w-0 max-w-2xl text-balance px-1 text-[14px] leading-relaxed text-[var(--color-text-secondary)] sm:mt-5 sm:text-base">
                Build communities, collaborate with brands, sell physical and digital products, create courses, and grow your online business — all in one premium workspace.
              </p>
            </div>

            <div className="mt-6 flex w-full min-w-0 flex-col items-stretch gap-3 sm:mt-7 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/register"
                className="inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-transparent px-8 text-[14px] font-bold text-white transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(253,80,0,0.35)] hover:brightness-105 active:translate-y-0 active:scale-[0.98] sm:h-[48px] sm:w-auto"
                style={{ background: ORANGE, boxShadow: "0 6px 20px rgba(253,80,0,0.25)" }}
              >
                Start Creating
                <ArrowRight className="size-4 shrink-0" />
              </Link>
              <Link
                href="/communities"
                className="inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-8 text-[14px] font-bold text-[var(--color-text-primary)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[var(--color-accent)]/30 hover:bg-orange-500/[0.03] hover:text-[var(--color-accent)] hover:shadow-md active:translate-y-0 active:scale-[0.98] sm:h-[48px] sm:w-auto"
              >
                Explore Communities
                <ArrowRight className="size-4 shrink-0 opacity-60" />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:mt-10">
              {TRUST_BADGES.map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-left"
                >
                  <span
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-md"
                    style={{ background: `${color}18`, color }}
                  >
                    <Icon className="size-3 shrink-0" strokeWidth={2.4} />
                  </span>
                  <span className="text-[12px] font-medium text-[var(--color-text-muted)] whitespace-nowrap">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HeroLiveTicker onlineCount={onlineCount} />
      <HeroPartnerStrip />
    </div>
  );
}
