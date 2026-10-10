import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { MarketplaceImport } from "@/components/commerce-os/marketplace-import";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommerceProductImportPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/products/import");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);
  if (!active) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-[#111827]">Import from Marketplace</h1>
        <p className="text-sm text-[#6B7280]">Create a store before importing products.</p>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Go to Stores
        </Link>
      </div>
    );
  }

  return <MarketplaceImport storeId={active.id} />;
}
