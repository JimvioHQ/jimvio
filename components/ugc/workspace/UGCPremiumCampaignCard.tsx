"use client";

import { memo } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Users } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";
import {
  formatCreatorCount,
  getCampaignBanner,
  getCampaignRewardLine,
  getClipRateBadge,
  getDaysRemaining,
} from "./ugc-campaign-utils";
import {
  getCampaignLifecycleStatus,
  lifecycleLabel,
} from "@/lib/ugc/campaign-schedule";
import { UGCVerifiedBadge } from "./UGCVerifiedBadge";
import { UGCPlatformMarks, campaignFallbackStyle } from "./UGCPlatformMarks";

type UGCPremiumCampaignCardProps = {
  campaign: UGCCampaign;
  index?: number;
  featured?: boolean;
  saved?: boolean;
  onToggleSave?: (campaignId: string) => void;
};

function relativeAge(iso: string): string | null {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return null;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
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
  const days = getDaysRemaining(c.submission_deadline ?? c.ends_at);
  const lifecycle = getCampaignLifecycleStatus(c);
  const deadlineSource = c.submission_deadline ?? c.ends_at;
  const deadlineLabel =
    days === null
      ? null
      : days === 0
        ? "Ends today"
        : deadlineSource
          ? `Ends ${new Date(deadlineSource).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
          : null;
  const isVerified = c.vendor?.verification_status === "verified";
  const brand = c.vendor?.business_name ?? "Brand";
  const canJoin = c.status === "active" && lifecycle !== "ended";
  const joinHref = `/ugc/${c.id}/join`;
  const briefHref = `/ugc/${c.id}`;
  const totalBudget = Number(c.total_budget ?? 0);
  const spentBudget = Number(c.spent_budget ?? 0);
  const showBudget = totalBudget > 0;
  const budgetPct = showBudget ? Math.min(100, Math.round((spentBudget / totalBudget) * 100)) : 0;
  const description = c.description?.replace(/\s+/g, " ").trim() || null;
  const age = relativeAge(c.created_at);
  const statusLabel =
    lifecycle === "live" || lifecycle === "ending_soon"
      ? "Live"
      : featured
        ? t("featured")
        : lifecycleLabel(lifecycle);

  return (
    <article className="group h-full min-w-0">
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[12px] border border-[#E8EAED] bg-white",
          "shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-shadow duration-200",
          "hover:shadow-[0_8px_20px_rgba(17,24,39,0.08)]",
        )}
      >
        <div className="relative shrink-0 overflow-hidden bg-[#F3F4F6] aspect-[16/10]">
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
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div
                className="absolute inset-0 grid place-items-center"
                style={campaignFallbackStyle(brand + c.id)}
              >
                <span className="text-[26px] font-semibold tracking-tight text-[#111827]/25">
                  {brand.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </Link>
          <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {statusLabel}
          </span>
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
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-[#111827] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            >
              {saved ? (
                <BookmarkCheck className="h-3.5 w-3.5 text-[#FF5A1F]" />
              ) : (
                <Bookmark className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col px-2.5 pb-2.5 pt-2">
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
            {age ? <span className="shrink-0 text-[11px] text-[#9CA3AF]">{age}</span> : null}
            <UGCPlatformMarks platforms={platforms} size="sm" className="ml-auto shrink-0" />
          </div>

          <h3 className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug tracking-[-0.01em] text-[#111827]">
            <Link
              href={briefHref}
              className="hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:underline"
            >
              {c.title}
            </Link>
          </h3>

          {description ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#6B7280]">{description}</p>
          ) : null}

          {showBudget ? (
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] tabular-nums text-[#6B7280]">
                <span className="truncate font-medium text-[#374151]">
                  {formatMoney(spentBudget, "USD")} / {formatMoney(totalBudget, "USD")}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                <div
                  className="h-full rounded-full bg-[#111827]/80"
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-[#FF5A1F]">{reward}</p>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <span
              className="inline-flex min-w-0 items-center gap-1 truncate text-[11px] text-[#6B7280]"
              aria-label={`${formatCreatorCount(creators)} creators`}
            >
              <Users className="h-3 w-3 shrink-0" aria-hidden />
              {formatCreatorCount(creators)}
              {!showBudget && deadlineLabel ? (
                <span className="truncate text-[#9CA3AF]">· {deadlineLabel}</span>
              ) : null}
            </span>
            {rateBadge ? (
              <span className="inline-flex shrink-0 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#1D4ED8]">
                {rateBadge}
              </span>
            ) : showBudget ? (
              <span className="inline-flex shrink-0 rounded-full bg-[#FFF4EF] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#FF5A1F]">
                {reward}
              </span>
            ) : null}
          </div>

          <div className="mt-auto flex items-center gap-2 pt-2.5">
            {canJoin ? (
              <Link
                href={joinHref}
                aria-label={`Join campaign ${c.title}`}
                className="inline-flex h-8 flex-1 items-center justify-center rounded-lg bg-[#FF5A1F] px-2.5 text-[11px] font-semibold text-white hover:bg-[#E54E18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
              >
                {t("joinCampaign")}
              </Link>
            ) : null}
            <Link
              href={briefHref}
              aria-label={`View campaign brief: ${c.title}`}
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-lg border border-[#E5E7EB] px-2.5 text-[11px] font-semibold text-[#111827] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]",
                canJoin ? "shrink-0" : "flex-1",
              )}
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
