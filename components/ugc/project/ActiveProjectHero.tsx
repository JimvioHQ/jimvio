"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import type { ProjectStage } from "@/lib/ugc/active-project";
import { STAGE_LABELS } from "@/lib/ugc/active-project";
import { getCampaignBanner, getDaysRemaining, formatCountdown } from "@/lib/ugc/campaign-detail";
import { Pill } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import { ProjectProgressBar } from "./active-project-ui";

type ActiveProjectHeroProps = {
  campaign: UGCCampaign;
  stage: ProjectStage;
  progressPercent: number;
  joinedAt?: string;
  rewardType: string;
};

export function ActiveProjectHero({
  campaign,
  stage,
  progressPercent,
  joinedAt,
  rewardType,
}: ActiveProjectHeroProps) {
  const banner = getCampaignBanner(campaign);
  const daysLeft = getDaysRemaining(campaign.ends_at);
  const countdown = formatCountdown(campaign.ends_at);
  const isArchived = campaign.status === "completed" || campaign.status === "cancelled";
  const isExpired = daysLeft !== null && daysLeft <= 0;

  return (
    <div className="relative overflow-hidden border-b border-[#EEF0F2] bg-white">
      <div className="relative h-[180px] sm:h-[220px]">
        {banner ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #FFF4EF 0%, #F9FAFB 55%, #EEF2FF 100%)" }}
          />
        )}

        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/ugc"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/80 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Active projects
            </Link>
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone="brand">
                <Sparkles className="mr-0.5 h-3 w-3" />
                Workspace
              </Pill>
              {isArchived ? <Pill tone="neutral">Archived</Pill> : null}
              {isExpired && !isArchived ? <Pill tone="warning">Expired</Pill> : null}
            </div>
          </div>

          <div className="flex items-end gap-4">
            {campaign.vendor?.business_logo ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 border-white/30 bg-white shadow-lg sm:h-16 sm:w-16">
                <Image
                  src={campaign.vendor.business_logo}
                  alt={campaign.vendor.business_name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                {campaign.vendor?.business_name ?? "Brand"} · {rewardType}
              </p>
              <h1 className="truncate text-xl font-bold sm:text-2xl">{campaign.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone={campaign.status === "active" ? "success" : "neutral"}>
                  Campaign: {campaign.status}
                </Pill>
                <Pill tone="info">Project: {STAGE_LABELS[stage]}</Pill>
                {joinedAt ? (
                  <span className="text-[11px] text-white/70">
                    Joined {new Date(joinedAt).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#6B7280]">
            {daysLeft !== null && daysLeft > 0 ? (
              <span>
                <strong className="text-[#111827]">{daysLeft}</strong> day{daysLeft === 1 ? "" : "s"} remaining
              </span>
            ) : null}
            {countdown ? (
              <span className="font-mono text-[#FF5A1F]">{countdown}</span>
            ) : null}
          </div>
          <div className="w-full sm:max-w-xs">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#6B7280]">Progress</span>
              <span className="font-bold text-[#111827]">{progressPercent}%</span>
            </div>
            <ProjectProgressBar value={progressPercent} />
          </div>
        </div>
      </div>
    </div>
  );
}
