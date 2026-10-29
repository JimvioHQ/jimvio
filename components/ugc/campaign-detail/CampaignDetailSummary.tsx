"use client";

import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { budgetRemaining } from "@/lib/ugc/campaign-brief";
import { getCampaignRewardLine } from "@/components/ugc/workspace/ugc-campaign-utils";
import type { CampaignAction } from "@/lib/ugc/campaign-action";
import { JoinCampaignGateLink } from "@/components/ugc/join/JoinCampaignGateLink";
import { UGCFundingBadge } from "@/components/ugc/workspace/UGCFundingBadge";

export function CampaignDetailSummary({
  campaign,
  action,
}: {
  campaign: UGCCampaign;
  action: CampaignAction;
}) {
  const { formatMoney } = useCurrency();
  const budget = budgetRemaining(campaign);
  const spentPct =
    budget.known && budget.total
      ? Math.min(100, Math.round(((budget.spent ?? 0) / budget.total) * 100))
      : null;
  const rate = getCampaignRewardLine(campaign, formatMoney);
  const cap =
    campaign.max_payout_per_sub != null && campaign.max_payout_per_sub > 0
      ? formatMoney(campaign.max_payout_per_sub, "USD")
      : null;

  return (
    <div className="grid gap-3 rounded-2xl border border-[#E7E9EE] bg-white p-3 sm:p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0 border-[#EEF0F2] lg:border-r lg:pr-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-semibold text-[#6B7280]">Campaign budget</p>
          <UGCFundingBadge funding={campaign.funding} />
        </div>
        {budget.known && budget.remaining != null ? (
          <>
            <p className="mt-1 text-[22px] font-bold tabular-nums tracking-tight text-[#111827]">
              {formatMoney(
                campaign.funding ? Math.min(budget.remaining, campaign.funding.remainingUsd) : budget.remaining,
                "USD",
              )}{" "}
              <span className="text-[13px] font-semibold text-[#6B7280]">remaining</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
              <div className="h-full rounded-full bg-[#FF5A1F]" style={{ width: `${spentPct ?? 0}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-medium text-[#9CA3AF]">
              <span>{spentPct ?? 0}% spent</span>
              <span>100%</span>
            </div>
          </>
        ) : (
          <p className="mt-1 text-[14px] font-semibold text-[#374151]">Budget status unavailable</p>
        )}
        <p className="mt-1 text-[11px] leading-relaxed text-[#9CA3AF]">
          This is the campaign budget, not your wallet. This is not your current earnings.
        </p>
        {campaign.funding && campaign.funding.state !== "funded" ? (
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-amber-700">
            {campaign.funding.state === "awaiting_funds"
              ? "The brand has not funded this campaign yet. Payouts start once money is held in escrow."
              : "Only part of the budget is held in escrow. Payouts never exceed the money held."}
          </p>
        ) : null}
      </div>

      <div className="min-w-0 lg:px-2">
        <p className="text-[12px] font-semibold text-[#6B7280]">Compensation</p>
        <p className="mt-1 text-[18px] font-bold leading-snug text-[#111827]">{rate}</p>
        {cap ? <p className="mt-1 text-[12px] text-[#6B7280]">Cap per submission: {cap}</p> : null}
        <p className="mt-1 text-[11px] text-[#9CA3AF]">
          {campaign.payment_model === "fixed_per_content"
            ? "Quoted per approved submission."
            : "Quoted per 1,000 approved views."}
        </p>
      </div>

      <CampaignActionButton action={action} className="h-11 min-w-[168px] px-5" />
    </div>
  );
}

export function CampaignActionButton({
  action,
  className,
}: {
  action: CampaignAction;
  className?: string;
}) {
  const cls = `inline-flex items-center justify-center rounded-full bg-[#FF5A1F] text-[13px] font-bold text-white transition hover:bg-[#E54E18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#E5E7EB] disabled:text-[#6B7280] ${className ?? ""}`;
  if (!action.enabled || !action.href) {
    return (
      <button type="button" disabled className={cls}>
        {action.label}
      </button>
    );
  }
  return (
    <JoinCampaignGateLink href={action.href} className={cls}>
      {action.label}
      <span aria-hidden className="ml-1">
        →
      </span>
    </JoinCampaignGateLink>
  );
}
