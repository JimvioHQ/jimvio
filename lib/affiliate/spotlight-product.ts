import { getImage } from "@/lib/utils";
import { formatAffiliateRate, offerForAffiliateProduct } from "@/lib/affiliate/commission-tiers";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import type { AffiliateSpotlightProduct } from "@/components/affiliate/sections/shared";

type RawAffiliateProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency?: string | null;
  images?: unknown;
  product_type?: string;
  affiliate_commission_rate?: number | null;
  affiliate_price?: number | null;
  sale_count?: number | null;
  view_count?: number | null;
  product_categories?: { name?: string | null } | null;
  vendors?: {
    business_name?: string | null;
    verification_status?: string | null;
  } | null;
};

/** Map a catalog product row into Affiliate Center spotlight card shape (USD). */
export function mapAffiliateSpotlightProduct(
  p: RawAffiliateProduct,
  defaultCommissionPercent: number
): AffiliateSpotlightProduct {
  const cat = p.product_categories?.name ?? p.product_type ?? "General";
  const offer = offerForAffiliateProduct({
    price: Number(p.price),
    currency: p.currency,
    configuredPercent: p.affiliate_commission_rate,
    fallbackPercent: defaultCommissionPercent,
    fixedEarning: p.affiliate_price,
  });
  const priceUsd = offer.priceUsd;
  const rate = offer.rate ?? 0;
  const earning = offer.earningUsd;
  const verification = p.vendors?.verification_status?.toLowerCase() ?? "";

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: cat,
    rate,
    commission: `${formatAffiliateRate(rate)}%`,
    avgEarning: earning,
    engagement: Number(p.sale_count ?? 0) + Number(p.view_count ?? 0),
    currency: PLATFORM_CURRENCY,
    image: getImage(p.images),
    price: priceUsd,
    sellerName: p.vendors?.business_name ?? null,
    verified:
      verification === "verified" ||
      verification === "approved" ||
      verification === "active",
  };
}
