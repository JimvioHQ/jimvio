import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
  pickActiveStore,
} from "@/lib/commerce-os";
import { StoreSelector } from "@/components/commerce-os/store-selector";
import {
  InventoryControl,
  type InventoryRow,
} from "@/components/commerce-os/inventory-control";
import { cosTable } from "@/lib/commerce-os/db";

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

  const { data: links } = await cosTable(db, "jimvio_store_products")
    .select(
      "id, status, products(id, name, sku, track_inventory, inventory_quantity, allow_backorder, low_stock_threshold, updated_at)",
    )
    .eq("store_id", active.id)
    .eq("vendor_id", auth.vendorId);

  const rows: InventoryRow[] = (links ?? []).flatMap((row) => {
    const p = row.products as unknown as {
      id: string;
      name: string;
      sku: string | null;
      track_inventory: boolean | null;
      inventory_quantity: number | null;
      allow_backorder: boolean | null;
      low_stock_threshold: number | null;
      updated_at: string | null;
    } | null;
    if (!p?.id) return [];
    return [
      {
        linkId: row.id,
        productId: p.id,
        name: p.name,
        sku: p.sku,
        trackInventory: Boolean(p.track_inventory),
        quantity: p.inventory_quantity,
        lowStockThreshold: Number(p.low_stock_threshold ?? 5),
        updatedAt: p.updated_at,
        allowBackorder: Boolean(p.allow_backorder),
      },
    ];
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Inventory</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Control stock levels for products published to {active.name}.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/inventory"
      />
      <InventoryControl storeId={active.id} rows={rows} />
    </div>
  );
}
