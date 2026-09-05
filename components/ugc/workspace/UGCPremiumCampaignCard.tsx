"use client";

import { memo } from "react";
import Link from "next/link";
import { Heart, User } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";
import {
  formatCreatorCount,
  getCampaignBanner,
  getCampaignRewardLine,
  getClipRateBadge,
} from "./ugc-campaign-utils";
import { getCampaignLifecycleStatus } from "@/lib/ugc/campaign-schedule";
import { UGCVerifiedBadge } from "./UGCVerifiedBadge";
import { UGCPlatformMarks, campaignFallbackStyle } from "./UGCPlatformMarks";

type UGCPremiumCampaignCardProps = {
  campaign: UGCCampaign;
  index?: number;
  featured?: boolean;
  saved?: boolean;
  onToggleSave?: (campaignId: string) => void;
};

/** Compact relative age matching reference: 3h, 10d, 2mo */
function relativeAge(iso: string): string | null {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.floor(ms / (1000 * 60));
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

function JoinButton({
  href,
  title,
  label,
  className,
}: {
  href: string;
  title: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`Join campaign ${title}`}
      className={cn(
        "inline-flex h-7 w-full items-center justify-center rounded-md bg-[#111827] px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]",
        className,
      )}
    >
      {label}
    </Link>
  );
}

