"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Globe2,
  Play,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  formatCreatorCount,
  getCampaignBanner,
  getCampaignRewardLine,
  getClipRateBadge,
} from "./ugc-campaign-utils";

function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("shrink-0", className)}
      aria-label="Verified"
      role="img"
    >
      <circle cx="8" cy="8" r="8" fill="#1D9BF0" />
      <path
        d="M4.75 8.15l2.05 2.05 4.45-4.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type UGCFeaturedCarouselProps = {
  campaigns: UGCCampaign[];
};

export function UGCFeaturedCarousel({ campaigns }: UGCFeaturedCarouselProps) {
  const { formatMoney } = useCurrency();
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % campaigns.length);
  }, [campaigns.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + campaigns.length) % campaigns.length);
  }, [campaigns.length]);

  useEffect(() => {
    if (campaigns.length <= 1) return;
    const t = setInterval(next, 7000);
    return () => clearInterval(t);
  }, [campaigns.length, next]);

  if (!campaigns.length) return null;

  const c = campaigns[index];
  const banner = getCampaignBanner(c);
  const rewardLine = getCampaignRewardLine(c, formatMoney);
  const clipBadge = getClipRateBadge(c, formatMoney);
  const creators = c.submission_count ?? 0;

  return (
    <section aria-label="Featured campaign" className="relative mb-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={c.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-[200px] overflow-hidden rounded-[16px] bg-[#111827] shadow-[0_8px_28px_rgba(17,24,39,0.16)] sm:h-[220px] lg:h-[240px]"
        >
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic campaign CDN URLs
            <img
              src={banner}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_32%]"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #111827 0%, #374151 50%, #FF5A1F 140%)",
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/96 via-[#0B1220]/78 to-[#0B1220]/28" />

          <div className="relative flex h-full flex-col justify-center px-5 py-4 sm:px-7 lg:px-9">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                <span aria-hidden>🔥</span>
                Featured Campaign
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[9px] font-medium text-white/85 backdrop-blur-sm">
                <Trophy className="h-2.5 w-2.5 text-[#FBBF24]" />
                Top Brand
              </span>
              <span className="hidden items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[9px] font-medium text-white/85 backdrop-blur-sm sm:inline-flex">
                <Sparkles className="h-2.5 w-2.5 text-[#FF5A1F]" />
                High Rewards
              </span>
              <span className="hidden items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[9px] font-medium text-white/85 backdrop-blur-sm md:inline-flex">
                <Zap className="h-2.5 w-2.5 text-[#34D399]" />
                Instant Payout
              </span>
              <span className="hidden items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[9px] font-medium text-white/85 backdrop-blur-sm lg:inline-flex">
                <Globe2 className="h-2.5 w-2.5 text-[#60A5FA]" />
                Global Audience
              </span>
            </div>

            <div className="mb-1.5 flex items-center gap-2 text-white/90">
              {c.vendor?.business_logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic vendor logos
                <img
                  src={c.vendor.business_logo}
                  alt=""
                  className="h-5 w-5 rounded-full border border-white/25 object-cover"
                />
              ) : (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#FF5A1F] text-[8px] font-bold text-white">
                  {c.vendor?.business_name?.[0] ?? "B"}
                </span>
              )}
              <span className="truncate text-[12px] font-semibold">
                {c.vendor?.business_name ?? "Brand"}
              </span>
              <VerifiedBadge className="h-3.5 w-3.5" />
            </div>

            <h2 className="max-w-xl line-clamp-1 text-[18px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[22px] lg:text-[26px]">
              {c.title}
            </h2>

            {c.description ? (
              <p className="mt-1.5 line-clamp-2 max-w-lg text-[12px] leading-snug text-white/65 sm:text-[13px]">
                {c.description}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
              <span className="font-bold text-[#FF5A1F]">{rewardLine}</span>
              <span className="text-white/55">
                {formatCreatorCount(creators)} creators joined
              </span>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-2">
              <Link
                href={`/ugc/${c.id}/join`}
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#FF5A1F] px-5 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(255,90,31,0.35)] transition-all hover:bg-[#E54E18] hover:shadow-[0_6px_18px_rgba(255,90,31,0.4)]"
              >
                Join Campaign
              </Link>
              <Link
                href={`/ugc/${c.id}`}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 text-[12px] font-semibold text-white backdrop-blur-sm transition-all hover:border-white/45 hover:bg-white/15"
              >
                <Play className="h-3 w-3 fill-current" />
                View Brief
              </Link>
            </div>
          </div>

          {clipBadge ? (
            <div className="absolute bottom-4 right-4 hidden rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-md sm:block">
              {clipBadge} Views
            </div>
          ) : null}

          {campaigns.length > 1 && (
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {campaigns.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i === index ? "w-5 bg-[#FF5A1F]" : "w-1.5 bg-white/35 hover:bg-white/55",
                  )}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {campaigns.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous featured campaign"
            className="absolute left-2.5 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition-all hover:bg-black/55"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next featured campaign"
            className="absolute right-2.5 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition-all hover:bg-black/55"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </section>
  );
}
