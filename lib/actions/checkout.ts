"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/services/db";
import { OrderUpdate } from "@/types/db";
import { Json } from "@/types/supabase";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatusValue =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "completed"
  | "checkout_direct";

type PaymentStatusValue =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded"
  | "cancelled"
  | "paid";

type AdminDB = ReturnType<typeof getAdminDB>;

// ─── Validation schema ────────────────────────────────────────────────────────

const ShippingSchema = z.object({
  orderIds: z
    .array(z.string().uuid("Each order ID must be a valid UUID"))
    .min(1, "At least one order ID is required"),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().max(100).default(""),
  email: z.string().email("Invalid email address").max(200),
  phone: z.string().trim().max(30).default(""),
  address1: z.string().trim().min(1, "Address is required").max(200),
  address2: z.string().trim().max(200).default(""),
  city: z.string().trim().min(1, "City is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Country code must be a 2-letter ISO code"),
  zip: z.string().trim().max(20).default(""),
  shippingAmount: z.number().nonnegative().optional(),
});

export type ShippingPayload = z.input<typeof ShippingSchema>;

// ─── Result helpers ───────────────────────────────────────────────────────────

type Ok<T> = { success: true } & T;
type Err = { success: false; error: string };
type Result<T = Record<never, never>> = Ok<T> | Err;

function ok<T>(data: T): Ok<T> {
  return { success: true, ...data };
}
function err(message: string): Err {
  return { success: false, error: message };
}


async function recordStatusChange(
  admin: AdminDB,
  orderId: string,
  previousStatus: OrderStatusValue | null,
  newStatus: OrderStatusValue,
  notes?: string
): Promise<void> {
  const { error } = await admin.from("order_status_history").insert({
    order_id: orderId,
    previous_status: previousStatus,
    new_status: newStatus,
    notes: notes ?? null,
  });
  if (error) {
    console.error(
      `[recordStatusChange] Failed for order ${orderId} (${previousStatus} → ${newStatus}):`,
      error
    );
  }
}

async function deleteCartItem(
  admin: AdminDB,
  cartId: string,
  productId: string,
  variantId: string | null
): Promise<boolean> {
  const base = admin
    .from("cart_items")
    .delete()
    .eq("cart_id", cartId)
    .eq("product_id", productId);

  const { error } = await (variantId
    ? base.eq("variant_id", variantId)
    : base.is("variant_id", null));

  if (error) {
    console.error(
      `[deleteCartItem] Failed — product: ${productId}, variant: ${variantId ?? "null"}`,
      error
    );
    return false;
  }
  return true;
}

// ─── Cart item validation ─────────────────────────────────────────────────────

type CartItem = {
  id: string;
  quantity: number;
  product_id: string;
  variant_id: string | null;
  vendor_id: string;
  product_source: string;
  source_metadata: Json;
  products: {
    id: string;
    name: string;
    price: number;
    currency: string;
    status: string;
    is_active: boolean;
    deleted_at: string | null;
    track_inventory: boolean;
    inventory_quantity: number;
    allow_backorder: boolean;
    is_digital: boolean;
    requires_shipping: boolean;
    // ✅ Added fields needed for order_items insert
    images: string[] | null;
    pricing_type: string | null;
    billing_period: string | null;
  } | null;
  product_variants: {
    id: string;
    name: string;
    price: number;
    inventory_quantity: number;
    is_active: boolean;
    // ✅ Added: variant-specific image fallback
    image_url: string | null;
  } | null;
};

function validateCartItems(items: CartItem[]): string[] {
  const errors: string[] = [];

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors.push("One or more items has an invalid quantity");
      continue;
    }

    const p = item.products;
    const v = item.product_variants;

    if (!p || p.status !== "active" || !p.is_active || p.deleted_at) {
      errors.push(`"${p?.name ?? "An item"}" is no longer available`);
      continue;
    }

    const unitPrice = Number(v?.price ?? p.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      errors.push(`"${p.name}" has an invalid price`);
      continue;
    }

    if (p.track_inventory && !p.allow_backorder) {
      const stock = v?.inventory_quantity ?? p.inventory_quantity;
      if (item.quantity > stock) {
        errors.push(
          stock === 0
            ? `"${p.name}" is out of stock`
            : `Only ${stock} of "${p.name}" in stock`
        );
      }
    }
  }

  return errors;
}

