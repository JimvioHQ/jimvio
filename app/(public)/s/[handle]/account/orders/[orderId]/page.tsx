import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";
import { formatStoreMoney } from "@/lib/commerce-os/storefront/money";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string; orderId: string }>;
};

function stepDone(
  payment: string | null,
  status: string | null,
  step: "placed" | "paid" | "processing" | "shipped" | "delivered"
): boolean {
  const p = (payment || "").toLowerCase();
  const s = (status || "").toLowerCase();
  const paid = p === "paid" || p === "completed";
  if (step === "placed") return true;
  if (step === "paid") return paid;
  if (step === "processing") {
    return (
      paid &&
      ["processing", "confirmed", "shipped", "delivered", "completed"].includes(s)
    );
  }
  if (step === "shipped") {
    return ["shipped", "delivered", "completed"].includes(s);
  }
  if (step === "delivered") {
    return ["delivered", "completed"].includes(s);
  }
  return false;
}

export default async function StorefrontOrderDetailPage({ params }: Props) {
  const { handle, orderId } = await params;
  const onStoreHost = await isRequestOnStoreHost();
  const linkOpts = { onStoreHost };
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        storefrontHref(handle, `/account/orders/${orderId}`, linkOpts)
      )}`
    );
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      `
      id, order_number, total_amount, subtotal, shipping_amount, discount_amount,
      currency, payment_status, status, created_at, shipping_address, metadata,
      order_items (
        id, product_name, product_image, quantity, unit_price, total_price
      )
    `
    )
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .eq("jimvio_store_id", store.id)
    .maybeSingle();

  if (!order) notFound();

  const tracking =
    order.metadata &&
    typeof order.metadata === "object" &&
    !Array.isArray(order.metadata)
      ? String(
          (order.metadata as Record<string, unknown>).tracking_number ||
            (order.metadata as Record<string, unknown>).trackingNumber ||
            ""
        ).trim() || null
      : null;

  const timeline = [
    { key: "placed" as const, label: "Order placed" },
    { key: "paid" as const, label: "Payment confirmed" },
    { key: "processing" as const, label: "Processing" },
    { key: "shipped" as const, label: "Shipped" },
    { key: "delivered" as const, label: "Delivered" },
  ];

  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const currency = order.currency || store.default_currency || "USD";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={storefrontHref(handle, "/account/orders", linkOpts)}
        className="text-xs font-semibold text-[var(--store-muted,#6B7280)] underline"
      >
        ← All orders
      </Link>
      <h1
        className="mt-3 text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--store-heading-font, inherit)" }}
      >
        {order.order_number ? `#${order.order_number}` : "Order"}
      </h1>
      <p className="mt-1 text-sm text-[var(--store-muted,#6B7280)]">
        {order.created_at
          ? new Date(order.created_at).toLocaleString()
          : ""}{" "}
        · {store.name}
      </p>

      <ol className="mt-8 space-y-3">
        {timeline.map((step) => {
          const done = stepDone(order.payment_status, order.status, step.key);
          return (
            <li key={step.key} className="flex items-center gap-3 text-sm">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
                  done
                    ? "bg-emerald-500 text-white"
                    : "bg-[var(--store-border,rgba(0,0,0,0.08))] text-[var(--store-muted,#6B7280)]"
                }`}
                aria-hidden
              >
                {done ? "✓" : "○"}
              </span>
              <span
                className={
                  done
                    ? "font-medium text-[var(--store-text,#111827)]"
                    : "text-[var(--store-muted,#6B7280)]"
                }
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {tracking ? (
        <div className="mt-6 rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)] p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--store-muted,#6B7280)]">
            Tracking
          </p>
          <p className="mt-1 font-semibold tabular-nums">{tracking}</p>
        </div>
      ) : null}

      <ul className="mt-8 space-y-3">
        {items.map((item) => {
          const row = item as {
            id: string;
            product_name?: string;
            product_image?: string | null;
            quantity?: number;
            total_price?: number;
          };
          return (
            <li
              key={row.id}
              className="flex items-center gap-3 rounded-[var(--store-card-radius,16px)] border border-[var(--store-border,rgba(0,0,0,0.08))] bg-[var(--store-surface,#fff)] px-3 py-3 text-sm"
            >
              {row.product_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.product_image}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-[var(--store-bg,#F8FAFC)]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{row.product_name || "Item"}</p>
                <p className="text-xs text-[var(--store-muted,#6B7280)]">
                  Qty {row.quantity ?? 1}
                </p>
              </div>
              <p className="tabular-nums font-semibold">
                {formatStoreMoney(Number(row.total_price || 0), currency)}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 space-y-1 border-t border-[var(--store-border,rgba(0,0,0,0.08))] pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--store-muted,#6B7280)]">Subtotal</span>
          <span className="tabular-nums">
            {formatStoreMoney(Number(order.subtotal || 0), currency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--store-muted,#6B7280)]">Shipping</span>
          <span className="tabular-nums">
            {formatStoreMoney(Number(order.shipping_amount || 0), currency)}
          </span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span className="tabular-nums">
            {formatStoreMoney(Number(order.total_amount || 0), currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
