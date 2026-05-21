// import { redirect } from "next/navigation";
// import { createClient } from "@/lib/supabase/server";
// import { createServiceClient } from "@/lib/supabase/service";
// import { startCheckout } from "@/lib/actions/checkout";
// import { CheckoutExperience } from "@/components/checkout/checkout-experience";
// import { PendingOrdersSelector } from "@/components/checkout/pending-orders-selector";
// import { sanitizePendingOrders } from "@/lib/payments/sanitize-pending-orders";

// export const dynamic = "force-dynamic";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type OrderRow = {
//   id: string;
//   status: string;
//   payment_status: string;
//   total_amount: number;
//   subtotal: number;
//   shipping_amount: number | null;
//   currency: string | null;
//   integration_source: string | null;
//   metadata: unknown;
//   shipping_address: unknown;
//   cj_shipping_method: string | null;
//   cj_supplier_cost: number | null;
//   vendors: { id: string; business_name: string; business_slug: string } | null;
//   order_items: OrderItemRow[];
// };

// type OrderItemRow = {
//   id: string;
//   product_id: string | null;
//   variant_id: string | null;
//   product_name: string;
//   product_image: string | null;
//   quantity: number;
//   unit_price: number;
//   total_price: number;
//   product_type: string | null;
//   pricing_type: string | null;
//   billing_period: string | null;
//   product_source: string;
//   source_metadata: Record<string, unknown>;
//   cj_vid: string | null;
//   cj_pid: string | null;
//   variant_weight: number | null;
//   variant_length: number | null;
//   variant_width: number | null;
//   variant_height: number | null;
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function flattenOrderItems(rawItems: any[]): OrderItemRow[] {
//   return (rawItems ?? []).map((item) => {
//     const variant = Array.isArray(item.product_variants)
//       ? item.product_variants[0]
//       : item.product_variants;
//     return {
//       id: item.id,
//       product_id: item.product_id ?? null,
//       variant_id: item.variant_id ?? null,
//       product_name: item.product_name,
//       product_image: item.product_image ?? null,
//       quantity: item.quantity,
//       unit_price: item.unit_price,
//       total_price: item.total_price,
//       product_type: item.product_type ?? null,
//       pricing_type: item.pricing_type ?? null,
//       billing_period: item.billing_period ?? null,
//       product_source: item.product_source ?? "vendor",
//       source_metadata: item.source_metadata ?? {},
//       cj_vid: variant?.cj_vid ?? null,
//       cj_pid: variant?.cj_pid ?? null,
//       variant_weight: variant?.weight ?? null,
//       variant_length: variant?.length ?? null,
//       variant_width: variant?.width ?? null,
//       variant_height: variant?.height ?? null,
//     };
//   });
// }

// function normaliseOrder(raw: any): OrderRow {
//   return {
//     id: raw.id,
//     status: raw.status,
//     payment_status: raw.payment_status,
//     total_amount: raw.total_amount,
//     subtotal: raw.subtotal,
//     shipping_amount: raw.shipping_amount ?? null,
//     currency: raw.currency ?? null,
//     integration_source: raw.integration_source ?? null,
//     metadata: raw.metadata ?? null,
//     shipping_address: raw.shipping_address ?? null,
//     cj_shipping_method: raw.cj_shipping_method ?? null,
//     cj_supplier_cost: raw.cj_supplier_cost ?? null,
//     vendors: Array.isArray(raw.vendors) ? raw.vendors[0] ?? null : raw.vendors,
//     order_items: flattenOrderItems(raw.order_items ?? []),
//   };
// }

// const ORDER_SELECT = `
//   id, status, payment_status,
//   total_amount, subtotal, shipping_amount, currency,
//   integration_source, metadata, shipping_address,
//   cj_shipping_method, cj_supplier_cost,
//   vendors (id, business_name, business_slug),
//   order_items (
//     id, product_id, variant_id, product_name, product_image,
//     quantity, unit_price, total_price,
//     product_type, pricing_type, billing_period,
//     product_source, source_metadata,
//     product_variants (cj_vid, cj_pid, weight, length, width, height)
//   )
// ` as const;

// // ─── Page ─────────────────────────────────────────────────────────────────────

// export default async function CheckoutPage(props: {
//   searchParams: Promise<{
//     order_id?: string;
//     order?: string;
//     retry?: string;
//     method?: string;
//     direct?: string;
//     product?: string;
//     qty?: string;
//   }>;
// }) {
//   const searchParams = await props.searchParams;

//   // Normalise — cancel page sends ?order=, checkout uses ?order_id=
//   const orderId = searchParams.order_id ?? searchParams.order ?? null;
//   const preferredMethod = searchParams.method ?? null;

//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();

//   if (!user) {
//     const next = orderId ? `/checkout?order_id=${orderId}` : "/checkout";
//     redirect(`/login?next=${encodeURIComponent(next)}`);
//   }

//   // Service client — sanitizer calls finalizeOrderPayment which touches
//   // financial fields protected by the service_role RLS trigger
//   const service = createServiceClient();

//   let finalOrders: OrderRow[] = [];

//   // ── Branch A: specific order (retry / direct / buy-now) ──────────────────
//   if (orderId) {
//     const { data: order, error } = await supabase
//       .from("orders")
//       .select(ORDER_SELECT)
//       .eq("id", orderId)
//       .eq("buyer_id", user.id)
//       .in("payment_status", ["pending", "failed"])
//       .single();

//     if (error || !order) redirect("/cart");

//     // Guard: never show a mixed digital + physical order
//     const types = new Set((order.order_items ?? []).map((i: any) => i.product_type));
//     if (types.has("digital") && types.has("physical")) redirect("/cart");

//     finalOrders = [normaliseOrder(order)];

//     // ── Branch B: cart checkout — sanitize, then decide ───────────────────────
//   } else {
//     let actionable: Awaited<ReturnType<typeof sanitizePendingOrders>> = [];

//     try {
//       actionable = await sanitizePendingOrders(service, user.id);
//     } catch (err) {
//       // Non-fatal — if sanitizer throws, fall through to startCheckout()
//       console.warn("[checkout] sanitizePendingOrders failed, proceeding to cart:", err);
//     }

//     if (actionable.length > 1) {
//       return <PendingOrdersSelector orders={actionable} />;
//     }

//     if (actionable.length === 1) {
//       const { data: order } = await supabase
//         .from("orders")
//         .select(ORDER_SELECT)
//         .eq("id", actionable[0].id)
//         .eq("buyer_id", user.id)
//         .single();

//       if (order) {
//         finalOrders = [normaliseOrder(order)];
//       }
//     }

//     if (finalOrders.length === 0) {
//       const result = await startCheckout();
//       if ("error" in result || !result.ok) redirect("/cart");

//       const { data: orders, error: fetchError } = await supabase
//         .from("orders")
//         .select(ORDER_SELECT)
//         .in("id", result.orderIds)
//         .eq("buyer_id", user.id)
//         .in("payment_status", ["pending", "failed"]);

//       if (fetchError || !orders?.length) redirect("/cart");

//       finalOrders = orders
//         .map(normaliseOrder)
//         .filter((o) => {
//           const types = new Set(o.order_items.map((i) => i.product_type));
//           return !(types.has("digital") && types.has("physical"));
//         });
//     }
//   }

//   if (!finalOrders.length) redirect("/cart");

//   const { data: profile } = await supabase
//     .from("profiles")
//     .select("full_name, email, phone")
//     .eq("id", user.id)
//     .single();

//   const isCommunity = finalOrders.some((o) => o.integration_source === "community");

//   return (
//     <div className="min-h-screen bg-[var(--color-bg)]">
//       <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6">
//         <CheckoutExperience
//           orders={finalOrders as never}
//           profile={profile}
//           mode={isCommunity ? "community" : "cart"}
//           preferredMethod={preferredMethod}
//         />
//       </div>
//     </div>
//   );
// }

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { startCheckout } from "@/lib/actions/checkout";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { PendingOrdersSelector } from "@/components/checkout/pending-orders-selector";
import { sanitizePendingOrders } from "@/lib/payments/sanitize-pending-orders";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenOrderItems(rawItems: any[]): OrderItemRow[] {
  return (rawItems ?? []).map((item) => {
    const variant = Array.isArray(item.product_variants)
      ? item.product_variants[0]
      : item.product_variants;
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
    retry?: string;
    method?: string;
    direct?: string;
    product?: string;
    qty?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  const orderId = searchParams.order_id ?? searchParams.order ?? null;
  const preferredMethod = searchParams.method ?? null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const next = orderId ? `/checkout?order_id=${orderId}` : "/checkout";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const service = createServiceClient();
  let finalOrders: OrderRow[] = [];

  // ── Branch A: Specific Order ───────────────────────────────────────────────
  if (orderId) {
    const { data: order, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .in("payment_status", ["pending", "failed"]) // Clean status guard
      .single();

    if (error || !order) redirect("/cart");

    const types = new Set((order.order_items ?? []).map((i: any) => i.product_type));
    if (types.has("digital") && types.has("physical")) redirect("/cart");

    finalOrders = [normaliseOrder(order)];

    // ── Branch B: Cart Checkout (Sanitize & Evaluate) ──────────────────────────
  } else {
    let actionable: Awaited<ReturnType<typeof sanitizePendingOrders>> = [];

    try {
      actionable = await sanitizePendingOrders(service, user.id);
    } catch (err) {
      console.warn("[checkout] sanitizePendingOrders failed:", err);
    }

    // If duplicates exist, make user choose one to stop loop creation
    if (actionable.length > 1) {
      return <PendingOrdersSelector orders={actionable} />;
    }

    if (actionable.length === 1) {
      const { data: order } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", actionable[0].id)
        .eq("buyer_id", user.id)
        .in("payment_status", ["pending", "failed"]) // FIX: Added status guard here
        .single();

      if (order) {
        finalOrders = [normaliseOrder(order)];
      }
    }

    // If nothing pending exists, cut a new order
    if (finalOrders.length === 0) {
      const result = await startCheckout();
      if ("error" in result || !result.ok) redirect("/cart");

      const { data: orders, error: fetchError } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .in("id", result.orderIds)
        .eq("buyer_id", user.id)
        .in("payment_status", ["pending", "failed"]);

      if (fetchError || !orders?.length) redirect("/cart");

      finalOrders = orders
        .map(normaliseOrder)
        .filter((o) => {
          const types = new Set(o.order_items.map((i) => i.product_type));
          return !(types.has("digital") && types.has("physical"));
        });
    }
  }

  if (!finalOrders.length) redirect("/cart");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  const isCommunity = finalOrders.some((o) => o.integration_source === "community");

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6">
        <CheckoutExperience
          orders={finalOrders} 
          profile={profile}
          mode={isCommunity ? "community" : "cart"}
          preferredMethod={preferredMethod}
        />
      </div>
    </div>
  );
}