// ─── Vendor order creation ────────────────────────────────────────────────────

async function createVendorOrder(
  admin: AdminDB,
  vendorId: string,
  vendorItems: CartItem[],
  buyerId: string,
  cartId: string,
  currency: string
): Promise<string> {
  let subtotal = 0;

  const orderItemsPayload = vendorItems.map((item) => {
    const p = item.products!;
    const v = item.product_variants;
    const unitPrice = Number(v?.price ?? p.price);
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    // ✅ Pick best image: variant image > first product image > null
    const productImage =
      v?.image_url ??
      (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null);

    return {
      product_id: item.product_id,
      variant_id: item.variant_id,
      vendor_id: vendorId,
      product_name: p.name,
      product_image: productImage,                    // ✅ Added
      variant_name: v?.name ?? null,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      product_source: item.product_source,
      source_metadata: item.source_metadata,
      product_type: p.is_digital ? "digital" : "physical",
      pricing_type: p.pricing_type ?? "one_time",     // ✅ Added with safe default
      billing_period: p.billing_period ?? null,       // ✅ Added
    };
  });

  // ✅ Validate currency before insert — null currency is a NOT NULL violation
  const safeCurrency = (currency || "RWF").toUpperCase();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      buyer_id: buyerId,
      vendor_id: vendorId,
      status: "pending" as OrderStatusValue,
      payment_status: "pending" as PaymentStatusValue,
      subtotal,
      total_amount: subtotal,
      currency: safeCurrency,
      metadata: { cart_id: cartId },
    })
    .select("id")
    .single();

  if (orderError || !order) {
    // ✅ Detailed error so we can see what's actually broken
    throw new Error(
      `Order insert failed for vendor ${vendorId}: ${orderError?.message ?? "no data returned"}${orderError?.details ? ` | details: ${orderError.details}` : ""
      }${orderError?.hint ? ` | hint: ${orderError.hint}` : ""}`
    );
  }

  const { error: itemsError } = await admin
    .from("order_items")
    .insert(orderItemsPayload.map((oi) => ({ ...oi, order_id: order.id })));

  if (itemsError) {
    await admin.from("orders").delete().eq("id", order.id);
    throw new Error(
      `Order items insert failed for vendor ${vendorId}: ${itemsError.message}${itemsError.details ? ` | details: ${itemsError.details}` : ""
      }${itemsError.hint ? ` | hint: ${itemsError.hint}` : ""}`
    );
  }

  return order.id;
}

// ─── updatePendingOrdersShipping ──────────────────────────────────────────────

// export async function updatePendingOrdersShipping(
//   rawPayload: ShippingPayload
// ): Promise<Result> {
//   const supabase = await createClient();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();
//   if (!user?.id) return err("Authentication required");
//   const userId = user.id;

//   const parsed = ShippingSchema.safeParse(rawPayload);
//   if (!parsed.success) {
//     return err(parsed.error.issues[0].message);
//   }
//   const payload = parsed.data;

//   const shipping_address = {
//     firstName: payload.firstName,
//     lastName: payload.lastName,
//     email: payload.email,
//     phone: payload.phone,
//     address1: payload.address1,
//     address2: payload.address2,
//     city: payload.city,
//     country: payload.country,
//     country_code: payload.countryCode,
//     zip: payload.zip,
//   };

//   const update: OrderUpdate = {
//     shipping_address,
//     updated_at: new Date().toISOString(),
//   };

//   if (typeof payload.shippingAmount === "number") {
//     update.shipping_amount = payload.shippingAmount;
//   }

//   const { error: updateError, data } = await supabase
//     .from("orders")
//     .update(update)
//     .eq("buyer_id", userId)
//     .eq("status", "pending")
//     .in("payment_status", ["pending", "failed"])
//     .in("id", payload.orderIds)
//     .select("id");

//   if (updateError) return err(updateError.message);

//   if (!data?.length) {
//     return err(
//       "No eligible orders found. They may have already been paid or belong to a different account."
//     );
//   }

//   revalidatePath("/checkout");
//   return ok({});
// }

// ─── updatePendingOrdersShipping ──────────────────────────────────────────────
// Replace your existing updatePendingOrdersShipping with this version.

