import { getSessionAffiliate } from "@/lib/affiliate/access";
import {
  affiliateCategoryName,
  assembleAffiliateProductContext,
  promotionInputFromContext,
  type AffiliateProductSource,
} from "@/lib/ai/affiliate-product-facts";
import type { AffiliateAuthoritativeContext } from "@/lib/ai/affiliate-workspace";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";
import { createClient } from "@/lib/supabase/server";

export {
  affiliateCategoryName,
  assembleAffiliateProductContext,
  promotionInputFromContext,
  type AffiliateProductSource,
};

export async function loadAffiliateProductContext(
  productId: string,
  options: { assetTypes?: string[]; platform?: string | null } = {},
): Promise<(AffiliateAuthoritativeContext & { category: string }) | null> {
  const id = productId.trim();
  if (!id || id.length > 80) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [settings, productResult, affiliate] = await Promise.all([
    getResolvedPlatformSettings(),
    supabase
      .from("products")
      .select(
        "id, slug, name, description, short_description, price, currency, images, features, affiliate_enabled, affiliate_commission_rate, affiliate_price, product_type, product_categories(name)",
      )
      .eq("id", id)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle(),
    getSessionAffiliate({ requireActive: false }),
  ]);

  const row = productResult.data as AffiliateProductSource | null;
  if (!row) return null;

  let trackingPath: string | null = null;
  if (affiliate?.id && affiliate.isActive) {
    const { data: link } = await supabase
      .from("affiliate_links")
      .select("link_code")
      .eq("affiliate_id", affiliate.id)
      .eq("product_id", row.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (link?.link_code) trackingPath = `/ref/${link.link_code}`;
  }

  const context = assembleAffiliateProductContext(row, {
    defaultCommissionPercent: settings.fees.default_affiliate_commission_percent,
    trackingPath,
    assetTypes: options.assetTypes,
    platform: options.platform,
  });
  if (!context) return null;
  return { ...context, category: affiliateCategoryName(row) };
}
