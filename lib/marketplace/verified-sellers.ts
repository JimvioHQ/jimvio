import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreVendor } from "@/components/marketplace/popular-stores-section";

/** Verified sellers with a few active products for the home rail. */
export async function fetchVerifiedSellers(
  supabase: SupabaseClient,
  limit = 8
): Promise<StoreVendor[]> {
  const { data: vendors, error } = await supabase
    .from("vendors")
    .select(
      "id, business_name, business_slug, business_logo, rating, total_sales, verification_status"
    )
    .eq("verification_status", "verified")
    .eq("is_active", true)
    .order("total_sales", { ascending: false })
    .limit(limit);

  if (error || !vendors?.length) return [];

  const vendorIds = vendors.map((v) => v.id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, images, price, currency, vendor_id")
    .in("vendor_id", vendorIds)
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sale_count", { ascending: false })
    .limit(vendorIds.length * 4);

  const byVendor = new Map<string, NonNullable<StoreVendor["products"]>>();
  for (const p of products ?? []) {
    if (!p.vendor_id) continue;
    const list = byVendor.get(p.vendor_id) ?? [];
    if (list.length >= 3) continue;
    list.push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      images: p.images,
      price: Number(p.price ?? 0),
      currency: p.currency,
    });
    byVendor.set(p.vendor_id, list);
  }

  return vendors
    .map((v) => ({
      id: v.id,
      business_name: v.business_name,
      business_slug: v.business_slug,
      business_logo: v.business_logo,
      rating: v.rating,
      total_sales: v.total_sales,
      products: byVendor.get(v.id) ?? [],
    }))
    .filter((v) => (v.products?.length ?? 0) > 0);
}