export async function updatePendingOrdersShipping(
  rawPayload: ShippingPayload
): Promise<Result> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return err("Authentication required");
  const userId = user.id;

  // ── Validate ───────────────────────────────────────────────────────────────
  const parsed = ShippingSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return err(parsed.error.issues[0].message);
  }
  const payload = parsed.data;

  // ── Build update ───────────────────────────────────────────────────────────
  const shipping_address = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    address1: payload.address1,
    address2: payload.address2,
    city: payload.city,
    country: payload.country,
    country_code: payload.countryCode,
    zip: payload.zip,
  };

  const update: OrderUpdate = {
    shipping_address,
    updated_at: new Date().toISOString(),
  };

  if (typeof payload.shippingAmount === "number") {
    update.shipping_amount = payload.shippingAmount;
  }

  // ✅ Use admin client (matches startCheckout) so RLS doesn't silently block
  const admin = getAdminDB();

  // ✅ Pre-check: fetch the actual state of those orders so we can give a real error
  const { data: existingOrders, error: fetchError } = await admin
    .from("orders")
    .select("id, buyer_id, status, payment_status")
    .in("id", payload.orderIds);

  if (fetchError) {
    console.error("[updatePendingOrdersShipping] Fetch failed:", fetchError);
    return err(`Could not read orders: ${fetchError.message}`);
  }

  if (!existingOrders?.length) {
    console.warn("[updatePendingOrdersShipping] No orders exist for IDs:", payload.orderIds);
    return err("Those orders no longer exist. Please return to the cart and try again.");
  }

  // Tell the user exactly why their submission was rejected
  const wrongBuyer = existingOrders.filter((o) => o.buyer_id !== userId);
  if (wrongBuyer.length) {
    console.warn("[updatePendingOrdersShipping] Wrong buyer:", { userId, wrongBuyer });
    return err("You can't update these orders — they belong to a different account.");
  }

  const notPending = existingOrders.filter(
    (o) => o.status !== "pending" || !["pending", "failed"].includes(o.payment_status ?? "")
  );
  if (notPending.length) {
    console.warn("[updatePendingOrdersShipping] Not pending:", notPending);
    return err(
      `Order already ${notPending[0].payment_status === "paid" ? "paid" : "in progress"}. Refresh the page to continue.`
    );
  }

  // ── Persist ────────────────────────────────────────────────────────────────
  const { error: updateError, data } = await admin
    .from("orders")
    .update(update)
    .eq("buyer_id", userId)
    .eq("status", "pending")
    .in("payment_status", ["pending", "failed"])
    .in("id", payload.orderIds)
    .select("id");

  if (updateError) {
    console.error("[updatePendingOrdersShipping] Update failed:", updateError);
    return err(updateError.message);
  }

  if (!data?.length) {
    // Should be unreachable now (pre-check above catches all cases)
    console.error(
      "[updatePendingOrdersShipping] Update returned 0 rows despite passing pre-check",
      { userId, orderIds: payload.orderIds, existingOrders }
    );
    return err("Could not update orders. Please refresh and try again.");
  }

  revalidatePath("/checkout");
  return ok({});
}

// ─── startCheckout ────────────────────────────────────────────────────────────

