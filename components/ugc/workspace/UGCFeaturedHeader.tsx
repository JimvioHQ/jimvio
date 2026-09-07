"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clapperboard, Eye } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";
import { getCampaignLifecycleStatus } from "@/lib/ugc/campaign-schedule";
import {
  formatUgcFundingUsd,
  getCampaignBanner,
  getClipRateBadge,
} from "./ugc-campaign-utils";
import { UGCVerifiedBadge } from "./UGCVerifiedBadge";
import { campaignFallbackStyle, UGCPlatformMarks } from "./UGCPlatformMarks";

const STAGE_BG = "linear-gradient(135deg, #0d0500 0%, #1e0900 45%, #2d1200 100%)";
const STAGE_GLOW = "radial-gradient(ellipse at 68% 50%, rgba(253,80,0,0.22) 0%, transparent 62%)";
const IMAGE_FADE = "linear-gradient(to right, rgba(13,5,0,0.55) 0%, rgba(13,5,0,0.25) 20%, transparent 45%)";
const MOBILE_TEXT =
  "linear-gradient(to right, rgba(13,5,0,0.94) 0%, rgba(13,5,0,0.82) 42%, rgba(13,5,0,0.35) 58%, transparent 72%)";

function typeLabel(type: UGCCampaign["campaign_type"]): string {
  if (type === "clipping" || type === "music_clipping") return "Clipping";
  if (type === "ugc") return "UGC";
  if (type === "promotion") return "Promotion";
  return "Campaign";
}

