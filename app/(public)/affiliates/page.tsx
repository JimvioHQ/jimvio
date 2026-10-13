import type { Metadata } from "next";
import { AffiliatesMarketingPage } from "@/components/affiliate/affiliates-marketing-page";
import {
  getTopAffiliates,
  getAffiliateProgramStats,
  getAffiliateSpotlightProducts,
  getAffiliateById,
} from "@/services/db";
import {
  formatPlatformCount,
  getResolvedPlatformSettings,
} from "@/lib/platform-settings";
import { createClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/seo";
import { formatAffiliateRate } from "@/lib/affiliate/commission-tiers";
import { mapAffiliateSpotlightProduct } from "@/lib/affiliate/spotlight-product";

export const metadata: Metadata = pageMetadata("affiliates");

export default async function AffiliatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [topEarners, stats, spotlightRes, settings, affiliateRow] =
    await Promise.all([
      getTopAffiliates(5),
      getAffiliateProgramStats(),
      getAffiliateSpotlightProducts(10),
      getResolvedPlatformSettings(),
      user ? getAffiliateById(user.id) : Promise.resolve(null),
    ]);

  const spotlight = spotlightRes.products ?? [];
  const topProducts = spotlight.map((p) =>
    mapAffiliateSpotlightProduct(
      p as Parameters<typeof mapAffiliateSpotlightProduct>[0],
      settings.fees.default_affiliate_commission_percent
    )
  );
  const maxRate = topProducts.reduce((m, p) => Math.max(m, p.rate), 0);
  const heroRate =
    maxRate > 0
      ? maxRate
      : settings.fees.default_affiliate_commission_percent;

  const statsRow = [
    {
      label: "Active affiliates",
      value: stats.affiliateCount ? formatPlatformCount(stats.affiliateCount) : "—",
    },
    {
      label: "Affiliate SKUs",
      value: stats.affiliateSkus ? formatPlatformCount(stats.affiliateSkus) : "—",
    },
    {
      label: "Top commission",
      value: `${formatAffiliateRate(heroRate)}%`,
    },
    {
      label: "Live products",
      value: stats.totalProducts ? formatPlatformCount(stats.totalProducts) : "—",
    },
  ];

  const maxEarning =
    topEarners.length > 0
      ? Math.max(...topEarners.map((a) => Number(a.total_earnings ?? 0)))
      : 1;

  return (
    <AffiliatesMarketingPage
      heroRate={heroRate}
      statsRow={statsRow}
      topProducts={topProducts}
      catalogTotal={Number(spotlightRes.total ?? topProducts.length)}
      topEarners={topEarners}
      maxEarning={maxEarning}
      settings={settings}
      isLoggedIn={!!user}
      hasAffiliateAccount={!!affiliateRow && affiliateRow.is_active !== false}
    />
  );
}
