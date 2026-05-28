
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { syncOrderWithCart } from "@/lib/actions/checkout";

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
  source_metadata: Record<string, unknown>;
  cj_vid: string | null;
  cj_pid: string | null;
  variant_weight: number | null;
  variant_length: number | null;
  variant_width: number | null;
  variant_height: number | null;
};

type OrderRow = {
  id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  subtotal: number;
  shipping_amount: number | null;
  currency: string | null;
  integration_source: string | null;
  metadata: unknown;
  shipping_address: unknown;
  cj_shipping_method: string | null;
  cj_supplier_cost: number | null;
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

function flattenOrderItems(rawItems: any[]): OrderItemRow[] {
  return (rawItems ?? []).map((item) => {
    const variant = Array.isArray(item.product_variants) ? item.product_variants[0] : item.product_variants;
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
      source_metadata: item.source_metadata ?? {},
      cj_vid: variant?.cj_vid ?? null,
      cj_pid: variant?.cj_pid ?? null,
      variant_weight: variant?.weight ?? null,
      variant_length: variant?.length ?? null,
      variant_width: variant?.width ?? null,
      variant_height: variant?.height ?? null,
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
    integration_source: raw.integration_source ?? null,
    metadata: raw.metadata ?? null,
    shipping_address: raw.shipping_address ?? null,
    cj_shipping_method: raw.cj_shipping_method ?? null,
    cj_supplier_cost: raw.cj_supplier_cost ?? null,
    vendors: Array.isArray(raw.vendors) ? raw.vendors[0] ?? null : raw.vendors,
    order_items: flattenOrderItems(raw.order_items ?? []),
  };
}

const ORDER_SELECT = `
  id, status, payment_status,
  total_amount, subtotal, shipping_amount, currency,
  integration_source, metadata, shipping_address,
  cj_shipping_method, cj_supplier_cost,
  vendors (id, business_name, business_slug),
  order_items (
    id, product_id, variant_id, product_name, product_image,
    quantity, unit_price, total_price,
    product_type, pricing_type, billing_period,
    product_source, source_metadata,
    product_variants (cj_vid, cj_pid, weight, length, width, height)
  )
` as const;


// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CheckoutPage(props: {
  searchParams: Promise<{
    order_id?: string;
    order?: string;
    method?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const orderId = searchParams.order_id ?? searchParams.order ?? null;
  const preferredMethod = searchParams.method ?? null;

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

  // ── Sync the order to current cart state ───────────────────────────────────
  // This handles the case where user modified cart in another tab after
  // clicking "Proceed to checkout". Updates items, totals, resets shipping.
  const syncResult = await syncOrderWithCart(orderId);

  if (!syncResult.ok) {
    redirectWithError(CHECKOUT_ERRORS.SYNC_FAILED, syncResult.error);
  }

  const { data: rawOrder, error: orderError } = await supabase
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

  const order = normaliseOrder(rawOrder);

  // Mixed digital + physical safeguard
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
  
  // ── Profile ─────────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  const isCommunity = order.integration_source === "community";

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-8xl mx-auto px-0 sm:px-4 md:px-6">
        <CheckoutExperience
          orders={[order] as never}
          profile={profile}
          mode={isCommunity ? "community" : "cart"}
          preferredMethod={preferredMethod}
          cartWasUpdated={syncResult.changed}
          changes={syncResult.changes}
        />
      </div>
    </div>
  );
}