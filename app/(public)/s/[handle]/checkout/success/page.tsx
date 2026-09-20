import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadPublishedStoreByHandle } from "@/lib/commerce-os";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";
import { isRequestOnStoreHost } from "@/lib/commerce-os/storefront-request";
import { formatStoreMoney } from "@/lib/commerce-os/storefront/money";
import { cosTable } from "@/lib/commerce-os/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function pickParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return typeof v === "string" ? v : undefined;
}

const FAILED_STATUSES = new Set([
  "failed",
  "cancelled",
  "cancel",
  "session_expired",
  "declined",
  "error",
]);

export default async function StorefrontCheckoutSuccessPage({
  params,
  searchParams,
}: Props) {
  const { handle } = await params;
  const sp = await searchParams;
  const onStoreHost = await isRequestOnStoreHost();
  const linkOpts = { onStoreHost };
  const supabase = await createClient();
  const store = await loadPublishedStoreByHandle(supabase, handle);
  if (!store) notFound();

  const cartHref = storefrontHref(handle, "/cart", linkOpts);
  const checkoutHref = storefrontHref(handle, "/checkout", linkOpts);
  const ordersHref = storefrontHref(handle, "/account/orders", linkOpts);
  const homeHref = storefrontHref(handle, "", linkOpts);

  const status = pickParam(sp.status)?.toLowerCase();
  const cancelled =
    pickParam(sp.cancelled)?.toLowerCase() === "true" ||
    pickParam(sp.cancel)?.toLowerCase() === "true";

  const rawRef = pickParam(sp.OrderMerchantReference)?.trim();
  const orderId =
    pickParam(sp.orderId)?.trim() ||
    pickParam(sp.order_id)?.trim() ||
    pickParam(sp.order)?.trim() ||
    rawRef?.split(":")[0];

  if (status && FAILED_STATUSES.has(status)) {
    redirect(
      `${checkoutHref}?error=${encodeURIComponent(
        status === "session_expired"
          ? "Your payment session expired. Please try again."
          : "Payment wasn't completed."
      )}${orderId ? `&order_id=${encodeURIComponent(orderId)}` : ""}`
    );
  }

  if (cancelled) {
    redirect(
      `${cartHref}?error=${encodeURIComponent("Payment wasn't completed.")}`
    );
  }

  if (!orderId) {
    return (
      <ResultShell storeName={store.name} logo={store.logo_url}>
        <h1 className="text-2xl font-semibold">Order not found</h1>
        <p className="mt-2 text-sm text-[var(--store-muted,#6B7280)]">
          We couldn&apos;t find your order details. If you were charged, contact
          the store with your payment reference.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={cartHref} className="store-btn">
            Return to cart
          </Link>
          <Link href={homeHref} className="store-link">
            Continue shopping
          </Link>
        </div>
      </ResultShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        storefrontHref(handle, `/checkout/success?order=${orderId}`, linkOpts)
      )}`
    );
  }

  const { data: order } = await cosTable(supabase, "orders")
    .select(
      `id, order_number, payment_status, status, total_amount, currency, shipping_address,
       order_items (product_name, quantity, total_price, product_image)`
    )
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .eq("jimvio_store_id", store.id)
    .maybeSingle();

  if (!order) {
    return (
      <ResultShell storeName={store.name} logo={store.logo_url}>
        <h1 className="text-2xl font-semibold">Order unavailable</h1>
        <p className="mt-2 text-sm text-[var(--store-muted,#6B7280)]">
          We couldn&apos;t load this order for {store.name}.
        </p>
        <Link href={ordersHref} className="store-btn mt-6 inline-flex">
          My orders
        </Link>
      </ResultShell>
    );
  }

  const paid =
    (order.payment_status || "").toLowerCase() === "paid" ||
    (order.payment_status || "").toLowerCase() === "completed";
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const orderLabel = order.order_number || order.id.slice(0, 8).toUpperCase();
  const currency = (order.currency || store.default_currency || "USD").toUpperCase();

  return (
    <ResultShell storeName={store.name} logo={store.logo_url}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-primary,#FF5A1F)]">
        {paid ? "Order confirmed" : "Payment received — confirming"}
      </p>
      <h1
        className="mt-2 text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--store-heading-font, inherit)" }}
      >
        {paid ? "Thank you for your order." : "We’re confirming your payment."}
      </h1>
      <p className="mt-2 text-sm text-[var(--store-muted,#6B7280)]">
        Order #{orderLabel}
        {paid
          ? " · Payment confirmed"
          : " · Status updates when the payment provider finishes verifying."}
      </p>

      <ul className="mt-6 space-y-2 border-t border-[var(--store-border,rgba(0,0,0,0.08))] pt-4 text-sm">
        {items.map(
          (
            item: {
              product_name?: string;
              quantity?: number;
              total_price?: number;
            },
            idx: number
          ) => (
            <li key={idx} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {item.product_name || "Item"}
                {item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : ""}
              </span>
              <span className="shrink-0 tabular-nums font-medium">
                {formatStoreMoney(item.total_price ?? 0, currency)}
              </span>
            </li>
          )
        )}
      </ul>
      <p className="mt-4 flex justify-between border-t border-[var(--store-border,rgba(0,0,0,0.08))] pt-3 text-sm font-semibold">
        <span>Total</span>
        <span className="tabular-nums">
          {formatStoreMoney(order.total_amount, currency)}
        </span>
      </p>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Link
          href={storefrontHref(handle, `/account/orders/${order.id}`, linkOpts)}
          className="inline-flex h-11 items-center justify-center rounded-[var(--store-btn-radius,9999px)] bg-[var(--store-primary,#FF5A1F)] px-5 text-sm font-semibold text-white"
        >
          View order
        </Link>
        <Link
          href={homeHref}
          className="inline-flex h-11 items-center justify-center rounded-[var(--store-btn-radius,9999px)] border border-[var(--store-border,rgba(0,0,0,0.12))] px-5 text-sm font-semibold"
        >
          Continue shopping
        </Link>
      </div>
      <p className="mt-8 text-center text-[11px] text-[var(--store-muted,#9CA3AF)]">
        Powered by Jimvio
      </p>
    </ResultShell>
  );
}

function ResultShell({
  storeName,
  logo,
  children,
}: {
  storeName: string;
  logo?: string | null;
  children: ReactNode;
}) {
  const logoUrl =
    typeof logo === "string" && logo.trim() ? logo.trim() : null;
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-9 w-auto max-w-[140px] object-contain"
          />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--store-primary,#FF5A1F)] text-xs font-bold text-white">
            {storeName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <p className="text-sm font-semibold">{storeName}</p>
      </div>
      {children}
    </div>
  );
}
