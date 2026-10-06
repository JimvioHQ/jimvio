import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import { StoreSettingsForm } from "@/components/commerce-os/store-settings-form";
import { cosTable } from "@/lib/commerce-os/db";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommerceSettingsPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/settings");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Settings</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const { data: store } = await cosTable(db, "jimvio_stores")
    .select(
      "id, name, handle, description, logo_url, favicon_url, contact_email, contact_phone, announcement_bar, default_currency, default_country, status, industry, theme_settings, seo, social",
    )
    .eq("id", active.id)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  if (!store) {
    return <p className="text-sm text-[#4B5563]">Store not found.</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Settings</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Configure how {store.name} operates and appears to customers.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/settings"
      />
      <StoreSettingsForm
        store={{
          ...store,
          theme_settings:
            store.theme_settings &&
            typeof store.theme_settings === "object" &&
            !Array.isArray(store.theme_settings)
              ? (store.theme_settings as Record<string, unknown>)
              : null,
          seo:
            store.seo && typeof store.seo === "object" && !Array.isArray(store.seo)
              ? (store.seo as Record<string, unknown>)
              : null,
          social:
            store.social &&
            typeof store.social === "object" &&
            !Array.isArray(store.social)
              ? (store.social as Record<string, unknown>)
              : null,
        }}
      />
    </div>
  );
}
