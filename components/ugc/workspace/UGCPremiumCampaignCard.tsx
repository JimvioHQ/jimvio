"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Instagram,
  Play,
  Share2,
  Users,
  Youtube,
} from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  formatCreatorCount,
  getCampaignBanner,
  getClipRateBadge,
} from "./ugc-campaign-utils";

const PLATFORM_ICONS: Record<string, typeof Youtube> = {
  youtube: Youtube,
  instagram: Instagram,
  tiktok: Play,
  x: Share2,
};

/** Premium blue verified mark — flat, minimal, no glow */
function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("shrink-0", className)}
      aria-label="Verified"
      role="img"
    >
      <circle cx="8" cy="8" r="8" fill="#1D9BF0" />
      <path
        d="M4.75 8.15l2.05 2.05 4.45-4.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type UGCPremiumCampaignCardProps = {
  campaign: UGCCampaign;
  index?: number;
  /** Featured row — same language, larger media */
  featured?: boolean;
};

function UGCPremiumCampaignCardInner({
  campaign: c,
  index = 0,
  featured = false,
}: UGCPremiumCampaignCardProps) {
  const { formatMoney } = useCurrency();
  const banner = getCampaignBanner(c);
  const clipBadge = getClipRateBadge(c, formatMoney);
  const platforms = (c.allowed_platforms ?? ["tiktok"]).slice(0, 3);
  const creators = c.submission_count ?? 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.32,
        delay: Math.min(index * 0.025, 0.14),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -3 }}
      className="group h-full"
    >
      <Link
        href={`/ugc/${c.id}`}
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-[14px] border border-[#EEF0F2] bg-white",
          "shadow-[0_1px_3px_rgba(17,24,39,0.04),0_4px_14px_rgba(17,24,39,0.03)]",
          "transition-[box-shadow,transform] duration-200",
          "hover:shadow-[0_4px_8px_rgba(17,24,39,0.05),0_12px_28px_rgba(17,24,39,0.08)]",
        )}
      >
        {/* Media — keep large */}
        <div
          className={cn(
            "relative shrink-0 overflow-hidden bg-[#F3F4F6]",
            featured ? "aspect-[16/10] sm:h-[132px] sm:aspect-auto" : "aspect-[16/10] sm:h-[112px] sm:aspect-auto",
          )}
        >
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic campaign CDN URLs
            <img
              src={banner}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.045]"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #FFF4EF 0%, #F3F4F6 55%, #EEF2FF 100%)",
              }}
            />
          )}
        </div>

        {/* Content — compact 16–18px padding, tight vertical rhythm */}
        <div className="flex flex-1 flex-col px-[16px] pb-[14px] pt-[14px] sm:px-[17px] sm:pb-[15px] sm:pt-[15px]">
          <div className="flex items-center gap-1.5">
            {c.vendor?.business_logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- dynamic vendor logos
              <img
                src={c.vendor.business_logo}
                alt=""
                loading="lazy"
                className="h-[18px] w-[18px] shrink-0 rounded-full border border-[#E8EAED] object-cover"
              />
            ) : (
              <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#FF5A1F] text-[8px] font-bold text-white">
                {c.vendor?.business_name?.[0] ?? "B"}
              </span>
            )}
            <span className="min-w-0 truncate text-[12px] font-semibold leading-none text-[#111827]">
              {c.vendor?.business_name ?? "Brand"}
            </span>
            <VerifiedBadge className="h-[13px] w-[13px]" />
            <div className="ml-auto flex items-center gap-0.5">
              {platforms.map((p) => {
                const Icon = PLATFORM_ICONS[p] ?? Share2;
                return (
                  <span key={p} className="text-[#9CA3AF]">
                    <Icon className="h-3 w-3" strokeWidth={1.75} />
                  </span>
                );
              })}
            </div>
          </div>

          <h3
            className={cn(
              "mt-1.5 line-clamp-2 font-bold leading-[1.25] tracking-[-0.01em] text-[#111827] transition-colors group-hover:text-[#FF5A1F]",
              featured ? "text-[13.5px]" : "text-[13px]",
            )}
          >
            {c.title}
          </h3>

          <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
            <span className="flex min-w-0 items-center gap-1 text-[11px] font-medium text-[#6B7280]">
              <Users className="h-3 w-3 shrink-0 text-[#9CA3AF]" strokeWidth={2} />
              <span className="truncate">{formatCreatorCount(creators)} creators</span>
            </span>
            {clipBadge ? (
              <span className="shrink-0 rounded-md bg-[#ECFDF5] px-1.5 py-0.5 text-[10px] font-bold tabular-nums tracking-tight text-[#059669]">
                {clipBadge}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export const UGCPremiumCampaignCard = memo(UGCPremiumCampaignCardInner);
