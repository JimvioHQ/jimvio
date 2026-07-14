"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
   ArrowRight, ShoppingBag, Users, Clock, Zap,
   ShieldCheck, Wallet, DollarSign, Star, ChevronRight, Play,
   Sparkles, Store, Megaphone, Globe, CheckCircle,
   Timer, TrendingUp, User, Video,
   Clapperboard, Package, Headphones, Palette,
   Monitor, Watch, Shirt, Armchair, BookOpen,
   CreditCard, BadgeCheck, Fingerprint,
    Smartphone, ArrowDownRight, Plus, Minus,
   Shield, Truck, Lock,
 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlashDealsClient } from "@/components/marketplace/new/FlashDealsClient";
import type { DbProduct } from "@/lib/utils";
import { motion } from "framer-motion";
import { CommunitiesSection } from "./homepage-communities";

/* ─── Design Tokens ─── Design Tokens (CSS Variables for Theme Support) ─── */
const shell = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";
const sectionBg = "bg-[var(--color-bg)]";
const sectionAlt = "bg-[var(--color-bg-elevated)]";
const paperSurface = "bg-[var(--color-surface)]";
const paperSurfaceLight = "bg-[var(--color-surface-secondary)]";
const accent = "text-[var(--color-accent)]";
const accentBg = "bg-[var(--color-accent)]";
const textPaper = "text-[var(--color-text-primary)]";
const textMuted = "text-[var(--color-text-muted)]";
const textDim = "text-[var(--color-text-muted)]";
const textSecondary = "text-[var(--color-text-secondary)]";
const borderColor = "border-[var(--color-border)]";
const borderStrong = "border-[var(--color-border-strong)]";
const accentSubtle = "bg-[var(--color-accent-subtle)]";
const accentLight = "bg-[var(--color-accent-light)]";

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/8 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-accent)]">
      {children}
    </span>
  );
}

function SectionHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn(
      "text-[30px] font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)] sm:text-[38px] lg:text-[44px]",
      className
    )}>
      {children}
    </h2>
  );
}