export async function startCheckout(): Promise<Result<{ orderIds: string[] }>> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return err("Sign in to check out");
  const userId = user.id;

  // ── Cart ───────────────────────────────────────────────────────────────────
  const { data: cart } = await supabase
    .from("carts")
    .select("id, currency")
    .eq("user_id", userId)
    .maybeSingle();
  if (!cart?.id) return err("Cart is empty");
  const cartId = cart.id;

  const admin = getAdminDB();

  // ── Resume existing pending/failed orders for this cart ───────────────────
  const { data: existingOrders, error: existingError } = await admin
    .from("orders")
    .select("id, payment_status")
    .eq("buyer_id", userId)
    .eq("status", "pending")
    .in("payment_status", ["pending", "failed"])
    .filter("metadata->>cart_id", "eq", cartId);

  if (existingError) {
    console.error("[startCheckout] Failed to fetch existing orders:", existingError);
    return err(`Could not validate existing checkout: ${existingError.message}`);
  }

  if (existingOrders && existingOrders.length > 0) {
    const failedOrders = existingOrders.filter((o) => o.payment_status === "failed");

    if (failedOrders.length > 0) {
      const failedIds = failedOrders.map((o) => o.id);

      const { error: resetError } = await admin
        .from("orders")
        .update({
          payment_status: "pending" as PaymentStatusValue,
          updated_at: new Date().toISOString(),
        })
        .in("id", failedIds);

      if (resetError) {
        console.error("[startCheckout] Failed to reset failed orders:", resetError);
        return err(`Could not reset failed orders: ${resetError.message}`);
      }

      await Promise.all(
        failedIds.map((id) =>
          recordStatusChange(
            admin,
            id,
            null,
            "pending",
            "Payment retry — reset from failed to pending"
          )
        )
      );
    }

    return ok({ orderIds: existingOrders.map((o) => o.id) });
  }

  // ── Fetch cart items ───────────────────────────────────────────────────────
  // ✅ Added: images, pricing_type, billing_period (products) and image_url (variants)
  const { data: rawItems, error: itemsError } = await supabase
    .from("cart_items")
    .select(`
      id, quantity, product_id, variant_id, vendor_id, product_source, source_metadata,
      products(
        id, name, price, currency, status, is_active, deleted_at,
        track_inventory, inventory_quantity, allow_backorder,
        is_digital, requires_shipping,
        images, pricing_type, billing_period
      ),
      product_variants(id, name, price, inventory_quantity, is_active, image_url)
    `)
    .eq("cart_id", cartId);

  if (itemsError) {
    console.error("[startCheckout] Failed to fetch cart items:", itemsError);
    return err(`Could not read cart: ${itemsError.message}`);
  }

  if (!rawItems || rawItems.length === 0) return err("Cart is empty");

  const items: CartItem[] = rawItems.map((item) => ({
    ...item,
    products: Array.isArray(item.products) ? item.products[0] ?? null : item.products,
    product_variants: Array.isArray(item.product_variants)
      ? item.product_variants[0] ?? null
      : item.product_variants,
  })) as CartItem[];

  // ── Validate ───────────────────────────────────────────────────────────────
  const validationErrors = validateCartItems(items);
  if (validationErrors.length > 0) {
    return err(validationErrors.join("; "));
  }

  // ── Group by vendor ────────────────────────────────────────────────────────
  const byVendor = new Map<string, CartItem[]>();
  for (const item of items) {
    const group = byVendor.get(item.vendor_id) ?? [];
    group.push(item);
    byVendor.set(item.vendor_id, group);
  }

  const createdOrderIds: string[] = [];

  for (const [vendorId, vendorItems] of byVendor) {
    try {
      const orderId = await createVendorOrder(
        admin,
        vendorId,
        vendorItems,
        userId,
        cartId,
        cart.currency as string
      );
      createdOrderIds.push(orderId);
      await recordStatusChange(admin, orderId, null, "pending", "Order created at checkout");
    } catch (e) {
      // Roll back any orders created in earlier iterations
      if (createdOrderIds.length > 0) {
        const { error: rollbackError } = await admin
          .from("orders")
          .delete()
          .in("id", createdOrderIds);

        if (rollbackError) {
          console.error(
            "[startCheckout] Rollback failed — orphaned order IDs:",
            createdOrderIds,
            rollbackError
          );
        }
      }

      // ✅ Surface the real error so we can see what's actually wrong
      const realMessage = e instanceof Error ? e.message : String(e);
      console.error("[startCheckout] Order creation failed:", realMessage);
      return err(realMessage);
    }
  }

  return ok({ orderIds: createdOrderIds });
}

export async function proceedToCheckout(): Promise<
  | { ok: true; orderId: string; orderIds: string[] }
  | { ok: false; error: string }
> {
  const result = await startCheckout();

  if (!result.success) {
    return { ok: false, error: result.error };
  }

  if (!result.orderIds?.length) {
    return { ok: false, error: "No orders were created. Please refresh your cart." };
  }

  return {
    ok: true,
    orderId: result.orderIds[0],
    orderIds: result.orderIds,
  };
}
export async function clearCartForOrder(
  orderId: string
): Promise<Result<{ failedItems: number }>> {
  const admin = getAdminDB();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("buyer_id, metadata")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error(`[clearCartForOrder] Could not find order ${orderId}:`, orderError);
    return err("Order not found");
  }

  const cartId = (order.metadata as Record<string, unknown>)?.cart_id as
    | string
    | undefined;

  if (!cartId) {
    console.warn(`[clearCartForOrder] No cart_id in metadata for order ${orderId}`);
    return err("No cart linked to this order");
  }

  const { data: orderItems, error: itemsError } = await admin
    .from("order_items")
    .select("product_id, variant_id")
    .eq("order_id", orderId);

  if (itemsError || !orderItems) {
    console.error(
      `[clearCartForOrder] Could not fetch items for order ${orderId}:`,
      itemsError
    );
    return err("Could not fetch order items");
  }

  const results = await Promise.all(
    orderItems.filter((oi) => oi.product_id !== null).map((oi) =>
      deleteCartItem(admin, cartId, oi.product_id!, oi.variant_id ?? null)
    )
  );

  const failedItems = results.filter((r) => !r).length;

  if (failedItems > 0) {
    console.warn(
      `[clearCartForOrder] ${failedItems}/${orderItems.length} cart items failed to delete for order ${orderId}`
    );
  }

  return ok({ failedItems });
}


