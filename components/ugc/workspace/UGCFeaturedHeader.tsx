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
  getCampaignOwnerAvatar,
  getClipRateBadge,
} from "./ugc-campaign-utils";
import { UGCVerifiedBadge } from "./UGCVerifiedBadge";
import { UGCPlatformMarks } from "./UGCPlatformMarks";
import { JoinCampaignGateLink } from "@/components/ugc/join/JoinCampaignGateLink";

/** Premium white stage — no atmosphere blobs, radial glows, or tint overlays. */
const STAGE_BG = "#FFFFFF";
const IMAGE_FADE =
  "linear-gradient(to right, #FFFFFF 0%, rgba(255,255,255,0.96) 18%, rgba(255,255,255,0.55) 42%, transparent 62%)";
const MOBILE_TEXT =
  "linear-gradient(to right, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 48%, rgba(255,255,255,0.55) 72%, transparent 88%)";
/** Flat featured fallback — never hue/radial decorative plates. */
const FEATURED_FALLBACK_BG = { background: "#FFFFFF" } as const;

/** Small white controls. Hidden until hover or keyboard focus so the card matches the clean reference. */
const CAROUSEL_CTRL =
  "absolute top-1/2 z-30 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#111827] shadow-[0_2px_8px_rgba(17,24,39,0.08)] opacity-0 transition hover:bg-[#F9FAFB] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 group-hover:opacity-100 [@media(hover:none)]:opacity-100";

