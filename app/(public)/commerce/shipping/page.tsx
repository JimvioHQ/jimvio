import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import { cosTable } from "@/lib/commerce-os/db";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ storeId?: string }> };

export default async function CommerceShippingPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/shipping");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Shipping</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const { data: zones } = await cosTable(db, "jimvio_shipping_zones")
    .select("id, name, countries, jimvio_shipping_rates(id, name, rate_type, price, currency)")
    .eq("store_id", active.id)
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Shipping</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Store shipping zones for {active.name}. Supplier/CJ rates still flow through Jimvio
          checkout for applicable lines.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/shipping"
      />
      {!zones?.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No shipping zones configured yet. Checkout can still use platform/supplier rates.
        </div>
      ) : (
        <ul className="space-y-3">
          {zones.map((z) => {
            const rates =
              (z.jimvio_shipping_rates as Array<{
                id: string;
                name: string;
                rate_type: string;
                price: number;
                currency: string;
              }>) || [];
            return (
              <li
                key={z.id}
                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm"
              >
                <p className="font-medium text-[#111827]">{z.name}</p>
                <p className="text-xs text-[#6B7280]">
                  Countries:{" "}
                  {(z.countries as string[])?.length
                    ? (z.countries as string[]).join(", ")
                    : "All"}
                </p>
                {rates.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-[#4B5563]">
                    {rates.map((r) => (
                      <li key={r.id}>
                        {r.name} · {r.rate_type} · {r.currency} {Number(r.price).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[#6B7280]">No rates in this zone.</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
