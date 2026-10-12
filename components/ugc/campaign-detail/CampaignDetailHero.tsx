"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { getCampaignOwnerAvatar } from "@/components/ugc/workspace/ugc-campaign-utils";
import { UGCVerifiedBadge } from "@/components/ugc/workspace/UGCVerifiedBadge";
import { safeHttpUrl } from "@/lib/ugc/campaign-brief";

type CampaignDetailHeroProps = {
  campaign: UGCCampaign;
};

export function CampaignDetailHero({ campaign }: CampaignDetailHeroProps) {
  const bannerMedia = (campaign.media ?? []).find((item) => item.usage === "banner");
  const banner = bannerMedia ? safeHttpUrl(bannerMedia.url) : null;
  const brandName = campaign.vendor?.business_name?.trim() || null;
  const ownerAvatar = getCampaignOwnerAvatar(campaign);
  const avatarName = brandName ?? campaign.title;
  const verified = campaign.vendor?.verification_status === "verified";

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E7E9EE] bg-white">
      <div className="relative h-[168px] bg-[#111827] sm:h-[210px]">
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[#1F2937]" />
        )}
        <div className="absolute left-3 top-3 flex items-center gap-2 sm:left-4 sm:top-4">
          <Link
            href="/ugc"
            className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Discover
          </Link>
          <span className="rounded-full bg-[#16A34A] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {campaign.status}
          </span>
        </div>
      </div>

      <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
        {ownerAvatar ? (
          <Image
            src={ownerAvatar}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl border border-[#EEF0F2] object-cover"
          />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#FFF1EA] text-base font-bold text-[#FF5A1F]">
            {avatarName[0]?.toUpperCase() ?? "J"}
          </div>
        )}
        <div className="min-w-0">
          {brandName ? (
            <p className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
              <span className="font-semibold text-[#111827]">{brandName}</span>
              {verified ? <UGCVerifiedBadge className="h-3.5 w-3.5" /> : null}
              {verified ? <span className="text-[11px] font-medium text-[#2563EB]">Verified</span> : null}
            </p>
          ) : null}
          <h1 className="mt-0.5 text-[20px] font-bold leading-tight tracking-tight text-[#111827] sm:text-[24px]">
            {campaign.title}
          </h1>
          {campaign.description ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[#6B7280]">
              {campaign.description.split("\n")[0]}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