function FeaturedStage({
  banner,
  brand,
  mobile,
}: {
  banner: string | null;
  brand: string;
  mobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative isolate h-full w-full overflow-hidden bg-white",
        mobile ? "rounded-r-2xl" : "rounded-r-3xl",
      )}
    >
      {banner ? (
        <>
          {/* Neutralized blur plate — no saturated cyan/blue bleed */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: "translate3d(0,0,0) scale(1.12)",
              filter: "blur(22px) brightness(1.06) saturate(0.35)",
              opacity: 0.55,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-white/55"
            aria-hidden
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner}
            alt=""
            className="hero-product-float absolute inset-0 z-10 h-full w-full object-cover object-center"
          />
        </>
      ) : (
        <div className="absolute inset-0" style={FEATURED_FALLBACK_BG}>
          <span className="relative z-10 grid h-full place-items-center text-[42px] font-bold tracking-tight text-[#111827]/16">
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
  const avatar = getCampaignOwnerAvatar(campaign);
  const isVerified = campaign.vendor?.verification_status === "verified";
  const lifecycle = getCampaignLifecycleStatus(campaign);
  const canJoin = campaign.status === "active" && lifecycle !== "ended";
  const rate = getClipRateBadge(campaign);
  const totalBudget = Number(campaign.total_budget ?? 0);
  const spentBudget = Number(campaign.spent_budget ?? 0);
  const mobile = variant === "mobile";

  return (
    <div className="flex h-full w-full min-w-0 flex-col justify-center gap-2.5 sm:gap-3.5">
      <div className="flex min-w-0 items-center gap-1.5">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="h-5 w-5 rounded-full border border-[#E8EAED] object-cover sm:h-6 sm:w-6"
          />
        ) : (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#111827] text-[8px] font-bold text-white sm:h-6 sm:w-6">
            {brand[0]?.toUpperCase() ?? "B"}
          </span>
        )}
        <span className="min-w-0 truncate text-[11px] font-semibold text-[#111827] sm:text-[13px]">
          {brand}
        </span>
        {isVerified ? <UGCVerifiedBadge className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" /> : null}
        <UGCPlatformMarks
          platforms={campaign.allowed_platforms ?? []}
          size="sm"
          className="ml-auto max-w-[40%] shrink-0 justify-end overflow-hidden"
        />
      </div>

      <h2
        className={cn(
          "line-clamp-2 min-w-0 font-extrabold tracking-[-0.025em] text-[#111827]",
          mobile ? "text-[13px] leading-[1.3]" : "text-xl leading-[1.35] lg:text-2xl",
        )}
      >
        {campaign.title}
      </h2>

      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        {rate ? (
          <span className="text-[15px] font-black leading-none tracking-tight text-[#FF5A1F] sm:text-2xl">
            {rate}
          </span>
        ) : null}
        {totalBudget > 0 ? (
          <span className="text-[11px] font-medium tabular-nums text-[#6B7280] sm:text-[13px]">
            {formatUgcFundingUsd(spentBudget)} / {formatUgcFundingUsd(totalBudget)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {canJoin ? (
          <JoinCampaignGateLink
            href={`/ugc/${campaign.id}/join`}
            data-hero-action
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-[0.97] sm:rounded-xl sm:px-4 sm:py-2 sm:text-xs"
              style={{
                background: "#FF5A1F",
                boxShadow: "0 4px 14px rgba(255,90,31,0.28)",
              }}
            >
              {t("joinCampaign")}
            </span>
          </JoinCampaignGateLink>
        ) : null}
        <Link
          href={`/ugc/${campaign.id}`}
          data-hero-action
          className={cn(mobile ? "inline-flex" : "hidden sm:inline-flex")}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-[10px] font-bold text-[#111827] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#D1D5DB] hover:bg-[#F9FAFB] sm:px-4 sm:py-2 sm:text-xs">
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
        className="product-tap-nav group relative h-[210px] overflow-hidden rounded-2xl border border-[#E8EAED] bg-white transition-[transform,box-shadow] duration-150 ease-out sm:h-[280px] sm:rounded-3xl lg:h-[320px] sm:hover:shadow-[0_16px_40px_rgba(17,24,39,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/50 focus-visible:ring-offset-0"
        style={{
          background: STAGE_BG,
          boxShadow: "0 4px 20px rgba(17,24,39,0.04)",
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
        <div className="relative flex h-full flex-row sm:hidden">
          <div
            className="relative z-10 flex h-full w-[58%] min-w-0 flex-col justify-center p-3 pr-2"
            style={{ background: MOBILE_TEXT }}
          >
            <FeaturedCopy campaign={c} variant="mobile" />
          </div>
          <div className="relative z-[15] h-full w-[42%] shrink-0 self-stretch">
            <FeaturedStage banner={banner} brand={brand} mobile />
          </div>
        </div>

        <div className="absolute inset-y-0 right-0 hidden w-[56%] bg-white sm:block lg:w-[55%]" style={{ zIndex: 1 }}>
          <FeaturedStage banner={banner} brand={brand} />
          <div className="pointer-events-none absolute inset-0" style={{ background: IMAGE_FADE }} />
        </div>

        <div
          className={cn(
            "absolute inset-0 z-10 hidden flex-col justify-center p-3 sm:flex sm:max-w-[48%] sm:p-7 sm:pr-8 lg:max-w-[46%] lg:p-8",
          )}
        >
          <FeaturedCopy campaign={c} variant="desktop" />
        </div>

        {multi ? (
          <>
            <button
              type="button"
              data-hero-action
              onClick={() => go(-1)}
              aria-label="Previous campaign"
              className={cn(CAROUSEL_CTRL, "left-3")}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              data-hero-action
              onClick={() => go(1)}
              aria-label="Next campaign"
              className={cn(CAROUSEL_CTRL, "right-3")}
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
            {/* Bare dots — no pill/box container chrome */}
            <div
              className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 bg-transparent p-0"
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
                    "appearance-none rounded-full border-0 bg-transparent p-0 shadow-none outline-none ring-0 ring-offset-0 transition-all",
                    "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                    "h-1.5",
                    i === index
                      ? "w-5 bg-[#FF5A1F] focus-visible:bg-[#E54E18]"
                      : "w-1.5 bg-[#D1D5DB] hover:bg-[#9CA3AF] focus-visible:bg-[#FF5A1F]",
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
      className="mb-5 h-[210px] animate-pulse rounded-2xl border border-[#E8EAED] bg-white sm:mb-6 sm:h-[280px] sm:rounded-3xl lg:h-[320px]"
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
      <p className="mt-1 text-[12px] text-[#6B7280]">Active briefs show in this header when campaigns are live.</p>
    </section>
  );
}
