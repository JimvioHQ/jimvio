"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/services/db";
import { OrderUpdate } from "@/types/db";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShippingPayload = {
  orderIds: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  country: string;
  countryCode: string;
  zip: string;
  shippingAmount?: number;
  shippingCurrency?: string;
};

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function deleteCartItem(
  admin: ReturnType<typeof getAdminDB>,
  cartId: string,
  productId: string,
  variantId: string | null
) {
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
      `[clearCartForOrder] Failed to delete cart item — product: ${productId}, variant: ${variantId ?? "null"}`,
      error
    );
  }
}

async function recordOrderStatusChange(
  admin: ReturnType<typeof getAdminDB>,
  orderId: string,
  previousStatus: OrderStatusValue | null,
  newStatus: OrderStatusValue,
  notes?: string
) {
  const { error } = await admin.from("order_status_history").insert({
    order_id: orderId,
    previous_status: previousStatus,
    new_status: newStatus,
    notes: notes ?? null,
  });

  if (error) {
    console.error("[recordOrderStatusChange] Insert failed:", error);
  }
}

// ─── updatePendingOrdersShipping ─────────────────────────────────────────────

export async function updatePendingOrdersShipping(payload: ShippingPayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false as const, error: "Authentication required" };
  }

  if (!Array.isArray(payload.orderIds) || !payload.orderIds.length) {
    return { success: false as const, error: "Order IDs required" };
  }
  if (!payload.firstName.trim()) {
    return { success: false as const, error: "First name required" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return { success: false as const, error: "Invalid email" };
  }
  if (!/^[A-Z]{2}$/.test(payload.countryCode)) {
    return {
      success: false as const,
      error: "Country code must be 2 uppercase letters",
    };
  }

  const shipping_address = {
    firstName: payload.firstName.slice(0, 100),
    lastName: payload.lastName.slice(0, 100),
    email: payload.email.slice(0, 200),
    phone: payload.phone.slice(0, 30),
    address1: payload.address1.slice(0, 200),
    address2: (payload.address2 ?? "").slice(0, 200),
    city: payload.city.slice(0, 100),
    country: payload.country.slice(0, 100),
    country_code: payload.countryCode,
    zip: payload.zip.slice(0, 20),
  };

  const update: OrderUpdate = {
    shipping_address,
    updated_at: new Date().toISOString(),
  };

  if (typeof payload.shippingAmount === "number" && payload.shippingAmount >= 0) {
    update.shipping_amount = payload.shippingAmount;
  }

  const { error } = await supabase
    .from("orders")
    .update(update)
    .eq("buyer_id", user.id)
    .eq("status", "pending")
    .in("payment_status", ["pending", "failed"])
    .in("id", payload.orderIds);

  if (error) {
    return { success: false as const, error: error.message };
  }

  revalidatePath("/checkout");
  return { success: true as const };
}

// ─── startCheckout ────────────────────────────────────────────────────────────

