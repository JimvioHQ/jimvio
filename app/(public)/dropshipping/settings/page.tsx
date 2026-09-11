import { redirect } from "next/navigation";
import { requireDropshippingMerchant, dsAdminDb, getOrCreateEntitlements } from "@/lib/dropshipping";

export const dynamic = "force-dynamic";

export default async function DropshippingSettingsPage() {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/dropshipping/settings");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const db = dsAdminDb();
  const entitlements = await getOrCreateEntitlements(db, auth.vendorId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Settings</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Plan limits for Dropshipping OS on this merchant account.
        </p>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 text-sm">
        <p className="font-medium text-[#111827]">
          Plan: <span className="capitalize text-[#FF5A1F]">{entitlements?.plan ?? "free"}</span>
        </p>
        <ul className="mt-3 space-y-1 text-[#4B5563]">
          <li>Max stores: {entitlements?.max_stores ?? 1}</li>
          <li>Max products: {entitlements?.max_products ?? 50}</li>
          <li>Max orders / month: {entitlements?.max_orders_per_month ?? 100}</li>
          <li>Max API calls / day: {entitlements?.max_api_calls_per_day ?? 1000}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-xs text-[#6B7280]">
        Webhook endpoint for Shopify (Dropshipping OS):{" "}
        <code className="text-[11px] text-[#111827]">
          /api/webhooks/dropshipping/shopify
        </code>
        . Existing fulfillment webhooks at{" "}
        <code className="text-[11px]">/api/webhooks/shopify</code> are unchanged.
      </div>
    </div>
  );
}
