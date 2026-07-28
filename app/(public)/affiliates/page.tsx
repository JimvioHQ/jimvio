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
import { getImage } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/seo";

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
  const maxRate = spotlight.reduce(
    (m, p) =>
      Math.max(
        m,
        Number(
          (p as { affiliate_commission_rate?: number | null })
            .affiliate_commission_rate ?? 0
        )
      ),
    0
  );
  const heroRate =
    maxRate > 0
      ? Math.round(maxRate)
      : Math.round(settings.fees.default_affiliate_commission_percent);

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
      value: maxRate > 0 ? `${Math.round(maxRate)}%` : `${heroRate}%`,
    },
    {
      label: "Live products",
      value: stats.totalProducts ? formatPlatformCount(stats.totalProducts) : "—",
    },
  ];

  const topProducts = spotlight.map((p) => {
    const row = p as {
      id: string;
      slug: string;
      name: string;
      price: number;
      currency?: string | null;
      images?: unknown;
      product_type?: string;
      affiliate_commission_rate?: number | null;
      sale_count?: number | null;
      view_count?: number | null;
      product_categories?: { name?: string | null } | null;
      vendors?: {
        business_name?: string | null;
        verification_status?: string | null;
      } | null;
    };
    const cat =
      row.product_categories?.name ?? row.product_type ?? "General";
    const rate = Number(
      row.affiliate_commission_rate ??
        settings.fees.default_affiliate_commission_percent
    );
    const currency = row.currency || "USD";
    const earning = Math.round(Number(row.price) * (rate / 100));
    const verification = row.vendors?.verification_status?.toLowerCase() ?? "";
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: cat,
      rate,
      commission: `${rate}%`,
      avgEarning: earning,
      engagement: Number(row.sale_count ?? 0) + Number(row.view_count ?? 0),
      currency,
      image: getImage(row.images),
      price: Number(row.price),
      sellerName: row.vendors?.business_name ?? null,
      verified:
        verification === "verified" ||
        verification === "approved" ||
        verification === "active",
    };
  });

  const maxEarning =
    topEarners.length > 0
      ? Math.max(...topEarners.map((a) => Number(a.total_earnings ?? 0)))
      : 1;

  return (
    <AffiliatesMarketingPage
      heroRate={heroRate}
      statsRow={statsRow}
      topProducts={topProducts}
      topEarners={topEarners}
      maxEarning={maxEarning}
      settings={settings}
      isLoggedIn={!!user}
      hasAffiliateAccount={!!affiliateRow}
    />
  );
}
