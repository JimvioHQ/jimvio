import { redirect } from "next/navigation";
import { requireDropshippingMerchant, dsAdminDb, availableInventory } from "@/lib/dropshipping";

export const dynamic = "force-dynamic";

export default async function DropshippingInventoryPage() {
  const auth = await requireDropshippingMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/channel-inventory");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const db = dsAdminDb();
  const { data: links, error } = await db
    .from("store_product_links")
    .select(
      "id, store_sku, connection_status, safety_stock, last_inventory_sync_at, supplier_variant_id, product_variants(sku, inventory_quantity), products(name), merchant_stores(name)"
    )
    .eq("vendor_id", auth.vendorId)
    .order("updated_at", { ascending: false })
    .limit(150);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Inventory</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Available stock after safety stock for linked variants.
        </p>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600">{error.message}</p>
      ) : null}

      {!links?.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No inventory links yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">On hand</th>
                <th className="px-3 py-2 font-medium">Available</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {links.map((row) => {
                const variant = Array.isArray(row.product_variants)
                  ? row.product_variants[0]
                  : row.product_variants;
                const product = Array.isArray(row.products) ? row.products[0] : row.products;
                const onHand = Number(
                  (variant as { inventory_quantity?: number } | null)?.inventory_quantity ?? 0
                );
                return (
                  <tr key={row.id} className="border-b border-[#F3F4F6]">
                    <td className="px-3 py-2.5 font-medium text-[#111827]">
                      {(product as { name?: string } | null)?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[#4B5563]">
                      {row.store_sku ||
                        (variant as { sku?: string } | null)?.sku ||
                        "—"}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{onHand}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {availableInventory(onHand, row.safety_stock ?? 0)}
                    </td>
                    <td className="px-3 py-2.5 text-[#4B5563]">{row.connection_status}</td>
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
