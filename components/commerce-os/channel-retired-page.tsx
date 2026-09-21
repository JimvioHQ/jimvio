import Link from "next/link";
import { CommerceCard } from "@/components/commerce-os/commerce-shell";

/**
 * Legacy external-channel surfaces are retired from active Commerce OS.
 * Historical channel data remains in the database for audit; new commerce is native-store only.
 */
export default function ChannelRetiredPage({
  title = "This page is no longer available",
}: {
  title?: string;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-8">
      <CommerceCard className="p-6">
        <h1 className="text-xl font-semibold tracking-tight text-[#111827]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
          Jimvio Commerce OS runs on <strong>native Jimvio stores</strong>. Use
          Orders, Products, and Fulfillment for your storefront commerce.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/commerce"
            className="rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
          >
            Commerce overview
          </Link>
          <Link
            href="/commerce/stores"
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
          >
            Manage stores
          </Link>
          <Link
            href="/commerce/orders"
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#374151]"
          >
            Orders
          </Link>
        </div>
      </CommerceCard>
    </div>
  );
}