function StatNumber({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-['var(--font-ibm-plex-mono)'] tabular-nums", className)}>
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   2. HERO
   ═══════════════════════════════════════════════ */

function SignalRingVisual() {
  return (
    <div aria-hidden className="relative flex size-48 items-center justify-center sm:size-56">
      <div className="absolute inset-0 rounded-full border border-[var(--color-accent)]/10" />
      <div className="absolute inset-4 rounded-full border border-[var(--color-accent)]/15" />
      <div className="absolute inset-8 rounded-full border border-[var(--color-accent)]/20" />
      <div className="absolute inset-12 rounded-full border border-[var(--color-accent)]/25" />
      <div className="absolute inset-16 rounded-full border border-[var(--color-accent)]/30" />
      <div className="absolute inset-[72px] rounded-full border border-[var(--color-accent)]/40" />
      <div className="absolute flex size-16 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
        <Zap className="h-7 w-7 text-[var(--color-accent)]" />
      </div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute inset-0 animate-ping rounded-full border border-[var(--color-accent)]/20"
          style={{ animationDuration: `${2 + i * 0.5}s`, animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </div>
  );
}

export function HeroSection() {
  return (
    <section className={cn(sectionBg, "relative overflow-hidden pt-12 pb-10 sm:pb-14 lg:pt-16 lg:pb-16")}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-accent)_0.06_0%,transparent_70%)]" />
      <div className={shell}>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative z-10">
            <h1 className="text-6xl font-semibold leading-[1.05] tracking-tight text-[var(--color-text-primary)]">
              Shop live.
              <br />
              <span className="text-[var(--color-accent)]">Sell live.</span>
              <br />
              <span className="whitespace-nowrap">Get paid same day.</span>
            </h1>

            <p className={cn("mt-4 max-w-lg text-[15px] leading-relaxed", "text-[var(--color-text-muted)]")}>
              Build your income ecosystem with Jimvio. Discover affiliate opportunities, create UGC content, sell in the marketplace, and grow with a community built for creators and entrepreneurs.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[var(--color-accent)] text-[var(--color-bg)] font-body font-semibold text-base hover:bg-[var(--color-accent-hover)] transition-all duration-300 shadow-2xl shadow-[var(--color-accent)]/20 hover:-translate-y-0.5"
              >
                Start shopping <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <Link
                href="/vendor/register"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full border border-[var(--color-text-primary)]/15 text-[var(--color-text-primary)] font-body font-medium text-base hover:bg-[var(--color-text-primary)]/5 hover:border-[var(--color-text-primary)]/25 transition-all duration-300"
              >
                Open your shop
              </Link>
            </div>
          </div>

          <div className="relative flex items-center justify-center lg:justify-end">
            <SignalRingVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   3. THE PULSE — Live Activity Ticker
   ═══════════════════════════════════════════════ */

const PULSE_ITEMS = [
  { text: "Sarah K. just purchased Wireless Earbuds Pro", type: "sale" },
  { text: "David M. received $340.00 same-day payout", type: "payout" },
  { text: "Grace A. went live — 89 watching", type: "live" },
  { text: "TechNova Gadgets joined as a vendor", type: "vendor" },
  { text: "Zara M. submitted a clip for GlowUp Cosmetics", type: "campaign" },
  { text: "James K. just purchased Smart Fitness Band", type: "sale" },
  { text: "Lena A. received $1,200.00 same-day payout", type: "payout" },
  { text: "Tunde O. went live — 234 watching", type: "live" },
  { text: "FitLife Apparel joined as a vendor", type: "vendor" },
  { text: "Maya O. submitted a clip for TechNova", type: "campaign" },
];

export function PulseSection() {
  const doubled = [...PULSE_ITEMS, ...PULSE_ITEMS];
  return (
    <section className={cn(sectionBg, "border-y border-[var(--color-border)] py-4")}>
      <div className="relative overflow-hidden">
        <div className="flex animate-marquee gap-8 whitespace-nowrap" style={{ animation: "marquee 40s linear infinite" }}>
          {doubled.map((item, i) => (
            <span key={i} className="font-mono text-[12px] text-[var(--color-text-muted)]">
              {item.text}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[var(--color-bg)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--color-bg)] to-transparent" />
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   4. TRUST STRIP
   ═══════════════════════════════════════════════ */

const TRUST_LOGOS = [
  { name: "Binance Pay", src: "/logos/binance.png", w: 90, h: 24 },
  { name: "Flutterwave", src: "/logos/Flutterwave-main.svg", w: 100, h: 24 },
  { name: "Visa", src: "/logos/visa.svg", w: 16, h: 16, color: true },
  { name: "Mastercard", src: "/logos/mastercard.svg", w: 26, h: 16, color: true },
  { name: "PayPal", src: "/logos/paypal.png", w: 80, h: 22 },
  { name: "NOWPayments", src: "/logos/nowpayment updated.svg", w: 110, h: 24 },
  { name: "Apple Pay", src: "/logos/apple-pay.svg", w: 55, h: 16 },
  { name: "Google Pay", src: "/logos/google-pay.svg", w: 60, h: 16 },
  { name: "MTN MoMo", src: "/logos/mtn.jpeg", w: 80, h: 24 },
];

export function TrustStrip() {
  return (
    <section className={cn(sectionAlt, "py-6")}>
      <div className={shell}>
        <div className="flex flex-col items-center gap-4">
<p className="font-sans text-[13px] font-medium tracking-wider text-[var(--color-text-muted)]">
  Trusted by industry leaders
</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {TRUST_LOGOS.map((m) => (
              <Image
                key={m.name}
                src={m.src!}
                alt={m.name}
                width={m.w}
                height={m.h}
                className={cn(
                  "h-5 w-auto object-contain transition-all",
                  m.color
                    ? "opacity-40 hover:opacity-100"
                    : "opacity-50 grayscale hover:opacity-80 hover:grayscale-0"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   5. FLASH DEALS
   ═══════════════════════════════════════════════ */

const mockDeal = (overrides: Partial<DbProduct>): DbProduct => ({
  id: "",
  name: "",
  slug: "",
  price: 0,
  compare_at_price: null,
  images: null,
  product_type: "physical",
  currency: "USD",
  status: "active",
  is_flash_deal: true,
  discount_label: null,
  shipping_from: null,
  delivery_time: null,
  affiliate_commission_rate: null,
  view_count: null,
  sale_count: null,
  sold_count: null,
  claimed_pct: null,
  rating: null,
  review_count: null,
  is_free_shipping: null,
  category_id: null,
  ...overrides,
});

const MOCK_DEALS: DbProduct[] = [
  mockDeal({ id: "d1", name: "Wireless Earbuds Pro",
    slug: "wireless-earbuds-pro", price: 29.99, compare_at_price: 79.99,
    images: ["https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400"], sale_count: 142 }),
  mockDeal({ id: "d2", name: "Smart Fitness Band",
    slug: "smart-fitness-band", price: 49.99, compare_at_price: 129.99,
    images: ["https://images.unsplash.com/photo-1576243345690-4e4b79b9e2c4?w=400"], sale_count: 87 }),
  mockDeal({ id: "d3", name: "Premium Leather Bag",
    slug: "premium-leather-bag", price: 89.99, compare_at_price: 199.99,
    images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400"], sale_count: 56 }),
  mockDeal({ id: "d4", name: "Portable Bluetooth Speaker",
    slug: "bluetooth-speaker", price: 39.99, compare_at_price: 89.99,
    images: ["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400"], sale_count: 203 }),
  mockDeal({ id: "d5", name: "LED Desk Lamp",
    slug: "led-desk-lamp", price: 34.99, compare_at_price: 69.99,
    images: ["https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400"], sale_count: 118 }),
  mockDeal({ id: "d6", name: "Noise-Cancelling Headphones",
    slug: "noise-cancelling-headphones", price: 59.99, compare_at_price: 149.99,
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"], sale_count: 74 }),
  mockDeal({ id: "d7", name: "Mechanical Keyboard",
    slug: "mechanical-keyboard", price: 44.99, compare_at_price: 99.99,
    images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400"], sale_count: 165 }),
  mockDeal({ id: "d8", name: "Studio Microphone",
    slug: "studio-microphone", price: 69.99, compare_at_price: 159.99,
    images: ["https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400"], sale_count: 92 }),
];

function CountdownTimer({ endsIn }: { endsIn: number }) {
  const [time, setTime] = useState(endsIn);
  useEffect(() => {
    if (time <= 0) return;
    const t = setInterval(() => setTime((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [time]);
  const h = Math.floor(time / 3600);
  const m = Math.floor((time % 3600) / 60);
  const s = time % 60;
  return (
    <span className="font-['var(--font-ibm-plex-mono)'] text-[11px] font-bold tabular-nums text-[var(--color-accent)]">
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

export function FlashDealsSection() {
  const items = [
    { rank: '#1', title: 'Gold Silk Scarf — Limited Drop', price: '28,000 RWF', available: 3, total: 12, timeLeft: '2:47', category: 'Fashion', image: '/uploads/fashion.jpg' },
    { rank: '#2', title: 'Ceramic Vase Set — Hand-Glazed', price: '45,000 RWF', available: 5, total: 8, timeLeft: '8:13', category: 'Home', image: '/uploads/home.jpg' },
    { rank: '#3', title: 'Leather Crossbody — Restock', price: '62,000 RWF', available: 8, total: 14, timeLeft: '15:02', category: 'Accessories', image: '/uploads/accessory.jpg' },
    { rank: '#4', title: 'Artisanal Mug Collection — 4pc', price: '36,000 RWF', available: 2, total: 6, timeLeft: '22:44', category: 'Kitchen', image: '/uploads/kitchen.jpg' },
    { rank: '#5', title: 'Amber Scented Candle — 250h', price: '18,000 RWF', available: 11, total: 20, timeLeft: '42:10', category: 'Lifestyle', image: '/uploads/lifestyle.jpg' },
  ];

  const [times, setTimes] = useState(items.map(i => i.timeLeft));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimes((prev) => prev.map((t) => {
        const [m, s] = t.split(':').map(Number);
        let total = m * 60 + s;
        total = Math.max(0, total - 1);
        const newM = Math.floor(total / 60);
        const newS = total % 60;
        return `${newM}:${newS.toString().padStart(2, '0')}`;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="flash-deals" aria-label="Flash deals" className="mx-auto max-w-7xl px-6 mt-10 pb-24">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent)] font-medium">Marketplace</span>
          <h2 className="font-display text-4xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)] mt-2 lg:text-5xl">Flash Deals</h2>
          <p className="mt-2 font-body text-sm text-[var(--color-text-muted)]">Limited time offers – Don't miss out!</p>
        </div>
        <a href="#marketplace" className="flex-shrink-0 font-mono text-sm text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]">View all deals →</a>
      </div>

      <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 scroll-smooth" role="list" aria-label="Flash deal items">
        {items.map((item, i) => (
          <article
            key={item.rank}
            role="listitem"
            className="group w-[300px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--color-text-primary)]/10 bg-[var(--color-surface-secondary)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-accent)]/30 hover:shadow-2xl hover:shadow-[var(--color-accent)]/5 lg:w-[340px]"
          >
            <div className="relative h-56 overflow-hidden">
              <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              <span className="absolute left-3 top-3 rounded-md bg-[var(--color-accent)] px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-[var(--color-bg)] shadow-lg">{item.rank}</span>
              <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-[var(--color-text-primary)]/10 bg-[var(--color-bg)]/80 px-2.5 py-1 font-mono text-[10px] tracking-wide text-[var(--color-text-primary)] shadow-lg backdrop-blur-md">
                <Zap size={10} className="text-[var(--color-accent)]" /> Ends in {times[i]}
              </span>
            </div>

            <div className="p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-accent)]">{item.category}</span>
              <h3 className="mt-1 font-display text-xl font-semibold leading-snug tracking-tight text-[var(--color-text-primary)]">{item.title}</h3>

              <div className="mb-4 mt-4">
                <div className="mb-1.5 flex justify-between font-body text-[11px] text-[var(--color-text-muted)]">
                  <span>Claimed: <strong className="text-[var(--color-text-secondary)]">{item.total - item.available}</strong></span>
                  <span>Available: <strong className="text-[var(--color-text-secondary)]">{item.available}</strong></span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-text-primary)]/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)]"
                    style={{ width: `${(1 - item.available / item.total) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-end justify-between">
                <span className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">{item.price}</span>
                <a href="#" className="flex items-center gap-1.5 font-body text-sm font-semibold text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]">
                  Claim <Clock size={14} />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   6. LIVE SHOPPING SPOTLIGHT
   ═══════════════════════════════════════════════ */

interface LiveSession {
  id: string;
  host: string;
  image: string;
  title: string;
  status: "live" | "upcoming";
  viewers: number;
  next: string;
  category: string;
}

const MOCK_LIVE: LiveSession[] = [
  { id: "l1", host: "Maya O.", image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400", title: "Summer Fashion Drop — Live Try-On", status: "live", viewers: 234, next: "Ending soon", category: "Fashion" },
  { id: "l2", host: "James K.", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400", title: "Gadget Unboxing: Latest Tech Gear", status: "live", viewers: 89, next: "Ending soon", category: "Electronics" },
  { id: "l3", host: "Amina S.", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400", title: "Skincare Routine with Premium Products", status: "upcoming", viewers: 0, next: "Tomorrow 4PM", category: "Beauty" },
];

function LiveCard({ session }: { session: LiveSession }) {
  const isLive = session.status === "live";
  return (
    <Link
      href={isLive ? `/live/${session.id}` : "#"}
      className={`relative group rounded-3xl overflow-hidden border ${isLive ? 'border-[var(--color-accent)]/30' : 'border-[var(--color-text-primary)]/6'} bg-[var(--color-surface-secondary)] hover:border-[var(--color-accent)]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[var(--color-accent)]/5`}
    >
      <div className="relative h-72 lg:h-80">
        <img src={session.image} alt={session.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-50 group-hover:scale-[1.02] transition duration-700" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/30 to-transparent" />

        <div className="absolute top-5 left-5 flex items-center gap-2">
          <span className={`flex h-2.5 w-2.5 rounded-full ${isLive ? 'bg-[var(--color-accent)] animate-pulse' : 'bg-[var(--color-text-primary)]/30'}`} aria-hidden="true" />
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 rounded-md backdrop-blur-sm bg-[var(--color-bg)]/80 text-[var(--color-text-primary)]/90 border border-[var(--color-text-primary)]/8 font-medium">
            {isLive ? 'Live now' : 'Next up'}
          </span>
        </div>

        <div className="absolute top-5 right-5">
          {isLive ? (
            <span className="font-mono text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-bg)]/80 backdrop-blur-sm border border-[var(--color-text-primary)]/8 text-[var(--color-text-primary)]/80">
              <Users size={12} className="text-[var(--color-accent)]" /> {session.viewers} watching
            </span>
          ) : (
            <span className="font-mono text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-bg)]/80 backdrop-blur-sm border border-[var(--color-text-primary)]/8 text-[var(--color-text-primary)]/80">
              <Clock size={12} className="text-amber-400" /> {session.next}
            </span>
          )}
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--color-accent)]">{session.category}</span>
          <h3 className="font-display font-semibold text-2xl lg:text-3xl tracking-tight text-[var(--color-text-primary)] mt-1">{session.host}</h3>
          <p className="mt-1 text-[var(--color-text-primary)]/60 text-sm font-body">{session.title}</p>
        </div>
      </div>

      <div className="p-5 flex items-center justify-between">
        <div className="font-body text-sm text-[var(--color-text-primary)]/60">
          Host: <strong className="text-[var(--color-text-primary)]/90">{session.host}</strong>
        </div>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-body font-semibold bg-[var(--color-accent)] text-[var(--color-bg)] hover:bg-[var(--color-accent-hover)] transition-colors shadow-lg shadow-[var(--color-accent)]/15">
          {isLive ? 'Join session' : 'Set reminder'} <Play size={14} strokeWidth={2.5} />
        </span>
      </div>
    </Link>
  );
}

export function LiveShoppingSpotlight() {
  const sessions = MOCK_LIVE;
  const hasLive = sessions.some((s) => s.status === "live");

  return (
    <section className={cn(sectionAlt, "py-12 sm:py-16")}>
      <div className={shell}>
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-normal uppercase tracking-[0.12em] text-[var(--color-accent)]">{hasLive ? "Live Now" : "Upcoming"}</span>
            <SectionHeading className="mt-2">Live Shopping</SectionHeading>
            <p className={cn("mt-1.5 max-w-md text-sm leading-relaxed", "text-[var(--color-text-muted)]")}>
              Watch hosts demo products in real time. Ask questions, buy instantly.
            </p>
          </div>
          <Link href="/live" className="font-mono text-sm text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]">
            Browse all sessions →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.length > 0 ? sessions.map((s) => (
            <LiveCard key={s.id} session={s} />
          )) : (
            <div className={cn("col-span-full rounded-2xl border border-[var(--color-text-primary)]/8 p-8 text-center", "text-[var(--color-text-muted)]")}>
              <p className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">No live sessions right now</p>
              <p className="text-[13px]">Next live: Fashion Try-On — Tomorrow 4PM</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   7. MARKETPLACE / CATEGORY BROWSE
   ═══════════════════════════════════════════════ */

function slugifyCategory(name: string) {
  return `/marketplace?category=${name.toLowerCase().replace(/&/g, "").replace(/\s+/g, "-")}`;
}

const CATEGORIES = [
  { name: "Electronics", icon: Monitor, href: slugifyCategory("Electronics"), image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400", count: "2.4K+" },
  { name: "Fashion", icon: Shirt, href: slugifyCategory("Fashion"), image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400", count: "5.1K+" },
  { name: "Home & Living", icon: Armchair, href: slugifyCategory("Home & Living"), image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400", count: "1.8K+" },
  { name: "Beauty", icon: Palette, href: slugifyCategory("Beauty"), image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400", count: "890+" },
  { name: "Accessories", icon: Watch, href: slugifyCategory("Accessories"), image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400", count: "3.2K+" },
  { name: "Audio", icon: Headphones, href: slugifyCategory("Audio"), image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400", count: "1.1K+" },
  { name: "Books & Media", icon: BookOpen, href: slugifyCategory("Books & Media"), image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400", count: "640+" },
  { name: "Gadgets", icon: Smartphone, href: slugifyCategory("Gadgets"), image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400", count: "950+" },
];

function CategoryCard({ cat }: { cat: typeof CATEGORIES[0] }) {
  return (
    <a
      href={cat.href}
      className="group relative h-72 lg:h-80 rounded-2xl overflow-hidden border border-[var(--color-text-primary)]/10 bg-[var(--color-bg)] hover:border-[var(--color-accent)]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[var(--color-accent)]/5"
      aria-label={`Browse ${cat.name}`}
    >
      <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/40 to-transparent" />

      <div className="relative h-full p-6 lg:p-7 flex flex-col justify-end">
        <div>
          <h3 className="font-display font-semibold text-2xl lg:text-3xl tracking-tight text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">{cat.name}</h3>
          <p className="mt-1 font-mono text-sm text-[var(--color-text-primary)]/40">{cat.count}</p>
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--color-text-primary)]/10 flex items-center justify-between text-sm font-body text-[var(--color-text-primary)]/60 group-hover:text-[var(--color-text-primary)]/90 transition-colors">
          <span>Browse</span>
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </a>
  );
}

export function CategoryBrowse() {
  return (
    <section className={cn(sectionBg, "py-12 sm:py-16")}>
      <div className={shell}>
        <div className="mb-8 flex items-end justify-between">
<div>
            <span className="inline-flex items-center gap-2 text-[11px] font-normal uppercase tracking-[0.12em] text-[var(--color-accent)]">Marketplace</span>
            <SectionHeading className="mt-2">Browse by Category</SectionHeading>
            <p className={cn("mt-1.5 max-w-md text-sm leading-relaxed", "text-[var(--color-text-muted)]")}>
              Find exactly what you need — from electronics to fashion and everything between.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="hidden font-mono text-sm text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)] sm:inline"
          >
            All products →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.name} cat={cat} />
          ))}
        </div>

        <div className="mt-5 text-center sm:hidden">
          <Link href="/marketplace" className="font-mono text-sm text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]">
            All products →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   8. CREATOR ECONOMY SHOWCASE
   ═══════════════════════════════════════════════ */

interface Creator {
  id: string;
  name: string;
  avatar: string;
  role: string;
  statLabel: string;
  statValue: string;
  href: string;
  tagline: string;
}

const CREATORS: Creator[] = [
  { id: "c1", name: "Sarah K.", avatar: "S", role: "Course Creator", statLabel: "Students taught", statValue: "2,400+", href: "/creator/sarah-k", tagline: "Sold $18K in courses her first quarter — no paid ads." },
  { id: "c2", name: "David M.", avatar: "D", role: "Community Owner", statLabel: "Community members", statValue: "1,200+", href: "/creator/david-m", tagline: "Built a paid community around fitness coaching. $8/month per member." },
  { id: "c3", name: "Grace A.", avatar: "G", role: "Digital Seller", statLabel: "Monthly earnings", statValue: "$3,400", href: "/creator/grace-a", tagline: "Sells Notion templates and design assets to a global audience." },
  { id: "c4", name: "Tunde O.", avatar: "T", role: "Affiliate Creator", statLabel: "Commissions earned", statValue: "$12,800", href: "/creator/tunde-o", tagline: "Reviews tech products and earns 15-30% on every sale through his links." },
];

function CreatorCard({ creator }: { creator: Creator }) {
   return (
     <Link
       href={creator.href}
       className="group flex flex-col gap-5 rounded-2xl bg-[var(--color-bg)] p-6 transition-all duration-300 hover:-translate-y-0.5 min-h-[300px]"
     >
       <div className="flex items-center gap-4">
         <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-2xl font-bold text-[var(--color-accent)]">
           {creator.avatar}
         </span>
         <div>
           <h3 className="text-2xl text-[var(--color-text-primary)] leading-tight">{creator.name}</h3>
           <p className="text-base text-[var(--color-text-muted)]">{creator.role}</p>
         </div>
       </div>
       <div>
         <p className="text-[11px] text-[var(--color-text-muted)]">{creator.statLabel}</p>
         <p className="font-mono text-2xl font-bold text-[var(--color-accent)]">{creator.statValue}</p>
       </div>
       <p className="flex-1 text-[13px] leading-relaxed text-[var(--color-text-muted)]">{creator.tagline}</p>
       <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-accent)] transition-all group-hover:gap-1.5">
         View profile <ArrowRight className="h-3 w-3" />
       </span>
     </Link>
   );
 }

export function CreatorShowcase() {
  return (
    <section className={cn(sectionBg, "py-12 sm:py-16")}>
      <div className={shell}>
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-normal uppercase tracking-[0.12em] text-[var(--color-accent)]">Creators</span>
            <SectionHeading className="mt-2">Built for creators who ship</SectionHeading>
            <p className={cn("mt-1.5 max-w-lg text-sm leading-relaxed", "text-[var(--color-text-muted)]")}>
              Whether you teach, build communities, or sell digital — these are real people earning on Jimvio today.
            </p>
          </div>
          <Link href="/creators" className="font-mono text-sm text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]">
            Meet more creators →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CREATORS.map((c) => (
            <CreatorCard key={c.id} creator={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   8. HOW JIMVIO WORKS
   ═══════════════════════════════════════════════ */

const steps = [
  {
    num: '01',
    title: 'Join — buyer, vendor, or creator',
    desc: 'One account, three doors. Pick your path: shop products, open a store, or start a course.',
    meta: 'No approval needed',
  },
  {
    num: '02',
    title: 'Create — list, live, or clip',
    desc: 'Vendors list with same-day tracking. Creators host live sessions. Anyone can post a clipping campaign.',
    meta: 'Live within minutes',
  },
  {
    num: '03',
    title: 'Get paid — same day, every time',
    desc: 'MTN MoMo, Binance Pay, Flutterwave, NOWPayments. Payouts settle before the session ends.',
    meta: 'Every vendor, every session',
  },
];

export function HowJimvioWorks() {
  return (
    <section id="how-it-works" aria-label="How Jimvio works" className="mx-auto max-w-7xl px-6 pb-24">
      <div className="mb-10">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent)] font-medium">How it works</span>
        <h2 className="font-display font-semibold text-4xl lg:text-[3.5rem] tracking-[-0.045em] text-[var(--color-text-primary)] mt-2">Three steps. No friction.</h2>
        <p className="mt-3 text-[var(--color-text-primary)]/50 font-body text-base max-w-xl">Not a sign-up funnel — it's how people actually move through Jimvio.</p>
      </div>

      <div className="relative">
        {/* Connecting line for desktop */}
        <div aria-hidden="true" className="hidden lg:block absolute top-16 left-[calc(33.33%-1rem)] w-[calc(33.33%+2rem)] h-px bg-gradient-to-r from-[var(--color-accent)]/30 via-[var(--color-accent)]/10 to-transparent" />

        <div className="grid lg:grid-cols-3 gap-5">
          {steps.map((step) => (
            <article key={step.num} className="relative rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-8 lg:p-9 hover:border-[var(--color-accent)]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]">
              <span className="font-mono text-5xl font-bold text-[var(--color-accent)]/30 tracking-tighter select-none">{step.num}</span>
              <h3 className="font-display font-semibold text-2xl tracking-tight text-[var(--color-text-primary)] mt-3">{step.title}</h3>
              <p className="mt-3 text-[var(--color-text-primary)]/60 font-body text-sm leading-relaxed">{step.desc}</p>
              <div className="mt-6 pt-5 border-t border-[var(--color-text-primary)]/5 flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--color-accent)]">{step.meta}</span>
                <ArrowDownRight size={16} className="text-[var(--color-accent)]" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   9. FEATURED UGC CAMPAIGNS
   ═══════════════════════════════════════════════ */

const FEATURED_CAMPAIGNS = [
  { title: "Silk Scarf Series", subtitle: "Fashion Creators", clips: 128, pool: "240,000 RWF", rewardPerView: "1.20 RWF", trend: "+34% this week", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600", status: "Active" as const },
  { title: "Kitchen Essentials", subtitle: "Kitchen Makers", clips: 84, pool: "180,000 RWF", rewardPerView: "1.20 RWF", trend: "+18% this week", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600", status: "Active" as const },
  { title: "Live Shopping Clips", subtitle: "Clipping Collective", clips: 210, pool: "320,000 RWF", rewardPerView: "1.20 RWF", trend: "+52% this week", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600", status: "Trending" as const },
];

export function FeaturedUGCCampaigns() {
  return (
    <section className={cn(sectionBg, "py-12 sm:py-16")}>
      <div className={shell}>
        <div className="mb-9">
          <span className="font-['var(--font-ibm-plex-mono)'] text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
            Clipping
          </span>
          <SectionHeading className="mt-2">Featured UGC Campaigns.</SectionHeading>
          <p className={cn("mt-3 max-w-xl text-base leading-relaxed", "text-[var(--color-text-muted)]")}>
            The campaigns running right now — real reward pools, real clips posted, real payouts.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {FEATURED_CAMPAIGNS.map((c) => (
            <Link
              key={c.title}
              href="/ugc"
              className="group relative overflow-hidden rounded-3xl border border-[var(--color-text-primary)]/20 bg-[var(--color-bg)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--color-accent)]/25 hover:shadow-2xl hover:shadow-[var(--color-accent)]/5"
            >
              <div className="relative h-60 overflow-hidden">
                <img
                  src={c.image}
                  alt=""
                  className="size-full object-cover opacity-60 transition-all duration-700 group-hover:scale-105 group-hover:opacity-40"
                  loading="lazy"
                />
                <div className="absolute left-4 top-4 flex gap-2">
                  <span className={cn(
                    "font-body text-[10px] tracking-wide",
                    c.status === "Trending"
                      ? "rounded-md bg-[var(--color-accent)] px-2 py-0.5 font-bold text-[var(--color-bg)]"
                      : "rounded-md border border-[var(--color-text-primary)]/8 bg-[var(--color-bg)]/80 px-2 py-0.5 text-[var(--color-text-primary)]/80 backdrop-blur-sm"
                  )}>
                    {c.status}
                  </span>
                </div>
                <div className="absolute right-4 top-4">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-bg)]/80 px-2.5 py-1 backdrop-blur-sm">
                    <span className="font-mono text-sm font-bold text-[var(--color-text-primary)]">{c.clips}</span>
                    <span className="font-['var(--font-ibm-plex-mono)'] text-[9px] tracking-wide text-[var(--color-text-primary)]/40">clips</span>
                  </span>
                </div>
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/20 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <h3 className="font-['var(--font-fraunces)'] text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                    {c.title}
                  </h3>
                  <p className="font-['var(--font-ibm-plex-mono)'] text-[10px] uppercase tracking-[0.1em] text-[var(--color-accent)]/60">
                    {c.subtitle}
                  </p>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[var(--color-text-primary)]/5 bg-[var(--color-surface-secondary)] p-3 text-center">
                    <span className="font-mono text-xl font-semibold text-[var(--color-accent)]">{c.pool}</span>
                    <span className="mt-0.5 block font-mono text-[9px] tracking-wide text-[var(--color-text-primary)]/30">Reward pool</span>
                  </div>
                  <div className="rounded-2xl border border-[var(--color-text-primary)]/5 bg-[var(--color-surface-secondary)] p-3 text-center">
                    <span className="font-mono text-xl font-semibold text-[var(--color-text-primary)]">{c.rewardPerView}</span>
                    <span className="mt-0.5 block font-mono text-[9px] tracking-wide text-[var(--color-text-primary)]/30">Per view</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--color-text-primary)]/5 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-emerald-400">
                    <TrendingUp className="h-3.5 w-3.5" /> {c.trend}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-body font-semibold text-[var(--color-accent)] transition-transform group-hover:translate-x-1">
                    Join <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   10. SOCIAL PROOF
   ═══════════════════════════════════════════════ */

const QUOTES = [
  {
    role: "Buyer",
    name: "Lena A.",
    avatar: "L",
    quote: "I was skeptical about buying from a new platform. Three orders in and every single one arrived on time. The tracking is better than the big marketplaces.",
    stat: "12 orders placed",
  },
  {
    role: "Vendor",
    name: "Kwame D.",
    avatar: "K",
    quote: "I listed my first product on Monday and had a sale by Wednesday. Payout hit my account the same day. That's never happened anywhere else.",
    stat: "$28K+ in sales",
  },
  {
    role: "Creator",
    name: "Zara M.",
    avatar: "Z",
    quote: "I joined a UGC campaign on a whim, posted a 45-second clip, and made $340 in my first month. Now I do it full time.",
    stat: "8 campaigns completed",
  },
];

export function SocialProof() {
  return (
    <section className={cn(sectionBg, "py-12 sm:py-16")}>
      <div className={shell}>
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 text-[11px] font-normal uppercase tracking-[0.12em] text-[var(--color-accent)]">Real stories</span>
          <SectionHeading className="mt-2">Trusted by buyers, vendors, and creators</SectionHeading>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {QUOTES.map((q) => (
            <div key={q.name} className="group flex flex-col rounded-2xl bg-[var(--color-surface)] p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5">
              <div className="mb-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-[var(--color-accent)]">{q.avatar}</span>
                </div>
                <div>
                  <p className="text-2xl text-[var(--color-text-primary)] leading-tight">{q.name}</p>
                  <p className="text-base font-light uppercase text-[var(--color-accent)] font-mono">{q.role}</p>
                </div>
              </div>
              <div className="mb-3">
                <span className="text-xl font-semibold text-[var(--color-text-muted)]">{q.stat}</span>
              </div>
              <blockquote className="flex-1 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                &ldquo;{q.quote}&rdquo;
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   11. PLATFORM — Everything in one place
   ═══════════════════════════════════════════════ */

export function PlatformSection() {
   return (
     <section className={cn(sectionBg, "py-16 sm:py-20")}>
       <div className={shell}>
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-[11px] font-normal uppercase tracking-[0.12em] text-[var(--color-accent)]">PLATFORM</span>
            <SectionHeading className="mt-2">
              Everything in one place.
            </SectionHeading>
           <p className={cn("mt-4 max-w-2xl text-base leading-relaxed sm:text-lg", "text-[var(--color-text-muted)]")}>
              Marketplace, live shopping, creators, payouts, security — not separate apps.
           </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Link
              href="/marketplace"
              className="group flex items-start gap-4 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 hover:border-[var(--color-accent)]/20 hover:bg-[var(--color-bg)] transition-all hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
                <ShoppingBag size={18} className="text-[var(--color-accent)]" />
              </div>
              <div className="text-left pt-1">
                <h3 className="font-body font-semibold text-[var(--color-text-primary)]">Marketplace</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Browse products from verified vendors worldwide.</p>
              </div>
            </Link>

            <Link
              href="/live"
              className="group flex items-start gap-4 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 hover:border-[var(--color-accent)]/20 hover:bg-[var(--color-bg)] transition-all hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
                <Video size={18} className="text-[var(--color-accent)]" />
              </div>
              <div className="text-left pt-1">
                <h3 className="font-body font-semibold text-[var(--color-text-primary)]">Live Shopping</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Watch hosts demo products in real time and buy instantly.</p>
              </div>
            </Link>

            <Link
              href="/creators"
              className="group flex items-start gap-4 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 hover:border-[var(--color-accent)]/20 hover:bg-[var(--color-bg)] transition-all hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
                <Users size={18} className="text-[var(--color-accent)]" />
              </div>
              <div className="text-left pt-1">
                <h3 className="font-body font-semibold text-[var(--color-text-primary)]">Creators</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Join brand campaigns and get paid to create content.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    );
 }

/* ═══════════════════════════════════════════════
   12. SECURITY & PAYMENTS
   ═══════════════════════════════════════════════ */

const PAYMENT_PROVIDERS = [
   { name: "MTN MoMo", logo: "/logos/mtn.jpeg" },
   { name: "Binance Pay", logo: "/logos/binance.png" },
   { name: "Flutterwave", logo: "/logos/flutterwave.png" },
   { name: "NOWPayments", logo: "/logos/nowpayment updated.svg" },
];

export function SecurityPayments() {
  return (
    <section className={cn(sectionBg, "py-12 sm:py-16")}>
      <div className={shell}>
        <div className="rounded-3xl border border-white/10 dark:border-white/10 bg-[var(--color-bg)] p-8 lg:p-10">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] lg:text-4xl mb-4">
            Shop with confidence
          </h2>
          <p className="text-[var(--color-text-primary)]/50 text-base lg:text-lg mb-10 max-w-2xl">
            Your security is our priority. Every transaction is protected from checkout to delivery.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Two-factor login */}
            <div className="flex items-start gap-4 p-4 rounded-2xl border border-[var(--color-paper)]/10 bg-[var(--color-ink)]/50 hover:border-[var(--color-accent)]/20 transition-all">
              <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
                <Fingerprint size={18} className="text-[var(--color-accent)]" />
              </div>
              <div>
                <h3 className="font-body font-semibold text-[var(--color-paper)]">Two-factor login</h3>
                <p className="text-sm text-[var(--color-paper)]/50 font-body mt-1 leading-relaxed">TOTP + backup codes — enabled on every account by default. No exceptions.</p>
              </div>
            </div>

            {/* Buyer Protection */}
            <div className="flex items-start gap-4 p-4 rounded-2xl border border-[var(--color-paper)]/10 bg-[var(--color-ink)]/50 hover:border-[var(--color-accent)]/20 transition-all">
              <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
                <Lock size={18} className="text-[var(--color-accent)]" />
              </div>
              <div>
                <h3 className="font-body font-semibold text-[var(--color-paper)]">Buyer protection</h3>
                <p className="text-sm text-[var(--color-paper)]/50 font-body mt-1 leading-relaxed">Every order is tracked. Refunds within 24 hours if delivery fails.</p>
              </div>
            </div>

            {/* Worldwide Shipping */}
            <div className="flex items-start gap-4 p-4 rounded-2xl border border-[var(--color-paper)]/10 bg-[var(--color-ink)]/50 hover:border-[var(--color-accent)]/20 transition-all">
              <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
                <Truck size={18} className="text-[var(--color-accent)]" />
              </div>
              <div>
                <h3 className="font-body font-semibold text-[var(--color-paper)]">Worldwide Shipping</h3>
                <p className="text-sm text-[var(--color-paper)]/50 font-body mt-1 leading-relaxed">Fast & reliable delivery</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-[var(--color-paper)]/30 pt-6 mt-8">
            {PAYMENT_PROVIDERS.map((p) => (
              <span
                key={p.name}
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-bg)]/60 p-2 backdrop-blur-sm"
              >
                <Image
                  src={p.logo}
                  alt={p.name}
                  width={24}
                  height={24}
                  className="size-6 object-contain"
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   12. FAQ
   ═══════════════════════════════════════════════ */

const questions = [
  { q: 'How fast do payouts actually settle?', a: 'Every vendor receives their payout before the live session ends. MTN MoMo and Binance Pay are typically under 2 minutes. Flutterwave and NOWPayments within 5 minutes. No pending windows, no approval delays.' },
  { q: 'Can I sell and create at the same time?', a: 'Yes — one account, three doors. You can list products, host live sessions, and launch a clipping campaign from the same dashboard. No separate signups, no extra verification.' },
  { q: 'Is there a fee to join as a vendor?', a: 'Zero platform fees on your first 10 orders. After that, a flat 3.5% per transaction — no hidden charges, no subscription cost. You pay only when you earn.' },
  { q: 'What is a clipping campaign?', a: 'A 15-second vertical clip showing a product or session. Every verified view earns RWF 1.20 (or equivalent in USD). Campaigns are open to anyone — no sponsorship deal required, no minimum follower count.' },
  { q: 'How does buyer protection work?', a: 'Every order has tracking. If delivery fails within 7 days, you get a full refund within 24 hours — no forms, no appeals. The vendor is notified immediately and the payout is reversed automatically.' },
];

export function CommonQuestions() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" aria-label="Common questions" className="mx-auto max-w-7xl px-6 pb-24">
      <div className="mb-9">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-accent)] font-medium">FAQ</span>
        <h2 className="font-display font-semibold text-4xl lg:text-[3.5rem] tracking-[-0.045em] text-[var(--color-paper)] mt-2">Common questions.</h2>
        <p className="mt-3 text-[var(--color-paper)]/50 font-body text-base max-w-xl leading-relaxed">Concrete answers — no filler, no marketing language.</p>
      </div>

      <div className="flex flex-col gap-5">
        <div className="space-y-3">
          {questions.map((item, i) => (
            <button
              key={i}
              onClick={() => setOpen(open === i ? null : i)}
              className={`w-full text-left rounded-2xl border p-6 lg:p-7 transition-all duration-300 hover:-translate-y-0.5 ${
                open === i
                  ? 'bg-[var(--color-surface-secondary)] border-[var(--color-accent)]/30 shadow-2xl shadow-[var(--color-accent)]/5'
                  : 'bg-[var(--color-bg)]/60 border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
              }`}
              aria-expanded={open === i}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display font-semibold text-lg lg:text-xl tracking-tight text-[var(--color-text-primary)]">{item.q}</h3>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-300 ${open === i ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-bg)]' : 'bg-[var(--color-bg)] border-[var(--color-text-primary)]/20 text-[var(--color-text-primary)]/50'}`}>
                  {open === i ? <Minus size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
                </span>
              </div>
              <div
                className={`overflow-hidden transition-all duration-500 ease-out ${open === i ? 'max-h-[300px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <p className="text-[var(--color-accent)] font-body text-sm lg:text-base leading-[1.8]">{item.a}</p>
              </div>
            </button>
          ))}
        </div>

        <a href="#" className="block rounded-2xl bg-gradient-to-br from-[var(--color-surface-secondary)] to-[var(--color-bg)] border border-[var(--color-text-primary)]/10 p-7 hover:border-[var(--color-accent)]/25 hover:-translate-y-1 transition-all duration-300">
          <h3 className="font-display font-semibold text-2xl tracking-tight text-[var(--color-text-primary)]">Still have questions?</h3>
          <p className="mt-3 text-[var(--color-text-primary)]/50 font-body text-sm leading-relaxed">Contact support — real people, not chatbots. Average response: under 10 minutes during business hours.</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-body font-semibold text-[var(--color-accent)]">Contact support →</span>
        </a>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   13. FOOTER CTA
   ═══════════════════════════════════════════════ */

export function FooterCTA() {
   return (
     <section className={cn(sectionBg, "py-16 sm:py-20")}>
       <div className={shell}>
         <div className="max-w-3xl">
           <span className="inline-flex items-center gap-2 text-[11px] font-normal uppercase tracking-[0.12em] text-[var(--color-accent)]">Get started</span>
           <SectionHeading className="mt-2">Choose your lane</SectionHeading>
           <p className={cn("mt-2 max-w-md text-sm leading-relaxed", "text-[var(--color-text-muted)]")}>
             One account. Three ways to use it. Pick the path that fits what you need right now.
           </p>
         </div>

         <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
           <Link
             href="/marketplace"
             className="group flex flex-col items-center gap-3 rounded-2xl bg-[var(--color-bg-elevated)] p-6 text-center transition-all hover:-translate-y-0.5"
           >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
                <ShoppingBag className="h-[18px] w-[18px] text-[var(--color-accent)]" />
              </div>
             <div>
               <h3 className="text-[15px] font-normal text-[var(--color-text-primary)]">Shop Jimvio</h3>
               <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">Browse products from verified vendors worldwide.</p>
             </div>
             <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-accent)] transition-all group-hover:gap-1.5">
               Start shopping <ArrowRight className="h-3.5 w-3.5" />
             </span>
           </Link>

           <Link
             href="/vendor/register"
             className="group flex flex-col items-center gap-3 rounded-2xl bg-[var(--color-bg-elevated)] p-6 text-center transition-all hover:-translate-y-0.5"
           >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
                <Store className="h-[18px] w-[18px] text-[var(--color-accent)]" />
              </div>
             <div>
               <h3 className="text-[15px] font-normal text-[var(--color-text-primary)]">Sell on Jimvio</h3>
               <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">List products, manage orders, get paid same day.</p>
             </div>
             <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-accent)] transition-all group-hover:gap-1.5">
               Open your shop <ArrowRight className="h-3.5 w-3.5" />
             </span>
           </Link>

           <Link
             href="/ugc"
             className="group flex flex-col items-center gap-3 rounded-2xl bg-[var(--color-bg)] p-6 text-center transition-all hover:-translate-y-0.5"
           >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
                <Clapperboard className="h-[18px] w-[18px] text-[var(--color-accent)]" />
              </div>
             <div>
               <h3 className="text-[15px] font-normal text-[var(--color-text-primary)]">Create on Jimvio</h3>
               <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">Join brand campaigns and get paid to create content.</p>
             </div>
             <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-accent)] transition-all group-hover:gap-1.5">
               Browse campaigns <ArrowRight className="h-3.5 w-3.5" />
             </span>
           </Link>
         </div>
       </div>
     </section>
   );
 }

/* ═══════════════════════════════════════════════
   REVEAL — scroll-triggered fade-up
   ═══════════════════════════════════════════════ */

function Reveal({ children }: { children: React.ReactNode }) {
   return (
     <motion.div
       initial={{ opacity: 0, y: 48 }}
       whileInView={{ opacity: 1, y: 0 }}
       viewport={{ once: true, margin: "-80px" }}
       transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
     >
       {children}
     </motion.div>
   );
}

/* ═══════════════════════════════════════════════
   ROOT EXPORT — all sections
   ═══════════════════════════════════════════════ */

export function HomepageSpecSections() {
  return (
    <>
      <Reveal><HeroSection /></Reveal>
      <Reveal><PulseSection /></Reveal>
      <Reveal><TrustStrip /></Reveal>
      <Reveal><FlashDealsSection /></Reveal>
      <Reveal><LiveShoppingSpotlight /></Reveal>
      <Reveal><CategoryBrowse /></Reveal>
      <Reveal><CreatorShowcase /></Reveal>
      <Reveal><CommunitiesSection /></Reveal>
      <Reveal><HowJimvioWorks /></Reveal>
      <Reveal><FeaturedUGCCampaigns /></Reveal>
      <Reveal><SocialProof /></Reveal>
      <Reveal><PlatformSection /></Reveal>
      <Reveal><SecurityPayments /></Reveal>
      <Reveal><CommonQuestions /></Reveal>
      <Reveal><FooterCTA /></Reveal>
    </>
  );
}