function FeaturedStage({
  banner,
  brand,
  campaignId,
  mobile,
}: {
  banner: string | null;
  brand: string;
  campaignId: string;
  mobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative isolate h-full w-full overflow-hidden bg-[#0F172A]",
        mobile ? "rounded-r-2xl" : "rounded-r-3xl",
      )}
      style={{
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -16px 32px rgba(15,23,42,0.4)",
      }}
    >
      {banner ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: "translate3d(0,0,0) scale(1.22)",
              filter: "blur(28px) brightness(0.7) saturate(1.15)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 45%, rgba(59,130,246,0.16) 0%, rgba(37,99,235,0.1) 35%, transparent 70%)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner}
            alt=""
            className="hero-product-float absolute inset-0 z-10 h-full w-full object-cover object-center"
            style={{ filter: "drop-shadow(0 14px 32px rgba(0,0,0,0.42))" }}
          />
        </>
      ) : (
        <div className="absolute inset-0" style={campaignFallbackStyle(brand + campaignId)}>
          <div className="absolute inset-0 bg-[#0d0500]/55" />
          <span className="relative z-10 grid h-full place-items-center text-[42px] font-bold tracking-tight text-white/25">
            {brand.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

function FeaturedCopy({
  campaign,
  variant,
}: {
  campaign: UGCCampaign;
  variant: "mobile" | "desktop";
}) {
  const { t } = useLocale();
  const brand = campaign.vendor?.business_name ?? "Brand";
  const isVerified = campaign.vendor?.verification_status === "verified";
  const lifecycle = getCampaignLifecycleStatus(campaign);
  const canJoin = campaign.status === "active" && lifecycle !== "ended";
  const rate = getClipRateBadge(campaign);
  const totalBudget = Number(campaign.total_budget ?? 0);
  const spentBudget = Number(campaign.spent_budget ?? 0);
  const mobile = variant === "mobile";

  return (
    <div className="flex h-full w-full min-w-0 flex-col justify-center gap-2.5 sm:gap-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="inline-flex h-5 items-center rounded-full px-2.5 text-[9px] font-bold leading-none text-white sm:h-6 sm:px-3 sm:text-[11px]"
          style={{
            background: "linear-gradient(90deg, #FF5A1F 0%, #FF7A1F 50%, #FF8C42 100%)",
            boxShadow: "0 2px 10px rgba(255, 90, 31, 0.28)",
          }}
        >
          {typeLabel(campaign.campaign_type)}
        </span>
        <span className="inline-flex h-5 items-center rounded-full bg-white/10 px-2.5 text-[9px] font-bold leading-none text-white/90 sm:h-6 sm:text-[11px]">
          Featured
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        {campaign.vendor?.business_logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={campaign.vendor.business_logo}
            alt=""
            className="h-5 w-5 rounded-full border border-white/20 object-cover sm:h-6 sm:w-6"
          />
        ) : (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15 text-[8px] font-bold text-white sm:h-6 sm:w-6">
            {brand[0]?.toUpperCase() ?? "B"}
          </span>
        )}
        <span className="min-w-0 truncate text-[11px] font-medium text-white/85 sm:text-[13px]">{brand}</span>
        {isVerified ? <UGCVerifiedBadge className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" /> : null}
        <UGCPlatformMarks
          platforms={campaign.allowed_platforms ?? []}
          size="sm"
          className="ml-auto hidden shrink-0 sm:flex"
        />
      </div>

      <h2
        className={cn(
          "line-clamp-2 min-w-0 font-extrabold tracking-[-0.025em] text-white",
          mobile ? "text-[13px] leading-[1.3]" : "text-xl leading-[1.35] lg:text-2xl",
        )}
      >
        {campaign.title}
      </h2>

      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        {rate ? (
          <span className="text-[17px] font-black leading-none tracking-tight text-[#fd8c00] sm:text-2xl">
            {rate}
          </span>
        ) : null}
        {totalBudget > 0 ? (
          <span className="text-[11px] font-medium tabular-nums text-white/55 sm:text-[13px]">
            {formatUgcFundingUsd(spentBudget)} / {formatUgcFundingUsd(totalBudget)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {canJoin ? (
          <Link href={`/ugc/${campaign.id}/join`} data-hero-action onClick={(e) => e.stopPropagation()}>
            <span
              className="inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 sm:rounded-xl sm:px-4 sm:py-2 sm:text-xs"
              style={{
                background: "linear-gradient(135deg, #FF5A1F 0%, #FF7A1F 50%, #FF8C42 100%)",
                boxShadow: "0 4px 18px rgba(253,80,0,0.50), 0 2px 8px rgba(253,80,0,0.35)",
              }}
            >
              {t("joinCampaign")}
            </span>
          </Link>
        ) : null}
        <Link
          href={`/ugc/${campaign.id}`}
          data-hero-action
          className={cn(mobile ? "inline-flex" : "hidden sm:inline-flex")}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/14 sm:px-4 sm:py-2 sm:text-xs"
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.20)",
            }}
          >
            <Eye className="size-3 sm:size-3.5" />
            {t("viewBrief")}
          </span>
        </Link>
      </div>
    </div>
  );
}

export function UGCFeaturedHeader({ campaigns }: { campaigns: UGCCampaign[] }) {
  const list = (() => {
    const seen = new Set<string>();
    return campaigns.filter((c) => {
      if (!c?.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  })();
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = list.length;
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
    const t = setInterval(() => go(1), 6000);
    return () => clearInterval(t);
  }, [go, multi]);

  function onFeaturedKey(e: KeyboardEvent<HTMLElement>) {
    if (!multi) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  }

  if (!count) return null;

  const c = list[Math.min(index, count - 1)]!;
  const banner = getCampaignBanner(c);
  const brand = c.vendor?.business_name ?? "Brand";

  return (
    <section aria-label="Featured campaigns" className="mb-5 sm:mb-6">
      <div
        role={multi ? "region" : undefined}
        tabIndex={multi ? 0 : undefined}
        onKeyDown={onFeaturedKey}
        className="product-tap-nav group relative h-[210px] overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-150 ease-out sm:h-[280px] sm:rounded-3xl lg:h-[320px] sm:hover:shadow-[0_20px_50px_rgba(37,99,235,0.18),0_8px_24px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
        style={{
          background: STAGE_BG,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.22), 0 0 0 1px rgba(59,130,246,0.06)",
        }}
        onTouchStart={(e) => {
          touchX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          if (start == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? start) - start;
          if (dx > 40) go(-1);
          if (dx < -40) go(1);
        }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: STAGE_GLOW }} />

        <div className="relative flex h-full flex-row sm:hidden">
          <div
            className="relative z-10 flex h-full w-[55%] min-w-0 flex-col justify-center p-3 pr-2"
            style={{ background: MOBILE_TEXT }}
          >
            <FeaturedCopy campaign={c} variant="mobile" />
          </div>
          <div className="relative z-[15] h-full w-[45%] shrink-0 self-stretch">
            <FeaturedStage banner={banner} brand={brand} campaignId={c.id} mobile />
          </div>
        </div>

        <div className="absolute inset-y-0 right-0 hidden w-[56%] sm:block lg:w-[55%]" style={{ zIndex: 1 }}>
          <FeaturedStage banner={banner} brand={brand} campaignId={c.id} />
          <div className="pointer-events-none absolute inset-0" style={{ background: IMAGE_FADE }} />
        </div>

        <div className="absolute inset-0 z-10 hidden flex-col justify-center p-3 pr-[4.75rem] sm:flex sm:max-w-[46%] sm:p-6 sm:pr-6 lg:max-w-[44%] lg:p-7">
          <FeaturedCopy campaign={c} variant="desktop" />
        </div>

        {multi ? (
          <>
            <button
              type="button"
              data-hero-action
              onClick={() => go(-1)}
              aria-label="Previous featured campaign"
              className="absolute left-2 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#111827] shadow-md hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] sm:grid sm:left-3"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              data-hero-action
              onClick={() => go(1)}
              aria-label="Next featured campaign"
              className="absolute right-2 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#111827] shadow-md hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] sm:grid sm:right-3"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <div
              className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5"
              role="tablist"
              aria-label="Featured campaign slides"
            >
              {list.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  data-hero-action
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

export function UGCFeaturedHeaderSkeleton() {
  return (
    <div
      aria-hidden
      className="mb-5 h-[210px] animate-pulse rounded-2xl bg-[#1a0800] sm:mb-6 sm:h-[280px] sm:rounded-3xl lg:h-[320px]"
    />
  );
}

export function UGCFeaturedHeaderEmpty() {
  return (
    <section
      aria-label="Featured campaigns"
      className="mb-5 flex h-[210px] flex-col items-center justify-center rounded-2xl border border-[#E8EAED] bg-white sm:mb-6 sm:h-[280px] sm:rounded-3xl lg:h-[320px]"
    >
      <Clapperboard className="mb-2 h-7 w-7 text-[#D1D5DB]" />
      <p className="text-sm font-semibold text-[#111827]">Featured campaigns appear here</p>
      <p className="mt-1 text-[12px] text-[#6B7280]">Live briefs show in this header when campaigns are active.</p>
    </section>
  );
}
