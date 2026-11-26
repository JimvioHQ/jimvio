"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/auth/platform-admin";
import { getAdminDB } from "@/services/db";
import { isPendingVariantSelection } from "@/lib/cart/pending-variant";
import { OrderUpdate } from "@/types/db";
import { Json } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/lib/notifications/notify-user";
import { computeOrderTotalAmount } from "@/lib/commerce/order-totals";
import { PLATFORM_CURRENCY, resolveLineUnitUsd, toPlatformUsd } from "@/lib/currency/platform";
import { estimateOrderTax } from "@/lib/commerce/tax-hooks";
import {
  buildAffiliateAttribution,
  mergeAffiliateMetadata,
  resolveAffiliateReferralFromCookies,
} from "@/lib/commerce/affiliate-hooks";
import { buildLineAttribution } from "@/lib/affiliate/attribution";
import { normalizeCountryCode } from "@/lib/geo/buyer-country";
import { cookies } from "next/headers";
import { cosTable } from "@/lib/commerce-os/db";
import { resolveJimvioStoreCheckoutTotals } from "@/lib/commerce-os/checkout/totals";
import { shouldScopeCartSyncToCatalogVendor } from "@/lib/commerce-os/checkout/cart-sync-scope";
import { resolveTrustedRateFromQuoteToken } from "@/lib/cj/checkout-quote-token";
import { revalidateCjLineStockWithToken, revalidatePendingCjOrders } from "@/lib/cj/revalidate-cart-stock";
import { usableCjVid } from "@/lib/cj/variant-vid";

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
  countryCode: z.preprocess(
    (val) => {
      if (typeof val !== "string") return val;
      return normalizeCountryCode(val) ?? val;
    },
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Country code must be a 2-letter ISO code")
  ),
  zip: z.string().trim().max(20).default(""),
  shippingAmount: z.number().nonnegative().optional(),
  /** Marketplace-only client hint; Jimvio Store discounts are server-validated via discountCode. */
  discountAmount: z.number().nonnegative().optional(),
  discountCode: z.string().trim().max(64).optional(),
  quoteToken: z.string().max(12_000).optional(),
  shippingOptionId: z.string().max(200).optional(),
  shippingOptionName: z.string().max(200).optional(),
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
  affiliate_link_id?: string | null;
  unit_price_at_add?: number | null;
  currency_at_add?: string | null;
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
    images: string[] | null;
    pricing_type: string | null;
    billing_period: string | null;
    affiliate_enabled?: boolean | null;
    affiliate_commission_rate?: number | null;
    affiliate_price?: number | null;
  } | null;
  product_variants: {
    id: string;
    name: string;
    price: number;
    inventory_quantity: number;
    is_active: boolean;
    image_url: string | null;
    cj_vid?: string | null;
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

    if (isPendingVariantSelection(item)) {
      errors.push(`Please choose your product options for "${p.name}" before checkout`);
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
  _currency: string,
  referralCode: string | null
): Promise<string> {
  let subtotal = 0;

  const orderItemsPayload = [];
  for (const item of vendorItems) {
    const p = item.products!;
    const v = item.product_variants;
    const unitPrice = resolveLineUnitUsd({
      unitPriceAtAdd: item.unit_price_at_add,
      currencyAtAdd: item.currency_at_add,
      catalogPrice: v?.price ?? p.price,
      catalogCurrency: p.currency,
    });
    const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;
    subtotal += totalPrice;

    const productImage =
      v?.image_url ??
      (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null);

    const attribution = await buildLineAttribution({
      buyerUserId: buyerId,
      productSource: item.product_source,
      affiliateEnabled: Boolean(p.affiliate_enabled),
      productCommissionRate: p.affiliate_commission_rate ?? null,
      affiliateFixedAmountUsd:
        p.affiliate_price != null && Number(p.affiliate_price) > 0
          ? toPlatformUsd(Number(p.affiliate_price), p.currency)
          : null,
      lineTotal: totalPrice,
      quantity: item.quantity,
      cartAffiliateLinkId: item.affiliate_link_id ?? null,
      saleCurrency: p.currency,
    });

    orderItemsPayload.push({
      product_id: item.product_id,
      variant_id: item.variant_id,
      vendor_id: vendorId,
      product_name: p.name,
      product_image: productImage,
      variant_name: v?.name ?? null,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      product_source: item.product_source,
      source_metadata: item.source_metadata,
      product_type: p.is_digital ? "digital" : "physical",
      pricing_type: p.pricing_type ?? "one_time",
      billing_period: p.billing_period ?? null,
      affiliate_id: attribution?.affiliate_id ?? null,
      affiliate_commission_rate: attribution?.affiliate_commission_rate ?? null,
      affiliate_commission_amount: attribution?.affiliate_commission_amount ?? null,
      affiliate_link_id: attribution?.affiliate_link_id ?? null,
      affiliate_campaign_id: attribution?.campaign_id ?? null,
      metadata: attribution
        ? {
            affiliate_link_id: attribution.affiliate_link_id,
            affiliate_campaign_id: attribution.campaign_id,
            attribution_model: attribution.attribution_model,
          }
        : null,
    });
  }

  const safeCurrency = PLATFORM_CURRENCY;

  // Commerce OS attribution: prefer cart.jimvio_store_id (server-owned), cookie as fallback
  let jimvioStoreId: string | null = null;
  let orderChannel: string = "marketplace";
  /** For native store orders, merchant store owner — not the product catalog vendor. */
  let orderOwnerVendorId = vendorId;
  try {
    const { data: cartRow } = await admin
      .from("carts")
      .select("jimvio_store_id")
      .eq("id", cartId)
      .maybeSingle();
    if (cartRow && (cartRow as { jimvio_store_id?: string | null }).jimvio_store_id) {
      jimvioStoreId = (cartRow as { jimvio_store_id: string }).jimvio_store_id;
      orderChannel = "jimvio_store";
    } else {
      const jar = await cookies();
      const handle = jar.get("jimvio_store_handle")?.value;
      if (handle) {
        const decoded = decodeURIComponent(handle).toLowerCase().trim();
        if (decoded) {
          const { data: store } = await cosTable(admin, "jimvio_stores")
            .select("id, vendor_id, status")
            .eq("handle", decoded)
            .maybeSingle();
          if (
            store?.id &&
            (store.status === "published" || store.status === "draft")
          ) {
            jimvioStoreId = store.id;
            orderChannel = "jimvio_store";
            if (typeof store.vendor_id === "string" && store.vendor_id) {
              orderOwnerVendorId = store.vendor_id;
            }
          }
        }
      }
    }

    if (jimvioStoreId) {
      const { data: ownedStore } = await cosTable(admin, "jimvio_stores")
        .select("id, vendor_id")
        .eq("id", jimvioStoreId)
        .maybeSingle();
      if (ownedStore?.vendor_id) {
        orderOwnerVendorId = String(ownedStore.vendor_id);
      }
    }
  } catch {
    // Cookie/cart resolution is best-effort; marketplace checkout must continue
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      buyer_id: buyerId,
      vendor_id: orderOwnerVendorId,
      status: "pending" as OrderStatusValue,
      payment_status: "pending" as PaymentStatusValue,
      subtotal,
      total_amount: subtotal,
      currency: safeCurrency,
      referral_code: referralCode,
      affiliate_attributed_at: referralCode ? new Date().toISOString() : null,
      order_channel: orderChannel,
      jimvio_store_id: jimvioStoreId,
      metadata: mergeAffiliateMetadata(
        {
          cart_id: cartId,
          ...(jimvioStoreId ? { jimvio_store_id: jimvioStoreId } : {}),
          ...(orderOwnerVendorId !== vendorId
            ? { catalog_vendor_id: vendorId }
            : {}),
        },
        buildAffiliateAttribution({
          referralCode,
          source: referralCode ? "cookie" : "none",
        })
      ) as Json,
    } as any)
    .select("id, order_number, total_amount, currency")
    .single();

  if (orderError || !order) {
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

  if (jimvioStoreId) {
    try {
      const { reserveInventoryForOrder } = await import(
        "@/lib/commerce-os/inventory/holds"
      );
      const hold = await reserveInventoryForOrder(admin, {
        storeId: jimvioStoreId,
        orderId: order.id,
        lines: orderItemsPayload.map((oi) => ({
          productId: oi.product_id as string,
          variantId: (oi as { variant_id?: string | null }).variant_id ?? null,
          quantity: Number(oi.quantity || 1),
        })),
      });
      if (!hold.ok) {
        await admin.from("order_items").delete().eq("order_id", order.id);
        await admin.from("orders").delete().eq("id", order.id);
        throw new Error(hold.error);
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("Insufficient inventory")) {
        throw e;
      }
      // Soft-fail hold insert errors so marketplace-compatible checkout continues
      console.warn("[checkout] inventory hold skipped:", e);
    }
  }

  await notifyUser(admin, {
    userId: buyerId,
    type: "order",
    title: "Order received",
    message: `Order #${order.order_number} is ready. Complete payment to confirm your items.`,
    actionUrl: jimvioStoreId
      ? `/account/orders/${order.id}`
      : `/checkout?order=${order.id}`,
    data: {
      event: "order.created",
      order_id: order.id,
      order_number: order.order_number,
      payment_status: "pending",
    },
    eventKey: `order.created:buyer:${order.id}`,
    email: {
      kind: "order_confirmation",
      orderId: order.id,
      orderNumber: String(order.order_number),
      totalAmount: Number(order.total_amount ?? subtotal),
      currency: String(order.currency ?? safeCurrency),
      paymentLabel: "Pending",
      statusLabel: "Order Created",
      itemCount: orderItemsPayload.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      items: orderItemsPayload.map((item) => ({
        name: String(item.product_name),
        quantity: Number(item.quantity || 1),
        imageUrl: typeof item.product_image === "string" ? item.product_image : null,
      })),
      actionPath: jimvioStoreId ? `/account/orders/${order.id}` : `/checkout?order=${order.id}`,
      idempotencyKey: `order.created:buyer:${order.id}`,
    },
  });

  // Merchant: order exists before payment — visible in Commerce → Orders immediately.
  try {
    const { data: vendorRow } = await admin
      .from("vendors")
      .select("user_id")
      .eq("id", orderOwnerVendorId)
      .maybeSingle();
    if (vendorRow?.user_id && vendorRow.user_id !== buyerId) {
      await notifyUser(admin, {
        userId: vendorRow.user_id,
        type: "order",
        title: "New order — payment pending",
        message: `Order #${order.order_number} was placed. Payment is pending.`,
        actionUrl: `/commerce/orders/${order.id}`,
        data: {
          event: "order.created",
          order_id: order.id,
          order_number: order.order_number,
          payment_status: "pending",
          jimvio_store_id: jimvioStoreId,
        },
        eventKey: `order.created:merchant:${order.id}`,
        email: {
          kind: "seller_new_order",
          orderId: order.id,
          orderNumber: String(order.order_number),
          currency: String(order.currency ?? safeCurrency),
          paymentLabel: "Pending",
          statusLabel: "Order Created",
          itemCount: orderItemsPayload.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
          items: orderItemsPayload.map((item) => ({
            name: String(item.product_name),
            quantity: Number(item.quantity || 1),
          })),
          actionPath: `/commerce/orders/${order.id}`,
          idempotencyKey: `order.created:merchant:${order.id}`,
        },
      });
    }
  } catch (merchantNotifyErr) {
    console.warn("[checkout] merchant order.created notify skipped:", merchantNotifyErr);
  }

  try {
    revalidatePath("/commerce");
    revalidatePath("/commerce/orders");
    if (jimvioStoreId) {
      revalidatePath(`/commerce/orders/${order.id}`);
      revalidatePath("/account");
      revalidatePath("/account/orders");
      revalidatePath(`/account/orders/${order.id}`);
    }
  } catch (revalidateErr) {
    console.warn("[checkout] revalidate skipped:", revalidateErr);
  }

  return order.id;
}

/**
 * When checkout resumes a pending order, backfill affiliate fields from the
 * current cart sticky link / referral cookies so attribution is not frozen null.
 */
async function refreshPendingOrdersAffiliateAttribution(
  admin: ReturnType<typeof getAdminDB>,
  orderIds: string[],
  buyerId: string,
  cartId: string
): Promise<void> {
  if (!orderIds.length) return;

  const referralCode = await resolveAffiliateReferralFromCookies();
  const { data: cartItems } = await admin
    .from("cart_items")
    .select(
      `
      product_id, quantity, product_source, affiliate_link_id,
      unit_price_at_add, currency_at_add,
      products(
        id, price, currency, affiliate_enabled, affiliate_commission_rate, affiliate_price
      ),
      product_variants(price)
    `
    )
    .eq("cart_id", cartId);

  const byProduct = new Map<string, any>();
  for (const item of (cartItems ?? []) as any[]) {
    if (item.product_id) byProduct.set(item.product_id, item);
  }

  for (const orderId of orderIds) {
    const { data: existingOrder } = await admin
      .from("orders")
      .select("id, metadata, referral_code")
      .eq("id", orderId)
      .eq("buyer_id", buyerId)
      .eq("payment_status", "pending")
      .maybeSingle();
    if (!existingOrder) continue;

    if (referralCode) {
      const prevMeta =
        existingOrder.metadata && typeof existingOrder.metadata === "object"
          ? (existingOrder.metadata as Record<string, unknown>)
          : {};
      await admin
        .from("orders")
        .update({
          referral_code: referralCode,
          affiliate_attributed_at: new Date().toISOString(),
          metadata: mergeAffiliateMetadata(
            prevMeta,
            buildAffiliateAttribution({
              referralCode,
              source: "cookie",
            })
          ) as Json,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", orderId);
    }

    const { data: lines } = await admin
      .from("order_items")
      .select(
        "id, product_id, quantity, total_price, affiliate_id, affiliate_link_id, product_source"
      )
      .eq("order_id", orderId);

    for (const line of lines ?? []) {
      if (line.affiliate_id && line.affiliate_link_id) continue;
      const cartItem = line.product_id ? byProduct.get(line.product_id) : null;
      const productRaw = cartItem?.products;
      const product = Array.isArray(productRaw) ? productRaw[0] : productRaw;
      if (!product) continue;

      const lineTotal = Number(line.total_price ?? 0);
      const attribution = await buildLineAttribution({
        buyerUserId: buyerId,
        productSource: line.product_source ?? cartItem?.product_source,
        affiliateEnabled: Boolean(product.affiliate_enabled),
        productCommissionRate: product.affiliate_commission_rate ?? null,
        affiliateFixedAmountUsd:
          product.affiliate_price != null && Number(product.affiliate_price) > 0
            ? toPlatformUsd(Number(product.affiliate_price), product.currency)
            : null,
        lineTotal,
        quantity: line.quantity,
        cartAffiliateLinkId: cartItem?.affiliate_link_id ?? null,
        saleCurrency: product.currency,
      });
      if (!attribution) continue;

      await admin
        .from("order_items")
        .update({
          affiliate_id: attribution.affiliate_id,
          affiliate_commission_rate: attribution.affiliate_commission_rate,
          affiliate_commission_amount: attribution.affiliate_commission_amount,
          affiliate_link_id: attribution.affiliate_link_id,
          affiliate_campaign_id: attribution.campaign_id,
          metadata: {
            affiliate_link_id: attribution.affiliate_link_id,
            affiliate_campaign_id: attribution.campaign_id,
            attribution_model: attribution.attribution_model,
            attribution_refreshed_at: new Date().toISOString(),
          },
        } as any)
        .eq("id", line.id)
        .is("affiliate_id", null);
    }
  }
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
): Promise<Result<{ resumeProvider?: "flutterwave" | "nowpayments" | "binancepay" | "mobile_money" | "wallet"; resumeTxRef?: string }>> {
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

  // ── Build shipping address ─────────────────────────────────────────────────
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

  // ✅ Use admin client (matches startCheckout) so RLS doesn't silently block
  const admin = getAdminDB();

  // ✅ Pre-check: fetch the actual state of those orders so we can give a real error
  // jimvio_store_id is not in generated Database types yet — use cosTable accessor
  const { data: existingOrdersRaw, error: fetchError } = await cosTable(admin, "orders")
    .select(
      "id, buyer_id, status, payment_status, subtotal, shipping_amount, discount_amount, tax_amount, total_amount, shipping_address, metadata, jimvio_store_id, currency, payment_provider, gateway_used"
    )
    .in("id", payload.orderIds);

  type ShippingOrderRow = {
    id: string;
    buyer_id: string;
    status: string | null;
    payment_status: string | null;
    subtotal: number | string | null;
    shipping_amount: number | string | null;
    discount_amount: number | string | null;
    tax_amount: number | string | null;
    total_amount: number | string | null;
    shipping_address: unknown;
    metadata: unknown;
    jimvio_store_id: string | null;
    currency: string | null;
    payment_provider: string | null;
    gateway_used: string | null;
  };

  const existingOrders = (existingOrdersRaw ?? []) as ShippingOrderRow[];

  if (fetchError) {
    console.error("[updatePendingOrdersShipping] Fetch failed:", fetchError);
    return err(`Could not read orders: ${fetchError.message}`);
  }

  if (!existingOrders.length) {
    console.warn("[updatePendingOrdersShipping] No orders exist for IDs:", payload.orderIds);
    return err("Those orders no longer exist. Please return to the cart and try again.");
  }

  // Tell the user exactly why their submission was rejected
  const wrongBuyer = existingOrders.filter((o) => o.buyer_id !== userId);
  if (wrongBuyer.length) {
    console.warn("[updatePendingOrdersShipping] Wrong buyer:", { userId, wrongBuyer });
    return err("You can't update these orders — they belong to a different account.");
  }

  // Marketplace's direct-checkout flow legitimately creates unpaid orders with
  // status="checkout_direct". Payment eligibility is determined by payment_status;
  // the order status must only exclude terminal/cancelled states here.
  const invalidOrderStatus = existingOrders.filter(
    (o) => !["pending", "checkout_direct"].includes(o.status ?? "")
  );
  if (invalidOrderStatus.length) {
    return err("One or more orders are no longer available for checkout. Please open Orders to review their status.");
  }

  // A previous payment attempt may still have a valid provider session. Never
  // rewrite shipping/totals once a provider has been given the order amount.
  const { data: paymentRows, error: paymentRowsError } = await admin
    .from("transactions")
    .select("id, order_id, provider, provider_transaction_id, reference, status, created_at, metadata")
    .in("order_id", payload.orderIds)
    .in("status", ["pending", "processing", "completed", "failed"])
    .order("created_at", { ascending: false });
  if (paymentRowsError) {
    console.error("[updatePendingOrdersShipping] Payment state lookup failed:", paymentRowsError);
    return err("We couldn't verify your existing payment attempt. Please open Orders and try again.");
  }

  const completedPaymentRows = (paymentRows ?? []).filter(
    (row) => row.status === "completed" && String(row.provider ?? "").toLowerCase() !== "wallet"
  );
  if (completedPaymentRows.length) {
    return err("A payment was already received and is being confirmed. Please check Orders before trying again.");
  }

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const activeRows = (paymentRows ?? []).filter((row) => {
    if (row.status === "failed") return false;
    const provider = String(row.provider ?? "").toLowerCase();
    const createdAt = new Date(row.created_at ?? 0).getTime();
    const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown>
      : {};
    if (provider === "wallet") return true; // Wallet debit reservations must always be reconciled.
    if (provider === "binance") {
      const expiry = Number(metadata.expire_time);
      return Number.isFinite(createdAt) && createdAt >= oneHourAgo &&
        (!Number.isFinite(expiry) || expiry > now);
    }
    if (provider === "nowpayments") return true;
    if (provider === "flutterwave") return Number.isFinite(createdAt) && createdAt >= oneHourAgo;
    if (provider === "mobile_money") return true; // Await provider confirmation; never start a duplicate charge.
    return true; // Unknown active providers fail closed instead of permitting a second charge.
  });

  if (activeRows.length) {
    const activeOrderIds = new Set(activeRows.map((row) => row.order_id));
    if (existingOrders.some((order) => !activeOrderIds.has(order.id))) {
      return err("A payment was started for only part of this cart. Please open Orders and finish or resolve that payment before retrying the cart.");
    }

    const providers = new Set(activeRows.map((row) => String(row.provider ?? "").toLowerCase()));
    if (providers.size !== 1) {
      return err("More than one payment attempt is active for this cart. Please open Orders and resolve the existing payment before starting another.");
    }

    const provider = [...providers][0];
    const isMobileMoney = provider === "flutterwave" && activeRows.some((row) => {
      const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata as Record<string, unknown>
        : {};
      return metadata.method === "mobile_money";
    });
    const resumeProvider =
      isMobileMoney ? "mobile_money" :
      provider === "binance" ? "binancepay" :
      provider === "flutterwave" ? "flutterwave" :
      provider === "nowpayments" ? "nowpayments" :
      provider === "wallet" ? "wallet" : null;

    if (!resumeProvider) {
      return err("A payment is still awaiting confirmation. Please complete or check that payment in Orders before starting another.");
    }

    if (provider !== "wallet") {
      const sessionKeys = new Set(activeRows.map((row) => {
        const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? row.metadata as Record<string, unknown>
          : {};
        return provider === "nowpayments"
          ? String(metadata.invoice_id ?? row.reference ?? "")
          : provider === "binance"
            ? String(metadata.prepay_id ?? row.provider_transaction_id ?? "")
            : String(row.provider_transaction_id ?? "");
      }));
      if (sessionKeys.size !== 1 || sessionKeys.has("")) {
        return err("The existing payment session is incomplete. Please open Orders and contact support before retrying payment.");
      }
    }

    const addressKeys = ["firstName", "lastName", "email", "phone", "address1", "address2", "city", "country", "country_code", "zip"];
    const normalizedAddress = (value: unknown) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const record = value as Record<string, unknown>;
      return addressKeys.map((key) => String(record[key] ?? "").trim());
    };
    const sameMoney = (a: unknown, b: unknown) =>
      Math.round((Number(a ?? 0) + Number.EPSILON) * 100) ===
      Math.round((Number(b ?? 0) + Number.EPSILON) * 100);

    const existingShippingTotal = existingOrders.reduce(
      (sum, order) => sum + Number(order.shipping_amount ?? 0),
      0
    );
    const existingDiscountTotal = existingOrders.reduce(
      (sum, order) => sum + Number(order.discount_amount ?? 0),
      0
    );
    const unchanged =
      existingOrders.every((order) =>
        JSON.stringify(normalizedAddress(order.shipping_address)) ===
        JSON.stringify(normalizedAddress(shipping_address))
      ) &&
      (typeof payload.shippingAmount !== "number" || sameMoney(existingShippingTotal, payload.shippingAmount)) &&
      (typeof payload.discountAmount !== "number" || sameMoney(existingDiscountTotal, payload.discountAmount));
    if (!unchanged) {
      return err("A payment session is already active for this order. Finish that payment from Orders before changing shipping details or totals.");
    }

    return ok({
      resumeProvider,
      ...(isMobileMoney && typeof activeRows[0].provider_transaction_id === "string"
        ? { resumeTxRef: activeRows[0].provider_transaction_id }
        : {}),
    });
  }

  // A stale processing flag without an active transaction is recoverable. Reset
  // it only after confirming that there is no pending/processing/completed row.
  const processingOrders = existingOrders.filter((order) => order.payment_status === "processing");
  const processingOrderIds = processingOrders.map((order) => order.id);
  if (processingOrderIds.length) {
    const hasUntrackedProviderAttempt = existingOrders.some((order) =>
      ["pending", "processing"].includes(order.payment_status ?? "") &&
      (order.payment_provider || order.gateway_used) &&
      !(paymentRows ?? []).some((row) => row.order_id === order.id)
    );
    if (hasUntrackedProviderAttempt) {
      return err("The payment provider has not confirmed the previous attempt yet. Please check Orders before trying another payment.");
    }
    const { error: resetError } = await admin
      .from("orders")
      .update({ payment_status: "pending" as PaymentStatusValue, updated_at: new Date().toISOString() })
      .in("id", processingOrderIds)
      .eq("buyer_id", userId)
      .in("status", ["pending", "checkout_direct"])
      .eq("payment_status", "processing");
    if (resetError) {
      console.error("[updatePendingOrdersShipping] Stale processing reset failed:", resetError);
      return err("We couldn't safely resume this order. Please open Orders and try again.");
    }
  }

  const notPending = existingOrders.filter(
    (o) => !["pending", "failed", "processing"].includes(o.payment_status ?? "")
  );
  if (notPending.length) {
    console.warn("[updatePendingOrdersShipping] Not pending:", notPending);
    return err(
      `Order already ${notPending[0].payment_status === "paid" || notPending[0].payment_status === "completed" ? "paid" : "in progress"}. Refresh the page to continue.`
    );
  }

  const referralCode = await resolveAffiliateReferralFromCookies();
  const attribution = buildAffiliateAttribution({
    referralCode,
    source: referralCode ? "cookie" : "none",
  });

  // ── Persist per-order with recomputed payable total ─────────────────────────
  const updatedIds: string[] = [];

  for (const order of existingOrders) {
    const subtotal = Number(order.subtotal ?? order.total_amount ?? 0);
    let shippingAmount =
      typeof payload.shippingAmount === "number"
        ? payload.shippingAmount
        : Number(order.shipping_amount ?? 0);
    let discountAmount =
      typeof payload.discountAmount === "number"
        ? payload.discountAmount
        : Number(order.discount_amount ?? 0);
    let taxAmount = Number(order.tax_amount ?? 0);

    const existingMeta =
      order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
        ? (order.metadata as Record<string, unknown>)
        : {};

    let totalsMeta: Record<string, unknown> = {};

    // Jimvio Store checkouts: server-authoritative discount + tax + shipping quotes
    if (order.jimvio_store_id) {
      try {
        const { data: lineRows } = await admin
          .from("order_items")
          .select("product_source, product_type")
          .eq("order_id", order.id);
        const lines = lineRows ?? [];
        const supplier = lines.some((line) => line.product_source === "cj");
        const needsShipping = lines.some(
          (line) => (line.product_type || "physical") !== "digital"
        );
        const fulfillment = supplier
          ? "supplier"
          : needsShipping
            ? "merchant"
            : "digital";
        let verifiedSupplierShipping: number | null = null;
        if (fulfillment === "supplier") {
          const trusted = resolveTrustedRateFromQuoteToken({
            token: payload.quoteToken,
            selection: {
              optionId: payload.shippingOptionId,
              name: payload.shippingOptionName || "",
              priceUSD: payload.shippingAmount,
            },
            products: [],
            destCountryCode: payload.countryCode,
            orderIds: [order.id],
          });
          verifiedSupplierShipping =
            trusted && Number.isFinite(Number(trusted.priceUSD))
              ? Number(trusted.priceUSD)
              : null;
        }
        const storeTotals = await resolveJimvioStoreCheckoutTotals(admin, {
          storeId: order.jimvio_store_id as string,
          subtotal,
          countryCode: payload.countryCode,
          proposedShippingAmount:
            typeof payload.shippingAmount === "number"
              ? payload.shippingAmount
              : undefined,
          discountCode: payload.discountCode ?? null,
          fulfillment,
          verifiedSupplierShipping,
        });
        shippingAmount = storeTotals.shippingAmount;
        discountAmount = storeTotals.discountAmount;
        taxAmount = storeTotals.taxAmount;
        totalsMeta = {
          jimvio_checkout_totals: {
            subtotal: storeTotals.subtotal,
            discount: storeTotals.discountAmount,
            shipping: storeTotals.shippingAmount,
            tax: storeTotals.taxAmount,
            grand_total: storeTotals.totalAmount,
            discount_id: storeTotals.discountId,
            discount_label: storeTotals.discountLabel,
            tax_rate: storeTotals.taxRate,
            shipping_source: storeTotals.shippingSource,
            free_shipping: storeTotals.freeShipping,
            verified_at: new Date().toISOString(),
          },
        };
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Could not calculate store checkout totals.";
        return err(message);
      }
    } else {
      const { data: lineRows } = await admin
        .from("order_items")
        .select("product_source")
        .eq("order_id", order.id);
      const supplier = (lineRows ?? []).some((line) => line.product_source === "cj");
      if (supplier) {
        const trusted = resolveTrustedRateFromQuoteToken({
          token: payload.quoteToken,
          selection: {
            optionId: payload.shippingOptionId,
            name: payload.shippingOptionName || "",
            priceUSD: payload.shippingAmount,
          },
          products: [],
          destCountryCode: payload.countryCode,
          orderIds: [order.id],
        });
        if (!trusted || !Number.isFinite(Number(trusted.priceUSD))) {
          return err("Select a delivery method before paying.");
        }
        shippingAmount = Number(trusted.priceUSD);
      }
      const taxEstimate = estimateOrderTax({
        subtotal,
        shippingAmount,
        countryCode: payload.countryCode,
        currency: order.currency ?? undefined,
      });
      if (taxEstimate.taxAmount > 0) {
        taxAmount = taxEstimate.taxAmount;
      }
    }

    const totalAmount = computeOrderTotalAmount({
      subtotal,
      discount_amount: discountAmount,
      shipping_amount: shippingAmount,
      tax_amount: taxAmount,
    });

    const orderUpdate: Record<string, unknown> = {
      shipping_address,
      shipping_amount: shippingAmount,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      updated_at: new Date().toISOString(),
      metadata: mergeAffiliateMetadata(
        { ...existingMeta, ...totalsMeta },
        attribution
      ) as Json,
    };

    if (referralCode) {
      orderUpdate.referral_code = referralCode;
    }

    const { error: updateError, data } = await admin
      .from("orders")
      .update(orderUpdate as OrderUpdate)
      .eq("id", order.id)
      .eq("buyer_id", userId)
      .in("status", ["pending", "checkout_direct"])
      .in("payment_status", ["pending", "failed"])
      .select("id");

    if (updateError) {
      console.error("[updatePendingOrdersShipping] Update failed:", updateError);
      return err(updateError.message);
    }
    if (data?.[0]?.id) updatedIds.push(data[0].id);
  }

  if (!updatedIds.length) {
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

export async function startCheckout(
  storeHandle?: string | null
): Promise<Result<{ orderIds: string[] }>> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return err("Sign in to check out");
  const userId = user.id;

  // ── Cart (marketplace vs Jimvio store scope) ───────────────────────────────
  const jar = await cookies();
  const storeHandleCookie = storeHandle || jar.get("jimvio_store_handle")?.value;
  let scopedStoreId: string | null = null;
  if (storeHandleCookie) {
    try {
      const decoded = decodeURIComponent(storeHandleCookie).toLowerCase().trim();
      const { resolveJimvioStoreIdByHandle } = await import(
        "@/lib/commerce-os/cart/scoped"
      );
      const store = await resolveJimvioStoreIdByHandle(supabase, decoded);
      if (store?.id) scopedStoreId = store.id;
    } catch {
      scopedStoreId = null;
    }
  }

  let cartQuery = supabase
    .from("carts")
    .select("id, currency, jimvio_store_id")
    .eq("user_id", userId);
  if (scopedStoreId) {
    cartQuery = cartQuery.eq("jimvio_store_id", scopedStoreId);
  } else {
    cartQuery = cartQuery.is("jimvio_store_id", null);
  }
  const { data: cart } = await cartQuery.maybeSingle();
  if (!cart?.id) return err("Cart is empty");
  const cartId = cart.id;

  const admin = getAdminDB();


  // ── Resume existing pending/failed orders for this cart ───────────────────
  let existingQuery = cosTable(admin, "orders")
    .select("id, payment_status, jimvio_store_id, payment_provider, gateway_used")
    .eq("buyer_id", userId)
    .eq("status", "pending")
    .in("payment_status", ["pending", "failed", "processing"])
    .filter("metadata->>cart_id", "eq", cartId);
  if (scopedStoreId) {
    existingQuery = existingQuery.eq("jimvio_store_id", scopedStoreId);
  } else {
    existingQuery = existingQuery.is("jimvio_store_id", null);
  }
  const { data: existingOrders, error: existingError } = await existingQuery;

  if (existingError) {
    console.error("[startCheckout] Failed to fetch existing orders:", existingError);
    return err(`Could not validate existing checkout: ${existingError.message}`);
  }

  if (existingOrders && existingOrders.length > 0) {
    const existingOrderIds = existingOrders.map((order) => order.id);
    const { data: activePaymentRows, error: activePaymentError } = await admin
      .from("transactions")
      .select("order_id, status")
      .in("order_id", existingOrderIds)
      .in("status", ["pending", "processing", "completed", "failed"]);
    if (activePaymentError) {
      console.error("[startCheckout] Could not verify active payment sessions:", activePaymentError);
      return err("Could not verify an existing payment. Please open Orders and try again.");
    }
    const hasUntrackedProcessingAttempt = existingOrders.some((order) =>
      ["pending", "processing"].includes(order.payment_status ?? "") &&
      (order.payment_provider || order.gateway_used) &&
      !(activePaymentRows ?? []).some((row) => row.order_id === order.id)
    );
    if (hasUntrackedProcessingAttempt) {
      return err("The payment provider has not confirmed a previous order attempt. Please check Orders before retrying checkout.");
    }
    const protectedOrderIds = new Set(
      (activePaymentRows ?? []).filter((row) => row.status !== "failed").map((row) => row.order_id)
    );
    const ordersSafeToRevalidate = existingOrders
      .filter((order) => !protectedOrderIds.has(order.id))
      .map((order) => order.id);
    if (ordersSafeToRevalidate.length) {
      const stockError = await revalidatePendingCjOrders(admin, ordersSafeToRevalidate);
      if (stockError) return err(stockError);
    }

    const failedOrders = existingOrders.filter(
      (o) => o.payment_status === "failed" && !protectedOrderIds.has(o.id)
    );

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

    // Resume must not freeze a missing affiliate attribution from an earlier attempt.
    try {
      const attributionRefreshIds = existingOrders
        .filter((order) => !protectedOrderIds.has(order.id))
        .map((order) => order.id);
      if (attributionRefreshIds.length) {
        await refreshPendingOrdersAffiliateAttribution(
          admin,
          attributionRefreshIds,
          userId,
          cartId
        );
      }
    } catch (refreshErr) {
      console.warn("[startCheckout] attribution refresh skipped:", refreshErr);
    }

    return ok({ orderIds: existingOrders.map((o) => o.id) });
  }

  // cartId was read above with the user's session filtered by user_id; line metadata is server-only.
  const { data: rawItems, error: itemsError } = await admin
    .from("cart_items")
    .select(`
      id, quantity, product_id, variant_id, vendor_id, product_source, source_metadata, affiliate_link_id, unit_price_at_add, currency_at_add,
      products(
        id, name, price, currency, status, is_active, deleted_at,
        track_inventory, inventory_quantity, allow_backorder,
        is_digital, requires_shipping,
        images, pricing_type, billing_period,
        affiliate_enabled, affiliate_commission_rate, affiliate_price
      ),
      product_variants(id, name, price, inventory_quantity, is_active, image_url, cj_vid)
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

  const supplierLines = items.filter((item) => item.product_source === "cj");
  if (supplierLines.length > 0) {
    const stockCheck = await revalidateCjLineStockWithToken(
      admin,
      supplierLines.map((item) => ({
        name: item.products?.name ?? "Item",
        quantity: item.quantity,
        vid: usableCjVid(item.product_variants?.cj_vid),
      })),
    );
    for (const item of supplierLines) {
      const vid = usableCjVid(item.product_variants?.cj_vid);
      if (vid && item.product_variants && stockCheck.quantities[vid] != null) {
        item.product_variants.inventory_quantity = stockCheck.quantities[vid]!;
      }
    }
    if (stockCheck.errors.length > 0) {
      return err(stockCheck.errors.join("; "));
    }
  }

  // ── Validate ───────────────────────────────────────────────────────────────
  const validationErrors = validateCartItems(items);
  const { evaluateDigitalPurchase } = await import("@/lib/digital-products/trust/service");
  for (const item of items) {
    if (item.products?.is_digital !== true) continue;
    const purchase = await evaluateDigitalPurchase(item.product_id);
    if (!purchase.allowed) {
      validationErrors.push(`"${item.products.name}" cannot be purchased. ${purchase.reason}`);
    }
  }
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
  const referralCode = await resolveAffiliateReferralFromCookies();

  for (const [vendorId, vendorItems] of byVendor) {
    try {
      const orderId = await createVendorOrder(
        admin,
        vendorId,
        vendorItems,
        userId,
        cartId,
        cart.currency as string,
        referralCode
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

export async function proceedToCheckout(
  storeHandle?: string | null
): Promise<
  | { ok: true; orderId: string; orderIds: string[] }
  | { ok: false; error: string }
> {
  const result = await startCheckout(storeHandle);

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Authentication required");
  if (!isUuid(orderId)) return err("Order not found");

  const admin = getAdminDB();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("buyer_id, metadata")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
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
  unit_price_at_add?: number | null;
  currency_at_add?: string | null;
  products: {
    id: string;
    name: string;
    price: number;
    currency?: string | null;
    status: string;
    is_active: boolean;
    deleted_at: string | null;
    is_digital: boolean;
    images: string[] | null;
    pricing_type: string | null;
    billing_period: string | null;
    affiliate_enabled?: boolean | null;
    affiliate_commission_rate?: number | null;
    affiliate_price?: number | null;
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
      id, buyer_id, vendor_id, status, payment_status, payment_provider, gateway_used,
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

  const { data: storeScope } = await cosTable(admin, "orders")
    .select("jimvio_store_id")
    .eq("id", orderId)
    .maybeSingle();
  const orderStoreId =
    (storeScope?.jimvio_store_id as string | null | undefined) ?? null;

  const metadata = (order.metadata as Record<string, unknown>) ?? {};
  const isDirectCheckout =
    order.status === "checkout_direct" || metadata.is_direct_checkout === true;

  // Buy Now creates a standalone checkout session — never sync it against the cart.
  if (isDirectCheckout) {
    return { ok: true, changed: false };
  }

  // Don't rewrite cart items or totals once a provider has an active payment
  // transaction. The amount shown to the provider must remain immutable.
  const { data: activePaymentRows, error: activePaymentError } = await admin
    .from("transactions")
    .select("id, status")
    .eq("order_id", orderId)
    .in("status", ["pending", "processing", "completed", "failed"])
    .limit(1);
  if (activePaymentError) {
    return { ok: false, error: "Could not verify the existing payment session." };
  }
  if (activePaymentRows?.some((row) => row.status !== "failed")) {
    return { ok: true, changed: false };
  }
  if (
    ["pending", "processing"].includes(order.payment_status as string) &&
    (order.payment_provider || order.gateway_used) &&
    !activePaymentRows?.length
  ) {
    return { ok: false, error: "The payment provider has not confirmed the previous attempt. Please check Orders before editing this order." };
  }

  // A stale processing flag without a corresponding transaction can be reset;
  // active provider sessions were returned above and remain immutable.
  if (order.status === "pending" && order.payment_status === "processing") {
    const { error: resetError } = await admin
      .from("orders")
      .update({ payment_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .eq("payment_status", "processing");
    if (resetError) {
      return { ok: false, error: "Could not safely resume the previous payment attempt." };
    }
  }

  // Don't sync orders that are already in flight or completed.
  if (
    order.status !== "pending" ||
    !["pending", "failed", "processing"].includes(order.payment_status as string)
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
  // The cart must be this user's (RLS on carts); line metadata is then read server-side.
  const { data: ownedCart } = await supabase.from("carts").select("id").eq("id", cartId).eq("user_id", user.id).maybeSingle();
  if (!ownedCart) return { ok: false, error: "Cart not found" };
  let cartItemsQuery = admin
    .from("cart_items")
    .select(
      `
      id, quantity, product_id, variant_id, vendor_id, product_source, source_metadata,
      unit_price_at_add, currency_at_add,
      products(
        id, name, price, currency, status, is_active, deleted_at,
        is_digital, images, pricing_type, billing_period,
        affiliate_enabled, affiliate_commission_rate, affiliate_price
      ),
      product_variants(id, name, price, is_active, image_url)
    `
    )
    .eq("cart_id", cartId);
  if (
    shouldScopeCartSyncToCatalogVendor({
      jimvio_store_id: orderStoreId,
    })
  ) {
    cartItemsQuery = cartItemsQuery.eq("vendor_id", order.vendor_id ?? "");
  }
  const { data: rawCartItems, error: cartError } = await cartItemsQuery;

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
    const currentPrice = resolveLineUnitUsd({
      unitPriceAtAdd: ci.unit_price_at_add,
      currencyAtAdd: ci.currency_at_add,
      catalogPrice: ci.product_variants?.price ?? ci.products?.price,
      catalogCurrency: ci.products?.currency,
    });

    if (!existing) {
      itemsAdded++;
    } else if (
      existing.quantity !== ci.quantity ||
      Math.abs(Number(existing.unit_price) - currentPrice) > 0.001
    ) {
      itemsUpdated++;
      if (Math.abs(Number(existing.unit_price) - currentPrice) > 0.001) {
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

    return { ok: false, error: "cart_empty" };
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
    const unitPrice = resolveLineUnitUsd({
      unitPriceAtAdd: ci.unit_price_at_add,
      currencyAtAdd: ci.currency_at_add,
      catalogPrice: v?.price ?? p.price,
      catalogCurrency: p.currency,
    });
    const totalPrice = Math.round(unitPrice * ci.quantity * 100) / 100;
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
      currency: PLATFORM_CURRENCY,
      subtotal: Math.round(newSubtotal * 100) / 100,
      total_amount: Math.round(newSubtotal * 100) / 100, // shipping re-added when user picks delivery
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
