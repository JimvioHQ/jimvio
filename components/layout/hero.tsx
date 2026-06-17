"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle,
  Globe,
  Headphones,
  Lock,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { TICKER_ITEMS } from "@/data/dashboard";

const ORANGE = "#fd5000";

const TRUST_BADGES = [
  { icon: CheckCircle, label: "Verified", tint: "#dcfce7", color: "#16a34a" },
  { icon: Lock, label: "Secure Payments", tint: "#dbeafe", color: "#2563eb" },
  { icon: ShieldCheck, label: "Protected", tint: "#dbeafe", color: "#2563eb" },
  { icon: Zap, label: "Instant Payouts", tint: "#fef9c3", color: "#ca8a04" },
  { icon: Globe, label: "Global", tint: "#f3f4f6", color: "#4b5563" },
  { icon: Headphones, label: "24/7 Support", tint: "#f3f4f6", color: "#4b5563" },
] as const;

const PARTNER_LOGOS = [
  { src: "/logos/paypal.png", alt: "PayPal", h: "h-5" },
  { src: "/logos/Payoneer_Master_Logo_OnWhite_RGB.svg", alt: "Payoneer", h: "h-5" },
  { src: "/logos/binance.png", alt: "Binance", h: "h-5" },
  { src: "/logos/flutterwave.png", alt: "Flutterwave", h: "h-4" },
  { src: "/logos/NOWPayments_idKVr3HnXR_1.svg", alt: "NOWPayments", h: "h-4" },
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
    <div className="border-b border-[#f0f0f0] bg-white py-6">
      <div className="mx-auto max-w-8xl px-4 sm:px-6">
        <p className="mb-4 text-center text-[12px] font-medium text-[#9ca3af]">
          Trusted by 10,000+ creators and businesses worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-70 grayscale">
          {PARTNER_LOGOS.map((logo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={logo.alt} src={logo.src} alt={logo.alt} className={`${logo.h} w-auto object-contain`} />
          ))}
          <span className="text-[13px] font-black tracking-wide text-[#1a1f71]">VISA</span>
          <span className="text-[13px] font-black tracking-wide text-[#eb001b]">Mastercard</span>
          <span className="text-[12px] font-semibold text-[#111]"> Apple Pay</span>
        </div>
      </div>
    </div>
  );
}

function HeroStageBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[58%] max-w-[760px] lg:block"
    >
      {/* Fade into white so copy stays readable on the left */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-white via-white/75 to-transparent" />
      <div className="absolute inset-y-0 right-[-4%] flex items-center justify-end">
        <Image
          src="/hero/jimvio-hero-stage.png"
          alt=""
          width={720}
          height={720}
          priority
          className="h-[min(640px,92%)] w-auto max-w-none object-contain object-right"
          sizes="58vw"
        />
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
    <div className="bg-white">
      <section className="relative overflow-hidden pt-10 pb-8 sm:pt-14 sm:pb-10">
        <HeroStageBackdrop />

        <div className="relative z-10 mx-auto max-w-8xl px-4 sm:px-6">
          <div className="max-w-[640px] text-center lg:max-w-[52%] lg:text-left">
            <div className="mb-6 flex justify-center lg:justify-start">
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-[#374151]"
                  style={{ background: "#f9fafb", border: "1px solid #ececec" }}
                >
                  <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                  {activeCount.toLocaleString()} people active now
                </span>
              </div>

              <h1
                className="font-black leading-[1.06] tracking-tight text-[#111]"
                style={{ fontSize: "clamp(2.25rem, 4.8vw, 3.75rem)", letterSpacing: "-0.03em" }}
              >
                The platform to
                <br />
                <span style={{ color: ORANGE }}>Earn Commissions</span>
                <br />
                Anywhere.
              </h1>

              <p className="mx-auto mt-5 max-w-[520px] text-[15px] leading-relaxed text-[#6b7280] sm:text-base lg:mx-0">
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
                  className="inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-6 text-[14px] font-bold text-[#111] transition-colors hover:bg-[#fafafa] sm:w-auto"
                >
                  Browse Marketplace
                  <ArrowRight className="size-4 opacity-60" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 lg:justify-start">
                {TRUST_BADGES.map(({ icon: Icon, label, tint, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span
                      className="grid size-7 place-items-center rounded-lg"
                      style={{ background: tint, color }}
                    >
                      <Icon className="size-3.5" strokeWidth={2.4} />
                    </span>
                    <span className="text-[12px] font-medium text-[#6b7280]">{label}</span>
                  </div>
                ))}
              </div>
            </div>

          {/* Mobile — stage visual below copy */}
          <div className="relative mx-auto mt-10 max-w-[420px] lg:hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
            <Image
              src="/hero/jimvio-hero-stage.png"
              alt="Jimvio platform"
              width={560}
              height={560}
              priority
              className="h-auto w-full object-contain"
              sizes="90vw"
            />
          </div>
        </div>
      </section>

      <HeroLiveTicker onlineCount={onlineCount} />
      <HeroPartnerStrip />
    </div>
  );
}
