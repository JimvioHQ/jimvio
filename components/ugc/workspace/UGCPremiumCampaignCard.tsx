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

function typeLabel(type: string): string {
  if (type === "clipping") return "Clipping";
  if (type === "music_clipping") return "Music clipping";
  if (type === "promotion") return "Promotion";
  return "UGC";
}

function contentRequirement(c: UGCCampaign): string {
  const min = c.min_duration;
  const max = c.max_duration;
  if (min && max) return `${min}–${max}s video`;
  if (max) return `Up to ${max}s`;
  if (min) return `${min}s+ video`;
  return "Video required";
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
  const platforms = (c.allowed_platforms ?? []).slice(0, 3);
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

  return (
    <article className="group h-full">
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[14px] border border-[#E8EAED] bg-white",
          "shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-shadow duration-200",
          "hover:shadow-[0_8px_24px_rgba(17,24,39,0.08)]",
        )}
      >
        <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-[#F3F4F6]">
          <Link href={`/ugc/${c.id}`} className="absolute inset-0 block" aria-label={c.title}>
            {banner ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={banner}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(145deg, #FFF4EF 0%, #F3F4F6 60%, #FFE8DC 100%)" }}
              />
            )}
          </Link>
          {featured ? (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-[#FF5A1F] px-2 py-0.5 text-[10px] font-semibold text-white">
              {t("featured")}
            </span>
          ) : (
            <span className="absolute left-2.5 top-2.5 rounded-full border border-white/20 bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              {lifecycleLabel(lifecycle)}
            </span>
          )}
          {onToggleSave ? (
            <button
              type="button"
              aria-label={saved ? "Remove bookmark" : "Save campaign"}
              onClick={() => onToggleSave(c.id)}
              className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#111827] shadow-sm"
            >
              {saved ? (
                <BookmarkCheck className="h-3.5 w-3.5 text-[#FF5A1F]" />
              ) : (
                <Bookmark className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
        </div>

        <Link href={`/ugc/${c.id}`} className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
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
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#FF5A1F] text-[9px] font-bold text-white">
                {c.vendor?.business_name?.[0] ?? "B"}
              </span>
            )}
            <span className="min-w-0 truncate text-[12px] font-semibold text-[#111827]">
              {c.vendor?.business_name ?? "Brand"}
            </span>
            {isVerified ? <VerifiedBadge className="h-3 w-3" /> : null}
          </div>

          <h3 className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-[1.3] tracking-[-0.01em] text-[#111827] group-hover:text-[#FF5A1F]">
            {c.title}
          </h3>

          <p className="mt-2 text-[13px] font-semibold tabular-nums text-[#059669]">{reward}</p>

          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[#64748B]">
            <span className="rounded-md bg-[#F8FAFC] px-1.5 py-0.5 font-medium">{typeLabel(c.campaign_type)}</span>
            <span className="rounded-md bg-[#F8FAFC] px-1.5 py-0.5 font-medium">{contentRequirement(c)}</span>
            {platforms.length ? (
              <span className="rounded-md bg-[#F8FAFC] px-1.5 py-0.5 font-medium capitalize">
                {platforms.map((p) => (p === "x" ? "X" : p)).join(" · ")}
              </span>
            ) : null}
          </div>

          <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-[#64748B]">
            <span>{deadlineLabel}</span>
            <span>
              {formatCreatorCount(creators)} {t("creatorsLabel")}
            </span>
          </div>
        </Link>
      </div>
    </article>
  );
}

export const UGCPremiumCampaignCard = memo(UGCPremiumCampaignCardInner);
