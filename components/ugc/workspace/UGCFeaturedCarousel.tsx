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
import { getCampaignLifecycleStatus, lifecycleLabel } from "@/lib/ugc/campaign-schedule";
import { UGCVerifiedBadge } from "./UGCVerifiedBadge";
import { UGCPlatformMarks, campaignFallbackStyle } from "./UGCPlatformMarks";

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
  const days = getDaysRemaining(c.submission_deadline ?? c.ends_at);
  const lifecycle = getCampaignLifecycleStatus(c);
  const isVerified = c.vendor?.verification_status === "verified";
  const brand = c.vendor?.business_name ?? "Brand";
  const joinHref = `/ugc/${c.id}/join`;

  return (
    <section aria-label="Featured campaign" className="relative mb-8">
      <p className="mb-2 text-[13px] font-semibold text-[#111827]">Featured campaign</p>
      <div className="overflow-hidden rounded-[16px] border border-[#E8EAED] bg-white shadow-[0_8px_24px_rgba(17,24,39,0.06)]">
        <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="relative aspect-[16/10] min-h-[180px] bg-[#F3F4F6] lg:aspect-auto lg:min-h-[240px]">
            {banner ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
            ) : (
              <div className="absolute inset-0 grid place-items-center" style={campaignFallbackStyle(brand + c.id)}>
                <span className="text-[40px] font-semibold text-[#111827]/20">{brand.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
            <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              {lifecycleLabel(lifecycle)}
            </span>
          </div>

          <div className="flex flex-col justify-center p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-2">
              {c.vendor?.business_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.vendor.business_logo} alt="" className="h-6 w-6 rounded-full border border-[#E5E7EB] object-cover" />
              ) : (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#111827] text-[10px] font-bold text-white">
                  {brand[0] ?? "B"}
                </span>
              )}
              <span className="truncate text-[13px] font-medium text-[#4B5563]">{brand}</span>
              {isVerified ? <UGCVerifiedBadge className="h-3.5 w-3.5" /> : null}
            </div>

            <h2 className="mt-2 text-[20px] font-semibold leading-snug tracking-[-0.02em] text-[#111827] sm:text-[22px]">
              <span className="line-clamp-2">{c.title}</span>
            </h2>
            {c.description ? (
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[#6B7280]">{c.description}</p>
            ) : null}

            <p className="mt-3 text-[18px] font-semibold tabular-nums text-[#111827]">{rewardLine}</p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <UGCPlatformMarks platforms={c.allowed_platforms ?? []} />
              <span className="text-[12px] text-[#6B7280]">
                {days === null ? "Open" : days === 0 ? "Ends today" : `${days}d left`}
              </span>
              <span className="text-[12px] text-[#6B7280]">
                {t("creatorsJoined", { count: formatCreatorCount(creators) })}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={joinHref}
                aria-label={`Join campaign ${c.title}`}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white hover:bg-[#E54E18]"
              >
                {t("joinCampaign")}
              </Link>
              <Link
                href={`/ugc/${c.id}`}
                aria-label={`View campaign brief: ${c.title}`}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#E5E7EB] px-4 text-[13px] font-semibold text-[#111827] hover:bg-[#F8FAFC]"
              >
                {t("viewBrief")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {campaigns.length > 1 ? (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1.5">
            {campaigns.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Go to featured campaign ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-[#FF5A1F]" : "w-1.5 bg-[#D1D5DB] hover:bg-[#9CA3AF]",
                )}
              />
            ))}
          </div>
          <div className="hidden gap-1 sm:flex">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous featured campaign"
              className="grid h-8 w-8 place-items-center rounded-full border border-[#E5E7EB] text-[#4B5563] hover:bg-white"
            >
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next featured campaign"
              className="grid h-8 w-8 place-items-center rounded-full border border-[#E5E7EB] text-[#4B5563] hover:bg-white"
            >
              <ChevronRight className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
