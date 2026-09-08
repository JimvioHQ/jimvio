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
  /**
   * Compact density for mobile 2-column Discover grids.
   * On `sm+` the card automatically expands to the default density.
   */
  density?: "default" | "compact";
  /** @deprecated Save control removed from Discover cards; API remains elsewhere */
  saved?: boolean;
  onToggleSave?: (campaignId: string) => void;
};

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
  density = "default",
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
  const joinLabel = t("joinCampaign");
  const compact = density === "compact";

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
        <div
          className={cn(
            "relative shrink-0 overflow-hidden bg-[#F3F4F6]",
            compact ? "aspect-[4/3] sm:aspect-[16/9]" : "aspect-[16/9]",
          )}
        >
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
                <span
                  className={cn(
                    "font-semibold tracking-tight text-[#111827]/25",
                    compact ? "text-[18px] sm:text-[24px]" : "text-[24px]",
                  )}
                >
                  {brand.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </Link>

          {canJoin ? (
            <div
              className={cn(
                "absolute inset-x-1.5 bottom-1.5 z-[1] transition-opacity duration-200 sm:inset-x-2 sm:bottom-2",
                "opacity-100 sm:pointer-events-none sm:opacity-0",
                "sm:group-hover/card:pointer-events-auto sm:group-hover/card:opacity-100",
                "sm:group-focus-within/card:pointer-events-auto sm:group-focus-within/card:opacity-100",
              )}
            >
              <JoinButton
                href={joinHref}
                title={c.title}
                label={joinLabel}
                className={cn(compact && "h-6 px-2 text-[10px] sm:h-7 sm:px-2.5 sm:text-[11px]")}
              />
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            compact ? "px-2 pb-2 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5" : "px-3 pb-3 pt-2.5",
          )}
        >
          <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                loading="lazy"
                decoding="async"
                className={cn(
                  "shrink-0 rounded-full border border-[#E8EAED] object-cover",
                  compact ? "h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" : "h-[18px] w-[18px]",
                )}
              />
            ) : (
              <span
                className={cn(
                  "grid shrink-0 place-items-center rounded-full bg-[#111827] font-bold text-white",
                  compact
                    ? "h-3.5 w-3.5 text-[7px] sm:h-[18px] sm:w-[18px] sm:text-[8px]"
                    : "h-[18px] w-[18px] text-[8px]",
                )}
              >
                {brand[0]?.toUpperCase() ?? "B"}
              </span>
            )}
            <span
              className={cn(
                "min-w-0 truncate font-semibold leading-none text-[#111827]",
                compact ? "text-[10px] sm:text-[12px]" : "text-[12px]",
              )}
            >
              {brand}
            </span>
            {isVerified ? (
              <UGCVerifiedBadge
                className={cn("shrink-0", compact ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3 w-3")}
              />
            ) : null}
            <UGCPlatformMarks
              platforms={platforms}
              size="sm"
              className={cn("ml-auto shrink-0", compact && "hidden sm:flex")}
            />
          </div>

          {/* Fixed-height title slot: description overlays on hover-capable desktops only */}
          <div
            className={cn(
              "relative overflow-hidden",
              compact ? "mt-1.5 min-h-[32px] sm:mt-2.5 sm:min-h-[40px]" : "mt-2.5 min-h-[40px]",
            )}
          >
            <h3
              id={`ugc-card-title-${c.id}`}
              className={cn(
                "min-w-0 font-semibold leading-[1.25] tracking-[-0.01em] text-[#111827]",
                compact ? "text-[12px] sm:text-[15px]" : "text-[15px]",
              )}
            >
              <Link
                href={briefHref}
                className="line-clamp-2 [@media(hover:hover)]:group-hover/card:line-clamp-1 sm:group-focus-within/card:line-clamp-1 hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:underline"
              >
                {c.title}
              </Link>
            </h3>
            {description ? (
              <p
                id={descId}
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-[19px] line-clamp-1 bg-white/95 text-[11px] leading-[1.35] text-[#6B7280]",
                  "max-sm:hidden opacity-0 translate-y-0.5 transition-[opacity,transform] duration-200 ease-out",
                  "[@media(hover:hover)]:group-hover/card:translate-y-0 [@media(hover:hover)]:group-hover/card:opacity-100",
                  "sm:group-focus-within/card:translate-y-0 sm:group-focus-within/card:opacity-100",
                )}
              >
                {description}
              </p>
            ) : null}
          </div>

          <div
            className={cn(
              "mt-auto flex items-center justify-between gap-1.5",
              compact ? "pt-2 sm:gap-2 sm:pt-3" : "gap-2 pt-3",
            )}
          >
            {showBudget ? (
              <p
                className={cn(
                  "min-w-0 truncate leading-none tabular-nums",
                  compact ? "text-[10px] sm:text-[12px]" : "text-[12px]",
                )}
              >
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
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full bg-[#EBF5FF] px-1.5 font-semibold leading-none tabular-nums text-[#1D4ED8] sm:px-2",
                  compact
                    ? "h-[18px] text-[9px] sm:h-[22px] sm:text-[11px]"
                    : "h-[22px] text-[11px]",
                )}
              >
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
