"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Globe,
  Headphones,
  Lock,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { TICKER_ITEMS } from "@/data/dashboard";
import { ApplePayLogo, MastercardLogo, VisaLogo } from "@/components/ui/payment-logos";
import { useAIStore } from "@/lib/store/use-ai-store";
import { JimvioAIMascot } from "@/components/ui/jimvio-ai-mascot";

const ORANGE = "#fd5000";
const HERO_PHRASES = [
  "Earn Commissions",
  "Join UGC Campaigns",
  "Build Communities",
  "Sell Products",
  "Create Campaigns",
  "Buy Products",
  "Work With Brands",
  "Host Live Events",
  "Sell Courses",
] as const;

const LONGEST_HERO_PHRASE = HERO_PHRASES.reduce((a, b) =>
  a.length >= b.length ? a : b,
);

function HeroRotatingPhrase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % HERO_PHRASES.length),
      2800,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="relative block w-full min-w-0 max-w-full">
      <span
        aria-hidden
        className="invisible block break-words leading-[1.12] [overflow-wrap:anywhere] md:whitespace-nowrap"
        style={{ color: ORANGE }}
      >
        {LONGEST_HERO_PHRASE}
      </span>
      <span className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={HERO_PHRASES[index]}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="block w-full min-w-0 max-w-full break-words leading-[1.12] [overflow-wrap:anywhere] md:whitespace-nowrap"
            style={{ color: ORANGE }}
          >
            {HERO_PHRASES[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

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
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] py-5 sm:py-6">
      <div className="mx-auto max-w-8xl px-4 sm:px-6">
        <p className="mb-4 text-center text-[11px] font-medium text-[var(--color-text-muted)] sm:text-[12px]">
          Trusted by 10,000+ creators and businesses worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4">
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

const HERO_AI_FEATURES = [
  {
    label: "Find Profitable Products",
    query: "What are the most profitable products to promote on Jimvio right now?",
  },
  {
    label: "Top Commissions",
    query: "Which affiliate products have the highest commission rates today?",
  },
  {
    label: "Launch & Sell Products",
    query: "How do I launch and sell products on Jimvio as a new vendor?",
  },
  {
    label: "Paid Creator Opportunities",
    query: "What UGC campaigns are paying creators the most right now?",
  },
  {
    label: "High-Converting Campaigns",
    query: "Show me high-converting campaigns I can join as a creator.",
  },
  {
    label: "Trending Winning Products",
    query: "What trending products are winning sales this week on Jimvio?",
  },
  {
    label: "Host Live Events",
    query: "How can I host live events and monetize my audience on Jimvio?",
  },
  {
    label: "Monetize Knowledge",
    query: "How do I sell courses and monetize my knowledge on Jimvio?",
  },
] as const;

function HeroAIFeatureRows({ onSelect }: { onSelect: (query: string) => void }) {
  const topRow = HERO_AI_FEATURES.slice(0, 4);
  const bottomRow = HERO_AI_FEATURES.slice(4);

  return (
    <div className="relative mt-3 lg:mt-4">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--color-surface)] to-transparent"
        aria-hidden
      />
      <div
        className="-mx-1 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [overscroll-behavior-x:contain] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max flex-col gap-2.5 sm:gap-3">
          {[topRow, bottomRow].map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2.5 sm:gap-3">
              {row.map(({ label, query }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onSelect(query)}
                  className="group shrink-0 rounded-sm px-2 py-1 text-left transition-all duration-200 hover:bg-[#fd5000]/10 active:scale-[0.98]"
                >
                  <span className="text-[12px] font-semibold leading-snug text-[var(--color-text-primary)] transition-colors duration-200 group-hover:text-[#fd5000] group-hover:underline group-hover:decoration-[#fd5000]/40 group-hover:underline-offset-2 sm:text-[13px]">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroAIPanel() {
  const openAssistant = useAIStore((s) => s.openAssistant);
  const [prompt, setPrompt] = useState("");

  const ask = (query?: string) => {
    const text = (query ?? prompt).trim();
    openAssistant(text);
    setPrompt("");
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-full lg:max-w-none">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:rounded-lg sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#fd5000] to-[#ff8c42] text-white">
              <Sparkles className="size-4" strokeWidth={2.25} />
            </span>
            <h2 className="text-[17px] font-black tracking-tight text-[#fd5000] sm:text-[22px]">
              Jimvio AI
            </h2>
          </div>
          <JimvioAIMascot
            size="sm"
            showRings={false}
            motionless
            className="hidden shrink-0 lg:block"
          />
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:items-stretch">
          <div className="relative min-w-0 flex-1">
            <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-[#fd5000]" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask();
              }}
              placeholder="Ask about products, campaigns…"
              aria-label="Ask Jimvio AI"
              className="h-11 w-full min-w-0 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] py-0 pl-10 pr-4 text-[13px] text-[var(--color-text-primary)] shadow-sm outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[#fd5000]/50 focus:ring-2 focus:ring-[#fd5000]/15 sm:h-12 sm:text-[14px]"
            />
          </div>
          <button
            type="button"
            onClick={() => ask()}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-sm px-5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 sm:h-12 sm:px-6 sm:text-[14px]"
            style={{ background: ORANGE }}
          >
            Ask AI
            <ArrowRight className="size-4" />
          </button>
        </div>

        <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--color-text-muted)] sm:mt-3 sm:text-[13px]">
          Earn, sell, create, and grow — affiliates, UGC campaigns, products, communities, live events, and courses.
        </p>
      </div>

      <HeroAIFeatureRows onSelect={(query) => ask(query)} />
    </div>
  );
}

export function Hero() {
  const [onlineCount, setOnlineCount] = useState(8447);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hero-data")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const users = parseActiveCount(d.stats?.totalUsers);
        setOnlineCount(Math.floor(users * 0.9));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full max-w-[100dvw] overflow-x-hidden bg-[var(--color-surface)]">
      <section className="relative w-full overflow-x-hidden pt-4 pb-5 sm:pt-6 sm:pb-8">
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

        <div className="relative z-10 mx-auto w-full min-w-0 max-w-8xl px-4 sm:px-6">
          <div className="grid w-full min-w-0 grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-2 lg:items-center lg:gap-10">
            <div className="w-full min-w-0 text-center lg:text-left">
              <h1
                className="mx-auto flex w-full min-w-0 max-w-full flex-col space-y-2 overflow-hidden break-words font-black tracking-tight text-[var(--color-text-primary)] [overflow-wrap:anywhere] sm:space-y-3 lg:mx-0"
                style={{
                  fontSize: "clamp(2rem, 7vw, 4rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.12,
                }}
              >
                <span>The platform to</span>
                <HeroRotatingPhrase />
                <span>Anywhere.</span>
              </h1>

              <p className="mx-auto mt-3 w-full min-w-0 max-w-[520px] break-words text-[14px] leading-relaxed text-[var(--color-text-muted)] [overflow-wrap:anywhere] sm:mt-4 sm:text-base lg:mx-0">
                Sell products. Promote offers. Create content. Build your community. Grow your audience — all in one
                place.
              </p>

              <div className="mt-5 flex w-full min-w-0 flex-col items-stretch gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-sm px-5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 sm:h-[48px] sm:w-auto sm:px-6 sm:text-[14px]"
                  style={{ background: ORANGE }}
                >
                  Start earning for Free
                  <ArrowRight className="size-4 shrink-0" />
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-[13px] font-bold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)] sm:h-[48px] sm:w-auto sm:px-6 sm:text-[14px]"
                >
                  Browse Marketplace
                  <ArrowRight className="size-4 shrink-0 opacity-60" />
                </Link>
              </div>

              <div className="mt-5 grid w-full min-w-0 grid-cols-2 gap-x-3 gap-y-2 sm:mt-6 lg:flex lg:flex-nowrap lg:items-center lg:justify-start lg:gap-x-3">
                {TRUST_BADGES.map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-md"
                      style={{ background: `${color}18`, color }}
                    >
                      <Icon className="size-3" strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0 truncate text-[10px] font-medium text-[var(--color-text-muted)] sm:text-[12px] lg:whitespace-nowrap">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full min-w-0">
              <HeroAIPanel />
            </div>
          </div>
        </div>
      </section>

      <HeroLiveTicker onlineCount={onlineCount} />
      <HeroPartnerStrip />
    </div>
  );
}
