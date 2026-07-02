import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FlashDealsPageClient } from "@/components/marketplace/new/FlashDealsPageClient";
import type { DbProduct } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("deals");

export default async function MarketplaceFlashDealsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(`
      id, name, slug, price, compare_at_price, currency, images, product_type,
      status, is_flash_deal, discount_label, shipping_from,
      delivery_time, affiliate_commission_rate, view_count, sale_count,
      sold_count, claimed_pct, rating, review_count, is_free_shipping, vendor_id, category_id
    `)
    .eq("is_flash_deal", true)
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("view_count", { ascending: false })
    .limit(24);

  return (
    <div className="mx-auto w-full max-w-8xl min-w-0 px-4 py-4 sm:px-6">
      <FlashDealsPageClient initialDeals={(data ?? []) as DbProduct[]} />
    </div>
  );
}
