"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  Star,
  Users,
  MessageCircle,
  Trophy,
  Zap,
  Shield,
  ShieldCheck,
  Globe,
  Sparkles,
  Bot,
  Clock,
  ChevronDown,
  Play,
  Heart,
  Award,
  TrendingUp,
  CheckCircle2,
  Bell,
  DollarSign,
  Wallet,
  Target,
  Rocket,
  ShoppingBag,
  Megaphone,
  Share2,
  Eye,
  BarChart3,
  CreditCard,
  Lock,
  ArrowUpRight,
  Flame,
  Package,
  FileCode2,
  Lightbulb,
  GraduationCap,
  CircleDollarSign,
  PiggyBank,
  BadgeDollarSign,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface LandingData {
  products: { id: string; name: string; slug: string; price: number; currency: string; image: string | null; sales: number; rating: number; type: string }[];
  campaigns: { id: string; title: string; type: string; rate: string; status: string; brand: string; budget: string | null; submissions: number }[];
  posts: { id: string; title: string; author: string; avatar: string | null; likes: number; replies: number; tag: string }[];
  stats: { totalUsers: number; totalUsersFormatted: string; totalPaid: number; totalPaidFormatted: string; totalPayouts: number; totalPayoutsFormatted: string; countries: number; countriesFormatted: string } | null;
  testimonials: { id: string; name: string; role: string; avatar: string | null; text: string; rating: number }[];
}

function useLandingData() {
  const { data, error, isLoading } = useSWR<LandingData>("/api/landing-data", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
  return { data, error, isLoading };
}

/* ═══════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════ */
const ACCENT = "#fd5000";
const ACCENT_RGB = "253,80,0";
const GREEN = "#16a34a";
const GREEN_RGB = "22,163,74";
const WARNING = "#f0b429";
const WARNING_RGB = "240,180,41";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5 } },
};

const stagger: Variants = {
  show: { transition: { staggerChildren: 0.1 } },
};

/* ═══════════════════════════════════════════════
   SHELL
   ═══════════════════════════════════════════════ */
function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={cn("relative overflow-hidden", className)}>{children}</section>;
}

function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

/* ═══════════════════════════════════════════════
   DECORATIONS
   ═══════════════════════════════════════════════ */
function GridBg({ opacity = 0.03 }: { opacity?: number }) {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={ACCENT} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)" />
    </svg>
  );
}

function GlowOrb({ className, color = ACCENT, size = 400 }: { className?: string; color?: string; size?: number }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute rounded-full blur-[120px]", className)}
      style={{ width: size, height: size, background: `radial-gradient(circle, ${color}15 0%, transparent 70%)` }} />
  );
}

/* ═══════════════════════════════════════════════
   ANIMATED COUNTER HOOK
   ═══════════════════════════════════════════════ */
function useCountUp(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!startOnView) { setCount(end); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          setCount(Math.floor(progress * end));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration, startOnView]);

  return { count, ref };
}

/* ═══════════════════════════════════════════════
   FLOATING EARNINGS NOTIFICATION
   ═══════════════════════════════════════════════ */
const EARNINGS_NOTIFS = [
  { name: "Sarah K.", amount: "$24.50", action: "earned from affiliate sale", country: "US" },
  { name: "Marcus D.", amount: "$12.00", action: "UGC campaign payout", country: "NG" },
  { name: "Aisha R.", amount: "$89.00", action: "marketplace product sold", country: "KE" },
  { name: "Luis M.", amount: "$6.50", action: "referral commission", country: "BR" },
  { name: "Priya S.", amount: "$156.00", action: "course sale", country: "IN" },
];

