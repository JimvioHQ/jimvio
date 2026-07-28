"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  Gift,
  Percent,
  Sparkles,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AFFILIATE_BTN_PRIMARY,
  AFFILIATE_CARD,
  AFFILIATE_SHELL,
  AffiliateSectionHeading,
  fadeUp,
} from "./shared";
import { cn } from "@/lib/utils";
import "../affiliate-polish.css";

const FEATURES = [
  {
    title: "Higher Commission Rates",
    desc: "Earn more on every eligible sale with Pro rates.",
    icon: Percent,
  },
  {
    title: "Exclusive Offers",
    desc: "Access limited campaigns reserved for Pro affiliates.",
    icon: Gift,
  },
  {
    title: "Marketing Tools",
    desc: "Creatives, banners, and link kits ready to share.",
    icon: Sparkles,
  },
  {
    title: "Timely Payouts",
    desc: "Faster withdrawals once you hit the Pro threshold.",
    icon: Clock3,
  },
] as const;

const PRO_BENEFITS = [
  "Up to 25% commission on top campaigns",
  "Priority access to exclusive offers",
  "Advanced analytics dashboard",
  "Dedicated affiliate support",
  "Early access to new products",
];

export function AffiliateBoostEarnings() {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <section className={`${AFFILIATE_SHELL} pt-12 sm:pt-14`} id="campaigns">
      <motion.div
        initial={reduceMotion ? false : "hidden"}
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        variants={fadeUp}
        className={cn(
          AFFILIATE_CARD,
          "overflow-hidden border-[#FFE4D6]/80 shadow-[0_8px_32px_rgba(255,90,31,0.08),0_2px_8px_rgba(17,24,39,0.04)]"
        )}
      >
        <div className="grid lg:grid-cols-[1fr_1.05fr]">
          <div className="border-b border-[#F3F4F6] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:border-[#F3F4F6]">
            <AffiliateSectionHeading
              title="Boost Your Earnings"
              subtitle="Upgrade to Jimvio Pro and unlock higher commissions, exclusive campaigns, and premium tools."
              className="mb-6 sm:mb-7"
            />

            <div className="space-y-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group flex gap-3.5 rounded-xl p-1.5 -mx-1.5 transition-colors duration-200 hover:bg-[#FFF8F5]"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFF0E8] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100">
                      <Icon
                        className="h-[18px] w-[18px] text-[#FF5A1F]"
                        strokeWidth={2.1}
                      />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#111827]">
                        {feature.title}
                      </p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#6B7280]">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              href="/pricing"
              className={cn(
                AFFILIATE_BTN_PRIMARY,
                "mt-8 h-11 px-6 text-[14px]",
                !reduceMotion && "aff-motion-cta"
              )}
            >
              Upgrade to Pro
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>

          <div
            className="relative flex flex-col gap-5 overflow-hidden p-6 sm:p-8 lg:flex-row lg:items-center"
            style={{
              background:
                "linear-gradient(155deg, #FFF3EC 0%, #FFE8DE 45%, #FFF8F5 100%)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.5)_0%,transparent_50%)]"
            />
            <div className="relative z-[1] max-w-[220px] shrink-0 rounded-2xl border border-white/60 bg-white/45 p-4 shadow-[0_8px_24px_rgba(255,90,31,0.08)] backdrop-blur-md">
              <p className="text-[15px] font-bold text-[#111827]">
                <span aria-hidden>👑 </span>Pro Benefits
              </p>
              <ul className="mt-3.5 space-y-2.5">
                {PRO_BENEFITS.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-[12.5px] leading-snug text-[#374151]"
                  >
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#FF5A1F]">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={cn(
                "relative mx-auto h-[220px] w-full max-w-[320px] flex-1 sm:h-[250px]",
                !reduceMotion && "aff-motion-pro"
              )}
            >
              <Image
                src="/images/affiliate/pro-card.png"
                alt="Jimvio Pro benefits illustration"
                fill
                loading="lazy"
                className="object-contain object-center drop-shadow-[0_16px_30px_rgba(255,90,31,0.18)]"
                sizes="(max-width: 1024px) 80vw, 320px"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
