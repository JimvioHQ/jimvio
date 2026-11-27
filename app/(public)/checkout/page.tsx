
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { syncOrderWithCart } from "@/lib/actions/checkout";
import { sanitizeCustomerOrderMetadata } from "@/lib/orders/customer-order-fields";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePendingOrderPlatformCurrency } from "@/lib/commerce/ensure-platform-currency";
import { getOrRefreshAccessToken } from "@/lib/cj/auth";
import { toPublicPayload } from "@/lib/marketplace/public-product";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderItemRow = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_type: string | null;
  pricing_type: string | null;
  billing_period: string | null;
  product_source: string;
  cj_vid: string | null;
  variant_weight: number | null;
  source_metadata: Record<string, unknown> | null;
};

type OrderRow = {
  id: string;
  status: string;
  payment_status: string;
  payment_provider: string | null;
  gateway_used: string | null;
  total_amount: number;
  subtotal: number;
  shipping_amount: number | null;
  discount_amount: number | null;
  currency: string | null;
  integration_source: string | null;
  metadata: unknown;
  shipping_address: unknown;
  vendors: { id: string; business_name: string; business_slug: string } | null;
  order_items: OrderItemRow[];
};

const CHECKOUT_ERRORS = {
  ORDER_NOT_FOUND: "order_not_found",
  MIXED_PRODUCTS: "mixed_products",
  NO_ITEMS: "no_items",
  SYNC_FAILED: "sync_failed",
} as const;

