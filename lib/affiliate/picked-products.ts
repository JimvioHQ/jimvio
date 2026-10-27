import { getSessionAffiliate } from "@/lib/affiliate/access";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Active links the signed-in affiliate already has for this page of products. */
export async function listPickedAffiliateProductIds(productIds: string[]): Promise<string[]> {
  if (!productIds.length) return [];
  try {
    const affiliate = await getSessionAffiliate({ requireActive: true });
    if (!affiliate) return [];
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("affiliate_links")
      .select("product_id")
      .eq("affiliate_id", affiliate.id)
      .eq("is_active", true)
      .in("product_id", productIds);
    return [
      ...new Set(
        (data ?? [])
          .map((row) => row.product_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
  } catch {
    return [];
  }
}
