import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommercePaymentsPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/payments");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Payments</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Payments</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Native stores reuse Jimvio checkout and payouts — there is no separate store
          checkout or payment processor.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/payments"
      />
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#4B5563]">
        <p className="font-medium text-[#111827]">Shared platform payments</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Cart and checkout: /cart and /checkout</li>
          <li>Payouts and wallet: seller wallet / seller dashboard</li>
          <li>Store orders are tagged with jimvio_store_id when attributed</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/wallet"
            className="rounded-md border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#374151]"
          >
            Open wallet
          </Link>
          <Link
            href="/seller"
            className="rounded-md bg-[#FF5A1F] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Seller dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
