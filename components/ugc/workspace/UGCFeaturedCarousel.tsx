"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";
import {
  formatCreatorCount,
  getCampaignBanner,
  getCampaignRewardLine,
  getDaysRemaining,
} from "./ugc-campaign-utils";

function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("shrink-0", className)} aria-label="Verified" role="img">
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

export function UGCFeaturedCarousel({ campaigns }: { campaigns: UGCCampaign[] }) {
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
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [campaigns.length, next]);

  if (!campaigns.length) return null;

  const c = campaigns[index];
  const banner = getCampaignBanner(c);
  const rewardLine = getCampaignRewardLine(c, formatMoney);
  const creators = c.submission_count ?? 0;
  const days = getDaysRemaining(c.ends_at);
  const type = c.campaign_type === "clipping" ? "Clipping" : c.campaign_type === "ugc" ? "UGC" : c.campaign_type.replace("_", " ");

  return (
    <section aria-label="Featured campaign" className="relative mb-6">
      <div className="relative overflow-hidden rounded-[16px] bg-[#0B1220] shadow-[0_10px_28px_rgba(17,24,39,0.16)]">
        <div className="relative min-h-[220px] sm:min-h-[240px] lg:min-h-[260px]">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(135deg, #0B1220 0%, #1F2937 55%, #FF5A1F 160%)" }}
            />
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/50 to-black/20" />

          <div className="relative z-[2] flex min-h-[220px] max-w-2xl flex-col justify-end p-5 sm:min-h-[240px] sm:p-6 lg:min-h-[260px] lg:p-7">
            <div className="mb-2 flex items-center gap-2 text-white/90">
              {c.vendor?.business_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.vendor.business_logo} alt="" className="h-6 w-6 rounded-full border border-white/25 object-cover" />
              ) : (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FF5A1F] text-[9px] font-bold text-white">
                  {c.vendor?.business_name?.[0] ?? "B"}
                </span>
              )}
              <span className="truncate text-[13px] font-semibold">{c.vendor?.business_name ?? "Brand"}</span>
              <VerifiedBadge className="h-3.5 w-3.5" />
            </div>

            <h2 className="text-[22px] font-bold leading-[1.15] tracking-[-0.03em] text-white sm:text-[26px]">
              <span className="line-clamp-2">{c.title}</span>
            </h2>
            {c.description ? (
              <p className="mt-2 line-clamp-2 max-w-xl text-[13px] leading-relaxed text-white/75">
                {c.description}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/80">
              <span className="font-bold text-[#FF8A55]">{rewardLine}</span>
              <span>{type}</span>
              {days !== null ? <span>{days === 0 ? "Ends today" : `${days}d left`}</span> : null}
              <span>{t("creatorsJoined", { count: formatCreatorCount(creators) })}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                href={`/ugc/${c.id}/join`}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#FF5A1F] px-5 text-[13px] font-bold text-white hover:bg-[#E54E18]"
              >
                {t("joinCampaign")}
              </Link>
              <Link
                href={`/ugc/${c.id}`}
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/25 bg-white/10 px-4 text-[13px] font-semibold text-white hover:bg-white/15"
              >
                {t("viewBrief")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {campaigns.length > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous featured campaign"
            className="absolute left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 text-white sm:grid"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next featured campaign"
            className="absolute right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 text-white sm:grid"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="mt-2 flex justify-center gap-1.5">
            {campaigns.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-[#FF5A1F]" : "w-1.5 bg-[#D1D5DB] hover:bg-[#9CA3AF]",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
