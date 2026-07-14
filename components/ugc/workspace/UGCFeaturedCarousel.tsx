"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, ShieldCheck } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  formatCreatorCount,
  getCampaignBanner,
  getCampaignRewardLine,
} from "./ugc-campaign-utils";

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
  const creators = c.submission_count ?? 0;

  return (
    <section aria-label="Featured campaign" className="relative mb-2.5">
      <AnimatePresence mode="wait">
        <motion.div
          key={c.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-[168px] overflow-hidden rounded-[16px] bg-[#111827] shadow-[0_4px_16px_rgba(17,24,39,0.12)] sm:h-[188px] lg:h-[200px]"
        >
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic campaign CDN URLs
            <img
              src={banner}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #111827 0%, #374151 50%, var(--color-accent) 140%)",
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#111827]/95 via-[#111827]/78 to-[#111827]/35" />

          <div className="relative flex h-full flex-col justify-center px-4 py-3 sm:px-5 lg:px-6">
            <div className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
              <span aria-hidden>🔥</span>
              Featured Campaign
            </div>

            <div className="mb-0.5 flex items-center gap-1.5 text-white/90">
              {c.vendor?.business_logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic vendor logos
                <img
                  src={c.vendor.business_logo}
                  alt=""
                  className="h-4 w-4 rounded-full border border-white/20 object-cover"
                />
              ) : (
                <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--color-accent)] text-[7px] font-bold text-white">
                  {c.vendor?.business_name?.[0] ?? "B"}
                </span>
              )}
              <span className="truncate text-[10px] font-medium">{c.vendor?.business_name ?? "Brand"}</span>
              <ShieldCheck className="h-3 w-3 shrink-0 text-[#60A5FA]" aria-label="Verified" />
            </div>

            <h2 className="line-clamp-1 text-[13px] font-bold leading-snug text-white sm:text-sm lg:text-[15px]">
              {c.title}
            </h2>

            {c.description && (
              <p className="mt-0.5 line-clamp-1 max-w-lg text-[10px] leading-snug text-white/65">
                {c.description}
              </p>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[10px]">
              <span className="font-semibold text-[var(--color-accent)]">{rewardLine}</span>
              <span className="text-white/55">{formatCreatorCount(creators)} creators joined</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <Link
                href={`/ugc/${c.id}/join`}
                className="inline-flex h-7 items-center justify-center rounded-full bg-[var(--color-accent)] px-3.5 text-[10px] font-bold text-white transition-colors hover:bg-[#E54E18]"
              >
                Join Campaign
              </Link>
              <Link
                href={`/ugc/${c.id}`}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 text-[10px] font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/15"
              >
                <Play className="h-2.5 w-2.5" />
                View Brief
              </Link>
            </div>
          </div>

          {campaigns.length > 1 && (
            <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
              {campaigns.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-0.5 rounded-full transition-all",
                    i === index ? "w-4 bg-[var(--color-accent)]" : "w-1 bg-white/35"
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
            className="absolute left-1.5 top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next featured campaign"
            className="absolute right-1.5 top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </section>
  );
}
