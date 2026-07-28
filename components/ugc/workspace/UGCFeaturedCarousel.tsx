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
        d="M4.7 8.2l2.1 2.1 4.5-4.5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
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
    <section aria-label="Featured campaign" className="relative mb-5">
      <AnimatePresence mode="wait">
        <motion.div
          key={c.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-[216px] overflow-hidden rounded-[16px] bg-[#111827] shadow-[0_10px_32px_rgba(17,24,39,0.18)] sm:h-[236px] lg:h-[260px]"
        >
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic campaign CDN URLs
            <img
              src={banner}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #111827 0%, #374151 50%, #FF5A1F 140%)",
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/97 via-[#0B1220]/80 to-[#0B1220]/25" />

          {clipBadge ? (
            <div className="absolute right-4 top-4 z-[2] hidden rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-md sm:block">
              {clipBadge} Views
            </div>
          ) : null}

          <div className="relative flex h-full flex-col justify-center px-5 py-5 sm:px-8 lg:px-10">
            <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
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

            <h2 className="max-w-xl line-clamp-1 text-[20px] font-bold leading-[1.15] tracking-[-0.03em] text-white sm:text-[24px] lg:text-[28px]">
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

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                href={`/ugc/${c.id}/join`}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#FF5A1F] px-6 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(255,90,31,0.38)] transition-all hover:bg-[#E54E18] hover:shadow-[0_6px_20px_rgba(255,90,31,0.45)]"
              >
                Join Campaign
              </Link>
              <Link
                href={`/ugc/${c.id}`}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-5 text-[13px] font-semibold text-white backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/15"
              >
                <Play className="h-3 w-3 fill-current" />
                View Brief
              </Link>
            </div>
          </div>

          {campaigns.length > 1 && (
            <div className="absolute bottom-3.5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
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
            className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition-all hover:bg-black/55"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next featured campaign"
            className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition-all hover:bg-black/55"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </section>
  );
}
