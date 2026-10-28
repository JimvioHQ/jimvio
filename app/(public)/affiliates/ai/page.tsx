import { createClient } from "@/lib/supabase/server";
import { getAffiliateSpotlightProducts } from "@/services/db";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";
import { AffiliateAiClient } from "@/components/affiliate/AffiliateAiClient";
import { offerForAffiliateProduct } from "@/lib/affiliate/commission-tiers";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import { getSessionAffiliate } from "@/lib/affiliate/access";
import { trackingUrlForOwnedLink } from "@/lib/affiliate/owned-tracking-url";
import { getSiteUrl } from "@/lib/site-url";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ProductOpt = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  rate: number;
  earning: number;
  description?: string;
  features?: string[];
  trackingUrl?: string | null;
};

function mapProduct(
  row: {
    id: string;
    slug: string;
    name: string;
    price: number;
    currency?: string | null;
    product_type?: string | null;
    description?: string | null;
    features?: string[] | null;
    affiliate_commission_rate?: number | null;
    affiliate_price?: number | null;
    product_categories?: { name?: string | null } | null;
  },
  defaultRate: number
): ProductOpt {
  const offer = offerForAffiliateProduct({
    price: Number(row.price ?? 0),
    currency: row.currency,
    configuredPercent: row.affiliate_commission_rate,
    fallbackPercent: defaultRate,
    fixedEarning: row.affiliate_price,
  });
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.product_categories?.name ?? row.product_type ?? "General",
    price: offer.priceUsd,
    currency: PLATFORM_CURRENCY,
    rate: offer.rate ?? 0,
    earning: offer.earningUsd,
    description: row.description ?? "",
    features: Array.isArray(row.features) ? row.features : [],
  };
}

export default async function AffiliateAiPage() {
  const [spotlightRes, settings, affiliate] = await Promise.all([
    getAffiliateSpotlightProducts(24),
    getResolvedPlatformSettings(),
    getSessionAffiliate({ requireActive: false }),
  ]);

  const defaultRate = settings.fees.default_affiliate_commission_percent;
  const byId = new Map<string, ProductOpt>();

  for (const p of spotlightRes.products ?? []) {
    const mapped = mapProduct(
      p as Parameters<typeof mapProduct>[0],
      defaultRate
    );
    byId.set(mapped.id, mapped);
  }

  // Prefer the affiliate's own active product links. The newest link for each product wins.
  if (affiliate?.id) {
    const admin = createServiceRoleClient() as any;
    const siteUrl = getSiteUrl();
    const { data: picked } = await admin
      .from("affiliate_links")
      .select(
        "product_id, link_code, expires_at, products(id, slug, name, price, currency, product_type, description, features, affiliate_commission_rate, affiliate_price, product_categories(name))"
      )
      .eq("affiliate_id", affiliate.id)
      .eq("is_active", true)
      .not("product_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(40);

    const trackedFor = new Set<string>();
    for (const row of picked ?? []) {
      const product = row.products as Parameters<typeof mapProduct>[0] | null;
      if (!product?.id) continue;
      const mapped = mapProduct(product, defaultRate);
      let trackingUrl = byId.get(product.id)?.trackingUrl ?? null;
      if (!trackedFor.has(product.id)) {
        trackedFor.add(product.id);
        trackingUrl = trackingUrlForOwnedLink({
          siteUrl,
          linkCode: row.link_code,
          expiresAt: row.expires_at,
        });
      }
      byId.set(product.id, { ...mapped, trackingUrl });
    }
  }

  // Ensure auth session is evaluated (client generate still gates).
  void (await createClient());

  const products = [...byId.values()].sort(
    (a, b) => Number(Boolean(b.trackingUrl)) - Number(Boolean(a.trackingUrl)),
  );
  return <AffiliateAiClient products={products} />;
}
