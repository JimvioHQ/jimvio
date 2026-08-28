"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";
import {
  formatCreatorCount,
  getCampaignBanner,
  getCampaignRewardLine,
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
  const { t } = useLocale();
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
          className="relative h-[240px] overflow-hidden rounded-[18px] bg-[#0B1220] shadow-[0_14px_40px_rgba(17,24,39,0.22)] sm:h-[268px] lg:h-[300px]"
        >
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic campaign CDN URLs
            <img
              src={banner}
              alt=""
              className="absolute inset-0 h-full w-full scale-[1.02] object-cover object-[center_28%]"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #0B1220 0%, #1F2937 55%, #FF5A1F 160%)",
              }}
            />
          )}

          {/* Netflix / Apple TV style overlays */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent"
          />

          {/* Dedicated content zone — bottom-left, no floating badges */}
          <div className="absolute inset-x-0 bottom-0 z-[2] p-5 sm:p-7 lg:p-8">
            <div className="max-w-xl">
              <div className="mb-2.5 flex items-center gap-2 text-white/90">
                {c.vendor?.business_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic vendor logos
                  <img
                    src={c.vendor.business_logo}
                    alt=""
                    className="h-6 w-6 rounded-full border border-white/25 object-cover"
                  />
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FF5A1F] text-[9px] font-bold text-white">
                    {c.vendor?.business_name?.[0] ?? "B"}
                  </span>
                )}
                <span className="truncate text-[13px] font-semibold tracking-tight">
                  {c.vendor?.business_name ?? "Brand"}
                </span>
                <VerifiedBadge className="h-3.5 w-3.5" />
              </div>

              <h2 className="max-w-lg text-[22px] font-bold leading-[1.12] tracking-[-0.03em] text-white sm:text-[28px] lg:text-[32px]">
                <span className="line-clamp-2">{c.title}</span>
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] sm:text-[13px]">
                <span className="font-bold text-[#FF8A55]">{rewardLine}</span>
                <span className="text-white/40">·</span>
                <span className="text-white/70">
                  {t("creatorsJoined", { count: formatCreatorCount(creators) })}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  href={`/ugc/${c.id}/join`}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#FF5A1F] px-6 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(255,90,31,0.42)] transition-all hover:bg-[#E54E18] hover:shadow-[0_8px_24px_rgba(255,90,31,0.5)]"
                >
                  {t("joinCampaign")}
                </Link>
                <Link
                  href={`/ugc/${c.id}`}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-5 text-[13px] font-semibold text-white backdrop-blur-md transition-all hover:border-white/45 hover:bg-white/15"
                >
                  <Play className="h-3 w-3 fill-current" />
                  {t("viewBrief")}
                </Link>
              </div>
            </div>
          </div>

          {campaigns.length > 1 && (
            <div className="absolute bottom-4 right-5 z-10 hidden gap-1.5 sm:flex">
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
            className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next featured campaign"
            className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </section>
  );
}
