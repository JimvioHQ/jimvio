"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AffiliateHero } from "./sections/AffiliateHero";
import { AffiliateCategories } from "./sections/AffiliateCategories";
import { AffiliateHowItWorks } from "./sections/AffiliateHowItWorks";
import { AffiliateProducts } from "./sections/AffiliateProducts";
import { AffiliateBottomCta } from "./sections/AffiliateBottomCta";
import { AFFILIATE_BTN_PRIMARY } from "./sections/shared";
import type { AffiliateSpotlightProduct } from "./sections/shared";
import type { ResolvedPlatformSettings } from "@/lib/platform-settings-shared";
import { cn } from "@/lib/utils";

type TopEarner = {
  id: string;
  user_id: string;
  total_conversions?: number | null;
  total_earnings?: number | null;
};

type AffiliatesMarketingPageProps = {
  heroRate: number;
  statsRow: { label: string; value: string }[];
  topProducts: AffiliateSpotlightProduct[];
  topEarners: TopEarner[];
  maxEarning: number;
  settings: ResolvedPlatformSettings;
  isLoggedIn: boolean;
  hasAffiliateAccount: boolean;
};

export function AffiliatesMarketingPage({
  heroRate,
  topProducts,
  isLoggedIn,
  hasAffiliateAccount,
}: AffiliatesMarketingPageProps) {
  const primaryCtaHref = hasAffiliateAccount
    ? "/affiliates/dashboard"
    : isLoggedIn
      ? "/activate/affiliate"
      : "/register?role=affiliate";

  return (
    <div className="relative min-h-screen bg-[#F7F8FA] font-sans text-[#111827]">
      <AffiliateHero heroRate={heroRate} primaryCtaHref={primaryCtaHref} />
      <AffiliateCategories />
      <AffiliateHowItWorks />
      <AffiliateProducts products={topProducts} />
      <AffiliateBottomCta primaryCtaHref={primaryCtaHref} />

      {/* Sticky mobile promote CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#FFE4D6]/80 bg-white/92 p-3 backdrop-blur-md sm:hidden safe-area-pb">
        <Link
          href={primaryCtaHref}
          className={cn(AFFILIATE_BTN_PRIMARY, "h-11 w-full px-4 text-[13.5px]")}
        >
          Start Promoting Now
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}