type SyncResult =
  | {
    ok: true;
    changed: boolean;
    changes?: {
      itemsAdded: number;
      itemsRemoved: number;
      itemsUpdated: number;
      priceChanged: boolean;
      shippingReset: boolean;
    };
  }
  | { ok: false; error: string };

type CartItemRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  vendor_id: string;
  quantity: number;
  product_source: string;
  source_metadata: Json;
  products: {
    id: string;
    name: string;
    price: number;
    status: string;
    is_active: boolean;
    deleted_at: string | null;
    is_digital: boolean;
    images: string[] | null;
    pricing_type: string | null;
    billing_period: string | null;
  } | null;
  product_variants: {
    id: string;
    name: string | null;
    price: number;
    is_active: boolean;
    image_url: string | null;
  } | null;
};

type OrderItemRow = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a stable key for matching cart items to order items */
function itemKey(productId: string, variantId: string | null): string {
  return `${productId}|${variantId ?? "null"}`;
}

function normalizeRelation<T>(rel: T | T[] | null): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

// ─── Main action ──────────────────────────────────────────────────────────────

/**
 * Sync a pending order's items, totals, and shipping back to match the user's
 * CURRENT cart. Called from /checkout page load.
 *
 * Logic:
 *   1. Verify order belongs to user, is still pending
 *   2. Fetch current cart items for the cart_id stored in order metadata
 *   3. Diff cart items vs order items
 *   4. If different → update order_items + order totals + reset shipping
 *   5. Return whether anything changed (so UI can show "cart updated" banner)
 */
