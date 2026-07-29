import { createClient } from "@/lib/supabase/server";
import { getAffiliateSpotlightProducts } from "@/services/db";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";
import { AffiliateAiClient } from "@/components/affiliate/AffiliateAiClient";

export default async function AffiliateAiPage() {
  const [spotlightRes, settings] = await Promise.all([
    getAffiliateSpotlightProducts(24),
    getResolvedPlatformSettings(),
  ]);

  const defaultRate = settings.fees.default_affiliate_commission_percent;
  const products = (spotlightRes.products ?? []).map((p) => {
    const row = p as {
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
    };
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.product_categories?.name ?? row.product_type ?? "General",
      price: Number(row.price ?? 0),
      currency: row.currency || "USD",
      rate: Number(row.affiliate_commission_rate ?? defaultRate),
      description: row.description ?? "",
      features: Array.isArray(row.features) ? row.features : [],
    };
  });

  // Ensure auth gate message surfaces via client generate call
  void (await createClient());

  return <AffiliateAiClient products={products} />;
}
