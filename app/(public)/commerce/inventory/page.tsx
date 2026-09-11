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

export default async function CommerceInventoryPage({ searchParams }: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/inventory");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const active = pickActiveStore(stores, storeId);

  if (!active) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[#111827]">Inventory</h1>
        <Link href="/commerce/stores" className="text-sm font-semibold text-[#FF5A1F]">
          Create a store
        </Link>
      </div>
    );
  }

  const { data: links } = await db
    .from("jimvio_store_products")
    .select(
      "id, status, products(id, name, slug, track_inventory, inventory_quantity, allow_backorder)"
    )
    .eq("store_id", active.id)
    .eq("vendor_id", auth.vendorId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Inventory</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Stock levels from the shared Jimvio catalog (not duplicated per store).
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/inventory"
      />
      {!links?.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No store products to show inventory for.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Tracking</th>
                <th className="px-4 py-2 font-medium">Qty</th>
              </tr>
            </thead>
            <tbody>
              {links.map((row) => {
                const p = row.products as unknown as {
                  name: string;
                  track_inventory: boolean;
                  inventory_quantity: number | null;
                } | null;
                return (
                  <tr key={row.id} className="border-b border-[#F3F4F6]">
                    <td className="px-4 py-3 font-medium text-[#111827]">
                      {p?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {p?.track_inventory ? "Tracked" : "Not tracked"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {p?.track_inventory
                        ? p.inventory_quantity ?? 0
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
