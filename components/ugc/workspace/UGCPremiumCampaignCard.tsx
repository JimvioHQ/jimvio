"use client";

import { memo } from "react";
import Link from "next/link";
import type { UGCCampaign } from "@/types/ugc";
import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";
import {
  formatUgcFundingUsd,
  getCampaignBanner,
  getCampaignOwnerAvatar,
  getClipRateBadge,
} from "./ugc-campaign-utils";
import { getCampaignLifecycleStatus } from "@/lib/ugc/campaign-schedule";
import { UGCVerifiedBadge } from "./UGCVerifiedBadge";
import { UGCPlatformMarks, campaignFallbackStyle } from "./UGCPlatformMarks";
import { JoinCampaignGateLink } from "@/components/ugc/join/JoinCampaignGateLink";

type UGCPremiumCampaignCardProps = {
  campaign: UGCCampaign;
  index?: number;
  featured?: boolean;
  /** @deprecated Save control removed from Discover cards; API remains elsewhere */
  saved?: boolean;
  onToggleSave?: (campaignId: string) => void;
};

/** Compact relative age: 3h, 10d, 2mo */
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
    <JoinCampaignGateLink
      href={href}
      aria-label={`Join campaign ${title}`}
      className={cn(
        "inline-flex h-7 w-full items-center justify-center rounded-md bg-[#FF5A1F] px-2.5 text-[11px] font-semibold text-white shadow-sm",
        "transition-[background-color,box-shadow,opacity] duration-200 hover:bg-[#E54E18] hover:shadow-[0_4px_14px_rgba(255,90,31,0.35)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-1",
        className,
      )}
    >
      {label}
    </JoinCampaignGateLink>
  );
}

function UGCPremiumCampaignCardInner({
  campaign: c,
  featured = false,
}: UGCPremiumCampaignCardProps) {
  const { t } = useLocale();
  const banner = getCampaignBanner(c);
  const avatar = getCampaignOwnerAvatar(c);
  const rateBadge = getClipRateBadge(c);
  const platforms = c.allowed_platforms ?? [];
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
  const descId = description ? `ugc-card-desc-${c.id}` : undefined;
  const age = relativeAge(c.created_at);
  const joinLabel = t("joinCampaign");

  return (
    <article
      className="group/card h-full min-w-0"
      aria-labelledby={`ugc-card-title-${c.id}`}
      aria-describedby={descId}
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[14px] border border-[#E8EAED] bg-white",
          "shadow-[0_1px_3px_rgba(17,24,39,0.05)] transition-[transform,box-shadow] duration-200 ease-out",
          "hover:-translate-y-px hover:shadow-[0_8px_22px_rgba(17,24,39,0.08)]",
          "focus-within:shadow-[0_8px_22px_rgba(17,24,39,0.08)]",
          featured && "shadow-[0_2px_8px_rgba(17,24,39,0.06)]",
        )}
      >
        <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-[#F3F4F6]">
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
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 ease-out group-hover/card:scale-[1.025] group-focus-within/card:scale-[1.025]"
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

          {canJoin ? (
            <div
              className={cn(
                "absolute inset-x-2 bottom-2 z-[1] transition-opacity duration-200",
                "opacity-100 sm:pointer-events-none sm:opacity-0",
                "sm:group-hover/card:pointer-events-auto sm:group-hover/card:opacity-100",
                "sm:group-focus-within/card:pointer-events-auto sm:group-focus-within/card:opacity-100",
              )}
            >
              <JoinButton href={joinHref} title={c.title} label={joinLabel} />
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col px-3 pb-3 pt-2.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                loading="lazy"
                decoding="async"
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

          {/* Fixed-height title slot: description overlays on hover without reflow */}
          <div className="relative mt-2.5 min-h-[40px] overflow-hidden">
            <h3
              id={`ugc-card-title-${c.id}`}
              className="min-w-0 text-[15px] font-semibold leading-[1.25] tracking-[-0.01em] text-[#111827]"
            >
              <Link
                href={briefHref}
                className="line-clamp-2 group-hover/card:line-clamp-1 group-focus-within/card:line-clamp-1 hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:underline"
              >
                {c.title}
              </Link>
            </h3>
            {description ? (
              <p
                id={descId}
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-[19px] line-clamp-1 bg-white/95 text-[11px] leading-[1.35] text-[#6B7280]",
                  "opacity-0 translate-y-0.5 transition-[opacity,transform] duration-200 ease-out",
                  "group-hover/card:translate-y-0 group-hover/card:opacity-100",
                  "group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100",
                )}
              >
                {description}
              </p>
            ) : null}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            {showBudget ? (
              <p className="min-w-0 truncate text-[12px] leading-none tabular-nums">
                <span className="font-semibold text-[#111827]">{formatUgcFundingUsd(spentBudget)}</span>
                <span className="font-medium text-[#9CA3AF]">
                  {" / "}
                  {formatUgcFundingUsd(totalBudget)}
                </span>
              </p>
            ) : (
              <span className="min-w-0" />
            )}
            {rateBadge ? (
              <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-[#EBF5FF] px-2 text-[11px] font-semibold leading-none tabular-nums text-[#1D4ED8]">
                {rateBadge}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export const UGCPremiumCampaignCard = memo(UGCPremiumCampaignCardInner);