function FloatingNotification({ index }: { index: number }) {
  const notif = EARNINGS_NOTIFS[index % EARNINGS_NOTIFS.length];
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 rounded-xl border border-[rgba(22,163,74,0.2)] bg-[var(--color-surface)]/90 px-4 py-3 shadow-lg backdrop-blur-sm"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `rgba(${GREEN_RGB}, 0.12)` }}>
        <CircleDollarSign className="h-4.5 w-4.5" style={{ color: GREEN }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[var(--color-text-primary)]">
          {notif.name} <span className="font-bold" style={{ color: GREEN }}>{notif.amount}</span>
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)] truncate">{notif.action}</p>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════ */
function Hero({ stats }: { stats?: LandingData["stats"] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: scrollRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const [notifIdx, setNotifIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNotifIdx((i) => (i + 1) % EARNINGS_NOTIFS.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <Section className="relative min-h-screen pt-28 pb-20 lg:pt-36 lg:pb-32">
      <div ref={scrollRef}>
        <GridBg opacity={0.02} />
        <GlowOrb className="top-10 left-1/4" size={500} />
        <GlowOrb className="bottom-10 right-1/4" size={400} color="ACCENT" />

        <motion.div style={{ y, opacity }}>
          <Container className="relative z-10">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left */}
              <div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                  className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(22,163,74,0.25)] bg-[rgba(22,163,74,0.06)] px-4 py-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16a34a] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16a34a]" />
                  </span>
                  <span className="text-xs font-bold text-[#16a34a]">{stats?.totalPaidFormatted ?? "$2.8M+"} paid out to creators</span>
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-6 text-4xl font-black leading-[1.08] tracking-tight text-[var(--color-text-primary)] sm:text-5xl lg:text-6xl"
                  style={{ letterSpacing: "-0.035em" }}>
                  Turn Your Skills Into{" "}
                  <span className="relative inline-block">
                    <span style={{ color: ACCENT }}>Income</span>
                    <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 12" fill="none" aria-hidden>
                      <path d="M2 8C40 2 100 2 198 8" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" opacity="0.3" />
                    </svg>
                  </span>
                </motion.h1>

                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="mb-8 max-w-lg text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
                  Jimvio combines Affiliate Marketing, UGC campaigns, a Digital Marketplace, and a
                  supportive Community — all in one platform. Start earning today.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }} className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/register"
                    className="inline-flex items-center justify-center gap-2.5 rounded-xl px-7 py-3.5 text-sm font-bold text-white shadow-xl transition-all active:scale-[0.97]"
                    style={{ background: ACCENT, boxShadow: `0 10px 32px rgba(${ACCENT_RGB},0.3)` }}>
                    Start Earning Free <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="#features"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-7 py-3.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
                    See How It Works <Play className="h-3.5 w-3.5" />
                  </Link>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  className="mt-10 flex flex-wrap gap-6">
                  {[
                    { value: stats?.totalUsersFormatted ?? "12K+", label: "Active Earners" },
                    { value: stats?.totalPaidFormatted ?? "$2.8M+", label: "Total Paid Out" },
                    { value: stats?.countriesFormatted ?? "50+", label: "Countries" },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className="text-xl font-black text-[var(--color-text-primary)]">{s.value}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{s.label}</p>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right — Dashboard preview + floating cards */}
              <div className="relative hidden lg:block" style={{ perspective: "1200px" }}>
                <div style={{ transform: "rotateY(-4deg) rotateX(2deg)", transformOrigin: "center center" }}>
                  <DashboardPreviewCard />
                </div>
                <div className="absolute -left-20 top-4 hidden xl:block w-72 z-20">
                  <AnimatePresence mode="wait">
                    <FloatingNotification key={notifIdx} index={notifIdx} />
                  </AnimatePresence>
                </div>
                <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 1.0, duration: 0.5 }} className="absolute -right-4 bottom-8 hidden xl:block z-20">
                  <EarningsMiniCard />
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: 1.3, duration: 0.5 }} className="absolute -right-8 top-1/3 hidden xl:block z-20">
                  <PayoutBadge />
                </motion.div>
              </div>
            </div>
          </Container>
        </motion.div>


      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   DASHBOARD PREVIEW CARD (Hero right side)
   ═══════════════════════════════════════════════ */
