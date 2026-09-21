import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  requireCommerceMerchant,
  cosAdminDb,
  listVendorJimvioStores,
} from "@/lib/commerce-os";
import { CommerceCard } from "@/components/commerce-os/commerce-shell";
import { CommerceOrderFulfillmentPanel } from "@/components/commerce-os/commerce-order-fulfillment-panel";
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
      currency, payment_status, status, created_at, paid_at, shipping_address, metadata,
      jimvio_store_id, buyer_id, tracking_number, tracking_status, cj_order_id,
      cj_order_num, cj_fulfillment_status, cj_shipping_method,
      order_items (
        id, product_name, product_image, quantity, unit_price, total_price, sku,
        product_source, source_metadata
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

  const meta =
    order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
      ? (order.metadata as Record<string, unknown>)
      : {};

  const { data: tx } = await db
    .from("transactions")
    .select("id, reference, status, amount, currency, type, created_at, metadata")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: earning } = await db
    .from("transactions")
    .select("id, amount, currency, status, reference, created_at")
    .eq("type", "vendor_earning")
    .ilike("reference", `%${orderId}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const timeline = [
    { label: "Order created", at: order.created_at, detail: null as string | null },
    {
      label: "Payment confirmed",
      at: order.paid_at || (order.payment_status === "paid" ? order.created_at : null),
      detail: null as string | null,
    },
    {
      label: "CJ order",
      at: order.cj_order_id ? order.paid_at || order.created_at : null,
      detail: (order.cj_order_num || order.cj_order_id || null) as string | null,
    },
    {
      label: "Tracking",
      at: order.tracking_number ? order.paid_at || order.created_at : null,
      detail: (order.tracking_number || null) as string | null,
    },
    {
      label: "Delivered",
      at: order.status === "delivered" ? order.paid_at || order.created_at : null,
      detail: null as string | null,
    },
  ].filter((e) => e.at);

  const paymentProvider =
    (typeof meta.payment_provider === "string" && meta.payment_provider) ||
    (tx?.metadata &&
    typeof tx.metadata === "object" &&
    !Array.isArray(tx.metadata) &&
    typeof (tx.metadata as Record<string, unknown>).provider === "string"
      ? String((tx.metadata as Record<string, unknown>).provider)
      : null) ||
    null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href={backHref} className="text-xs font-semibold text-[#6B7280] underline">
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
              product_source?: string | null;
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
                    {row.product_source ? ` · ${row.product_source}` : ""}
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

      <div className="grid gap-5 md:grid-cols-2">
        <CommerceCard className="p-5">
          <h2 className="text-sm font-semibold text-[#111827]">Payment</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#6B7280]">Status</dt>
              <dd className="font-medium">{order.payment_status || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#6B7280]">Provider</dt>
              <dd className="font-medium">{paymentProvider || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#6B7280]">Reference</dt>
              <dd className="truncate font-medium">{tx?.reference || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#6B7280]">Paid amount</dt>
              <dd className="tabular-nums font-semibold">
                {formatStoreMoney(
                  Number(tx?.amount ?? order.total_amount ?? 0),
                  tx?.currency || currency
                )}
              </dd>
            </div>
          </dl>
        </CommerceCard>

        <CommerceCard className="p-5">
          <h2 className="text-sm font-semibold text-[#111827]">Financials</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#6B7280]">Customer total</dt>
              <dd className="tabular-nums">
                {formatStoreMoney(Number(order.total_amount || 0), currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#6B7280]">Shipping</dt>
              <dd className="tabular-nums">
                {formatStoreMoney(Number(order.shipping_amount || 0), currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#6B7280]">Merchant earning</dt>
              <dd className="tabular-nums font-semibold">
                {earning
                  ? formatStoreMoney(
                      Number(earning.amount || 0),
                      earning.currency || currency
                    )
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-[#9CA3AF]">
            Earnings come from wallet ledger entries after payment confirmation —
            not estimated UI totals.
          </p>
        </CommerceCard>
      </div>

      {ship ? (
        <CommerceCard className="p-5">
          <h2 className="text-sm font-semibold text-[#111827]">Customer / shipping</h2>
          <p className="mt-2 text-sm text-[#4B5563]">
            {[ship.name, ship.first_name, ship.last_name].filter(Boolean).join(" ") ||
              "Customer"}
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

      <CommerceCard className="p-5">
        <h2 className="text-sm font-semibold text-[#111827]">CJ / fulfillment</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[#6B7280]">CJ order</dt>
            <dd className="font-medium">
              {order.cj_order_num || order.cj_order_id || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6B7280]">CJ status</dt>
            <dd className="font-medium">{order.cj_fulfillment_status || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6B7280]">Tracking</dt>
            <dd className="font-medium">
              {order.tracking_number || "—"}
              {order.tracking_status ? ` · ${order.tracking_status}` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#6B7280]">Shipping method</dt>
            <dd className="font-medium">{order.cj_shipping_method || "—"}</dd>
          </div>
        </dl>
        {order.jimvio_store_id ? (
          <div className="mt-4 border-t border-[#E5E7EB] pt-4">
            <CommerceOrderFulfillmentPanel
              orderId={order.id}
              status={order.status}
              paymentStatus={order.payment_status}
              trackingNumber={order.tracking_number}
              isCj={Boolean(order.cj_order_id)}
            />
          </div>
        ) : null}
      </CommerceCard>

      <CommerceCard className="p-5">
        <h2 className="text-sm font-semibold text-[#111827]">Timeline</h2>
        {!timeline.length ? (
          <p className="mt-3 text-sm text-[#6B7280]">No events yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {timeline.map((event) => (
              <li key={event.label} className="text-sm">
                <p className="font-medium text-[#111827]">{event.label}</p>
                <p className="text-[11px] text-[#9CA3AF]">
                  {new Date(String(event.at)).toLocaleString()}
                  {event.detail ? ` · ${event.detail}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CommerceCard>
    </div>
  );
}
