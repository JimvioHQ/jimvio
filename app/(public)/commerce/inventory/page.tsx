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
  type InventoryHistoryRow,
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

  const productIds = (links ?? [])
    .map((row) => {
      const p = row.products as unknown as { id?: string } | null;
      return p?.id;
    })
    .filter((id): id is string => Boolean(id));

  const reservedByProduct = new Map<string, number>();
  if (productIds.length) {
    const { data: holds } = await cosTable(db, "jimvio_inventory_holds")
      .select("product_id, quantity")
      .eq("store_id", active.id)
      .eq("status", "reserved")
      .in("product_id", productIds)
      .gt("expires_at", new Date().toISOString());
    for (const h of holds ?? []) {
      if (!h.product_id) continue;
      reservedByProduct.set(
        h.product_id,
        (reservedByProduct.get(h.product_id) || 0) + Number(h.quantity || 0),
      );
    }
  }

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
    const onHand = Number(p.inventory_quantity ?? 0);
    const reserved = reservedByProduct.get(p.id) || 0;
    const available = Math.max(0, onHand - reserved);
    return [
      {
        linkId: row.id,
        productId: p.id,
        name: p.name,
        sku: p.sku,
        trackInventory: Boolean(p.track_inventory),
        quantity: p.inventory_quantity,
        reserved,
        available,
        lowStockThreshold: Number(p.low_stock_threshold ?? 5),
        updatedAt: p.updated_at,
        allowBackorder: Boolean(p.allow_backorder),
      },
    ];
  });

  const { data: hist } = await cosTable(db, "jimvio_inventory_adjustments")
    .select(
      "id, product_id, previous_quantity, delta, new_quantity, reason, actor_user_id, created_at, products(name)",
    )
    .eq("store_id", active.id)
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: false })
    .limit(50);

  const actorIds = Array.from(
    new Set(
      (hist ?? [])
        .map((h) => h.actor_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const actorName = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      actorName.set(p.id, p.full_name || p.email || p.id.slice(0, 8));
    }
  }

  const history: InventoryHistoryRow[] = (hist ?? []).map((h) => {
    const product = h.products as unknown as { name?: string } | null;
    return {
      id: h.id,
      productName: product?.name || "Product",
      delta: Number(h.delta || 0),
      previous: Number(h.previous_quantity || 0),
      next: Number(h.new_quantity || 0),
      reason: h.reason,
      createdAt: h.created_at,
      actor: h.actor_user_id ? actorName.get(h.actor_user_id) || null : null,
    };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Inventory</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          On hand, reserved holds, and available stock for {active.name}.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/inventory"
      />
      <InventoryControl storeId={active.id} rows={rows} history={history} />
    </div>
  );
}