function DashboardPreviewCard() {
  const recentTransactions = [
    { name: "Affiliate Sale", amount: "+$24.50", time: "2m ago", color: "ACCENT", initials: "SK" },
    { name: "UGC Campaign", amount: "+$89.00", time: "18m ago", color: "ACCENT", initials: "MR" },
    { name: "Course Purchase", amount: "+$156.00", time: "1h ago", color: GREEN, initials: "PS" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]">
      {/* App header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: ACCENT }}>
            <span className="text-[10px] font-black text-white">J</span>
          </div>
          <span className="text-xs font-bold text-[var(--color-text-primary)]">Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-[rgba(22,163,74,0.08)] px-2.5 py-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16a34a] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
            </span>
            <span className="text-[10px] font-bold" style={{ color: GREEN }}>Live</span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-border)]">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)]">JD</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Earnings headline */}
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-medium text-[var(--color-text-muted)]">Total Earnings</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black tracking-tight text-[var(--color-text-primary)]">$12,458</p>
              <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: `rgba(${GREEN_RGB},0.1)`, color: GREEN }}>
                <TrendingUp className="h-2.5 w-2.5" /> +18.4%
              </span>
            </div>
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)]">vs last month</span>
        </div>

        {/* Chart — SVG line with gradient fill */}
        <div className="mb-5 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <svg viewBox="0 0 400 80" className="w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity="0.2" />
                <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Fill area */}
            <path d="M0,65 L20,60 L50,62 L80,50 L110,55 L140,40 L170,42 L200,30 L230,35 L260,22 L290,25 L320,15 L350,18 L380,8 L400,5 L400,80 L0,80 Z"
              fill="url(#chartGrad)" />
            {/* Line */}
            <path d="M0,65 L20,60 L50,62 L80,50 L110,55 L140,40 L170,42 L200,30 L230,35 L260,22 L290,25 L320,15 L350,18 L380,8 L400,5"
              fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* End dot */}
            <circle cx="400" cy="5" r="4" fill={ACCENT} />
            <circle cx="400" cy="5" r="7" fill={ACCENT} opacity="0.2" />
          </svg>
          <div className="mt-2 flex justify-between text-[9px] text-[var(--color-text-muted)]">
            <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
          </div>
        </div>

        {/* Breakdown pills */}
        <div className="mb-5 flex flex-wrap gap-1.5">
          {[
            { label: "Affiliate", value: "$4,280", color: "ACCENT" },
            { label: "UGC", value: "$2,150", color: "ACCENT" },
            { label: "Marketplace", value: "$5,428", color: GREEN },
            { label: "Referrals", value: "$600", color: "WARNING" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              <span className="text-[10px] text-[var(--color-text-muted)]">{s.label}</span>
              <span className="text-[10px] font-bold text-[var(--color-text-primary)]">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Recent Activity</p>
          <div className="space-y-1.5">
            {recentTransactions.map((t, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--color-surface)]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: t.color }}>
                  {t.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{t.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{t.time}</p>
                </div>
                <span className="text-xs font-bold" style={{ color: GREEN }}>{t.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   EARNINGS MINI CARD (floating, hero right)
   ═══════════════════════════════════════════════ */
function EarningsMiniCard() {
  return (
    <div className="w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-3 shadow-xl backdrop-blur-md">
      <div className="mb-2 flex items-center gap-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded" style={{ background: `rgba(${GREEN_RGB},0.12)` }}>
          <TrendingUp className="h-3 w-3" style={{ color: GREEN }} />
        </div>
        <span className="text-[10px] font-bold text-[var(--color-text-muted)]">This Week</span>
      </div>
      <p className="text-lg font-black text-[var(--color-text-primary)]">$1,842</p>
      <div className="mt-1.5 flex items-center gap-1">
        <div className="flex-1 overflow-hidden rounded-full bg-[var(--color-border)]" style={{ height: 3 }}>
          <div className="h-full rounded-full" style={{ width: "72%", background: GREEN }} />
        </div>
        <span className="text-[9px] font-bold" style={{ color: GREEN }}>72%</span>
      </div>
      <p className="mt-1 text-[9px] text-[var(--color-text-muted)]">of weekly goal</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAYOUT BADGE (floating, hero right)
   ═══════════════════════════════════════════════ */
function PayoutBadge() {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[rgba(22,163,74,0.25)] bg-[var(--color-surface)]/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `rgba(${GREEN_RGB},0.1)` }}>
        <CircleDollarSign className="h-4 w-4" style={{ color: GREEN }} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-[var(--color-text-primary)]">Payout Sent</p>
        <p className="text-xs font-black" style={{ color: GREEN }}>$2,450.00</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TRUSTED BY — Payment Partners
   ═══════════════════════════════════════════════ */
const PAYMENT_PROVIDERS = [
  { name: "Flutterwave", logo: "/logos/Flutterwave-main.svg", width: 100, height: 28 },
  { name: "NowPayments", logo: "/logos/nowpayment updated.svg", width: 110, height: 28 },
  { name: "Binance Pay", logo: "/logos/binance.png", width: 90, height: 28 },
  { name: "Apple Pay", logo: null, width: 80, height: 28 },
  { name: "Google Pay", logo: null, width: 90, height: 28 },
];

function TrustedBy() {
  return (
    <Section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-10">
      <Container>
        <motion.p initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
          className="mb-6 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]" style={{ fontFamily: "var(--font-dm-sans), var(--font-mono), monospace" }}>
          Powered by trusted payment partners
        </motion.p>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
          className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {PAYMENT_PROVIDERS.map((p) => (
            <motion.div key={p.name} variants={fadeIn}
              className="flex items-center opacity-40 grayscale transition-all hover:opacity-80 hover:grayscale-0">
              {p.logo ? (
                <Image src={p.logo} alt={p.name} width={p.width} height={p.height} className="h-7 w-auto object-contain" />
              ) : (
                <span className="text-sm font-bold text-[var(--color-text-muted)]" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>{p.name}</span>
              )}
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   CORE PILLARS — 4 WAYS TO EARN
   ═══════════════════════════════════════════════ */
const PILLARS = [
  {
    icon: Share2,
    title: "Affiliate Marketing",
    tagline: "Promote & Earn",
    description: "Share products and earn up to 30% commission on every sale. No inventory, no risk — just share your link and get paid.",
    features: ["Up to 30% commission", "Real-time tracking", "Instant payouts", "500+ products"],
    color: "ACCENT",
    href: "/affiliate",
    cta: "Start Earning",
  },
  {
    icon: Megaphone,
    title: "UGC Campaigns",
    tagline: "Create & Earn",
    description: "Join brand campaigns, create short-form content, and get paid per 1,000 views. No followers needed — just create.",
    features: ["Paid per 1K views", "Any platform accepted", "120+ active campaigns", "Instant approval"],
    color: "ACCENT",
    href: "/ugc",
    cta: "Join Campaign",
  },
  {
    icon: ShoppingBag,
    title: "Digital Marketplace",
    tagline: "Sell & Earn",
    description: "Sell digital products, templates, courses, and services. Reach thousands of buyers across 50+ countries.",
    features: ["0% listing fee", "Global reach", "Secure payments", "Instant delivery"],
    color: GREEN,
    href: "/marketplace",
    cta: "Start Selling",
  },
  {
    icon: Users,
    title: "Community",
    tagline: "Learn & Earn",
    description: "Join communities of earners. Get mentorship, tips, and support to grow your income. Learn from top creators.",
    features: ["Expert mentorship", "Live sessions", "Success stories", "Free to join"],
    color: "WARNING",
    href: "/communities",
    cta: "Join Community",
  },
];

function CorePillars() {
  return (
    <Section id="features" className="bg-[var(--color-bg)] py-24 lg:py-32">
      <GridBg opacity={0.02} />
      <Container className="relative z-10">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mb-16 text-center">
          <motion.div variants={fadeUp} className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(253,80,0,0.2)] bg-[rgba(253,80,0,0.06)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
              <Zap className="h-3 w-3" /> 4 Ways to Earn
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="mb-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl" style={{ letterSpacing: "-0.03em" }}>
            Multiple income streams,<br />one platform
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto max-w-2xl text-base text-[var(--color-text-muted)]">
            Jimvio gives you everything you need to earn money online. Choose one path or combine them all.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid gap-4 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <motion.div key={p.title} variants={fadeUp} whileHover={{ y: -4 }}>
              <Link href={p.href} className="group flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all hover:border-[rgba(253,80,0,0.3)]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${p.color}12` }}>
                    <p.icon className="h-6 w-6" style={{ color: p.color }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: p.color }}>{p.tagline}</p>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{p.title}</h3>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)] flex-1">{p.description}</p>
                <ul className="mb-5 grid grid-cols-2 gap-1.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: GREEN }} /> {f}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-1.5 text-sm font-bold transition-all group-hover:gap-2.5" style={{ color: ACCENT }}>
                  {p.cta} <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   AFFILIATE SPOTLIGHT — COMMISSION CALCULATOR
   ═══════════════════════════════════════════════ */
function AffiliateSection() {
  const [productPrice, setProductPrice] = useState(49);
  const [commissionRate, setCommissionRate] = useState(20);
  const [salesPerMonth, setSalesPerMonth] = useState(50);
  const earnings = (productPrice * commissionRate / 100) * salesPerMonth;

  return (
    <Section className="bg-[var(--color-surface)] py-24 lg:py-32">
      <Container>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger}
          className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left — calculator */}
          <div>
            <motion.div variants={fadeUp} className="mb-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(253,80,0,0.2)] bg-[rgba(253,80,0,0.06)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
                <Share2 className="h-3 w-3" /> Affiliate Marketing
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="mb-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
              Calculate your <span style={{ color: ACCENT }}>earnings</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mb-8 text-base text-[var(--color-text-muted)]">
              See how much you could earn with Jimvio&apos;s affiliate program.
            </motion.p>

            <motion.div variants={fadeUp} className="space-y-5">
              {/* Product price */}
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-[var(--color-text-secondary)]">Product price</span>
                  <span className="font-bold text-[var(--color-text-primary)]">${productPrice}</span>
                </div>
                <Slider
                  value={[productPrice]}
                  onValueChange={(v) => setProductPrice(v[0])}
                  min={5}
                  max={200}
                  step={1}
                  showTooltip
                  tooltipContent={(v) => `$${v}`}
                />
              </div>
              {/* Commission rate */}
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-[var(--color-text-secondary)]">Commission rate</span>
                  <span className="font-bold" style={{ color: ACCENT }}>{commissionRate}%</span>
                </div>
                <Slider
                  value={[commissionRate]}
                  onValueChange={(v) => setCommissionRate(v[0])}
                  min={5}
                  max={30}
                  step={1}
                  showTooltip
                  tooltipContent={(v) => `${v}%`}
                />
              </div>
              {/* Sales per month */}
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-[var(--color-text-secondary)]">Sales per month</span>
                  <span className="font-bold text-[var(--color-text-primary)]">{salesPerMonth}</span>
                </div>
                <Slider
                  value={[salesPerMonth]}
                  onValueChange={(v) => setSalesPerMonth(v[0])}
                  min={1}
                  max={200}
                  step={1}
                  showTooltip
                  tooltipContent={(v) => `${v} sales`}
                />
              </div>
            </motion.div>
          </div>

          {/* Right — result */}
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            <div className="rounded-2xl border border-[rgba(253,80,0,0.2)] bg-[rgba(253,80,0,0.03)] p-8">
              <p className="mb-2 text-sm text-[var(--color-text-muted)]">Your estimated monthly earnings</p>
              <p className="mb-1 text-5xl font-black" style={{ color: ACCENT }}>${earnings.toLocaleString()}</p>
              <p className="mb-6 text-sm text-[var(--color-text-muted)]">${(earnings * 12).toLocaleString()}/year</p>
              <div className="space-y-3 border-t border-[rgba(253,80,0,0.15)] pt-6">
                {[
                  { label: "Per sale commission", value: `$${(productPrice * commissionRate / 100).toFixed(2)}` },
                  { label: "Sales per month", value: salesPerMonth.toString() },
                  { label: "Conversion rate (est.)", value: "3.2%" },
                  { label: "Cookie duration", value: "30 days" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-muted)]">{r.label}</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{r.value}</span>
                  </div>
                ))}
              </div>
              <Link href="/affiliate"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all"
                style={{ background: ACCENT, boxShadow: "0 8px 24px rgba(253,80,0,0.25)" }}>
                Start Affiliate Journey <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </Container>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   UGC SECTION
   ═══════════════════════════════════════════════ */
const UGC_CAMPAIGNS = [
  { brand: "GlowUp Skincare", type: "Product Review", rate: "$8/1K views", status: "Open", slots: 24 },
  { brand: "TechNova", type: "Unboxing", rate: "$12/1K views", status: "Open", slots: 18 },
  { brand: "FitLife Pro", type: "Transformation", rate: "$10/1K views", status: "Open", slots: 31 },
  { brand: "StyleHub Africa", type: "Fashion Haul", rate: "$6/1K views", status: "Open", slots: 42 },
];

function UGCSection({ campaigns }: { campaigns?: LandingData["campaigns"] }) {
  const items = campaigns && campaigns.length > 0 ? campaigns : [];
  return (
    <Section className="bg-[var(--color-bg)] py-24 lg:py-32">
      <Container>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mb-16">
          <motion.div variants={fadeUp} className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(253,80,0,0.2)] bg-[rgba(253,80,0,0.06)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
              <Megaphone className="h-3 w-3" /> UGC Campaigns
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="mb-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            Get paid to <span style={{ color: ACCENT }}>create content</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="max-w-2xl text-base text-[var(--color-text-muted)]">
            No followers required. Join brand campaigns, create content on any platform, and earn per 1,000 views.
          </motion.p>
        </motion.div>

        {items.length > 0 ? (
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid gap-3 sm:grid-cols-2">
            {items.map((c) => (
              <motion.div key={c.id} variants={fadeUp} whileHover={{ y: -3 }}
                className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[rgba(253,80,0,0.3)]">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: `rgba(253,80,0,0.1)` }}>
                  <Megaphone className="h-5 w-5" style={{ color: ACCENT }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">{c.brand}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{c.type} · {c.submissions} submissions</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: GREEN }}>{c.rate}</p>
                  <span className="text-[10px] font-bold uppercase" style={{ color: ACCENT }}>{c.status}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12 text-[var(--color-text-muted)]">No active campaigns yet.</div>
        )}

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="mt-8 text-center">
          <Link href="/ugc" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all" style={{ background: ACCENT, boxShadow: "0 8px 24px rgba(253,80,0,0.25)" }}>
            Browse All Campaigns <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </Container>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   MARKETPLACE SECTION
   ═══════════════════════════════════════════════ */
const PRODUCTS = [
  { name: "Notion Template Pack", price: "$29", sales: "1.2K", rating: 4.9, type: "Template" },
  { name: "React UI Kit Pro", price: "$49", sales: "890", rating: 4.8, type: "Code" },
  { name: "Social Media Course", price: "$79", sales: "2.1K", rating: 5.0, type: "Course" },
  { name: "Design System Bundle", price: "$39", sales: "640", rating: 4.7, type: "Assets" },
  { name: "Freelance Starter Kit", price: "$19", sales: "3.5K", rating: 4.9, type: "Bundle" },
  { name: "AI Prompt Library", price: "$15", sales: "4.2K", rating: 4.8, type: "Digital" },
];

function MarketplaceSection() {
  return (
    <Section className="bg-[var(--color-surface)] py-24 lg:py-32">
      <Container>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mb-16 text-center">
          <motion.div variants={fadeUp} className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.06)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#16a34a]">
              <ShoppingBag className="h-3 w-3" /> Marketplace
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="mb-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            Sell digital products <span style={{ color: GREEN }}>globally</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto max-w-2xl text-base text-[var(--color-text-muted)]">
            Templates, courses, code, assets — sell anything digital. Zero listing fees, instant payouts.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <motion.div key={p.name} variants={fadeUp} whileHover={{ y: -3 }}
              className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-all hover:border-[rgba(22,163,74,0.3)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: `rgba(${GREEN_RGB},0.1)`, color: GREEN }}>{p.type}</span>
                <div className="flex items-center gap-0.5 text-xs">
                  <Star className="h-3 w-3" style={{ fill: WARNING, color: WARNING }} />
                  <span className="font-bold text-[var(--color-text-primary)]">{p.rating}</span>
                </div>
              </div>
              <p className="mb-2 text-sm font-bold text-[var(--color-text-primary)]">{p.name}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-black text-[var(--color-text-primary)]">{p.price}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{p.sales} sales</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   COMMUNITY SECTION
   ═══════════════════════════════════════════════ */
const COMMUNITY_POSTS = [
  { author: "Sarah K.", avatar: "S", title: "How I earned $5K in my first month with affiliate marketing", replies: 42, likes: 234, tag: "Success Story" },
  { author: "Marcus D.", avatar: "M", title: "UGC campaign tips: What brands actually look for in content", replies: 28, likes: 189, tag: "Tips" },
  { author: "Aisha R.", avatar: "A", title: "From zero to $2K/month selling Notion templates — my journey", replies: 67, likes: 412, tag: "Guide" },
];

function CommunitySection() {
  return (
    <Section className="bg-[var(--color-bg)] py-24 lg:py-32">
      <Container>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mb-16 text-center">
          <motion.div variants={fadeUp} className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(240,180,41,0.2)] bg-[rgba(240,180,41,0.06)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[WARNING]">
              <Users className="h-3 w-3" /> Community
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="mb-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            Learn from <span style={{ color: WARNING }}>top earners</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto max-w-2xl text-base text-[var(--color-text-muted)]">
            Not a social network — a community focused on earning. Get tips, mentorship, and support from people making real money.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="space-y-3">
          {COMMUNITY_POSTS.map((p, i) => (
            <motion.div key={p.title} variants={fadeUp} whileHover={{ x: 4 }}
              className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[rgba(240,180,41,0.3)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: `hsl(${i * 80}, 50%, 45%)` }}>{p.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: `rgba(240,180,41,0.1)`, color: "WARNING" }}>{p.tag}</span>
                </div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{p.title}</p>
                <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                  <span>{p.author}</span>·<span className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.likes}</span>·<span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{p.replies}</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   WHY JIMVIO
   ═══════════════════════════════════════════════ */
const WHY_ITEMS = [
  { icon: CircleDollarSign, title: "Multiple Income Streams", desc: "Affiliate, UGC, marketplace, and community — all earning from one dashboard." },
  { icon: Wallet, title: "One Dashboard", desc: "Track all earnings, campaigns, and sales in a single beautiful dashboard." },
  { icon: Shield, title: "Secure Payments", desc: "Multi-gateway payments with bank-level encryption. Get paid on time, every time." },
  { icon: Users, title: "Real Community", desc: "Learn from people actually earning. No vanity metrics — just real results." },
  { icon: GraduationCap, title: "Learning Resources", desc: "Courses, tutorials, and mentorship to help you earn more, faster." },
  { icon: Globe, title: "Global Opportunities", desc: "Earn from 50+ countries. Work from anywhere, get paid anywhere." },
  { icon: Rocket, title: "Easy Onboarding", desc: "Start earning in minutes. No complex setup, no approval process." },
  { icon: BarChart3, title: "Transparent Analytics", desc: "See exactly where your money comes from. Real-time tracking, no hidden fees." },
];

function WhyJimvio() {
  return (
    <Section className="bg-[var(--color-surface)] py-24 lg:py-32">
      <Container>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mb-16 text-center">
          <motion.div variants={fadeUp} className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
              <Target className="h-3 w-3" /> Why Jimvio
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="mb-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            Built for earners, by earners
          </motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_ITEMS.map((item) => (
            <motion.div key={item.title} variants={fadeUp} whileHover={{ y: -3 }}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 transition-all hover:border-[rgba(253,80,0,0.2)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `rgba(${ACCENT_RGB},0.08)` }}>
                <item.icon className="h-5 w-5" style={{ color: ACCENT }} />
              </div>
              <h3 className="mb-1 text-sm font-bold text-[var(--color-text-primary)]">{item.title}</h3>
              <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   SUCCESS STORIES
   ═══════════════════════════════════════════════ */
const STORIES = [
  { name: "Sarah Kim", country: "United States", earned: "$12,400", period: "6 months", role: "Affiliate Marketer", quote: "I started with zero experience. Now affiliate marketing is my primary income source.", avatar: "S", growth: "+340%" },
  { name: "Marcus Chen", country: "Nigeria", earned: "$8,200", period: "4 months", role: "UGC Creator", quote: "I create short videos for brands and get paid per view. No followers needed.", avatar: "M", growth: "+520%" },
  { name: "Aisha Rahman", country: "Kenya", earned: "$15,600", period: "8 months", role: "Digital Seller", quote: "I sell Notion templates and courses. Jimvio handles payments worldwide.", avatar: "A", growth: "+280%" },
];

function SuccessStories() {
  return (
    <Section className="bg-[var(--color-bg)] py-24 lg:py-32">
      <Container>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mb-16 text-center">
          <motion.div variants={fadeUp} className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.06)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#16a34a]">
              <Trophy className="h-3 w-3" /> Success Stories
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="mb-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            Real people, real <span style={{ color: GREEN }}>earnings</span>
          </motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid gap-4 md:grid-cols-3">
          {STORIES.map((s, i) => (
            <motion.div key={s.name} variants={fadeUp} whileHover={{ y: -4 }}
              className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all hover:border-[rgba(22,163,74,0.3)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: `hsl(${i * 100}, 50%, 45%)` }}>{s.avatar}</div>
                <div>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">{s.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{s.country} · {s.role}</p>
                </div>
              </div>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">&ldquo;{s.quote}&rdquo;</p>
              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">Total earned in {s.period}</p>
                  <p className="text-lg font-black" style={{ color: GREEN }}>{s.earned}</p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: `rgba(${GREEN_RGB},0.1)`, color: GREEN }}>
                  {s.growth}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   EARNINGS CHART SECTION
   ═══════════════════════════════════════════════ */
function EarningsSection() {
  const totalEarned = useCountUp(2847593, 2500);
  const totalEarners = useCountUp(12847, 2000);
  const totalPayouts = useCountUp(89420, 2200);

  const chartData = [12, 19, 14, 26, 22, 35, 30, 42, 38, 52, 48, 65];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const maxVal = Math.max(...chartData);

  return (
    <Section className="bg-[var(--color-surface)] py-24 lg:py-32">
      <Container>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mb-16 text-center">
          <motion.div variants={fadeUp} className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(253,80,0,0.2)] bg-[rgba(253,80,0,0.06)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
              <TrendingUp className="h-3 w-3" /> Platform Earnings
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="mb-4 text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            The numbers speak for <span style={{ color: ACCENT }}>themselves</span>
          </motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid gap-4 md:grid-cols-3 mb-12">
          {[
            { label: "Total Paid Out", value: `$${totalEarned.count.toLocaleString()}`, ref: totalEarned.ref, icon: Banknote, color: GREEN },
            { label: "Active Earners", value: totalEarners.count.toLocaleString(), ref: totalEarners.ref, icon: Users, color: "ACCENT" },
            { label: "Payouts Processed", value: totalPayouts.count.toLocaleString(), ref: totalPayouts.ref, icon: CreditCard, color: "ACCENT" },
          ].map((s) => (
            <motion.div key={s.label} variants={fadeUp} ref={s.ref}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${s.color}12` }}>
                <s.icon className="h-6 w-6" style={{ color: s.color }} />
              </div>
              <p className="text-3xl font-black text-[var(--color-text-primary)]">{s.value}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Chart */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-[var(--color-text-primary)]">Platform Growth</p>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: `rgba(${GREEN_RGB},0.1)`, color: GREEN }}>+42% YoY</span>
          </div>
          <div className="flex items-end gap-2" style={{ height: 180 }}>
            {chartData.map((val, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <motion.div initial={{ height: 0 }} whileInView={{ height: `${(val / maxVal) * 100}%` }}
                  viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full rounded-t-md" style={{ background: i === chartData.length - 1 ? ACCENT : `rgba(${ACCENT_RGB},0.2)` }} />
                <span className="text-[9px] text-[var(--color-text-muted)]">{months[i]}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   TRUST SECTION
   ═══════════════════════════════════════════════ */
function TrustSection() {
  return (
    <Section className="bg-[var(--color-bg)] py-20">
      <Container>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: "Verified Creators", desc: "Every creator is verified for authenticity", color: GREEN },
            { icon: Lock, title: "Secure Payments", desc: "Bank-level encryption on every transaction", color: "ACCENT" },
            { icon: Eye, title: "Transparent Analytics", desc: "See exactly where every dollar comes from", color: "ACCENT" },
            { icon: Award, title: "Community Achievements", desc: "Recognized milestones and earning goals", color: "WARNING" },
          ].map((t) => (
            <motion.div key={t.title} variants={fadeUp} className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${t.color}12` }}>
                <t.icon className="h-5 w-5" style={{ color: t.color }} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">{t.title}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{t.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════ */
const FAQ_ITEMS = [
  { q: "How do I start earning on Jimvio?", a: "Sign up for free, choose your path — affiliate, UGC campaigns, selling products, or joining communities — and start immediately. No approval process needed." },
  { q: "What are the fees?", a: "Starter is free with minimal transaction fees. Pro plan removes platform fees entirely. No hidden charges, no surprise deductions." },
  { q: "How do payouts work?", a: "We support bank transfers, mobile money, and crypto wallets. Processing takes 1-2 business days for most methods. Minimum payout is just $10." },
  { q: "Do I need followers for UGC?", a: "No! UGC campaigns are open to everyone. Brands care about content quality, not follower count. Many of our top UGC earners started with zero followers." },
  { q: "How much can I earn with affiliate marketing?", a: "Commissions range from 5-30% per sale depending on the product. Our top affiliates earn $5,000+/month. It depends on your promotion strategy and audience." },
  { q: "Is my earnings data private?", a: "Yes. Your earnings, analytics, and personal data are completely private. We never share your financial information with anyone." },
];

function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <Section id="faq" className="bg-[var(--color-surface)] py-24 lg:py-32">
      <Container className="max-w-3xl">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="mb-16 text-center">
          <motion.div variants={fadeUp} className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
              <MessageCircle className="h-3 w-3" /> FAQ
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            Frequently asked questions
          </motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <motion.div key={i} variants={fadeUp} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
              <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="flex w-full items-center justify-between p-5 text-left">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{item.q}</span>
                <motion.div animate={{ rotate: openIdx === i ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 ml-4">
                  <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIdx === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--color-text-muted)]">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════ */
function FinalCTA() {
  return (
    <Section className="bg-[var(--color-bg)] py-24 lg:py-32">
      <Container>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger}
          className="relative overflow-hidden rounded-3xl p-8 sm:p-12 lg:p-16"
          style={{ background: "linear-gradient(135deg, #0d0600 0%, #1a0800 50%, #0d0600 100%)" }}>
          <GlowOrb className="top-0 right-0" size={400} />
          <GlowOrb className="bottom-0 left-0" size={300} color="ACCENT" />
          <GridBg opacity={0.04} />

          <div className="relative z-10 text-center">
            <motion.div variants={fadeUp}>
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(253,80,0,0.3)] bg-[rgba(253,80,0,0.1)] px-4 py-1.5 text-xs font-bold" style={{ color: ACCENT }}>
                Start Earning Today
              </span>
            </motion.div>

            <motion.h2 variants={fadeUp} className="mb-6 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl" style={{ letterSpacing: "-0.03em" }}>
              Your income starts here.
            </motion.h2>

            <motion.p variants={fadeUp} className="mx-auto mb-10 max-w-lg text-base text-white/60">
              Join 12,000+ people already earning through affiliate marketing, UGC, marketplace sales, and community. Free to start, no credit card required.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/register" className="inline-flex items-center gap-2.5 rounded-xl px-8 py-4 text-base font-bold text-white shadow-xl transition-all active:scale-[0.97]"
                style={{ background: ACCENT, boxShadow: `0 10px 32px rgba(${ACCENT_RGB},0.3)` }}>
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-8 py-4 text-base font-semibold text-white/70 transition-all hover:border-white/30 hover:text-white">
                Browse Marketplace
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-white/40">
              {["Free forever", "No credit card", "Cancel anytime", "Instant access"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> {t}</span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}

/* ═══════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════ */
const FOOTER_LINKS = {
  Product: [
    { label: "Affiliate Program", href: "/affiliate" },
    { label: "UGC Campaigns", href: "/ugc" },
    { label: "Marketplace", href: "/marketplace" },
    { label: "Communities", href: "/communities" },
    { label: "Pricing", href: "#pricing" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Tutorials", href: "#" },
    { label: "Creator Guide", href: "#" },
    { label: "API", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <Container className="py-12 lg:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT }}>
                <span className="text-sm font-black text-white">J</span>
              </div>
              <span className="text-lg font-black tracking-tight text-[var(--color-text-primary)]">Jimvio</span>
            </Link>
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">The all-in-one earning platform. Affiliate, UGC, Marketplace, and Community.</p>
            <div className="flex gap-3">
              {["X", "GH", "YT", "IG"].map((s) => (
                <a key={s} href="#" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">{s}</a>
              ))}
            </div>
          </div>
          {Object.entries(FOOTER_LINKS).map(([cat, links]) => (
            <div key={cat}>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{cat}</h4>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l.label}><Link href={l.href} className="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--color-border)] pt-8 sm:flex-row">
          <p className="text-xs text-[var(--color-text-muted)]">&copy; 2026 Jimvio. All rights reserved.</p>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="h-2 w-2 rounded-full bg-[#16a34a]" /> All systems operational
          </div>
        </div>
      </Container>
    </footer>
  );
}

/* ═══════════════════════════════════════════════
   ROOT EXPORT
   ═══════════════════════════════════════════════ */
export function LandingPagePremium() {
  const { data } = useLandingData();

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <main>
        <Hero stats={data?.stats} />
        <TrustedBy />
        <CorePillars />
        <AffiliateSection />
        <UGCSection campaigns={data?.campaigns} />
        <MarketplaceSection products={data?.products} />
        <CommunitySection posts={data?.posts} />
        <WhyJimvio />
        <SuccessStories testimonials={data?.testimonials} />
        <EarningsSection stats={data?.stats} />
        <TrustSection />
        <FAQ />
        <FinalCTA />
      </main>
    </div>
  );
}
