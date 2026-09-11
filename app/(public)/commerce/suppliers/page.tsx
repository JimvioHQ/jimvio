import Link from "next/link";
import { CommerceCard } from "@/components/commerce-os/commerce-shell";

export const dynamic = "force-dynamic";

/**
 * Suppliers hub — Jimvio Store abstraction over the supplier connector network.
 * Underlying provider adapters remain internal; merchants see Jimvio branding only.
 */
export default function CommerceSuppliersPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
          Suppliers
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Source products, sync inventory, and fulfill orders through Jimvio Store —
          verified global sourcing with tracking.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CommerceCard className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#111827]">Jimvio Store</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Verified
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
            Global sourcing, inventory sync, fulfillment, and tracking — available for
            products you sell on Jimvio and connected channels.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-[#6B7280]">
            <li>· Inventory sync</li>
            <li>· Fulfillment available</li>
            <li>· Tracking available</li>
          </ul>
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
          <p className="text-sm font-semibold text-[#111827]">Sell everywhere</p>
          <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
            Import marketplace products into your Jimvio storefront or a connected Shopify
            store.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/marketplace/physical"
              className="rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
            >
              Open marketplace
            </Link>
            <Link
              href="/commerce/integrations"
              className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
            >
              Connect Shopify
            </Link>
          </div>
        </CommerceCard>
      </div>
    </div>
  );
}
