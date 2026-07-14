"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Copy,
  Share2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { UGCCampaign } from "@/types/ugc";
import { cn } from "@/lib/utils";
import {
  formatCountdown,
  getCampaignBanner,
  getCampaignCategory,
  getCampaignTags,
  getDaysRemaining,
  isFeaturedCampaign,
} from "@/lib/ugc/campaign-detail";
import { Pill } from "./campaign-detail-ui";

type CampaignDetailHeroProps = {
  campaign: UGCCampaign;
  campaignId: string;
  isJoined: boolean;
  isPending?: boolean;
  isBookmarked: boolean;
  isActive: boolean;
  joinHref: string;
  joinLabel: string;
  onShare: () => void;
  onCopyLink: () => void;
  onToggleBookmark: () => void;
};

export function CampaignDetailHero({
  campaign,
  campaignId,
  isJoined,
  isPending = false,
  isBookmarked,
  isActive,
  joinHref,
  joinLabel,
  onShare,
  onCopyLink,
  onToggleBookmark,
}: CampaignDetailHeroProps) {
  const banner = getCampaignBanner(campaign);
  const daysLeft = getDaysRemaining(campaign.ends_at);
  const countdown = formatCountdown(campaign.ends_at);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative overflow-hidden border-b border-[#EEF0F2] bg-white">
      <div className="relative h-[180px] sm:h-[220px] lg:h-[260px]">
        {banner ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #FFF4EF 0%, #F9FAFB 55%, #EEF2FF 100%)" }}
          />
        )}

        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-between px-4 py-4 sm:px-6">
          <Link
            href="/ugc"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm transition hover:bg-black/30"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Discover
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {isFeaturedCampaign(campaign) ? (
              <Pill tone="brand">
                <Sparkles className="h-3 w-3" />
                Featured
              </Pill>
            ) : null}
            <Pill tone={isActive ? "success" : "neutral"}>{campaign.status}</Pill>
            <Pill tone="info">{getCampaignCategory(campaign)}</Pill>
            {countdown ? <Pill tone={daysLeft !== null && daysLeft <= 3 ? "danger" : "warning"}>{countdown}</Pill> : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="relative shrink-0">
              {campaign.vendor?.business_logo ? (
                <Image
                  src={campaign.vendor.business_logo}
                  alt={campaign.vendor.business_name}
                  width={64}
                  height={64}
                  className="h-14 w-14 rounded-2xl border-2 border-white object-cover shadow-md sm:h-16 sm:w-16"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[#FF7A45] text-lg font-bold text-white shadow-md sm:h-16 sm:w-16">
                  {campaign.vendor?.business_name?.[0] ?? "B"}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#6B7280]">
                <span className="font-semibold text-[#111827]">{campaign.vendor?.business_name ?? "Brand"}</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" aria-label="Verified brand" />
              </p>
              <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-[#111827] sm:text-[28px]">
                {campaign.title}
              </h1>
              {campaign.description ? (
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#6B7280] sm:text-sm">
                  {campaign.description.split("\n")[0]}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {getCampaignTags(campaign).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-medium text-[#4B5563]"
                  >
                    {tag}
                  </span>
                ))}
                <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-medium text-[#4B5563]">
                  Global
                </span>
                <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-medium text-[#4B5563]">
                  English
                </span>
                <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-medium text-[#4B5563]">
                  Published {new Date(campaign.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 flex-wrap items-center gap-2 lg:flex">
            <button
              type="button"
              onClick={onToggleBookmark}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-[12px] font-semibold transition",
                isBookmarked
                  ? "border-[var(--color-accent)] bg-[#FFF4EF] text-[var(--color-accent)]"
                  : "border-[#E5E7EB] bg-white text-[#374151] hover:border-[var(--color-accent)]/40",
              )}
              aria-pressed={isBookmarked}
            >
              <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
              {isBookmarked ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#374151] transition hover:border-[var(--color-accent)]/40"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-[#374151] transition hover:border-[var(--color-accent)]/40"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy link"}
            </button>
            {isActive && !isPending && campaign.join_mode !== "invite_only" ? (
              <Link
                href={joinHref}
                className="inline-flex h-10 items-center rounded-xl bg-[var(--color-accent)] px-5 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(255,90,31,0.28)] transition hover:bg-[#E54E18]"
              >
                {joinLabel}
              </Link>
            ) : isPending ? (
              <Link
                href={joinHref}
                className="inline-flex h-10 items-center rounded-xl border border-amber-300 bg-amber-50 px-5 text-[13px] font-bold text-amber-800"
              >
                {joinLabel}
              </Link>
            ) : (
              <span className="inline-flex h-10 items-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 text-[13px] font-semibold text-[#9CA3AF]">
                Unavailable
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
