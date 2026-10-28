import "server-only";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  categoryTypeOrFilter,
  marketplaceEntryDecision,
  marketplaceHrefWithoutCategory,
  marketplaceSearchParamsFromRecord,
  type MarketplaceProductType,
  type MarketplaceQueryRecord,
} from "@/lib/marketplace/experience";

/**
 * True when the slug is an active category for this marketplace type.
 * Null means the lookup failed and the URL should be left alone.
 */
export async function categorySlugMatchesType(
  type: MarketplaceProductType,
  slug: string,
): Promise<boolean | null> {
  const value = slug.trim();
  if (!value) return true;
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("product_categories")
      .select("id")
      .eq("slug", value)
      .eq("is_active", true)
      .limit(1);
    query =
      type === "digital"
        ? query.eq("category_type", "digital")
        : query.or(categoryTypeOrFilter("physical"));
    const { data, error } = await query;
    if (error) return null;
    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error("[marketplace] category type check failed:", error);
    return null;
  }
}

/** Normalize the canonical route URL, then drop a category that belongs to the other type. */
export async function redirectIfMarketplaceLocationNeedsNormalization(
  routeType: MarketplaceProductType,
  raw: MarketplaceQueryRecord,
): Promise<void> {
  const decision = marketplaceEntryDecision(routeType, raw);
  if (decision.redirectTo) redirect(decision.redirectTo);
  if (!decision.category) return;
  const matches = await categorySlugMatchesType(routeType, decision.category);
  if (matches === false) {
    redirect(marketplaceHrefWithoutCategory(routeType, marketplaceSearchParamsFromRecord(raw)));
  }
}
