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
import {
  ShippingManager,
  type ShippingZoneRow,
} from "@/components/commerce-os/shipping-manager";

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
    .select(
      "id, name, countries, is_active, jimvio_shipping_rates(id, name, rate_type, price, currency, min_order_amount, max_order_amount, is_active)",
    )
    .eq("store_id", active.id)
    .eq("vendor_id", auth.vendorId)
    .order("created_at", { ascending: true });

  const rows: ShippingZoneRow[] = (zones ?? []).map((z) => ({
    id: z.id,
    name: z.name,
    countries: Array.isArray(z.countries) ? (z.countries as string[]) : [],
    is_active: z.is_active !== false,
    rates: ((z.jimvio_shipping_rates as ShippingZoneRow["rates"]) || []).map(
      (r) => ({
        id: r.id,
        name: r.name,
        rate_type: r.rate_type,
        price: Number(r.price || 0),
        currency: r.currency || "USD",
        min_order_amount:
          r.min_order_amount == null ? null : Number(r.min_order_amount),
        max_order_amount:
          r.max_order_amount == null ? null : Number(r.max_order_amount),
        is_active: r.is_active !== false,
      }),
    ),
  }));

  const awaiting = await cosTable(db, "orders")
    .select("id", { count: "exact", head: true })
    .eq("jimvio_store_id", active.id)
    .in("payment_status", ["paid", "completed"])
    .in("status", ["pending", "paid", "processing", "confirmed"]);
  const awaitingFulfillment =
    typeof awaiting.count === "number" ? awaiting.count : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Shipping</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Shipping zones and rates for {active.name}.
        </p>
      </div>
      <StoreSelector
        stores={stores}
        activeId={active.id}
        basePath="/commerce/shipping"
      />
      <ShippingManager
        storeId={active.id}
        zones={rows}
        awaitingFulfillment={awaitingFulfillment ?? 0}
      />
    </div>
  );
}
