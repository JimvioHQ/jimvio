import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
} from "@/lib/commerce-os";
import { CommerceCard } from "@/components/commerce-os/commerce-shell";
import { formatStoreMoney } from "@/lib/commerce-os/storefront/money";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ storeId?: string }>;
};

export default async function CommerceOrderDetailPage({
  params,
  searchParams,
}: Props) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    if (auth.status === 401) redirect("/login?next=/commerce/orders");
    return <p className="text-sm text-[#4B5563]">{auth.error}</p>;
  }

  const { orderId } = await params;
  const { storeId } = await searchParams;
  const db = cosAdminDb();
  const stores = await listVendorJimvioStores(db, auth.vendorId);
  const storeIds = new Set(stores.map((s) => s.id));

  const { data: order } = await db
    .from("orders")
    .select(
      `
      id, order_number, total_amount, subtotal, shipping_amount, discount_amount,
      currency, payment_status, status, created_at, shipping_address, metadata,
      jimvio_store_id, buyer_id,
      order_items (
        id, product_name, product_image, quantity, unit_price, total_price, sku
      )
    `
    )
    .eq("id", orderId)
    .eq("vendor_id", auth.vendorId)
    .maybeSingle();

  if (!order) notFound();
  if (
    order.jimvio_store_id &&
    storeIds.size > 0 &&
    !storeIds.has(order.jimvio_store_id)
  ) {
    notFound();
  }

  const store = stores.find((s) => s.id === order.jimvio_store_id) || null;
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const currency = order.currency || "USD";
  const backHref = storeId
    ? `/commerce/orders?storeId=${storeId}`
    : "/commerce/orders";

  const ship =
    order.shipping_address &&
    typeof order.shipping_address === "object" &&
    !Array.isArray(order.shipping_address)
      ? (order.shipping_address as Record<string, unknown>)
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href={backHref}
          className="text-xs font-semibold text-[#6B7280] underline"
        >
          ← Orders
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
          {order.order_number ? `#${order.order_number}` : "Order"}
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          {store?.name || "Store"} · {order.payment_status || "—"} ·{" "}
          {order.status || "—"}
        </p>
      </div>

      <CommerceCard className="p-5">
        <h2 className="text-sm font-semibold text-[#111827]">Items</h2>
        <ul className="mt-3 space-y-3">
          {items.map((item) => {
            const row = item as {
              id: string;
              product_name?: string;
              product_image?: string | null;
              quantity?: number;
              total_price?: number;
              sku?: string | null;
            };
            return (
              <li key={row.id} className="flex items-center gap-3 text-sm">
                {row.product_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.product_image}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-[#F3F4F6]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{row.product_name || "Item"}</p>
                  <p className="text-xs text-[#6B7280]">
                    Qty {row.quantity ?? 1}
                    {row.sku ? ` · ${row.sku}` : ""}
                  </p>
                </div>
                <p className="tabular-nums font-semibold">
                  {formatStoreMoney(Number(row.total_price || 0), currency)}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 space-y-1 border-t border-[#E5E7EB] pt-4 text-sm">
          <div className="flex justify-between text-[#6B7280]">
            <span>Subtotal</span>
            <span className="tabular-nums">
              {formatStoreMoney(Number(order.subtotal || 0), currency)}
            </span>
          </div>
          <div className="flex justify-between text-[#6B7280]">
            <span>Shipping</span>
            <span className="tabular-nums">
              {formatStoreMoney(Number(order.shipping_amount || 0), currency)}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-[#111827]">
            <span>Total</span>
            <span className="tabular-nums">
              {formatStoreMoney(Number(order.total_amount || 0), currency)}
            </span>
          </div>
        </div>
      </CommerceCard>

      {ship ? (
        <CommerceCard className="p-5">
          <h2 className="text-sm font-semibold text-[#111827]">Shipping</h2>
          <p className="mt-2 text-sm text-[#4B5563]">
            {[ship.name, ship.first_name, ship.last_name]
              .filter(Boolean)
              .join(" ") || "Customer"}
            <br />
            {[ship.address1, ship.address2].filter(Boolean).join(", ")}
            <br />
            {[ship.city, ship.zip, ship.country].filter(Boolean).join(", ")}
            {ship.phone ? (
              <>
                <br />
                {String(ship.phone)}
              </>
            ) : null}
          </p>
        </CommerceCard>
      ) : null}
    </div>
  );
}