function metaString(meta: unknown, key: string): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function redirectWithError(code: string, detail?: string): never {
  const params = new URLSearchParams({ error: code });
  if (detail) params.set("detail", detail);
  console.warn(`[checkout] redirect: ${code}`, detail ? { detail } : "");
  redirect(`/cart?${params.toString()}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────



function metaNumber(meta: unknown, key: string): number | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const value = Number((meta as Record<string, unknown>)[key]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function flattenOrderItems(rawItems: any[]): OrderItemRow[] {
  return (rawItems ?? []).map((item) => {
    const variant = Array.isArray(item.product_variants) ? item.product_variants[0] : item.product_variants;
    const itemMeta = item.source_metadata ?? null;
    const variantMeta = variant?.source_metadata ?? null;
    return {
      id: item.id,
      product_id: item.product_id ?? null,
      variant_id: item.variant_id ?? null,
      product_name: item.product_name,
      product_image: item.product_image ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      product_type: item.product_type ?? null,
      pricing_type: item.pricing_type ?? null,
      billing_period: item.billing_period ?? null,
      product_source: item.product_source ?? "vendor",
      cj_vid:
        variant?.cj_vid ??
        metaString(variantMeta, "cj_vid") ??
        metaString(itemMeta, "cj_vid") ??
        null,
      variant_weight:
        variant?.weight ??
        metaNumber(variantMeta, "cj_weight") ??
        metaNumber(itemMeta, "cj_weight") ??
        null,
      // Only what the checkout screen reads; supplier pricing and catalog fields stay on the server.
      source_metadata: itemMeta
        ? { cj_vid: metaString(itemMeta, "cj_vid"), cj_weight: metaNumber(itemMeta, "cj_weight") }
        : null,
    };
  });
}

function normaliseOrder(raw: any): OrderRow {
  return {
    id: raw.id,
    status: raw.status,
    payment_status: raw.payment_status,
    payment_provider: raw.payment_provider ?? null,
    gateway_used: raw.gateway_used ?? null,
    total_amount: raw.total_amount,
    subtotal: raw.subtotal,
    shipping_amount: raw.shipping_amount ?? null,
    discount_amount: raw.discount_amount ?? null,
    currency: raw.currency ?? null,
    integration_source: raw.integration_source ?? null,
    metadata: sanitizeCustomerOrderMetadata(raw.metadata),
    shipping_address: raw.shipping_address ?? null,
    vendors: Array.isArray(raw.vendors) ? raw.vendors[0] ?? null : raw.vendors,
    order_items: flattenOrderItems(raw.order_items ?? []),
  };
}

const ORDER_SELECT = `
  id, status, payment_status, payment_provider, gateway_used,
  total_amount, subtotal, shipping_amount, discount_amount, currency,
  integration_source, metadata, shipping_address,
  vendors (id, business_name, business_slug),
  order_items (
    id, product_id, variant_id, product_name, product_image,
    quantity, unit_price, total_price,
    product_type, pricing_type, billing_period,
    product_source, source_metadata,
    product_variants (cj_vid, weight, length, width, height, source_metadata)
  )
` as const;


// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CheckoutPage(props: {
  searchParams: Promise<{
    order_id?: string;
    order_ids?: string;
    orderIds?: string;
    order?: string;
    orderId?: string;
    method?: string;
    direct?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const primaryOrderId =
    searchParams.orderId ?? searchParams.order_id ?? searchParams.order ?? null;
  const orderIdsParam = searchParams.order_ids ?? searchParams.orderIds ?? "";
  const requestedOrderIds = orderIdsParam
    ? orderIdsParam.split(",").map((value) => value.trim()).filter(Boolean)
    : primaryOrderId ? [primaryOrderId] : [];
  if (primaryOrderId && !requestedOrderIds.includes(primaryOrderId)) {
    requestedOrderIds.unshift(primaryOrderId);
  }
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    requestedOrderIds.length === 0 ||
    requestedOrderIds.length > 50 ||
    new Set(requestedOrderIds).size !== requestedOrderIds.length ||
    requestedOrderIds.some((id) => !UUID_PATTERN.test(id))
  ) {
    redirect("/cart");
  }

  const preferredMethod = searchParams.method ?? null;
  const requestedDirectCheckout = searchParams.direct === "1";

  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextParams = new URLSearchParams({
      order_id: requestedOrderIds[0],
      order_ids: requestedOrderIds.join(","),
    });
    if (requestedDirectCheckout) nextParams.set("direct", "1");
    if (preferredMethod) nextParams.set("method", preferredMethod);
    const next = `/checkout?${nextParams.toString()}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const admin = createAdminClient();
  const fetchOrders = async (ids: string[]) =>
    admin
      .from("orders")
      .select(ORDER_SELECT)
      .eq("buyer_id", user.id)
      .in("id", ids)
      .in("payment_status", ["pending", "failed", "processing"]);

  // Confirm every requested order belongs to this buyer before syncing or reading
  // payment metadata. A combined checkout can never mix another user's orders.
  const { data: initialRawOrders, error: initialOrdersError } = await fetchOrders(requestedOrderIds);
  if (initialOrdersError || !initialRawOrders || initialRawOrders.length !== requestedOrderIds.length) {
    console.error("[checkout] initial order lookup failed", {
      code: initialOrdersError?.code ?? null,
      message: initialOrdersError?.message ?? null,
      requestedCount: requestedOrderIds.length,
      returnedCount: initialRawOrders?.length ?? 0,
    });
    redirectWithError(
      CHECKOUT_ERRORS.ORDER_NOT_FOUND,
      "One or more orders could not be found or are no longer payable."
    );
  }

  const initialOrdersById = new Map(initialRawOrders.map((row) => [row.id, row]));
  const initialOrders = requestedOrderIds.map((id) => initialOrdersById.get(id)!);
  const isDirectCheckout = requestedDirectCheckout || initialOrders.every((order) => {
    const metadata = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
      ? order.metadata as Record<string, unknown>
      : {};
    return order.status === "checkout_direct" || metadata.is_direct_checkout === true;
  });
  const cartIdValues = initialOrders.map((row) => metaString(row.metadata, "cart_id"));
  const cartIds = new Set(cartIdValues.filter(Boolean));
  if (
    cartIds.size > 1 ||
    (requestedOrderIds.length > 1 && (cartIdValues.some((id) => !id) || cartIds.size !== 1))
  ) {
    redirectWithError(CHECKOUT_ERRORS.ORDER_NOT_FOUND, "These orders do not belong to the same checkout cart.");
  }

  let checkoutOrderIds = [...requestedOrderIds];
  let cartWasUpdated = false;
  const aggregateChanges = {
    itemsAdded: 0,
    itemsRemoved: 0,
    itemsUpdated: 0,
    priceChanged: false,
    shippingReset: false,
  };

  // Do not sync or rewrite any order if any order in this cart already has an
  // active payment session. The provider's amount and all order lines stay fixed.
  const { data: initialPaymentRows, error: initialPaymentError } = await admin
    .from("transactions")
    .select("order_id, status")
    .in("order_id", checkoutOrderIds)
    .in("status", ["pending", "processing", "completed"]);
  if (initialPaymentError) {
    redirectWithError(CHECKOUT_ERRORS.SYNC_FAILED, "Could not verify existing payment sessions.");
  }
  const hasInitialPaymentSession = Boolean(initialPaymentRows?.length);

  if (!isDirectCheckout && !hasInitialPaymentSession) {
    const syncResults = await Promise.all(checkoutOrderIds.map((id) => syncOrderWithCart(id)));
    const cancelledOrderIds: string[] = [];
    for (let index = 0; index < syncResults.length; index += 1) {
      const result = syncResults[index];
      if (!result.ok) {
        if (result.error === "cart_empty") {
          cancelledOrderIds.push(checkoutOrderIds[index]);
          continue;
        }
        redirectWithError(CHECKOUT_ERRORS.SYNC_FAILED, result.error);
      }
      if (result.changed && result.changes) {
        cartWasUpdated = true;
        aggregateChanges.itemsAdded += result.changes.itemsAdded;
        aggregateChanges.itemsRemoved += result.changes.itemsRemoved;
        aggregateChanges.itemsUpdated += result.changes.itemsUpdated;
        aggregateChanges.priceChanged ||= result.changes.priceChanged;
        aggregateChanges.shippingReset ||= result.changes.shippingReset;
      }
    }
    checkoutOrderIds = checkoutOrderIds.filter((id) => !cancelledOrderIds.includes(id));
    if (!checkoutOrderIds.length) redirect("/cart");
  }

  const { data: rawOrders, error: ordersError } = await fetchOrders(checkoutOrderIds);
  if (ordersError || !rawOrders || rawOrders.length !== checkoutOrderIds.length) {
    console.error("[checkout] refreshed order lookup failed", {
      code: ordersError?.code ?? null,
      message: ordersError?.message ?? null,
      requestedCount: checkoutOrderIds.length,
      returnedCount: rawOrders?.length ?? 0,
    });
    redirectWithError(
      CHECKOUT_ERRORS.ORDER_NOT_FOUND,
      "One or more orders could not be found or are no longer payable."
    );
  }

  const rawOrdersById = new Map(rawOrders.map((row) => [row.id, row]));
  const orderedRawOrders = checkoutOrderIds.map((id) => rawOrdersById.get(id)!);
  if (orderedRawOrders.some((order) => !["pending", "checkout_direct"].includes(order.status))) {
    redirectWithError(CHECKOUT_ERRORS.ORDER_NOT_FOUND, "One or more orders are no longer available for payment.");
  }
  const displayOrders = orderedRawOrders.map(normaliseOrder);
  const allItems = displayOrders.flatMap((order) => order.order_items);
  const hasMixedOrder = displayOrders.some((order) => {
    const orderTypes = new Set(order.order_items.map((item) => item.product_type));
    return orderTypes.has("digital") && orderTypes.has("physical");
  });
  if (hasMixedOrder) {
    redirectWithError(
      CHECKOUT_ERRORS.MIXED_PRODUCTS,
      "One of these orders mixes digital and physical items. Please separate those items before checkout."
    );
  }
  if (!allItems.length || displayOrders.some((order) => !order.order_items.length)) {
    redirectWithError(CHECKOUT_ERRORS.NO_ITEMS, "One or more orders have no items.");
  }

  const hasUntrackedPaymentProvider = displayOrders.some((order) =>
    ["pending", "processing"].includes(order.payment_status) &&
    Boolean(order.payment_provider || order.gateway_used)
  );
  const hasPaymentInFlight = hasInitialPaymentSession || hasUntrackedPaymentProvider;

  // Currency normalization is safe only before a provider has received an amount.
  if (!hasPaymentInFlight) {
    for (const order of displayOrders) {
      try {
        await ensurePendingOrderPlatformCurrency(admin, order.id);
      } catch (error) {
        console.warn("[checkout] pending USD normalize skipped", { orderId: order.id, error });
      }
    }
  }

  if (allItems.some((item) => item.product_source === "cj")) {
    try {
      await getOrRefreshAccessToken();
    } catch (error) {
      console.warn("[checkout] CJ token warm skipped", error);
    }
  }

  // Re-read after safe normalization; keep the requested order sequence stable.
  let finalOrders = displayOrders;
  if (!hasPaymentInFlight) {
    const { data: refreshedRawOrders } = await fetchOrders(checkoutOrderIds);
    if (refreshedRawOrders?.length === checkoutOrderIds.length) {
      const refreshedById = new Map(refreshedRawOrders.map((row) => [row.id, row]));
      finalOrders = checkoutOrderIds.map((id) => normaliseOrder(refreshedById.get(id)!));
    }
  }

  const { data: latestPaymentRows, error: latestPaymentError } = await admin
    .from("transactions")
    .select("order_id, provider, provider_transaction_id, status, metadata, created_at")
    .in("order_id", checkoutOrderIds)
    .in("status", ["pending", "processing", "completed"])
    .order("created_at", { ascending: false });
  if (latestPaymentError) {
    redirectWithError(CHECKOUT_ERRORS.SYNC_FAILED, "Could not verify the current payment session.");
  }

  const latestPaymentByOrder = new Map<string, NonNullable<typeof latestPaymentRows>[number]>();
  for (const row of latestPaymentRows ?? []) {
    if (!latestPaymentByOrder.has(row.order_id)) latestPaymentByOrder.set(row.order_id, row);
  }
  const mappedProviders = finalOrders.map((order) => {
    const payment = latestPaymentByOrder.get(order.id);
    const metadata =
      payment?.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata)
        ? payment.metadata as Record<string, unknown>
        : {};
    const storedProvider = String(
      payment?.provider ??
      (["pending", "processing"].includes(order.payment_status) ? order.payment_provider ?? order.gateway_used : "") ??
      ""
    ).toLowerCase();
    const mapped =
      storedProvider === "binance" ? "binancepay" :
      storedProvider === "flutterwave" && metadata.method === "mobile_money" ? "mobile_money" :
      storedProvider;
    return ["nowpayments", "flutterwave", "binancepay", "mobile_money", "wallet"].includes(mapped)
      ? mapped
      : null;
  });
  const resumeProvider = (
    mappedProviders.every(Boolean) && new Set(mappedProviders).size === 1
      ? mappedProviders[0]
      : null
  ) as "nowpayments" | "flutterwave" | "binancepay" | "mobile_money" | "wallet" | null;
  const hasActivePaymentSession = Boolean(latestPaymentRows?.length);

  // ── Profile ─────────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  const buyerSafeOrders = toPublicPayload(
    finalOrders.map((order) => ({
      ...order,
      order_items: order.order_items.map((item) => ({
        ...item,
        is_supplier_fulfilled: item.product_source === "cj",
        // The checkout UI needs a supplier-fulfilled flag, not the supplier ID.
        product_source: item.product_source === "cj" ? "vendor" : item.product_source,
      })),
    })),
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-8xl mx-auto px-0 sm:px-4 md:px-6">
        <CheckoutExperience
          orders={buyerSafeOrders as never}
          profile={profile}
          mode={finalOrders.some((order) => order.integration_source === "community") ? "community" : "cart"}
          preferredMethod={preferredMethod}
          resumeProvider={resumeProvider}
          hasActivePaymentSession={hasActivePaymentSession}
          cartWasUpdated={cartWasUpdated}
          changes={cartWasUpdated ? aggregateChanges : undefined}
        />
      </div>
    </div>
  );
}
