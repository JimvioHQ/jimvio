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
        d="M4.7 8.2l2.1 2.1 4.5-4.5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        delay: Math.min(index * 0.02, 0.12),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -3 }}
      className="group h-full"
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[12px] border border-[#EEF0F2] bg-white",
          "shadow-[0_1px_2px_rgba(17,24,39,0.04),0_3px_10px_rgba(17,24,39,0.03)]",
          "transition-[box-shadow] duration-200",
          "hover:shadow-[0_6px_20px_rgba(17,24,39,0.09)]",
        )}
      >
        {/* Media — dominant, keep large */}
        <div
          className={cn(
            "relative shrink-0 overflow-hidden bg-[#F3F4F6]",
            featured
              ? "aspect-[5/3] sm:h-[148px] sm:aspect-auto"
              : "aspect-[5/3] sm:h-[128px] sm:aspect-auto",
          )}
        >
          <Link href={`/ugc/${c.id}`} className="absolute inset-0 block" aria-label={c.title}>
            {banner ? (
              // eslint-disable-next-line @next/next/no-img-element -- dynamic campaign CDN URLs
              <img
                src={banner}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.05]"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(145deg, #FFF4EF 0%, #F3F4F6 60%, #FFE8DC 100%)",
                }}
              />
            )}
          </Link>

          {featured ? (
            <span className="absolute left-2.5 top-2.5 z-[1] rounded-full bg-[#FF5A1F] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-[0_2px_8px_rgba(255,90,31,0.35)]">
              Featured
            </span>
          ) : null}

          {/* Hover Join Campaign CTA */}
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex justify-center px-3 pb-3",
              "translate-y-2 opacity-0 transition-all duration-200 ease-out",
              "group-hover:translate-y-0 group-hover:opacity-100",
              "motion-reduce:translate-y-0 motion-reduce:opacity-100",
            )}
          >
            <Link
              href={`/ugc/${c.id}/join`}
              className={cn(
                "pointer-events-auto inline-flex h-9 items-center justify-center rounded-full",
                "bg-[#FF5A1F] px-5 text-[12px] font-bold text-white",
                "shadow-[0_8px_22px_rgba(255,90,31,0.42),0_2px_6px_rgba(17,24,39,0.18)]",
                "transition-all duration-200 hover:bg-[#E54E18] hover:shadow-[0_10px_26px_rgba(255,90,31,0.5)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
              )}
            >
              Join Campaign
            </Link>
          </div>
        </div>

        {/* Compact body */}
        <Link href={`/ugc/${c.id}`} className="flex flex-col px-4 pb-3 pt-3">
          <div className="flex items-center gap-1.5">
            {c.vendor?.business_logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- dynamic vendor logos
              <img
                src={c.vendor.business_logo}
                alt=""
                loading="lazy"
                className="h-4 w-4 shrink-0 rounded-full border border-[#E8EAED] object-cover"
              />
            ) : (
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#FF5A1F] text-[7px] font-bold text-white">
                {c.vendor?.business_name?.[0] ?? "B"}
              </span>
            )}
            <span className="min-w-0 truncate text-[11px] font-semibold leading-none text-[#111827]">
              {c.vendor?.business_name ?? "Brand"}
            </span>
            <VerifiedBadge className="h-3 w-3" />
            <div className="ml-auto flex items-center gap-0.5 pl-1">
              {platforms.map((p) => {
                const Icon = PLATFORM_ICONS[p] ?? Share2;
                return (
                  <span key={p} className="text-[#A1A1AA]">
                    <Icon className="h-2.5 w-2.5" strokeWidth={1.75} />
                  </span>
                );
              })}
            </div>
          </div>

          <h3
            className={cn(
              "mt-1 line-clamp-2 font-bold leading-[1.3] tracking-[-0.01em] text-[#111827] transition-colors group-hover:text-[#FF5A1F]",
              featured ? "text-[13px]" : "text-[12.5px]",
            )}
          >
            {c.title}
          </h3>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1 text-[10.5px] font-medium text-[#6B7280]">
              <Users className="h-3 w-3 shrink-0 text-[#9CA3AF]" strokeWidth={2} />
              <span className="truncate">{formatCreatorCount(creators)} creators</span>
            </span>
            {clipBadge ? (
              <span className="shrink-0 rounded-[6px] bg-[#ECFDF5] px-1.5 py-[3px] text-[10px] font-bold tabular-nums leading-none tracking-tight text-[#059669]">
                {clipBadge}
              </span>
            ) : null}
          </div>
        </Link>
      </div>
    </motion.article>
  );
}

export const UGCPremiumCampaignCard = memo(UGCPremiumCampaignCardInner);
