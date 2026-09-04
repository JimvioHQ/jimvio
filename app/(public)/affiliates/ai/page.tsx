import { createClient } from "@/lib/supabase/server";
import { getAffiliateSpotlightProducts } from "@/services/db";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";
import { AffiliateAiClient } from "@/components/affiliate/AffiliateAiClient";
import { PLATFORM_CURRENCY, toPlatformUsd } from "@/lib/currency/platform";
import { getSessionAffiliate } from "@/lib/affiliate/access";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ProductOpt = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  rate: number;
  description?: string;
  features?: string[];
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
    product_categories?: { name?: string | null } | null;
  },
  defaultRate: number
): ProductOpt {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.product_categories?.name ?? row.product_type ?? "General",
    price: toPlatformUsd(Number(row.price ?? 0), row.currency),
    currency: PLATFORM_CURRENCY,
    rate: Number(row.affiliate_commission_rate ?? defaultRate),
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

  // Prefer the affiliate's picked products first when available.
  if (affiliate?.id) {
    const admin = createServiceRoleClient() as any;
    const { data: picked } = await admin
      .from("affiliate_links")
      .select(
        "product_id, products(id, slug, name, price, currency, product_type, description, features, affiliate_commission_rate, product_categories(name))"
      )
      .eq("affiliate_id", affiliate.id)
      .eq("is_active", true)
      .not("product_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(40);

    for (const row of picked ?? []) {
      const product = row.products as Parameters<typeof mapProduct>[0] | null;
      if (!product?.id) continue;
      byId.set(product.id, mapProduct(product, defaultRate));
    }
  }

  // Ensure auth session is evaluated (client generate still gates).
  void (await createClient());

  const products = [...byId.values()];
  return <AffiliateAiClient products={products} />;
}
