import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import { CommerceCard } from "@/components/commerce-os/commerce-shell";

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
          Native store checkout uses platform payment providers. Customer return URLs
          stay on your merchant host.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/payments"
      />
      <CommerceCard className="p-5 text-sm text-[#4B5563]">
        <p className="font-medium text-[#111827]">How payments work</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Checkout creates a pending order scoped to this store</li>
          <li>Provider webhooks mark transactions successful and orders PAID</li>
          <li>Browser success redirects never mark orders paid alone</li>
          <li>Merchant earnings credit the wallet ledger after payment</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/commerce/finance?storeId=${active.id}`}
            className="rounded-md bg-[#FF5A1F] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Finance
          </Link>
          <Link
            href="/wallet"
            className="rounded-md border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#374151]"
          >
            Wallet OS
          </Link>
          <Link
            href={`/commerce/orders?storeId=${active.id}`}
            className="rounded-md border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#374151]"
          >
            Orders
          </Link>
        </div>
      </CommerceCard>
    </div>
  );
}
