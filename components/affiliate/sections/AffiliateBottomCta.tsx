"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AFFILIATE_BTN_PRIMARY,
  AFFILIATE_SHELL,
  fadeUp,
} from "./shared";
import { cn } from "@/lib/utils";
import "../affiliate-polish.css";

type AffiliateBottomCtaProps = {
  primaryCtaHref: string;
};

export function AffiliateBottomCta({ primaryCtaHref }: AffiliateBottomCtaProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section className={`${AFFILIATE_SHELL} py-12 pb-24 sm:py-14 sm:pb-14`}>
      <motion.div
        initial={reduceMotion ? false : "hidden"}
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        variants={fadeUp}
        className="relative overflow-hidden rounded-[20px] border border-[#FFE4D6] px-5 py-8 sm:px-8 sm:py-9 lg:px-10"
        style={{
          background:
            "linear-gradient(110deg, #FFF5F0 0%, #FFEDE4 42%, #FFF8F5 100%)",
          boxShadow: "0 12px 36px rgba(255,90,31,0.1), 0 2px 8px rgba(17,24,39,0.04)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.55)_0%,transparent_48%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[#FF5A1F]/10 blur-3xl"
        />

        <div className="relative z-[1] flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
          <div
            className={cn(
              "relative h-[140px] w-[160px] shrink-0 sm:h-[168px] sm:w-[200px]",
              !reduceMotion && "aff-motion-mega"
            )}
          >
            <Image
              src="/images/affiliate/hero-phone.png"
              alt="Jimvio Affiliate Program — phone earnings, commission cards, coins and gifts"
              fill
              loading="lazy"
              className="object-contain object-center mix-blend-multiply drop-shadow-[0_12px_24px_rgba(255,90,31,0.22)]"
              sizes="(max-width: 640px) 160px, 200px"
            />
          </div>

          <div className="min-w-0 flex-1 text-center md:text-left">
            <h2 className="text-[22px] font-bold tracking-tight text-[#111827] sm:text-[26px]">
              Ready to start earning?
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">
              Join thousands of Affiliates who are earning daily with Jimvio.
            </p>
          </div>

          <Link
            href={primaryCtaHref}
            className={cn(
              AFFILIATE_BTN_PRIMARY,
              "h-12 shrink-0 px-7 text-[14px] shadow-[0_10px_24px_rgba(255,90,31,0.32)]"
            )}
          >
            Start Promoting Now
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
