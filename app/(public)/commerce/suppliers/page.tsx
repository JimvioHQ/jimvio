import Link from "next/link";
import { CommerceCard } from "@/components/commerce-os/commerce-shell";

export const dynamic = "force-dynamic";

/**
 * Suppliers hub — CJ and supplier network live in existing Jimvio systems.
 * This page consolidates discovery without rebuilding CJ.
 */
export default function CommerceSuppliersPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
          Suppliers
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Source products and fulfill through Jimvio suppliers. CJ Dropshipping uses the
          existing connector and fulfillment router.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CommerceCard className="p-5">
          <p className="text-sm font-semibold text-[#111827]">CJ Dropshipping</p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Import catalog products, map variants, and route fulfillment through the
            existing CJ connector.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/marketplace/physical"
              className="rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
            >
              Browse marketplace
            </Link>
            <Link
              href="/commerce/channel-products"
              className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
            >
              Channel products
            </Link>
          </div>
        </CommerceCard>

        <CommerceCard className="p-5">
          <p className="text-sm font-semibold text-[#111827]">Supplier Network</p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Sell marketplace products to your Jimvio store or connected Shopify store.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/marketplace"
              className="rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
            >
              Open Marketplace
            </Link>
            <Link
              href="/commerce/integrations"
              className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
            >
              Connect store
            </Link>
          </div>
        </CommerceCard>
      </div>
    </div>
  );
}