export async function startCheckout() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to check out" };

  const { data: cart } = await supabase
    .from("carts")
    .select("id, currency")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!cart) return { error: "Cart is empty" };

  const admin = getAdminDB();

  const { data: existingOrders, error: fetchExistingError } = await admin
    .from("orders")
    .select("id, payment_status")
    .eq("buyer_id", user.id)
    .eq("status", "pending")
    .in("payment_status", ["pending", "failed"])
    .filter("metadata->>cart_id", "eq", cart.id);

  if (fetchExistingError) {
    console.error("[startCheckout] Failed to fetch existing orders:", fetchExistingError);
    return { error: "Could not validate existing checkout orders. Please try again." };
  }

  if (existingOrders && existingOrders.length > 0) {
    const failedIds = existingOrders
      .filter((o) => o.payment_status === "failed")
      .map((o) => o.id);

    if (failedIds.length > 0) {
      const { error: resetError } = await admin
        .from("orders")
        .update({
          payment_status: "pending" as PaymentStatusValue,
          updated_at: new Date().toISOString(),
        })
        .in("id", failedIds);

      if (resetError) {
        console.error("[startCheckout] Failed to reset failed orders:", resetError);
        return { error: "Could not reset failed orders. Please try again." };
      }

      for (const id of failedIds) {
        await recordOrderStatusChange(
          admin,
          id,
          "pending", // Matches your original flow safe state tracking
          "pending",
          "Payment retry — reset from failed to pending"
        );
      }
    }

    return { ok: true as const, orderIds: existingOrders.map((o) => o.id) };
  }

  // ── Fetch cart items ─────────────────────────────────────────────────────
  const { data: items } = await supabase
    .from("cart_items")
    .select(`
      id, quantity, product_id, variant_id, vendor_id, product_source, source_metadata,
      products!inner(
        id, name, price, currency, status, is_active, deleted_at,
        track_inventory, inventory_quantity, allow_backorder,
        is_digital, requires_shipping
      ),
      product_variants(id, name, price, inventory_quantity, is_active)
    `)
    .eq("cart_id", cart.id);

  if (!items || items.length === 0) return { error: "Cart is empty" };

  // ── Validate quantity > 0 and price > 0 ─────────────────────────────────
  const invalid: string[] = [];
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      invalid.push(`Invalid quantity for a cart item`);
      continue;
    }

    const p = Array.isArray(item.products) ? item.products[0] : item.products;
    const v = Array.isArray(item.product_variants) ? item.product_variants[0] : item.product_variants;

    if (!p || p.status !== "active" || !p.is_active || p.deleted_at) {
      invalid.push(`${p?.name ?? "Item"} is no longer available`);
      continue;
    }

    const unitPrice = Number(v?.price ?? p.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      invalid.push(`${p.name} has an invalid price`);
      continue;
    }

    if (p.track_inventory && !p.allow_backorder) {
      const stock = v?.inventory_quantity ?? p.inventory_quantity;
      if (item.quantity > stock) {
        invalid.push(`Only ${stock} of ${p.name} in stock`);
      }
    }
  }
  if (invalid.length > 0) return { error: invalid.join("; ") };

  // ── Group by vendor ──────────────────────────────────────────────────────
  const byVendor = new Map<string, typeof items>();
  for (const item of items) {
    const list = byVendor.get(item.vendor_id) ?? [];
    list.push(item);
    byVendor.set(item.vendor_id, list);
  }

  const createdOrderIds: string[] = [];

  for (const [vendorId, vendorItems] of byVendor) {
    let subtotal = 0;

    const orderItemsToInsert = vendorItems.map((item) => {
      const p = Array.isArray(item.products) ? item.products[0] : item.products!;
      const v = Array.isArray(item.product_variants) ? item.product_variants[0] : item.product_variants;
      const unitPrice = Number(v?.price ?? p.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      return {
        product_id: item.product_id,
        variant_id: item.variant_id,
        vendor_id: vendorId,
        product_name: p.name,
        variant_name: v?.name ?? null,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        product_source: item.product_source,
        source_metadata: item.source_metadata,
        product_type: p.is_digital ? "digital" : "physical",
      };
    });

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        buyer_id: user.id,
        vendor_id: vendorId,
        status: "pending" as OrderStatusValue,
        payment_status: "pending" as PaymentStatusValue,
        subtotal,
        total_amount: subtotal,
        currency: cart.currency,
        metadata: { cart_id: cart.id },
      })
      .select("id")
      .single();

    if (orderError || !order) {
      if (createdOrderIds.length > 0) {
        await admin.from("orders").delete().in("id", createdOrderIds);
      }
      console.error("[startCheckout] Order creation failed:", orderError);
      return { error: "Couldn't create order. Please try again." };
    }

    const itemsWithOrderId = orderItemsToInsert.map((oi) => ({
      ...oi,
      order_id: order.id,
    }));

    const { error: itemsError } = await admin
      .from("order_items")
      .insert(itemsWithOrderId);

    if (itemsError) {
      await admin
        .from("orders")
        .delete()
        .in("id", [...createdOrderIds, order.id]);
      console.error("[startCheckout] Order items insert failed:", itemsError);
      return { error: "Couldn't create order. Please try again." };
    }

    await recordOrderStatusChange(admin, order.id, null, "pending", "Order created at checkout");
    createdOrderIds.push(order.id);
  }

  return { ok: true as const, orderIds: createdOrderIds };
}

export async function clearCartForOrder(orderId: string) {
  const admin = getAdminDB();

  const { data: order, error: orderFetchError } = await admin
    .from("orders")
    .select("buyer_id, metadata")
    .eq("id", orderId)
    .single();

  if (orderFetchError || !order) {
    console.error(`[clearCartForOrder] Could not find order ${orderId}:`, orderFetchError);
    return;
  }

  const cartId = (order.metadata as Record<string, unknown>)?.cart_id as string | undefined;
  if (!cartId) {
    console.warn(`[clearCartForOrder] No cart_id in metadata for order ${orderId}`);
    return;
  }

  const { data: orderItems, error: itemsFetchError } = await admin
    .from("order_items")
    .select("product_id, variant_id")
    .eq("order_id", orderId);

  if (itemsFetchError || !orderItems) {
    console.error(`[clearCartForOrder] Could not fetch order items for ${orderId}:`, itemsFetchError);
    return;
  }

  for (const oi of orderItems) {
    await deleteCartItem(admin, cartId, oi.product_id ?? "", oi.variant_id ?? null);
  }
}

