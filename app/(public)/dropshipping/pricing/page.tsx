import { redirect } from "next/navigation";
import { requireDropshippingMerchant, dsAdminDb } from "@/lib/dropshipping";
import { PricingRulesClient } from "./pricing-client";

export const dynamic = "force-dynamic";

export default async function DropshippingPricingPage() {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/pricing");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const db = dsAdminDb();
  const { data: rules, error } = await db
    .from("ds_price_rules")
    .select(
      "id, name, markup_type, markup_value, min_profit, max_price, rounding_rule, currency, priority, is_active, store_id, product_id"
    )
    .eq("vendor_id", auth.vendorId)
    .order("priority", { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Pricing</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Markup rules applied when importing products and syncing prices.
        </p>
      </div>
      {error ? (
        <p className="text-sm font-medium text-red-600">{error.message}</p>
      ) : null}
      <PricingRulesClient initialRules={rules ?? []} vendorId={auth.vendorId} />
    </div>
  );
}
