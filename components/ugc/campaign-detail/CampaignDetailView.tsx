"use client";

import { useParams } from "next/navigation";
import { CampaignDetailHero } from "./CampaignDetailHero";
import { CampaignDetailSections } from "./CampaignDetailSections";
import { CampaignActionButton, CampaignDetailSummary } from "./CampaignDetailSummary";
import { CampaignDetailSkeleton } from "./CampaignDetailSkeleton";
import { CampaignDetailError } from "./CampaignDetailError";
import { useCampaignDetail } from "./use-campaign-detail";
import { resolveCampaignPrimaryAction } from "@/lib/ugc/campaign-action";
import { countryPolicyFromJoinConfig, creatorCountryDecision } from "@/lib/ugc/campaign-brief";

export function CampaignDetailView() {
  const { id } = useParams<{ id: string }>();
  const { state, retry } = useCampaignDetail(id);

  if (state.status === "loading") return <CampaignDetailSkeleton />;
  if (state.status === "error") return <CampaignDetailError state={state} onRetry={retry} />;

  const { campaign, profile, participantStatus, submissionStatus } = state;
  const policy = countryPolicyFromJoinConfig(campaign.join_config);
  const countryDecision =
    policy.mode === "all" || !profile
      ? "unchecked"
      : creatorCountryDecision(policy, profile.country ?? null);
  const action = resolveCampaignPrimaryAction({
    campaignId: id,
    status: campaign.status,
    joinMode: campaign.join_mode,
    participantStatus,
    submissionStatus,
    endsAt: campaign.ends_at,
    countryDecision: participantStatus === "accepted" ? "allowed" : countryDecision,
  });

  return (
    <div className="bg-white pb-24 lg:pb-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 py-4 sm:px-6 sm:py-6">
        <CampaignDetailHero campaign={campaign} />
        <CampaignDetailSummary campaign={campaign} action={action} />
        <CampaignDetailSections campaign={campaign} />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EEF0F2] bg-white/95 p-3 backdrop-blur lg:hidden pb-[max(12px,env(safe-area-inset-bottom))]">
        <CampaignActionButton action={action} className="h-12 w-full" />
      </div>
    </div>
  );
}
