"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { CampaignDetailHero } from "./CampaignDetailHero";
import { CampaignDetailSections } from "./CampaignDetailSections";
import { CampaignDetailSidebar, CampaignDetailMobileCta } from "./CampaignDetailSidebar";
import { CampaignDetailSkeleton } from "./CampaignDetailSkeleton";
import { CampaignDetailError } from "./CampaignDetailError";
import { useCampaignDetail } from "./use-campaign-detail";
import { useLocale } from "@/context/LocaleContext";

export function CampaignDetailView() {
  const { id } = useParams<{ id: string }>();
  const { state, retry, toggleBookmark } = useCampaignDetail(id);
  const { t } = useLocale();

  const share = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const title = state.status === "ready" ? state.campaign.title : "Jimvio Campaign";
    if (navigator.share) {
      void navigator.share({ title, url });
    } else {
      void navigator.clipboard.writeText(url);
    }
  }, [state]);

  const copyLink = useCallback(() => {
    if (typeof window !== "undefined") {
      void navigator.clipboard.writeText(window.location.href);
    }
  }, []);

  if (state.status === "loading") {
    return <CampaignDetailSkeleton />;
  }

  if (state.status === "error") {
    return <CampaignDetailError state={state} onRetry={retry} />;
  }

  const { campaign, isJoined, isBookmarked, profile, similar, isPending } = state;
  const isActive = campaign.status === "active";
  const joinHref = isJoined
    ? `/ugc/${id}/dashboard`
    : isPending
      ? `/ugc/${id}/application`
      : `/ugc/${id}/join`;
  const joinLabel = isJoined
    ? t("openDashboard")
    : isPending
      ? t("viewApplication")
      : campaign.join_mode === "application" || campaign.join_mode === "hybrid"
        ? t("applyNow")
        : campaign.join_mode === "invite_only"
          ? t("inviteOnly")
          : t("joinCampaign");

  return (
    <div className="bg-[#FAFAFA] pb-28 lg:pb-10">
      <CampaignDetailHero
        campaign={campaign}
        campaignId={id}
        isJoined={isJoined}
        isPending={isPending}
        isBookmarked={isBookmarked}
        isActive={isActive}
        joinHref={joinHref}
        joinLabel={joinLabel}
        onShare={share}
        onCopyLink={copyLink}
        onToggleBookmark={toggleBookmark}
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <CampaignDetailSections campaign={campaign} profile={profile} similar={similar} />
        <CampaignDetailSidebar
          campaign={campaign}
          campaignId={id}
          isJoined={isJoined}
          isPending={isPending}
          isBookmarked={isBookmarked}
          isActive={isActive}
          joinHref={joinHref}
          joinLabel={joinLabel}
          profile={profile}
          onToggleBookmark={toggleBookmark}
          onShare={share}
        />
      </div>

      <CampaignDetailMobileCta
        campaign={campaign}
        campaignId={id}
        isJoined={isJoined}
        isPending={isPending}
        isActive={isActive}
        joinHref={joinHref}
        joinLabel={joinLabel}
      />
    </div>
  );
}
