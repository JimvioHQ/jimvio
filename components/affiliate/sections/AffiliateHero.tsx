"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AFFILIATE_BTN_PRIMARY,
  AFFILIATE_BTN_SECONDARY,
  AFFILIATE_SHELL,
  fadeUp,
  staggerContainer,
} from "./shared";
import { formatAffiliateRate } from "@/lib/affiliate/commission-tiers";
import { cn } from "@/lib/utils";
import "../affiliate-polish.css";

const CHECKLIST = [
  "High commission rates",
  "Real-time tracking",
  "Timely payouts",
  "Marketing tools & creatives",
];

const SOCIAL_AVATARS = [
  { bg: "from-[#FD7E14] to-[#FF5A1F]", initials: "AM" },
  { bg: "from-[#6366F1] to-[#4F46E5]", initials: "JK" },
  { bg: "from-[#10B981] to-[#059669]", initials: "SL" },
  { bg: "from-[#F59E0B] to-[#D97706]", initials: "NR" },
];

type AffiliateHeroProps = {
  heroRate: number;
  primaryCtaHref: string;
};

function AnimatedChart({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <svg
      viewBox="0 0 120 48"
      className="h-10 w-[120px] overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id="affChartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FF5A1F" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 36 C18 34 22 20 38 22 C54 24 58 10 74 12 C90 14 96 6 120 4 L120 48 L0 48 Z"
        fill="url(#affChartFill)"
        className={cn(!reduceMotion && "aff-chart-fill")}
      />
      <path
        d="M0 36 C18 34 22 20 38 22 C54 24 58 10 74 12 C90 14 96 6 120 4"
        fill="none"
        stroke="#FF5A1F"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={cn(!reduceMotion && "aff-chart-draw")}
      />
      <circle
        cx="120"
        cy="4"
        r="3.5"
        fill="#FF5A1F"
        className="motion-safe:animate-pulse"
      />
    </svg>
  );
}

export function AffiliateHero({ heroRate, primaryCtaHref }: AffiliateHeroProps) {
  const rateLabel = formatAffiliateRate(heroRate);
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section className={`${AFFILIATE_SHELL} pt-5 sm:pt-6 lg:pt-7`}>
      <motion.div
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        variants={staggerContainer}
        className="relative overflow-hidden rounded-[22px] border border-[#FFE4D6]/90 px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12"
        style={{
          background:
            "radial-gradient(90% 70% at 88% 12%, rgba(255,138,85,0.32) 0%, transparent 55%), radial-gradient(70% 55% at 8% 90%, rgba(255,176,136,0.28) 0%, transparent 50%), linear-gradient(145deg, #FFF4EE 0%, #FFE8DE 28%, #FFF9F6 58%, #FFFFFF 100%)",
          boxShadow:
            "0 1px 2px rgba(17,24,39,0.04), 0 16px 48px rgba(255,90,31,0.1), inset 0 1px 0 rgba(255,255,255,0.75)",
        }}
      >
        {/* Soft mesh + glass depth — keep phone illustration unchanged */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7) 0%, transparent 40%), radial-gradient(circle at 80% 30%, rgba(255,90,31,0.08) 0%, transparent 35%), linear-gradient(125deg, rgba(255,255,255,0.35) 0%, transparent 45%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.5)_0%,transparent_42%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full bg-[#FF5A1F]/18 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[18%] top-[36%] h-40 w-40 rounded-full bg-[#FFB088]/35 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-[#FFC9A8]/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-[42%] top-[8%] h-24 w-24 rounded-full bg-white/50 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[1px] rounded-[21px] border border-white/50"
        />

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 xl:gap-10">
          <motion.div variants={fadeUp} className="max-w-xl">
            <h1 className="text-[clamp(1.85rem,4vw,2.65rem)] font-bold leading-[1.12] tracking-tight text-[#111827]">
              Jimvio{" "}
              <span className="text-[#FF5A1F]">Affiliate Program</span>
            </h1>
            <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-[#6B7280]">
              Earn up to {rateLabel}% commission by promoting products you love
              and trust.
            </p>

            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {CHECKLIST.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-[13.5px] font-medium text-[#374151]"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#FF5A1F] shadow-[0_2px_8px_rgba(255,90,31,0.35)]">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={primaryCtaHref}
                className={cn(AFFILIATE_BTN_PRIMARY, "h-11 px-6 text-[14px]")}
              >
                Start Promoting Now
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <Link
                href="#campaigns"
                className={cn(AFFILIATE_BTN_SECONDARY, "h-11 px-6 text-[14px]")}
              >
                View Top Campaigns
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2.5" aria-hidden>
                {SOCIAL_AVATARS.map((avatar) => (
                  <span
                    key={avatar.initials}
                    className={`relative grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${avatar.bg} text-[10px] font-bold text-white ring-2 ring-white`}
                  >
                    {avatar.initials}
                  </span>
                ))}
              </div>
              <p className="text-[12.5px] font-medium text-[#6B7280]">
                Join{" "}
                <span className="font-semibold text-[#111827]">25,000+</span>{" "}
                affiliates earning with Jimvio
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="relative mx-auto w-full max-w-[460px] lg:mx-0 lg:max-w-none"
          >
            <div
              className={cn(
                "absolute left-2 top-4 z-10 rounded-2xl border border-white/70 bg-white/75 px-3 py-2.5 shadow-[0_8px_24px_rgba(17,24,39,0.1)] backdrop-blur-md sm:left-4 sm:top-6",
                !reduceMotion && "aff-motion-badge"
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Top commission
              </p>
              <p className="mt-0.5 text-[20px] font-bold tabular-nums leading-none text-[#FF5A1F]">
                {rateLabel}%
              </p>
              <div className="mt-2">
                <AnimatedChart reduceMotion={reduceMotion} />
              </div>
            </div>

            <span
              aria-hidden
              className={cn(
                "absolute right-6 top-10 z-[2] h-7 w-7 rounded-full bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] shadow-[0_4px_12px_rgba(245,158,11,0.45)] ring-2 ring-white/80 sm:right-10",
                !reduceMotion && "aff-motion-float"
              )}
            />
            <span
              aria-hidden
              className={cn(
                "absolute bottom-14 right-4 z-[2] h-5 w-5 rounded-full bg-gradient-to-br from-[#FCD34D] to-[#F59E0B] shadow-[0_4px_10px_rgba(245,158,11,0.4)] ring-2 ring-white/70 sm:bottom-16 sm:right-8",
                !reduceMotion && "aff-motion-float-slow"
              )}
            />

            <div
              className={cn(
                "relative aspect-[5/4] w-full sm:aspect-[6/5]",
                !reduceMotion && "aff-motion-float"
              )}
            >
              <Image
                src="/images/affiliate/hero-phone.png"
                alt="Affiliate earnings on Jimvio — up to top commission rates"
                fill
                priority
                className="object-contain object-center mix-blend-multiply drop-shadow-[0_24px_48px_rgba(255,90,31,0.16)]"
                sizes="(max-width: 1024px) 90vw, 460px"
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
