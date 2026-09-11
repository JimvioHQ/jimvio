import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import type { ThemeDraft } from "@/lib/commerce-os/themes/registry";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import { BuilderClient } from "@/components/commerce-os/builder-client";
import { cosTable } from "@/lib/commerce-os/db";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommerceBuilderPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/builder");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Builder</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const { data: store } = await cosTable(db, "jimvio_stores")
    .select("id, name, handle, theme_draft")
    .eq("id", active.id)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Theme builder</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Edit home sections for {active.name}. Save draft, then publish.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/builder"
      />
      <BuilderClient
        storeId={active.id}
        storeName={store?.name || active.name}
        handle={store?.handle || active.handle}
        initialDraft={(store?.theme_draft as ThemeDraft) || null}
      />
    </div>
  );
}
