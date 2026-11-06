
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { syncOrderWithCart } from "@/lib/actions/checkout";
import { sanitizeCustomerOrderMetadata } from "@/lib/orders/customer-order-fields";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePendingOrderPlatformCurrency } from "@/lib/commerce/ensure-platform-currency";
import { getOrRefreshAccessToken } from "@/lib/cj/auth";

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
  total_amount: number;
  subtotal: number;
  shipping_amount: number | null;
  currency: string | null;
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

function redirectWithError(code: string, detail?: string): never {
  const params = new URLSearchParams({ error: code });
  if (detail) params.set("detail", detail);
  console.warn(`[checkout] redirect: ${code}`, detail ? { detail } : "");
  redirect(`/cart?${params.toString()}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function metaString(meta: unknown, key: string): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

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
    total_amount: raw.total_amount,
    subtotal: raw.subtotal,
    shipping_amount: raw.shipping_amount ?? null,
    currency: raw.currency ?? null,
    metadata: sanitizeCustomerOrderMetadata(raw.metadata),
    shipping_address: raw.shipping_address ?? null,
    vendors: Array.isArray(raw.vendors) ? raw.vendors[0] ?? null : raw.vendors,
    order_items: flattenOrderItems(raw.order_items ?? []),
  };
}

const ORDER_SELECT = `
  id, status, payment_status,
  total_amount, subtotal, shipping_amount, currency,
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
    order?: string;
    orderId?: string;
    method?: string;
    direct?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const orderId =
    searchParams.orderId ?? searchParams.order_id ?? searchParams.order ?? null;
  const preferredMethod = searchParams.method ?? null;
  const isDirectCheckout = searchParams.direct === "1";

  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const next = orderId ? `/checkout?order_id=${orderId}` : "/checkout";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // ── No order ID → user came here directly, send back to cart ───────────────
  if (!orderId) {
    redirect("/cart");
  }

  // ── Sync the order to current cart state (cart checkout only) ───────────────
  // Buy Now uses a standalone checkout session and must not be synced to cart.
  let syncResult: Awaited<ReturnType<typeof syncOrderWithCart>> | null = null;
  if (!isDirectCheckout) {
    syncResult = await syncOrderWithCart(orderId);

    if (!syncResult.ok) {
      redirectWithError(CHECKOUT_ERRORS.SYNC_FAILED, syncResult.error);
    }
  }

  const { data: rawOrder, error: orderError } = await createAdminClient()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .in("payment_status", ["pending", "failed"])
    .single();

  if (orderError || !rawOrder) {
    redirectWithError(
      CHECKOUT_ERRORS.ORDER_NOT_FOUND,
      `Order ${orderId} not found or already paid`
    );
  }

  const isCommunity = rawOrder.integration_source === "community";
  const order = normaliseOrder(rawOrder);
  const types = new Set(order.order_items.map((i) => i.product_type));
  if (types.has("digital") && types.has("physical")) {
    redirectWithError(
      CHECKOUT_ERRORS.MIXED_PRODUCTS,
      "Order contains both digital and physical items"
    );
  }

  if (!order.order_items.length) {
    redirectWithError(CHECKOUT_ERRORS.NO_ITEMS, "Order has no items");
  }

  try {
    await ensurePendingOrderPlatformCurrency(createAdminClient(), order.id);
  } catch (error) {
    console.warn("[checkout] pending USD normalize skipped", error);
  }

  if (order.order_items.some((item) => item.product_source === "cj")) {
    try {
      await getOrRefreshAccessToken();
    } catch (error) {
      console.warn("[checkout] CJ token warm skipped", error);
    }
  }

  const { data: refreshedRaw } = await createAdminClient()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .in("payment_status", ["pending", "failed"])
    .single();
  const displayOrder = refreshedRaw ? normaliseOrder(refreshedRaw) : order;
  
  // ── Profile ─────────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-8xl mx-auto px-0 sm:px-4 md:px-6">
        <CheckoutExperience
          orders={[displayOrder] as never}
          profile={profile}
          mode={isCommunity ? "community" : "cart"}
          preferredMethod={preferredMethod}
          cartWasUpdated={!isDirectCheckout && (syncResult?.changed ?? false)}
          changes={!isDirectCheckout ? syncResult?.changes : undefined}
        />
      </div>
    </div>
  );
}