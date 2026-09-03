"use client";

import { memo } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
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
import {
  getCampaignLifecycleStatus,
  lifecycleLabel,
} from "@/lib/ugc/campaign-schedule";
import { UGCVerifiedBadge } from "./UGCVerifiedBadge";
import { UGCPlatformMarks, campaignFallbackStyle } from "./UGCPlatformMarks";

function typeLabel(type: string): string {
  if (type === "clipping") return "Clipping";
  if (type === "music_clipping") return "Music clipping";
  if (type === "promotion") return "Promotion";
  return "UGC";
}

type UGCPremiumCampaignCardProps = {
  campaign: UGCCampaign;
  index?: number;
  featured?: boolean;
  saved?: boolean;
  onToggleSave?: (campaignId: string) => void;
};

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
  const platforms = c.allowed_platforms ?? [];
  const creators = c.submission_count ?? 0;
  const days = getDaysRemaining(c.submission_deadline ?? c.ends_at);
  const lifecycle = getCampaignLifecycleStatus(c);
  const deadlineSource = c.submission_deadline ?? c.ends_at;
  const deadlineLabel =
    days === null
      ? "Open"
      : days === 0
        ? "Due today"
        : `Deadline ${new Date(deadlineSource!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  const isVerified = c.vendor?.verification_status === "verified";
  const brand = c.vendor?.business_name ?? "Brand";
  const joinHref = `/ugc/${c.id}/join`;

  return (
    <article className="group h-full min-w-0">
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[16px] border border-[#E8EAED] bg-white",
          "shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-shadow duration-200",
          "hover:shadow-[0_10px_28px_rgba(17,24,39,0.08)]",
        )}
      >
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-[#F3F4F6]">
          <Link href={`/ugc/${c.id}`} className="absolute inset-0 block" aria-label={`View campaign brief: ${c.title}`}>
            {banner ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={banner}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center" style={campaignFallbackStyle(brand + c.id)}>
                <span className="text-[28px] font-semibold tracking-tight text-[#111827]/25">
                  {brand.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </Link>
          <span className="absolute left-2.5 top-2.5 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            {featured ? t("featured") : lifecycleLabel(lifecycle)}
          </span>
          {onToggleSave ? (
            <button
              type="button"
              aria-label={saved ? "Remove saved campaign" : "Save campaign"}
              title={saved ? "Remove saved campaign" : "Save campaign"}
              onClick={() => onToggleSave(c.id)}
              className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-[#111827] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            >
              {saved ? (
                <BookmarkCheck className="h-3.5 w-3.5 text-[#FF5A1F]" />
              ) : (
                <Bookmark className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col px-3.5 pb-3.5 pt-3">
          <div className="flex items-center gap-1.5">
            {c.vendor?.business_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.vendor.business_logo}
                alt=""
                loading="lazy"
                className="h-5 w-5 shrink-0 rounded-full border border-[#E8EAED] object-cover"
              />
            ) : (
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#111827] text-[9px] font-bold text-white">
                {brand[0] ?? "B"}
              </span>
            )}
            <span className="min-w-0 truncate text-[12px] font-medium text-[#4B5563]">{brand}</span>
            {isVerified ? <UGCVerifiedBadge className="h-3 w-3" /> : null}
            <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
              {typeLabel(c.campaign_type)}
            </span>
          </div>

          <h3 className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-[#111827]">
            <Link href={`/ugc/${c.id}`} className="hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:underline">
              {c.title}
            </Link>
          </h3>
          {c.description ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#6B7280]">{c.description}</p>
          ) : null}

          <p className="mt-2 text-[15px] font-semibold tabular-nums text-[#111827]">{reward}</p>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <UGCPlatformMarks platforms={platforms} />
            <span className="shrink-0 text-[11px] text-[#6B7280]">
              {formatCreatorCount(creators)} {t("creatorsLabel")}
            </span>
          </div>

          <p className="mt-2 text-[12px] text-[#6B7280]">{deadlineLabel}</p>

          <div className="mt-auto flex gap-2 pt-3">
            <Link
              href={joinHref}
              aria-label={`Join campaign ${c.title}`}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[#FF5A1F] px-3 text-[12px] font-semibold text-white hover:bg-[#E54E18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            >
              {t("joinCampaign")}
            </Link>
            <Link
              href={`/ugc/${c.id}`}
              aria-label={`View campaign brief: ${c.title}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E5E7EB] px-3 text-[12px] font-semibold text-[#111827] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            >
              {t("viewBrief")}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export const UGCPremiumCampaignCard = memo(UGCPremiumCampaignCardInner);