function UGCPremiumCampaignCardInner({
  campaign: c,
  featured = false,
  saved = false,
  onToggleSave,
}: UGCPremiumCampaignCardProps) {
  const { formatMoney } = useCurrency();
  const { t } = useLocale();
  const banner = getCampaignBanner(c);
  const reward = getCampaignRewardLine(c, formatMoney);
  const rateBadge = getClipRateBadge(c, formatMoney);
  const platforms = c.allowed_platforms ?? [];
  const creators = c.submission_count ?? 0;
  const lifecycle = getCampaignLifecycleStatus(c);
  const isVerified = c.vendor?.verification_status === "verified";
  const brand = c.vendor?.business_name ?? "Brand";
  const canJoin = c.status === "active" && lifecycle !== "ended";
  const joinHref = `/ugc/${c.id}/join`;
  const briefHref = `/ugc/${c.id}`;
  const totalBudget = Number(c.total_budget ?? 0);
  const spentBudget = Number(c.spent_budget ?? 0);
  const showBudget = totalBudget > 0;
  const description = c.description?.replace(/\s+/g, " ").trim() || null;
  const age = relativeAge(c.created_at);
  const showLive = lifecycle === "live" || lifecycle === "ending_soon";
  const joinLabel = t("joinCampaign");

  return (
    <article className="group/card h-full min-w-0">
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white",
          "shadow-[0_1px_3px_rgba(17,24,39,0.05)] transition-[transform,box-shadow] duration-200",
          "hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(17,24,39,0.08)]",
          featured && "shadow-[0_2px_8px_rgba(17,24,39,0.06)]",
        )}
      >
        {/* A. Image area - ~16:9 */}
        <div className="relative shrink-0 overflow-hidden bg-[#F3F4F6] aspect-[16/9]">
          <Link
            href={briefHref}
            className="absolute inset-0 block"
            aria-label={`View campaign brief: ${c.title}`}
          >
            {banner ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={banner}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[200ms] group-hover/card:scale-[1.02]"
              />
            ) : (
              <div
                className="absolute inset-0 grid place-items-center"
                style={campaignFallbackStyle(brand + c.id)}
              >
                <span className="text-[24px] font-semibold tracking-tight text-[#111827]/25">
                  {brand.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </Link>

          {showLive ? (
            <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-1.5 py-[3px] text-[10px] font-semibold leading-none text-white backdrop-blur-[2px]">
              <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[#22C55E]" aria-hidden />
              Live
            </span>
          ) : null}

          {onToggleSave ? (
            <button
              type="button"
              aria-label={saved ? "Remove saved campaign" : "Save campaign"}
              title={saved ? "Remove saved campaign" : "Save campaign"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave(c.id);
              }}
              className="absolute right-2 top-2 z-[1] grid h-7 w-7 place-items-center rounded-full border border-black/[0.06] bg-white text-[#111827] shadow-[0_1px_3px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5",
                  saved ? "fill-[#FF5A1F] text-[#FF5A1F]" : "text-[#111827]",
                )}
                strokeWidth={1.75}
                aria-hidden
              />
            </button>
          ) : null}
        </div>

        {/* B-G. Compact body */}
        <div className="flex min-w-0 flex-1 flex-col px-2.5 pb-2.5 pt-2">
          {/* B. Brand / platform row */}
          <div className="flex min-w-0 items-center gap-1">
            {c.vendor?.business_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.vendor.business_logo}
                alt=""
                loading="lazy"
                className="h-[18px] w-[18px] shrink-0 rounded-full border border-[#E8EAED] object-cover"
              />
            ) : (
              <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#111827] text-[8px] font-bold text-white">
                {brand[0]?.toUpperCase() ?? "B"}
              </span>
            )}
            <span className="min-w-0 truncate text-[12px] font-semibold leading-none text-[#111827]">
              {brand}
            </span>
            {isVerified ? <UGCVerifiedBadge className="h-3 w-3 shrink-0" /> : null}
            {age ? (
              <span className="shrink-0 text-[11px] leading-none text-[#9CA3AF]">
                {"\u00B7"} {age}
              </span>
            ) : null}
            <UGCPlatformMarks platforms={platforms} size="sm" className="ml-auto shrink-0" />
          </div>

          {/* C. Title */}
          <h3 className="mt-1.5 min-w-0 text-[13px] font-semibold leading-[1.25] tracking-[-0.01em] text-[#111827]">
            <Link
              href={briefHref}
              className="line-clamp-1 hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:underline"
            >
              {c.title}
            </Link>
          </h3>

          {/* D. Optional short description */}
          {description ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-[#9CA3AF]">
              {description}
            </p>
          ) : null}

          {/* H. Join - body CTA above metrics (hover on desktop, always on touch) */}
          {canJoin ? (
            <>
              <div className="mt-1.5 sm:hidden">
                <JoinButton href={joinHref} title={c.title} label={joinLabel} />
              </div>
              <div
                className={cn(
                  "hidden overflow-hidden transition-[max-height,opacity,margin] duration-200 sm:block",
                  "max-h-0 opacity-0",
                  "group-hover/card:mt-1.5 group-hover/card:max-h-8 group-hover/card:opacity-100",
                  "group-focus-within/card:mt-1.5 group-focus-within/card:max-h-8 group-focus-within/card:opacity-100",
                )}
              >
                <JoinButton href={joinHref} title={c.title} label={joinLabel} />
              </div>
            </>
          ) : null}

          {/* E. Budget / progress text */}
          {showBudget ? (
            <p className="mt-1.5 min-w-0 truncate text-[11px] leading-none tabular-nums">
              <span className="font-semibold text-[#111827]">
                {formatMoney(spentBudget, "USD")}
              </span>
              <span className="font-medium text-[#9CA3AF]">
                {" / "}
                {formatMoney(totalBudget, "USD")}
              </span>
            </p>
          ) : null}

          {/* F + G. Creator count + rate pill */}
          <div
            className={cn(
              "flex items-center justify-between gap-2",
              showBudget ? "mt-1.5" : "mt-auto pt-1.5",
            )}
          >
            <span
              className="inline-flex min-w-0 items-center gap-1 truncate text-[11px] tabular-nums text-[#6B7280]"
              aria-label={`${formatCreatorCount(creators)} creators`}
            >
              <User className="h-3 w-3 shrink-0" aria-hidden strokeWidth={2} />
              {formatCreatorCount(creators)}
            </span>
            {rateBadge ? (
              <span className="inline-flex shrink-0 items-center rounded-full bg-[#EBF5FF] px-2 py-[3px] text-[11px] font-semibold leading-none tabular-nums text-[#1D4ED8]">
                {rateBadge}
              </span>
            ) : !showBudget ? (
              <span className="inline-flex shrink-0 items-center rounded-full bg-[#EBF5FF] px-2 py-[3px] text-[11px] font-semibold leading-none tabular-nums text-[#1D4ED8]">
                {reward}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export const UGCPremiumCampaignCard = memo(UGCPremiumCampaignCardInner);
