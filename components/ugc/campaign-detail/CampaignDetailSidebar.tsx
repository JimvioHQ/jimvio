"use client";

import Link from "next/link";
import { Bookmark, ShieldCheck } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  buildEligibility,
  formatCountdown,
  getRemainingBudget,
  getRewardType,
  type CreatorProfileSnapshot,
} from "@/lib/ugc/campaign-detail";
import { getCampaignPayoutLabel, getCampaignRewardLine } from "@/components/ugc/workspace/ugc-campaign-utils";
import { MetricTile, Pill, ProgressBar, SectionCard } from "./campaign-detail-ui";

type CampaignDetailSidebarProps = {
  campaign: UGCCampaign;
  campaignId: string;
  isJoined: boolean;
  isPending?: boolean;
  isBookmarked: boolean;
  isActive: boolean;
  joinHref: string;
  joinLabel: string;
  profile: CreatorProfileSnapshot | null;
  onToggleBookmark: () => void;
  sticky?: boolean;
};

export function CampaignDetailSidebar({
  campaign,
  campaignId,
  isJoined,
  isPending = false,
  isBookmarked,
  isActive,
  joinHref,
  joinLabel,
  profile,
  onToggleBookmark,
  sticky = true,
}: CampaignDetailSidebarProps) {
  const { formatMoney } = useCurrency();
  const rewardType = getRewardType(campaign);
  const remaining = getRemainingBudget(campaign);
  const budgetPct = Math.min(100, ((campaign.spent_budget ?? 0) / (campaign.total_budget || 1)) * 100);
  const eligibility = buildEligibility(campaign, profile);
  const countdown = formatCountdown(campaign.ends_at);

  const eligibilityTone =
    eligibility.level === "eligible" ? "success" : eligibility.level === "almost" ? "warning" : "danger";

  return (
    <aside className={cn(sticky && "lg:sticky lg:top-4")}>
      <SectionCard className="space-y-4 shadow-[0_8px_30px_rgba(17,24,39,0.06)]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">Reward</p>
          <p className="mt-1 text-[22px] font-bold text-[var(--color-accent)]">
            {getCampaignRewardLine(campaign, formatMoney)}
          </p>
          <p className="text-[12px] text-[#6B7280]">{getCampaignPayoutLabel(campaign, formatMoney)}</p>
          <Pill tone="brand">{rewardType}</Pill>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-[12px]">
            <span className="font-semibold text-[#374151]">Budget remaining</span>
            <span className="font-bold tabular-nums text-[#111827]">
              {formatMoney(remaining, "USD")}
            </span>
          </div>
          <ProgressBar value={100 - budgetPct} />
          <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
            {formatMoney(campaign.spent_budget ?? 0, "USD")} paid of{" "}
            {formatMoney(campaign.total_budget, "USD")}
          </p>
        </div>

        {countdown ? (
          <MetricTile label="Deadline" value={countdown} sub="Submission window" />
        ) : null}

        <div className="rounded-[12px] border border-[#EEF0F2] bg-[#FAFAFA] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-[#111827]">Your eligibility</p>
            <Pill tone={eligibilityTone}>
              {eligibility.level === "eligible"
                ? "Eligible"
                : eligibility.level === "almost"
                  ? "Almost"
                  : "Not eligible"}
            </Pill>
          </div>
          <ProgressBar value={eligibility.score} />
          <p className="mt-1.5 text-[11px] text-[#6B7280]">{eligibility.score}% requirements met</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleBookmark}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[12px] font-semibold",
              isBookmarked
                ? "border-[var(--color-accent)] bg-[#FFF4EF] text-[var(--color-accent)]"
                : "border-[#E5E7EB] text-[#374151]",
            )}
          >
            <Bookmark className={cn("h-3.5 w-3.5", isBookmarked && "fill-current")} />
            Save
          </button>
          {isActive && !isPending ? (
            <Link
              href={joinHref}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--color-accent)] text-[12px] font-bold text-white hover:bg-[#E54E18]"
            >
              {joinLabel}
            </Link>
          ) : isPending ? (
            <Link
              href={joinHref}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-[12px] font-bold text-amber-800"
            >
              {joinLabel}
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-xl bg-[#F3F4F6] text-[12px] font-semibold text-[#9CA3AF]">
              Closed
            </span>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-[11px] leading-relaxed text-emerald-800">
            Escrow-protected payouts. Approved creators are paid securely after review.
          </p>
        </div>
      </SectionCard>
    </aside>
  );
}

export function CampaignDetailMobileCta({
  campaign,
  campaignId,
  isJoined,
  isPending = false,
  isActive,
  joinHref,
  joinLabel,
}: {
  campaign: UGCCampaign;
  campaignId: string;
  isJoined: boolean;
  isPending?: boolean;
  isActive: boolean;
  joinHref: string;
  joinLabel: string;
}) {
  const { formatMoney } = useCurrency();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EEF0F2] bg-white/95 px-4 pt-3 backdrop-blur lg:hidden pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3">
        <div className="min-w-0 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">Earn up to</p>
          <p className="text-[16px] font-bold text-[var(--color-accent)]">
            {formatMoney(campaign.max_payout_per_sub ?? campaign.fixed_rate ?? campaign.rate_per_1k_views * 10, "USD")}
          </p>
        </div>
        {isActive || isPending ? (
          <Link
            href={joinHref}
            className={cn(
              "flex h-12 flex-1 items-center justify-center rounded-2xl text-sm font-bold shadow-[0_4px_16px_rgba(255,90,31,0.3)]",
              isPending
                ? "border border-amber-300 bg-amber-50 text-amber-800"
                : "bg-[var(--color-accent)] text-white",
            )}
          >
            {joinLabel}
          </Link>
        ) : (
          <div className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#F3F4F6] text-sm font-semibold text-[#9CA3AF]">
            Unavailable
          </div>
        )}
      </div>
    </div>
  );
}
