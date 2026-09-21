import Link from "next/link";
import { CommerceCard } from "@/components/commerce-os/commerce-shell";

export const dynamic = "force-dynamic";

/**
 * Fulfillment network hub — native Jimvio store sourcing + automated fulfillment.
 */
export default function CommerceSuppliersPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">
          Fulfillment network
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Source products and fulfill paid store orders through Jimvio Fulfillment.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CommerceCard className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#111827]">Jimvio Fulfillment</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Automatic
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
            After payment is confirmed, eligible line items are submitted to the
            fulfillment network. Tracking syncs back to Commerce and your customer.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-[#6B7280]">
            <li>· Product / variant mapping</li>
            <li>· Order creation after payment</li>
            <li>· Tracking sync to customer + Commerce</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/commerce/products"
              className="rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
            >
              Store products
            </Link>
            <Link
              href="/commerce/fulfillment"
              className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
            >
              Fulfillment
            </Link>
          </div>
        </CommerceCard>

        <CommerceCard className="p-5">
          <p className="text-sm font-semibold text-[#111827]">Catalog</p>
          <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
            Browse the catalog and publish products to your storefront.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/marketplace/physical"
              className="rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
            >
              Browse catalog
            </Link>
            <Link
              href="/commerce/stores"
              className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
            >
              Manage stores
            </Link>
          </div>
        </CommerceCard>
      </div>
    </div>
  );
}
