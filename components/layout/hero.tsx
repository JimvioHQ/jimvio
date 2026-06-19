"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Globe,
  Headphones,
  Lock,
  Megaphone,
  Percent,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Video,
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
    <span
      className="relative inline-block overflow-hidden align-bottom"
      style={{ height: "1.06em", minWidth: "min(100%, 14ch)" }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={HERO_PHRASES[index]}
          initial={{ y: 36, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -36, opacity: 0 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          className="block whitespace-nowrap"
          style={{ color: ORANGE }}
        >
          {HERO_PHRASES[index]}
        </motion.span>
      </AnimatePresence>
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

function HeroAIPanel() {
  const openAssistant = useAIStore((s) => s.openAssistant);
  const [prompt, setPrompt] = useState("");

  const ask = (query?: string) => {
    const text = (query ?? prompt).trim();
    openAssistant(text);
    setPrompt("");
  };

  return (
    <div className="mx-auto w-full max-w-[560px] lg:mx-0 lg:max-w-none">
      <div className="overflow-visible rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
        <div className="grid grid-cols-1 items-end gap-4 overflow-visible sm:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[#fd5000] to-[#ff8c42] text-white">
                <Sparkles className="size-4" strokeWidth={2.25} />
              </span>
              <h2 className="text-[20px] font-black tracking-tight text-[#fd5000] sm:text-[22px]">
                Jimvio AI
              </h2>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-text-muted)] sm:text-[13px]">
              Jimvio AI helps you earn, sell, create, and grow — from affiliate commissions and UGC
              campaigns to products, communities, live events, and courses.
            </p>
          </div>

          <JimvioAIMascot size="md" className="mx-auto shrink-0 sm:mx-0" />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ask();
            }}
            placeholder="Ask about products, campaigns, earnings…"
            className="h-11 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3.5 text-[13px] text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[#fd5000]/40"
          />
          <button
            type="button"
            onClick={() => ask()}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: ORANGE }}
          >
            Ask Jimvio AI
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {HERO_AI_FEATURES.map(({ label, query, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => ask(query)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition-colors hover:border-[#fd5000]/25 hover:bg-[var(--color-surface-secondary)]/60"
          >
            <span className="mb-2 grid size-7 place-items-center rounded-md bg-[#fd5000]/10 text-[#fd5000]">
              <Icon className="size-3.5" strokeWidth={2.25} />
            </span>
            <span className="block text-[11px] font-semibold leading-snug text-[var(--color-text-primary)]">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const HERO_AI_FEATURES = [
  {
    label: "Find Profitable Products",
    query: "What are the most profitable products to promote on Jimvio right now?",
    icon: Search,
  },
  {
    label: "Top Commissions",
    query: "Which affiliate products have the highest commission rates today?",
    icon: Percent,
  },
  {
    label: "Launch & Sell Products",
    query: "How do I launch and sell products on Jimvio as a new vendor?",
    icon: Store,
  },
  {
    label: "Paid Creator Opportunities",
    query: "What UGC campaigns are paying creators the most right now?",
    icon: Video,
  },
  {
    label: "High-Converting Campaigns",
    query: "Show me high-converting campaigns I can join as a creator.",
    icon: Megaphone,
  },
  {
    label: "Trending Winning Products",
    query: "What trending products are winning sales this week on Jimvio?",
    icon: TrendingUp,
  },
  {
    label: "Host Live Events",
    query: "How can I host live events and monetize my audience on Jimvio?",
    icon: Radio,
  },
  {
    label: "Monetize Knowledge",
    query: "How do I sell courses and monetize my knowledge on Jimvio?",
    icon: BookOpen,
  },
] as const;

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
                <HeroRotatingPhrase />
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

              <div className="mt-8 flex flex-nowrap items-center justify-center gap-x-2.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-x-3 [&::-webkit-scrollbar]:hidden lg:justify-start lg:overflow-visible">
                {TRUST_BADGES.map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex shrink-0 items-center gap-1.5">
                    <span
                      className="grid size-6 place-items-center rounded-md"
                      style={{ background: `${color}18`, color }}
                    >
                      <Icon className="size-3" strokeWidth={2.4} />
                    </span>
                    <span className="whitespace-nowrap text-[11px] font-medium text-[var(--color-text-muted)] sm:text-[12px]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <HeroAIPanel />
          </div>
        </div>
      </section>

      <HeroLiveTicker onlineCount={onlineCount} />
      <HeroPartnerStrip />
    </div>
  );
}
