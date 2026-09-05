"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";
import {
  getCampaignBanner,
  getCampaignRewardLine,
} from "./ugc-campaign-utils";
import { getCampaignLifecycleStatus } from "@/lib/ugc/campaign-schedule";
import { UGCVerifiedBadge } from "./UGCVerifiedBadge";
import { campaignFallbackStyle } from "./UGCPlatformMarks";

function campaignTypeLabel(type: UGCCampaign["campaign_type"]): string {
  if (type === "clipping" || type === "music_clipping") return "Clipping";
  if (type === "ugc") return "UGC";
  if (type === "promotion") return "Promotion";
  return "Product";
}

export function UGCPremiumFeaturedHero({ campaigns }: { campaigns: UGCCampaign[] }) {
  const { formatMoney } = useCurrency();
  const { t } = useLocale();
  const [index, setIndex] = useState(0);
  const count = campaigns.length;
  const multi = count > 1;

  useEffect(() => {
    setIndex(0);
  }, [campaigns]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!multi) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count, multi],
  );

  useEffect(() => {
    if (!multi) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, multi]);

  if (!count) return null;

  const c = campaigns[Math.min(index, count - 1)]!;
  const banner = getCampaignBanner(c);
  const reward = getCampaignRewardLine(c, formatMoney);
  const brand = c.vendor?.business_name ?? "Brand";
  const isVerified = c.vendor?.verification_status === "verified";
  const lifecycle = getCampaignLifecycleStatus(c);
  const canJoin = c.status === "active" && lifecycle !== "ended";
  const description = c.description?.replace(/\s+/g, " ").trim() || null;
  const budget =
    Number(c.total_budget ?? 0) > 0 ? formatMoney(c.total_budget, "USD") : null;
  const metaParts = [campaignTypeLabel(c.campaign_type), reward, budget].filter(Boolean);

  return (
    <section aria-label="Featured campaign" className="mb-4 sm:mb-5">
      <div
        className={cn(
          "relative overflow-hidden rounded-[14px] sm:rounded-[16px]",
          "aspect-[5/3] sm:aspect-[16/7] lg:aspect-[16/5]",
          "bg-[#0B0F14] shadow-[0_8px_28px_rgba(17,24,39,0.12)]",
        )}
      >
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={c.id}
            src={banner}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={campaignFallbackStyle(brand + c.id)}
          />
        )}

        <div
          className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25 sm:via-black/45 sm:to-transparent"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 sm:hidden"
          aria-hidden
        />

        <div className="relative flex h-full flex-col justify-end p-4 sm:justify-center sm:p-6 md:p-8 lg:max-w-[58%] lg:p-10">
          <div className="flex items-center gap-2">
            {c.vendor?.business_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.vendor.business_logo}
                alt=""
                className="h-7 w-7 rounded-full border border-white/25 object-cover sm:h-8 sm:w-8"
              />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-[11px] font-bold text-white sm:h-8 sm:w-8">
                {brand[0] ?? "B"}
              </span>
            )}
            <span className="truncate text-[13px] font-medium text-white/90 sm:text-[14px]">
              {brand}
            </span>
            {isVerified ? <UGCVerifiedBadge className="h-3.5 w-3.5" /> : null}
          </div>

          <h2 className="mt-2 line-clamp-2 text-[22px] font-bold leading-[1.15] tracking-[-0.03em] text-white sm:mt-3 sm:text-[28px] md:text-[34px] lg:text-[40px]">
            {c.title}
          </h2>

          <p className="mt-1.5 text-[12px] font-medium text-white/70 sm:mt-2 sm:text-[13px] md:text-[14px]">
            {metaParts.join(" · ")}
          </p>

          {description ? (
            <p className="mt-2 line-clamp-2 max-w-xl text-[12px] leading-relaxed text-white/75 sm:mt-2.5 sm:text-[13px] md:text-[14px]">
              {description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4 sm:gap-2.5">
            {canJoin ? (
              <Link
                href={`/ugc/${c.id}/join`}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white hover:bg-[#E54E18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-10 sm:px-5"
              >
                {t("joinCampaign")}
              </Link>
            ) : null}
            <Link
              href={`/ugc/${c.id}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/35 bg-white/10 px-4 text-[13px] font-semibold text-white backdrop-blur-sm hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-10 sm:px-5"
            >
              {t("viewBrief")}
            </Link>
          </div>
        </div>

        {multi ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous featured campaign"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#111827] shadow-md hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] sm:left-3 sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next featured campaign"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#111827] shadow-md hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] sm:right-3 sm:h-10 sm:w-10"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <div
              className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5"
              role="tablist"
              aria-label="Featured campaign slides"
            >
              {campaigns.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show featured campaign ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                    i === index ? "w-5 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
