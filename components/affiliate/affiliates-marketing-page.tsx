import { AffiliateHero } from "./sections/AffiliateHero";
import { AffiliateCategories } from "./sections/AffiliateCategories";
import { AffiliateHowItWorks } from "./sections/AffiliateHowItWorks";
import { AffiliateBoostEarnings } from "./sections/AffiliateBoostEarnings";
import { AffiliateProducts } from "./sections/AffiliateProducts";
import { AffiliateBottomCta } from "./sections/AffiliateBottomCta";
import type { AffiliateSpotlightProduct } from "./sections/shared";
import type { ResolvedPlatformSettings } from "@/lib/platform-settings-shared";

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
    ? "/dashboard/analytics"
    : isLoggedIn
      ? "/dashboard/activate/affiliate"
      : "/register?role=affiliate";

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans text-[#111827]">
      <AffiliateHero heroRate={heroRate} primaryCtaHref={primaryCtaHref} />
      <AffiliateCategories />
      <AffiliateHowItWorks />
      <AffiliateBoostEarnings />
      <AffiliateProducts products={topProducts} />
      <AffiliateBottomCta primaryCtaHref={primaryCtaHref} />
    </div>
  );
}
