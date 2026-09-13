import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
} from "@/lib/commerce-os";
import { CreateStoreForm } from "@/components/commerce-os/create-store-form";
import { cosTable } from "@/lib/commerce-os/db";
import { storefrontDisplayUrl } from "@/lib/commerce-os/storefront-url";
import {
  isJimvioStorePubliclyLive,
  jimvioStoreLiveLabel,
} from "@/lib/commerce-os/store-live";

export const dynamic = "force-dynamic";

export default async function CommerceStoresPage() {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/stores");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);

  const { data: full } = await cosTable(db, "jimvio_stores")
    .select(
      "id, name, handle, status, default_currency, published_at, created_at, primary_domain"
    )
    .eq("vendor_id", auth.vendorId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Stores</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Native Jimvio storefronts. Connect Shopify and other channels from Integrations.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/commerce/integrations"
          className="rounded-xl bg-[#FF5A1F] px-3 py-2 text-xs font-semibold text-white"
        >
          Connect Store
        </Link>
        <Link
          href="/commerce/connected-stores"
          className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#374151]"
        >
          Connected Stores
        </Link>
      </div>

      {!stores.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No stores yet.
        </div>
      ) : (
        <div className="space-y-2">
          {(full ?? []).map((s) => {
            const live = isJimvioStorePubliclyLive(s);
            const liveUrl = storefrontDisplayUrl(s.handle);
            return (
              <div
                key={s.id}
                className="flex flex-col gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-[#111827]">{s.name}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {s.handle}.jimvio.com · {s.default_currency}
                    {s.published_at
                      ? ` · published ${new Date(s.published_at).toLocaleDateString()}`
                      : ""}
                  </p>
                  <span
                    className={
                      live
                        ? "mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                        : "mt-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                    }
                  >
                    {jimvioStoreLiveLabel(s)}
                    {!live ? " — publish in Builder to go live" : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/commerce?storeId=${s.id}`}
                    className="rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151]"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={`/commerce/builder?storeId=${s.id}`}
                    className="rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-semibold text-[#374151]"
                  >
                    Customize
                  </Link>
                  {live ? (
                    <a
                      href={liveUrl}
                      className="rounded-md bg-[#FF5A1F] px-2.5 py-1.5 text-xs font-semibold text-white"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open store
                    </a>
                  ) : (
                    <Link
                      href={`/commerce/builder?storeId=${s.id}`}
                      className="rounded-md bg-[#FF5A1F] px-2.5 py-1.5 text-xs font-semibold text-white"
                    >
                      Publish to go live
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateStoreForm />
    </div>
  );
}
