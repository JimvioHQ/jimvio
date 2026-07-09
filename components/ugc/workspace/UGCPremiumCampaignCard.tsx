"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Instagram,
  Play,
  Share2,
  ShieldCheck,
  Users,
  Youtube,
} from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  formatCreatorCount,
  getCampaignBanner,
  getCampaignRewardLine,
  getClipRateBadge,
} from "./ugc-campaign-utils";

const PLATFORM_ICONS: Record<string, typeof Youtube> = {
  youtube: Youtube,
  instagram: Instagram,
  tiktok: Play,
  x: Share2,
};

type UGCPremiumCampaignCardProps = {
  campaign: UGCCampaign;
  bookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
  index?: number;
  compact?: boolean;
};

export function UGCPremiumCampaignCard({
  campaign: c,
  index = 0,
  compact = true,
}: UGCPremiumCampaignCardProps) {
  const { formatMoney } = useCurrency();
  const banner = getCampaignBanner(c);
  const rewardLine = getCampaignRewardLine(c, formatMoney);
  const clipBadge = getClipRateBadge(c, formatMoney);
  const platforms = (c.allowed_platforms ?? ["tiktok"]).slice(0, 3);
  const creators = c.submission_count ?? 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.02, 0.12), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="group h-full"
    >
      <Link
        href={`/ugc/${c.id}`}
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-[16px] border border-[#EEF0F2] bg-white shadow-[0_1px_6px_rgba(17,24,39,0.04)] transition-shadow duration-200 hover:shadow-[0_3px_12px_rgba(17,24,39,0.07)]",
          compact && "min-h-[148px]"
        )}
      >
        <div className="relative h-[64px] shrink-0 overflow-hidden bg-[#F3F4F6] sm:h-[68px]">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic campaign CDN URLs
            <img
              src={banner}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-400 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #FFF4EF 0%, #F9FAFB 100%)",
              }}
            />
          )}
        </div>

        <div className="flex flex-1 flex-col p-2">
          <div className="mb-1 flex items-center gap-1">
            {c.vendor?.business_logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- dynamic vendor logos
              <img
                src={c.vendor.business_logo}
                alt=""
                className="h-4 w-4 shrink-0 rounded-full border border-[#E8EAED] object-cover"
              />
            ) : (
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#FF5A1F] text-[7px] font-bold text-white">
                {c.vendor?.business_name?.[0] ?? "B"}
              </span>
            )}
            <span className="min-w-0 truncate text-[10px] font-semibold text-[#111827]">
              {c.vendor?.business_name ?? "Brand"}
            </span>
            <ShieldCheck className="h-3 w-3 shrink-0 text-[#3B82F6]" aria-hidden />
            <div className="ml-auto flex gap-px">
              {platforms.map((p) => {
                const Icon = PLATFORM_ICONS[p] ?? Share2;
                return (
                  <span key={p} className="text-[#9CA3AF]">
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                );
              })}
            </div>
          </div>

          <h3 className="line-clamp-2 min-h-[1.75rem] text-[11px] font-bold leading-tight text-[#111827] group-hover:text-[#FF5A1F]">
            {c.title}
          </h3>

          <div className="mt-auto flex items-center justify-between gap-1 pt-1.5">
            <p className="truncate text-[10px] font-bold text-[#111827]">{rewardLine}</p>
            <div className="flex shrink-0 items-center gap-1">
              <span className="flex items-center gap-px text-[9px] font-medium text-[#6B7280]">
                <Users className="h-2.5 w-2.5" />
                {formatCreatorCount(creators)}
              </span>
              {clipBadge && (
                <span className="rounded bg-[#EFF6FF] px-1 py-px text-[8px] font-bold text-[#2563EB]">
                  {clipBadge}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
