"use client";

import { Bookmark, Share2, ShieldCheck, Users } from "lucide-react";
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
import { getCampaignRewardLine } from "@/components/ugc/workspace/ugc-campaign-utils";
import { MetricTile, Pill, ProgressBar, SectionCard } from "./campaign-detail-ui";
import { UGCPlatformMarks } from "@/components/ugc/workspace/UGCPlatformMarks";
import { JoinCampaignGateLink } from "@/components/ugc/join/JoinCampaignGateLink";

type CampaignDetailSidebarProps = {
  campaign: UGCCampaign;
  campaignId: string;
  isJoined: boolean;
  isPending?: boolean;
  participantStatus?: string | null;
  isBookmarked: boolean;
  isActive: boolean;
  joinHref: string;
  joinLabel: string;
  profile: CreatorProfileSnapshot | null;
  onToggleBookmark: () => void;
  onShare?: () => void;
  sticky?: boolean;
};

function remainingSlots(campaign: UGCCampaign): number | null {
  const cfg = campaign.join_config as { maxParticipants?: number } | null | undefined;
  const max = campaign.max_participants ?? cfg?.maxParticipants ?? null;
  if (max == null || max <= 0) return null;
  return Math.max(0, max - (campaign.approved_count ?? campaign.submission_count ?? 0));
}

export function CampaignDetailSidebar({
  campaign,
  campaignId,
  isJoined,
  isPending = false,
  participantStatus = null,
  isBookmarked,
  isActive,
  joinHref,
  joinLabel,
  profile,
  onToggleBookmark,
  onShare,
  sticky = true,
}: CampaignDetailSidebarProps) {
  const { formatMoney } = useCurrency();
  const rewardType = getRewardType(campaign);
  const remaining = getRemainingBudget(campaign);
  const budgetPct = Math.min(
    100,
    ((campaign.spent_budget ?? 0) / (campaign.total_budget || 1)) * 100,
  );
  const eligibility = buildEligibility(campaign, profile);
  const countdown = formatCountdown(campaign.ends_at);
  const creatorsJoined = campaign.approved_count ?? campaign.submission_count ?? 0;
  const slotsLeft = remainingSlots(campaign);
  const hasBudget = Number(campaign.total_budget) > 0;
  const participation =
    participantStatus === "accepted" || isJoined
      ? "Joined"
      : participantStatus === "pending"
        ? "Application pending"
        : participantStatus === "waitlisted"
          ? "Waitlisted"
          : participantStatus === "rejected"
            ? "Not accepted"
            : participantStatus === "invited"
              ? "Invited"
              : participantStatus === "withdrawn"
                ? "Withdrawn"
                : "Not joined";

  const eligibilityTone =
    eligibility.level === "eligible"
      ? "success"
      : eligibility.level === "almost"
        ? "warning"
        : "danger";

  return (
    <aside className={cn(sticky && "lg:sticky lg:top-4")}>
      <SectionCard className="space-y-4 shadow-[0_10px_36px_rgba(17,24,39,0.07)] ring-1 ring-[#FFE4D6]/50">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">Your rate</p>
          <p className="mt-1 text-[22px] font-bold tracking-tight text-[#FF5A1F]">
            {getCampaignRewardLine(campaign, formatMoney)}
          </p>
          <p className="text-[12px] text-[#6B7280]">
            {campaign.payment_model === "per_views"
              ? "Per 1,000 approved views. This is not your current earnings."
              : "Per approved clip. This is not your current earnings."}
          </p>
          <p className="mt-2 text-[12px] font-medium text-[#374151]">Status: {participation}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone="brand">{rewardType}</Pill>
            <Pill tone={isActive ? "success" : "neutral"}>{campaign.status}</Pill>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Creators joined" value={String(creatorsJoined)} />
          <MetricTile
            label="Remaining slots"
            value={slotsLeft == null ? "Open" : String(slotsLeft)}
          />
        </div>

        {hasBudget ? (
          <div>
            <div className="mb-2 flex items-center justify-between text-[12px]">
              <span className="font-semibold text-[#374151]">Campaign budget left</span>
              <span className="font-bold tabular-nums text-[#111827]">
                {formatMoney(remaining, "USD")}
              </span>
            </div>
            <ProgressBar value={100 - budgetPct} />
            <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
              {formatMoney(campaign.spent_budget ?? 0, "USD")} recorded against{" "}
              {formatMoney(campaign.total_budget, "USD")} campaign budget. This is the brand’s
              budget, not a balance in your wallet.
            </p>
          </div>
        ) : null}

        {countdown ? (
          <MetricTile label="Timeline" value={countdown} sub="Submission window" />
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
          <p className="mt-1.5 text-[11px] text-[#6B7280]">
            {eligibility.score}% requirements met
          </p>
        </div>

        {isActive && !isPending && campaign.join_mode !== "invite_only" ? (
          <JoinCampaignGateLink
            href={joinHref}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#FF5A1F] text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(255,90,31,0.35)] transition hover:bg-[#E54E18]"
          >
            {joinLabel}
          </JoinCampaignGateLink>
        ) : isPending ? (
          <JoinCampaignGateLink
            href={joinHref}
            className="flex h-11 w-full items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-[13px] font-bold text-amber-800"
          >
            {joinLabel}
          </JoinCampaignGateLink>
        ) : campaign.join_mode === "invite_only" ? (
          <span className="flex h-11 w-full items-center justify-center rounded-full bg-[#F3F4F6] text-[13px] font-semibold text-[#6B7280]">
            Invite only
          </span>
        ) : (
          <span className="flex h-11 w-full items-center justify-center rounded-full bg-[#F3F4F6] text-[13px] font-semibold text-[#9CA3AF]">
            Campaign closed
          </span>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleBookmark}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[12px] font-semibold transition",
              isBookmarked
                ? "border-[#FF5A1F] bg-[#FFF4EF] text-[#FF5A1F]"
                : "border-[#E5E7EB] text-[#374151] hover:border-[#FF5A1F]/40",
            )}
          >
            <Bookmark className={cn("h-3.5 w-3.5", isBookmarked && "fill-current")} />
            {isBookmarked ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] text-[12px] font-semibold text-[#374151] transition hover:border-[#FF5A1F]/40"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-[11px] leading-relaxed text-emerald-800">
            Rewards are quoted after the brand approves a submission. Approved views are what
            count for CPM. Jimvio does not promise a payout date on this page.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" aria-hidden />
          {(campaign.allowed_platforms ?? []).length > 0 ? (
            <UGCPlatformMarks platforms={campaign.allowed_platforms ?? []} />
          ) : (
            <span className="text-[11px] text-[#9CA3AF]">Multi-platform</span>
          )}
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
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
            Rate
          </p>
          <p className="text-[16px] font-bold text-[#FF5A1F]">
            {getCampaignRewardLine(campaign, formatMoney)}
          </p>
        </div>
        {isPending ? (
          <JoinCampaignGateLink
            href={joinHref}
            className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 text-sm font-bold text-amber-800 shadow-[0_4px_16px_rgba(255,90,31,0.3)]"
          >
            {joinLabel}
          </JoinCampaignGateLink>
        ) : isActive && campaign.join_mode !== "invite_only" ? (
          <JoinCampaignGateLink
            href={joinHref}
            className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#FF5A1F] text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,90,31,0.3)]"
          >
            {joinLabel}
          </JoinCampaignGateLink>
        ) : (
          <div className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#F3F4F6] text-sm font-semibold text-[#9CA3AF]">
            {campaign.join_mode === "invite_only" ? "Invite only" : "Unavailable"}
          </div>
        )}
      </div>
    </div>
  );
}