export async function syncOrderWithCart(orderId: string): Promise<SyncResult> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "Sign in required" };

  const admin = getAdminDB();

  // ── Fetch order + its current items ─────────────────────────────────────────
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select(
      `
      id, buyer_id, vendor_id, status, payment_status,
      currency, subtotal, total_amount, shipping_amount, metadata,
      order_items (id, product_id, variant_id, quantity, unit_price)
    `
    )
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .single();

  if (orderError || !order) {
    return { ok: false, error: "Order not found" };
  }

  // Don't sync orders that are already in flight or completed
  if (
    order.status !== "pending" ||
    !["pending", "failed"].includes(order.payment_status as string)
  ) {
    return { ok: false, error: "Order is no longer editable" };
  }

  const cartId = (order.metadata as Record<string, unknown>)?.cart_id as
    | string
    | undefined;
  if (!cartId) {
    return { ok: false, error: "Order has no cart reference" };
  }

  // ── Fetch current cart items (only this vendor's items) ─────────────────────
  const { data: rawCartItems, error: cartError } = await supabase
    .from("cart_items")
    .select(
      `
      id, quantity, product_id, variant_id, vendor_id, product_source, source_metadata,
      products(
        id, name, price, status, is_active, deleted_at,
        is_digital, images, pricing_type, billing_period
      ),
      product_variants(id, name, price, is_active, image_url)
    `
    )
    .eq("cart_id", cartId)
    .eq("vendor_id", order.vendor_id ?? "");

  if (cartError) {
    return { ok: false, error: `Could not read cart: ${cartError.message}` };
  }

  const cartItems: CartItemRow[] = (rawCartItems ?? []).map((item) => ({
    ...item,
    products: normalizeRelation(item.products),
    product_variants: normalizeRelation(item.product_variants),
  })) as CartItemRow[];

  // ── Build diff ──────────────────────────────────────────────────────────────
  const orderItemMap = new Map<string, OrderItemRow>();
  for (const oi of order.order_items ?? []) {
    if (oi.product_id) {
      orderItemMap.set(itemKey(oi.product_id, oi.variant_id), oi);
    }
  }

  const cartItemMap = new Map<string, CartItemRow>();
  for (const ci of cartItems) {
    cartItemMap.set(itemKey(ci.product_id, ci.variant_id), ci);
  }

  let itemsAdded = 0;
  let itemsRemoved = 0;
  let itemsUpdated = 0;
  let priceChanged = false;

  // Cart items NOT in order → need to add
  // Cart items IN order with different quantity or price → need to update
  for (const [key, ci] of cartItemMap) {
    const existing = orderItemMap.get(key);
    const currentPrice = Number(ci.product_variants?.price ?? ci.products?.price ?? 0);

    if (!existing) {
      itemsAdded++;
    } else if (
      existing.quantity !== ci.quantity ||
      Number(existing.unit_price) !== currentPrice
    ) {
      itemsUpdated++;
      if (Number(existing.unit_price) !== currentPrice) {
        priceChanged = true;
      }
    }
  }

  // Order items NOT in cart → need to remove
  for (const [key] of orderItemMap) {
    if (!cartItemMap.has(key)) {
      itemsRemoved++;
    }
  }

  const changed = itemsAdded + itemsRemoved + itemsUpdated > 0;

  // Nothing changed → return early
  if (!changed) {
    return { ok: true, changed: false };
  }

  // ── Cart became empty for this vendor → cancel the order ────────────────────
  if (cartItems.length === 0) {
    const { error: cancelError } = await admin
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (cancelError) {
      return { ok: false, error: `Could not cancel empty order: ${cancelError.message}` };
    }

    return {
      ok: true,
      changed: true,
      changes: {
        itemsAdded: 0,
        itemsRemoved,
        itemsUpdated: 0,
        priceChanged: false,
        shippingReset: true,
      },
    };
  }

  // ── Rebuild order_items from cart ───────────────────────────────────────────
  // Delete old order items, then insert fresh ones from the cart.
  // This is simpler than upserting and ensures the order EXACTLY matches the cart.
  const { error: deleteError } = await admin
    .from("order_items")
    .delete()
    .eq("order_id", orderId);

  if (deleteError) {
    return { ok: false, error: `Could not clear old items: ${deleteError.message}` };
  }

  let newSubtotal = 0;
  const newItemsPayload = cartItems.map((ci) => {
    const p = ci.products!;
    const v = ci.product_variants;
    const unitPrice = Number(v?.price ?? p.price);
    const totalPrice = unitPrice * ci.quantity;
    newSubtotal += totalPrice;

    const productImage =
      v?.image_url ??
      (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null);

    return {
      order_id: orderId,
      product_id: ci.product_id,
      variant_id: ci.variant_id,
      vendor_id: ci.vendor_id,
      product_name: p.name,
      product_image: productImage,
      variant_name: v?.name ?? null,
      quantity: ci.quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      product_source: ci.product_source,
      source_metadata: ci.source_metadata,
      product_type: p.is_digital ? "digital" : "physical",
      pricing_type: p.pricing_type ?? "one_time",
      billing_period: p.billing_period ?? null,
    };
  });

  const { error: insertError } = await admin
    .from("order_items")
    .insert(newItemsPayload);

  if (insertError) {
    return { ok: false, error: `Could not rebuild items: ${insertError.message}` };
  }

  // ── Update order totals, reset shipping (delivery method may no longer fit) ─
  // We keep the shipping_address (user already entered it) but null out
  // shipping_amount so the user re-picks a delivery method.
  const shippingReset = (order.shipping_amount ?? 0) > 0;

  const { error: updateError } = await admin
    .from("orders")
    .update({
      subtotal: newSubtotal,
      total_amount: newSubtotal, // shipping will be re-added when user picks delivery
      shipping_amount: null,
      // Clear any active Binance prepay session — amount has changed, old one invalid
      metadata: {
        ...((order.metadata as Record<string, unknown>) ?? {}),
        binance_prepay_id: null,
        binance_expire_time: null,
        binance_pay_amount: null,
        cart_synced_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    return { ok: false, error: `Could not update totals: ${updateError.message}` };
  }

  return {
    ok: true,
    changed: true,
    changes: {
      itemsAdded,
      itemsRemoved,
      itemsUpdated,
      priceChanged,
      shippingReset,
    },
  };
}