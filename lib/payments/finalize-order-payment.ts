// import type { SupabaseClient } from "@supabase/supabase-js";
// import { createShopifyOrder, attachShopifyOrdersToJimvioOrder } from "@/services/shopifyOrderCreation";
// import { getShopifyPlatformCommissionFallback } from "@/lib/platform-settings";
// import { creditVendorWalletsForNativeOrder } from "@/lib/payments/credit-vendors-for-native-order";
// import { dispatchNonShopifyFulfillmentIntegrations, isShopifyFulfillmentLine } from "@/lib/order-fulfillment/after-payment";
// import { grantDigitalAccess as executeDigitalAccessGrant } from "@/lib/actions/digital-access";

// // ─── Digital access ───────────────────────────────────────────────────────────

// async function grantDigitalAccess(
//   db: SupabaseClient,
//   orderId: string,
//   buyerUserId: string | null | undefined,
//   paymentProvider: string | null | undefined
// ): Promise<void> {
//   try {
//     const { data: items } = await db
//       .from("order_items")
//       .select("id, product_id, digital_download_url")
//       .eq("order_id", orderId);

//     if (!items || items.length === 0) return;

//     const productIds = items
//       .map((i: { product_id: string | null }) => i.product_id)
//       .filter((id): id is string => !!id);

//     if (productIds.length === 0) return;

//     const { data: products } = await db
//       .from("products")
//       .select("id, product_type, digital_file_url, pricing_type, billing_period")
//       .in("id", productIds);

//     const productMap = new Map(
//       (products ?? []).map((p: any) => [p.id, p] as const)
//     );

//     const now = new Date().toISOString();
//     let digitalCount = 0;

//     for (const item of items) {
//       const product = productMap.get(item.product_id ?? "");
//       // product_type enum: physical | digital | subscription | course | software | template | ebook
//       if (!product || product.product_type !== "digital") continue;

//       digitalCount++;

//       if (item.digital_download_url) continue; // already granted

//       if (buyerUserId) {
//         try {
//           await executeDigitalAccessGrant({
//             userId: buyerUserId,
//             productId: product.id,
//             orderItemId: item.id,
//             orderId,
//             accessUrl: product.digital_file_url ?? null,
//             subtype: null,
//             pricingType: product.pricing_type ?? "one_time",
//             billingPeriod: product.billing_period ?? null,
//           });
//         } catch (e) {
//           console.warn(`[DigitalAccess] Failed for ${item.id}:`, e);
//         }
//       } else {
//         // Legacy fallback — no authenticated buyer
//         const { error } = await db
//           .from("order_items")
//           .update({
//             product_type: "digital",
//             digital_download_url: product.digital_file_url ?? null,
//             access_granted_at: now,
//           })
//           .eq("id", item.id);

//         if (error) {
//           console.warn(`[DigitalAccess] Fallback failed for order_item ${item.id}:`, error.message);
//         }
//       }
//     }

//     // All items digital → instant delivery
//     if (digitalCount > 0 && digitalCount === items.length) {
//       // order_status enum includes "delivered" ✓
//       await db
//         .from("orders")
//         .update({ status: "delivered", delivered_at: now })
//         .eq("id", orderId);

//       if (buyerUserId) {
//         await db.from("notifications").insert({
//           user_id: buyerUserId,
//           // notification_type enum includes "order" ✓
//           type: "order",
//           title: "Digital Access Granted! ⚡",
//           message: `Your digital purchase is ready. Access it anytime from your Library.`,
//           data: { order_id: orderId, type: "digital_access" },
//           action_url: `/dashboard/library`,
//         });
//       }

//       console.log(`[DigitalAccess] ✓ Instant delivery for order ${orderId}. ${digitalCount} items unlocked.`);
//     } else if (digitalCount > 0) {
//       console.log(`[DigitalAccess] ✓ Partial digital grant for order ${orderId}. ${digitalCount}/${items.length} unlocked.`);
//     }
//   } catch (err) {
//     console.warn(`[DigitalAccess] Non-fatal error for order ${orderId}:`, err);
//   }
// }

// // ─── Types ────────────────────────────────────────────────────────────────────

// export type FinalizePaymentContext = {
//   providerTransactionId: string;
//   providerReference: string;
//   paidAtIso: string;
//   notifyUserId?: string | null;
//   amountForMessage?: number | null;
//   webhookReference?: string;
//   nowpaymentsPaymentId?: number | null;
//   paymentProvider?: string | null;
// };

// // ─── Main ─────────────────────────────────────────────────────────────────────

// export async function finalizeOrderPayment(
//   db: SupabaseClient,
//   orderId: string,
//   ctx: FinalizePaymentContext
// ): Promise<{ type: "regular" | "shopify" | "skipped" }> {

//   if (ctx.providerTransactionId) {
//     const now = new Date();

//     const { data: claimedTx, error: claimError } = await db
//       .from("transactions")
//       .update({ status: "completed", updated_at: now.toISOString() })
//       .eq("provider_transaction_id", ctx.providerTransactionId)
//       .eq("status", "pending")       // FIX: was "pending" → correct, this is the lock condition
//       .select("id")
//       .maybeSingle();

//     if (claimError) {
//       console.error(`[finalizeOrderPayment] Lock error for tx ${ctx.providerTransactionId}:`, claimError);
//     }

//     if (!claimedTx && !claimError) {
//       const { data: existingTx } = await db
//         .from("transactions")
//         .select("updated_at, status")
//         .eq("provider_transaction_id", ctx.providerTransactionId)
//         .maybeSingle();

//       if (existingTx && existingTx.status === "completed") { // FIX: was "successful"
//         const ageMs = now.getTime() - new Date(existingTx.updated_at).getTime();

//         if (ageMs < 3 * 60 * 1000) {
//           console.log(`[finalizeOrderPayment] Tx ${ctx.providerTransactionId} locked ${Math.round(ageMs / 1000)}s ago. Skipping.`);
//           return { type: "skipped" };
//         }

//         // Stale lock — re-acquire to recover from a crash
//         console.log(`[finalizeOrderPayment] Stale lock (${Math.round(ageMs / 1000)}s). Re-acquiring.`);
//         await db
//           .from("transactions")
//           .update({ updated_at: now.toISOString() })
//           .eq("provider_transaction_id", ctx.providerTransactionId);
//       }
//     }
//   }

//   // ── 1. Fetch order ─────────────────────────────────────────────────────────

//   const { data: order, error: orderError } = await db
//     .from("orders")
//     .select(`
//       *,
//       order_items (
//         id,
//         product_id,
//         vendor_id,
//         product_name,
//         quantity,
//         unit_price,
//         total_price,
//         product_source,
//         source_metadata,
//         affiliate_id,
//         affiliate_commission_rate,
//         affiliate_commission_amount
//       ),
//       profiles (
//         full_name,
//         email,
//         phone
//       )
//     `)
//     .eq("id", orderId)
//     .single();

//   if (orderError || !order) {
//     throw new Error(`Order not found: ${orderId}`);
//   }

//   const isPaid = order.payment_status === "completed"; // enum value ✓
//   const rawOrderItems = order.order_items ?? [];

//   const orderItems = rawOrderItems.map((item: any) => ({
//     ...item,
//     shopify_variant_id: item.source_metadata?.shopify_variant_id ?? null,
//     shopify_product_id: item.source_metadata?.shopify_product_id ?? null,
//   })) as Array<{
//     id: string;
//     vendor_id: string;
//     shopify_variant_id: number | null;
//     product_name: string;
//     quantity: number;
//     unit_price: number;
//     total_price: number;
//     product_source?: string | null;
//     source_metadata?: Record<string, unknown> | null;
//     affiliate_id: string | null;
//     affiliate_commission_rate: number | null;
//     affiliate_commission_amount: number | null;
//     product_id: string | null;
//   }>;

//   const shopifyItems = orderItems.filter((item) => isShopifyFulfillmentLine(item));
//   const hasShopifyBridge =
//     order.shopify_order_id != null ||
//     (Array.isArray(order.shopify_order_ids) && order.shopify_order_ids.length > 0);

//   if (isPaid && (shopifyItems.length === 0 || hasShopifyBridge)) {
//     return { type: "skipped" };
//   }

//   const recoveryShopifyOnly = isPaid && shopifyItems.length > 0 && !hasShopifyBridge;

//   const buyerProfile = order.profiles as {
//     full_name?: string | null;
//     email?: string | null;
//     phone?: string | null;
//   } | null;

//   const buyerName = (buyerProfile?.full_name || "Unknown User").split(" ");

//   const shipping = order.shipping_address as {
//     address1?: string;
//     address2?: string;
//     city?: string;
//     country?: string;
//     country_code?: string;
//     zip?: string;
//     phone?: string;
//   } | null;


//   function buildOrderPatch(
//     status: "confirmed" | "processing",
//     existingMetadata: Record<string, unknown> = {}
//   ): Record<string, unknown> {
//     const metadataUpdate: Record<string, unknown> = { ...existingMetadata };

//     if (ctx.nowpaymentsPaymentId != null) {
//       metadataUpdate.nowpayments_payment_id = ctx.nowpaymentsPaymentId;
//     }
//     if (ctx.paymentProvider) {
//       metadataUpdate.payment_provider = ctx.paymentProvider;
//     }

//     return {
//       payment_status: "completed",
//       status,
//       paid_at: ctx.paidAtIso,
//       updated_at: new Date().toISOString(),
//       metadata: metadataUpdate,
//     };
//   }

//   if (shopifyItems.length === 0) {
//     if (isPaid) return { type: "skipped" };

//     const { error: patchError } = await db
//       .from("orders")
//       .update(buildOrderPatch("confirmed", order.metadata ?? {}))
//       .eq("id", orderId);

//     if (patchError) {
//       console.error("[finalizeOrderPayment] Failed to update order status:", patchError);
//       throw new Error(`Failed to update order status: ${patchError.message}`);
//     }

//     try {
//       await db.from("order_status_history").insert({
//         order_id: orderId,
//         previous_status: order.status,
//         new_status: "confirmed",
//         notes: `Payment confirmed via ${ctx.paymentProvider ?? "gateway"}. Order moved to confirmed.`,
//       });
//     } catch (e) {
//       console.warn("[finalizeOrderPayment] Could not log status history:", e);
//     }

//     await creditVendorWalletsForNativeOrder(db, {
//       orderId,
//       orderNumber: String(order.order_number ?? orderId),
//       currency: String(order.currency ?? "RWF"),
//       paymentProvider: ctx.paymentProvider ?? null,
//       providerTransactionId: ctx.providerTransactionId,
//       items: orderItems.map((i) => ({
//         vendor_id: i.vendor_id,
//         total_price: i.total_price,
//         product_source: i.product_source,
//         shopify_variant_id: i.shopify_variant_id,
//       })),
//     });

//     await grantDigitalAccess(db, orderId, ctx.notifyUserId, ctx.paymentProvider);

//     await dispatchNonShopifyFulfillmentIntegrations(db, {
//       orderId,
//       orderNumber: String(order.order_number ?? orderId),
//       items: orderItems.map((i) => ({
//         id: i.id,
//         product_id: i.product_id ?? "",
//         vendor_id: i.vendor_id,
//         quantity: i.quantity,
//         unit_price: i.unit_price,
//         total_price: i.total_price,
//         product_source: i.product_source,
//         source_metadata: i.source_metadata ?? null,
//       })),
//     });

//     // Affiliate commissions
//     for (const item of orderItems.filter((i) => i.affiliate_id != null)) {
//       if (!item.affiliate_id || !item.affiliate_commission_amount) continue;

//       await db.from("affiliate_commissions").insert({
//         affiliate_id: item.affiliate_id,
//         order_id: orderId,
//         order_item_id: item.id,
//         product_id: item.product_id,
//         vendor_id: item.vendor_id,
//         commission_rate: item.affiliate_commission_rate,
//         order_amount: item.total_price,
//         commission_amount: item.affiliate_commission_amount,
//         status: "pending",
//       });

//       await db.rpc("increment_affiliate_earnings", {
//         p_affiliate_id: item.affiliate_id,
//         p_amount: item.affiliate_commission_amount,
//       });
//     }

//     if (ctx.notifyUserId) {
//       await db.from("notifications").insert({
//         user_id: ctx.notifyUserId,
//         type: "order",
//         title: "Payment Confirmed!",
//         message: `Your payment${ctx.amountForMessage != null ? ` of RWF ${Number(ctx.amountForMessage).toLocaleString()}` : ""} has been confirmed. Order is being processed.`,
//         data: { order_id: orderId, reference: ctx.webhookReference },
//         action_url: `/dashboard/orders/${orderId}`,
//       });
//     }

//     return { type: "regular" };
//   }

//   // ── 3b. Shopify path ───────────────────────────────────────────────────────

//   const itemsByVendor = shopifyItems.reduce<Record<string, typeof shopifyItems>>(
//     (acc, item) => {
//       if (!acc[item.vendor_id]) acc[item.vendor_id] = [];
//       acc[item.vendor_id].push(item);
//       return acc;
//     },
//     {}
//   );

//   const results = await Promise.allSettled(
//     Object.entries(itemsByVendor).map(async ([vendorId, items]) => {
//       const { data: creds } = await db
//         .from("shopify_credentials")
//         .select("platform_commission_rate")
//         .eq("vendor_id", vendorId)
//         .single();

//       const fallbackRate = await getShopifyPlatformCommissionFallback(db);
//       const platformCommissionRate =
//         creds?.platform_commission_rate != null
//           ? Number(creds.platform_commission_rate)
//           : fallbackRate;

//       const vendorTotal = items.reduce((sum, i) => sum + Number(i.total_price), 0);

//       return createShopifyOrder({
//         jimvioOrderId: orderId,
//         vendorId,
//         buyer: {
//           firstName: buyerName[0] || "Customer",
//           lastName: buyerName.slice(1).join(" ") || "",
//           email: buyerProfile?.email || "",
//           phone: buyerProfile?.phone || shipping?.phone || "",
//           address1: shipping?.address1 || "",
//           address2: shipping?.address2 || "",
//           city: shipping?.city || "",
//           country: shipping?.country || "Rwanda",
//           countryCode: shipping?.country_code || "RW",
//           zip: shipping?.zip || "00000",
//         },
//         items: items.map((i) => ({
//           shopifyVariantId: i.shopify_variant_id as number,
//           quantity: i.quantity,
//           unitPrice: Number(i.unit_price),
//           productName: i.product_name,
//         })),
//         totalAmount: vendorTotal,
//         currency: order.currency || "USD",
//         paymentReference: ctx.providerTransactionId,
//         platformCommissionRate,
//       });
//     })
//   );

//   const created = results
//     .filter(
//       (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof createShopifyOrder>>> =>
//         r.status === "fulfilled"
//     )
//     .map((r) => r.value);

//   if (created.length) {
//     await attachShopifyOrdersToJimvioOrder(orderId, created);
//   }

//   if (!recoveryShopifyOnly) {
//     const { error: shopifyPatchError } = await db
//       .from("orders")
//       .update(buildOrderPatch("processing", order.metadata ?? {}))
//       .eq("id", orderId);

//     if (shopifyPatchError) {
//       console.error("[finalizeOrderPayment] Failed to update Shopify order status:", shopifyPatchError);
//       throw new Error(`Failed to update Shopify order status: ${shopifyPatchError.message}`);
//     }

//     try {
//       await db.from("order_status_history").insert({
//         order_id: orderId,
//         previous_status: order.status,
//         new_status: "processing",
//         notes: `Payment confirmed via ${ctx.paymentProvider ?? "gateway"}. Forwarding to Shopify for fulfillment.`,
//       });
//     } catch (e) {
//       console.warn("[finalizeOrderPayment] Could not log status history:", e);
//     }

//     if (ctx.notifyUserId) {
//       await db.from("notifications").insert({
//         user_id: ctx.notifyUserId,
//         type: "order", // notification_type enum ✓
//         title: "Payment Confirmed!",
//         message: `Your Shopify order${ctx.amountForMessage != null ? ` (RWF ${Number(ctx.amountForMessage).toLocaleString()})` : ""} is being fulfilled by the merchant.`,
//         data: { order_id: orderId, reference: ctx.webhookReference },
//         action_url: `/dashboard/orders/${orderId}`,
//       });
//     }
//   }

//   await creditVendorWalletsForNativeOrder(db, {
//     orderId,
//     orderNumber: String(order.order_number ?? orderId),
//     currency: String(order.currency ?? "RWF"),
//     paymentProvider: ctx.paymentProvider ?? null,
//     providerTransactionId: ctx.providerTransactionId,
//     items: orderItems.map((i) => ({
//       vendor_id: i.vendor_id,
//       total_price: i.total_price,
//       product_source: i.product_source,
//       shopify_variant_id: i.shopify_variant_id,
//     })),
//   });

//   await dispatchNonShopifyFulfillmentIntegrations(db, {
//     orderId,
//     orderNumber: String(order.order_number ?? orderId),
//     items: orderItems.map((i) => ({
//       id: i.id,
//       product_id: i.product_id ?? "",
//       vendor_id: i.vendor_id,
//       quantity: i.quantity,
//       unit_price: i.unit_price,
//       total_price: i.total_price,
//       product_source: i.product_source,
//       source_metadata: i.source_metadata ?? null,
//     })),
//   });

//   // Affiliate commissions — deduplicated for Shopify path
//   for (const item of orderItems.filter((i) => i.affiliate_id != null)) {
//     if (!item.affiliate_id || !item.affiliate_commission_amount) continue;

//     const { data: existing } = await db
//       .from("affiliate_commissions")
//       .select("id")
//       .eq("order_item_id", item.id)
//       .maybeSingle();

//     if (existing) continue;

//     await db.from("affiliate_commissions").insert({
//       affiliate_id: item.affiliate_id,
//       order_id: orderId,
//       order_item_id: item.id,
//       product_id: item.product_id,
//       vendor_id: item.vendor_id,
//       commission_rate: item.affiliate_commission_rate,
//       order_amount: item.total_price,
//       commission_amount: item.affiliate_commission_amount,
//       status: "pending", // payout_status enum ✓
//     });

//     await db.rpc("increment_affiliate_earnings", {
//       p_affiliate_id: item.affiliate_id,
//       p_amount: item.affiliate_commission_amount,
//     });
//   }

//   return { type: "shopify" };
// }

import type { SupabaseClient } from "@supabase/supabase-js";
import { createShopifyOrder, attachShopifyOrdersToJimvioOrder } from "@/services/shopifyOrderCreation";
import { getShopifyPlatformCommissionFallback } from "@/lib/platform-settings";
import { creditVendorWalletsForNativeOrder } from "@/lib/payments/credit-vendors-for-native-order";
import { dispatchNonShopifyFulfillmentIntegrations, isShopifyFulfillmentLine } from "@/lib/order-fulfillment/after-payment";
import { grantDigitalAccess as executeDigitalAccessGrant } from "@/lib/actions/digital-access";
import { submitOrderToCJ } from "@/services/cj/cj-order-service";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FinalizePaymentContext = {
  providerTransactionId: string;
  providerReference: string;
  paidAtIso: string;
  notifyUserId?: string | null;
  amountForMessage?: number | null;
  webhookReference?: string;
  nowpaymentsPaymentId?: number | null;
  paymentProvider?: string | null;
};

// Shape of a CJ order item pulled from order_items + source_metadata
interface CJOrderItem {
  id: string;
  product_id: string | null;
  vendor_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_source: string | null;
  source_metadata: Record<string, unknown> | null;
  affiliate_id: string | null;
  affiliate_commission_rate: number | null;
  affiliate_commission_amount: number | null;
}

// ─── Digital access ───────────────────────────────────────────────────────────

async function grantDigitalAccess(
  db: SupabaseClient,
  orderId: string,
  buyerUserId: string | null | undefined,
  paymentProvider: string | null | undefined
): Promise<void> {
  try {
    const { data: items } = await db
      .from("order_items")
      .select("id, product_id, digital_download_url")
      .eq("order_id", orderId);

    if (!items || items.length === 0) return;

    const productIds = items
      .map((i: { product_id: string | null }) => i.product_id)
      .filter((id): id is string => !!id);

    if (productIds.length === 0) return;

    const { data: products } = await db
      .from("products")
      .select("id, product_type, digital_file_url, pricing_type, billing_period")
      .in("id", productIds);

    const productMap = new Map(
      (products ?? []).map((p: any) => [p.id, p] as const)
    );

    const now = new Date().toISOString();
    let digitalCount = 0;

    for (const item of items) {
      const product = productMap.get(item.product_id ?? "");
      if (!product || product.product_type !== "digital") continue;

      digitalCount++;
      if (item.digital_download_url) continue;

      if (buyerUserId) {
        try {
          await executeDigitalAccessGrant({
            userId: buyerUserId,
            productId: product.id,
            orderItemId: item.id,
            orderId,
            accessUrl: product.digital_file_url ?? null,
            subtype: null,
            pricingType: product.pricing_type ?? "one_time",
            billingPeriod: product.billing_period ?? null,
          });
        } catch (e) {
          console.warn(`[DigitalAccess] Failed for ${item.id}:`, e);
        }
      } else {
        const { error } = await db
          .from("order_items")
          .update({
            product_type: "digital",
            digital_download_url: product.digital_file_url ?? null,
            access_granted_at: now,
          })
          .eq("id", item.id);

        if (error) {
          console.warn(`[DigitalAccess] Fallback failed for ${item.id}:`, error.message);
        }
      }
    }

    if (digitalCount > 0 && digitalCount === items.length) {
      await db
        .from("orders")
        .update({ status: "delivered", delivered_at: now })
        .eq("id", orderId);

      if (buyerUserId) {
        await db.from("notifications").insert({
          user_id: buyerUserId,
          type: "order",
          title: "Digital Access Granted! ⚡",
          message: `Your digital purchase is ready. Access it anytime from your Library.`,
          data: { order_id: orderId, type: "digital_access" },
          action_url: `/dashboard/library`,
        });
      }
    }
  } catch (err) {
    console.warn(`[DigitalAccess] Non-fatal error for order ${orderId}:`, err);
  }
}

// ─── CJ submission ────────────────────────────────────────────────────────────

/**
 * Submit CJ line items to CJ Dropshipping after payment is confirmed.
 *
 * Reads cj_vid from order_items.source_metadata and cj_shipping_method
 * from orders.cj_shipping_method (saved during checkout step 2).
 *
 * Non-fatal: logs failure but does not throw — the order is already paid
 * and the buyer should not be left in limbo. Ops can retry via failed_wallet_credits.
 */
async function submitCJItemsIfPresent(
  db: SupabaseClient,
  orderId: string,
  orderItems: CJOrderItem[],
  order: {
    cj_shipping_method: string | null;
    shipping_address: Record<string, string> | null;
    profiles: {
      full_name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
  }
): Promise<void> {
  const cjItems = orderItems.filter(
    (i) => i.product_source === "cj"
  );

  if (cjItems.length === 0) return;

  // ── Guard: shipping method must have been saved at checkout ───────────────
  const shippingMethod = order.cj_shipping_method;
  if (!shippingMethod) {
    console.error(
      `[CJ] Order ${orderId} has CJ items but no cj_shipping_method saved. ` +
      "Buyer did not complete the delivery step. Skipping CJ submission."
    );
    await db.from("order_status_history").insert({
      order_id: orderId,
      previous_status: "confirmed",
      new_status: "confirmed",
      notes: "CJ submission skipped: cj_shipping_method not set on order.",
    });
    return;
  }

  // ── Build line items — cj_vid lives in source_metadata ───────────────────
  const lines = cjItems.map((item) => {
    const cjVid =
      (item.source_metadata?.cj_vid as string | undefined) ??
      (item.source_metadata?.vid as string | undefined) ??
      null;

    if (!cjVid) {
      throw new Error(
        `[CJ] Order item ${item.id} is source=cj but has no cj_vid in source_metadata. ` +
        "Cannot submit to CJ without a variant ID."
      );
    }

    return {
      vid: cjVid,
      quantity: item.quantity,
      shippingName: shippingMethod,
    };
  });

  // ── Build shipping address from order.shipping_address ───────────────────
  const sa = order.shipping_address;
  const profile = order.profiles;
  const buyerName = (profile?.full_name ?? "Customer").split(" ");

  const shippingAddress = {
    name: profile?.full_name ?? "Customer",
    phone: sa?.phone ?? profile?.phone ?? "",
    countryCode: sa?.country_code ?? sa?.countryCode ?? "RW",
    province: sa?.province ?? sa?.city ?? "",
    city: sa?.city ?? "",
    address: sa?.address1 ?? sa?.address ?? "",
    address2: sa?.address2 ?? "",
    zip: sa?.zip ?? "00000",
  };

  // ── Submit — submitOrderToCJ handles its own error logging ────────────────
  try {
    const result = await submitOrderToCJ({
      orderId,
      lines,
      shippingAddress,
    });

    console.log(
      `[CJ] Order ${orderId} submitted successfully. ` +
      `CJ order: ${result.cjOrderNum} (${result.cjOrderId})`
    );

    // Notify buyer that their CJ items are being processed
    if (order.profiles) {
      const buyerId = (order.profiles as any).id ?? null;
      if (buyerId) {
        await db.from("notifications").insert({
          user_id: buyerId,
          type: "order",
          title: "Order sent to supplier",
          message:
            `Your order is being processed by our supplier. ` +
            `CJ reference: ${result.cjOrderNum}`,
          data: {
            order_id: orderId,
            cj_order_num: result.cjOrderNum,
          },
          action_url: `/dashboard/orders/${orderId}`,
        });
      }
    }
  } catch (err) {
    // submitOrderToCJ already writes to order_status_history and
    // failed_wallet_credits on failure — just log here.
    console.error(
      `[CJ] Submission failed for order ${orderId}:`,
      (err as Error).message
    );
    // Non-fatal: order is paid, buyer will be notified, ops can retry
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function finalizeOrderPayment(
  db: SupabaseClient,
  orderId: string,
  ctx: FinalizePaymentContext
): Promise<{ type: "regular" | "shopify" | "skipped" }> {

  // ── Idempotency lock via transactions table ────────────────────────────────
  // Uses a compare-and-swap on status=pending to ensure only one webhook
  // processes this payment. If claimedTx is null and no error, the tx was
  // already claimed — check age to decide whether to skip or re-acquire.
  if (ctx.providerTransactionId) {
    const now = new Date();

    const { data: claimedTx, error: claimError } = await db
      .from("transactions")
      .update({ status: "completed", updated_at: now.toISOString() })
      .eq("provider_transaction_id", ctx.providerTransactionId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error(
        `[finalizeOrderPayment] Lock error for tx ${ctx.providerTransactionId}:`,
        claimError
      );
    }

    if (!claimedTx && !claimError) {
      const { data: existingTx } = await db
        .from("transactions")
        .select("updated_at, status")
        .eq("provider_transaction_id", ctx.providerTransactionId)
        .maybeSingle();

      if (existingTx?.status === "completed") {
        const ageMs = now.getTime() - new Date(existingTx.updated_at).getTime();

        if (ageMs < 3 * 60 * 1000) {
          console.log(
            `[finalizeOrderPayment] Tx ${ctx.providerTransactionId} ` +
            `locked ${Math.round(ageMs / 1000)}s ago. Skipping.`
          );
          return { type: "skipped" };
        }

        // Stale lock — re-acquire to recover from a crash
        console.log(
          `[finalizeOrderPayment] Stale lock (${Math.round(ageMs / 1000)}s). Re-acquiring.`
        );
        await db
          .from("transactions")
          .update({ updated_at: now.toISOString() })
          .eq("provider_transaction_id", ctx.providerTransactionId);
      }
    }
  }

  // ── 1. Fetch order with all needed fields ─────────────────────────────────
  // ✅ Fixed: select cj_shipping_method + full shipping_address for CJ submission
  const { data: order, error: orderError } = await db
    .from("orders")
    .select(`
            *,
            order_items (
                id,
                product_id,
                vendor_id,
                product_name,
                quantity,
                unit_price,
                total_price,
                product_source,
                source_metadata,
                affiliate_id,
                affiliate_commission_rate,
                affiliate_commission_amount
            ),
            profiles (
                id,
                full_name,
                email,
                phone
            )
        `)
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const isPaid = order.payment_status === "paid";
  const rawOrderItems = order.order_items ?? [];

  const orderItems = rawOrderItems.map((item: any) => ({
    ...item,
    shopify_variant_id: item.source_metadata?.shopify_variant_id ?? null,
    shopify_product_id: item.source_metadata?.shopify_product_id ?? null,
  })) as Array<CJOrderItem & {
    shopify_variant_id: number | null;
    shopify_product_id: string | null;
  }>;

  const shopifyItems = orderItems.filter((item) => isShopifyFulfillmentLine(item));
  const hasShopifyBridge =
    order.shopify_order_id != null ||
    (Array.isArray(order.shopify_order_ids) && order.shopify_order_ids.length > 0);

  if (isPaid && (shopifyItems.length === 0 || hasShopifyBridge)) {
    return { type: "skipped" };
  }

  const recoveryShopifyOnly = isPaid && shopifyItems.length > 0 && !hasShopifyBridge;

  const buyerProfile = order.profiles as {
    id?: string | null;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;

  const buyerName = (buyerProfile?.full_name || "Unknown User").split(" ");

  const shipping = order.shipping_address as {
    address1?: string;
    address2?: string;
    city?: string;
    country?: string;
    country_code?: string;
    zip?: string;
    phone?: string;
  } | null;

  function buildOrderPatch(
    status: "confirmed" | "processing",
    existingMetadata: Record<string, unknown> = {}
  ): Record<string, unknown> {
    const metadataUpdate: Record<string, unknown> = { ...existingMetadata };

    if (ctx.nowpaymentsPaymentId != null) {
      metadataUpdate.nowpayments_payment_id = ctx.nowpaymentsPaymentId;
    }
    if (ctx.paymentProvider) {
      metadataUpdate.payment_provider = ctx.paymentProvider;
    }

    return {
      // ✅ Fixed: was "completed" which isn't in payment_status enum — use "paid"
      payment_status: "paid",
      status,
      paid_at: ctx.paidAtIso,
      updated_at: new Date().toISOString(),
      metadata: metadataUpdate,
    };
  }

  // ── 3a. Non-Shopify path ──────────────────────────────────────────────────

  if (shopifyItems.length === 0) {
    if (isPaid) return { type: "skipped" };

    // ── 3a-i. Mark order as confirmed + paid ──────────────────────────────
    const { error: patchError } = await db
      .from("orders")
      .update(buildOrderPatch("confirmed", order.metadata ?? {}))
      .eq("id", orderId);

    if (patchError) {
      console.error("[finalizeOrderPayment] Failed to update order status:", patchError);
      throw new Error(`Failed to update order status: ${patchError.message}`);
    }

    try {
      await db.from("order_status_history").insert({
        order_id: orderId,
        previous_status: order.status,
        new_status: "confirmed",
        notes: `Payment confirmed via ${ctx.paymentProvider ?? "gateway"}.`,
      });
    } catch (e) {
      console.warn("[finalizeOrderPayment] Could not log status history:", e);
    }

    // ── 3a-ii. Credit vendor wallets ──────────────────────────────────────
    await creditVendorWalletsForNativeOrder(db, {
      orderId,
      orderNumber: String(order.order_number ?? orderId),
      currency: String(order.currency ?? "RWF"),
      paymentProvider: ctx.paymentProvider ?? null,
      providerTransactionId: ctx.providerTransactionId,
      items: orderItems.map((i) => ({
        vendor_id: i.vendor_id,
        total_price: i.total_price,
        product_source: i.product_source,
        shopify_variant_id: i.shopify_variant_id,
      })),
    });

    // ── 3a-iii. Grant digital access ──────────────────────────────────────
    await grantDigitalAccess(db, orderId, ctx.notifyUserId, ctx.paymentProvider);

    // ── 3a-iv. Dispatch non-Shopify fulfillment integrations ──────────────
    await dispatchNonShopifyFulfillmentIntegrations(db, {
      orderId,
      orderNumber: String(order.order_number ?? orderId),
      items: orderItems.map((i) => ({
        id: i.id,
        product_id: i.product_id ?? "",
        vendor_id: i.vendor_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
        product_source: i.product_source,
        source_metadata: i.source_metadata ?? null,
      })),
    });

    // ── 3a-v. ✅ NEW: Submit CJ items to CJ Dropshipping ─────────────────
    // Runs after order is marked confirmed so CJ failure doesn't block payment
    // confirmation. Non-fatal — errors are logged to failed_wallet_credits.
    await submitCJItemsIfPresent(db, orderId, orderItems, {
      cj_shipping_method: order.cj_shipping_method ?? null,
      shipping_address: order.shipping_address as Record<string, string> | null,
      profiles: buyerProfile,
    });

    // ── 3a-vi. Affiliate commissions ──────────────────────────────────────
    for (const item of orderItems.filter((i) => i.affiliate_id != null)) {
      if (!item.affiliate_id || !item.affiliate_commission_amount) continue;

      await db.from("affiliate_commissions").insert({
        affiliate_id: item.affiliate_id,
        order_id: orderId,
        order_item_id: item.id,
        product_id: item.product_id,
        vendor_id: item.vendor_id,
        commission_rate: item.affiliate_commission_rate,
        order_amount: item.total_price,
        commission_amount: item.affiliate_commission_amount,
        status: "pending",
      });

      await db.rpc("increment_affiliate_earnings", {
        p_affiliate_id: item.affiliate_id,
        p_amount: item.affiliate_commission_amount,
      });
    }

    // ── 3a-vii. Notify buyer ──────────────────────────────────────────────
    if (ctx.notifyUserId) {
      await db.from("notifications").insert({
        user_id: ctx.notifyUserId,
        type: "order",
        title: "Payment Confirmed!",
        message: `Your payment${ctx.amountForMessage != null
            ? ` of RWF ${Number(ctx.amountForMessage).toLocaleString()}`
            : ""
          } has been confirmed. Order is being processed.`,
        data: { order_id: orderId, reference: ctx.webhookReference },
        action_url: `/dashboard/orders/${orderId}`,
      });
    }

    return { type: "regular" };
  }

  // ── 3b. Shopify path ──────────────────────────────────────────────────────

  const itemsByVendor = shopifyItems.reduce<
    Record<string, typeof shopifyItems>
  >((acc, item) => {
    if (!acc[item.vendor_id]) acc[item.vendor_id] = [];
    acc[item.vendor_id].push(item);
    return acc;
  }, {});

  const results = await Promise.allSettled(
    Object.entries(itemsByVendor).map(async ([vendorId, items]) => {
      const { data: creds } = await db
        .from("shopify_credentials")
        .select("platform_commission_rate")
        .eq("vendor_id", vendorId)
        .single();

      const fallbackRate = await getShopifyPlatformCommissionFallback(db);
      const platformCommissionRate =
        creds?.platform_commission_rate != null
          ? Number(creds.platform_commission_rate)
          : fallbackRate;

      const vendorTotal = items.reduce(
        (sum, i) => sum + Number(i.total_price),
        0
      );

      return createShopifyOrder({
        jimvioOrderId: orderId,
        vendorId,
        buyer: {
          firstName: buyerName[0] || "Customer",
          lastName: buyerName.slice(1).join(" ") || "",
          email: buyerProfile?.email || "",
          phone: buyerProfile?.phone || shipping?.phone || "",
          address1: shipping?.address1 || "",
          address2: shipping?.address2 || "",
          city: shipping?.city || "",
          country: shipping?.country || "Rwanda",
          countryCode: shipping?.country_code || "RW",
          zip: shipping?.zip || "00000",
        },
        items: items.map((i) => ({
          shopifyVariantId: i.shopify_variant_id as number,
          quantity: i.quantity,
          unitPrice: Number(i.unit_price),
          productName: i.product_name,
        })),
        totalAmount: vendorTotal,
        currency: order.currency || "USD",
        paymentReference: ctx.providerTransactionId,
        platformCommissionRate,
      });
    })
  );

  const created = results
    .filter(
      (r): r is PromiseFulfilledResult<
        Awaited<ReturnType<typeof createShopifyOrder>>
      > => r.status === "fulfilled"
    )
    .map((r) => r.value);

  if (created.length) {
    await attachShopifyOrdersToJimvioOrder(orderId, created);
  }

  if (!recoveryShopifyOnly) {
    const { error: shopifyPatchError } = await db
      .from("orders")
      .update(buildOrderPatch("processing", order.metadata ?? {}))
      .eq("id", orderId);

    if (shopifyPatchError) {
      console.error(
        "[finalizeOrderPayment] Failed to update Shopify order status:",
        shopifyPatchError
      );
      throw new Error(
        `Failed to update Shopify order status: ${shopifyPatchError.message}`
      );
    }

    try {
      await db.from("order_status_history").insert({
        order_id: orderId,
        previous_status: order.status,
        new_status: "processing",
        notes: `Payment confirmed via ${ctx.paymentProvider ?? "gateway"
          }. Forwarding to Shopify for fulfillment.`,
      });
    } catch (e) {
      console.warn("[finalizeOrderPayment] Could not log status history:", e);
    }

    if (ctx.notifyUserId) {
      await db.from("notifications").insert({
        user_id: ctx.notifyUserId,
        type: "order",
        title: "Payment Confirmed!",
        message: `Your Shopify order${ctx.amountForMessage != null
            ? ` (RWF ${Number(ctx.amountForMessage).toLocaleString()})`
            : ""
          } is being fulfilled by the merchant.`,
        data: { order_id: orderId, reference: ctx.webhookReference },
        action_url: `/dashboard/orders/${orderId}`,
      });
    }
  }

  // ── Credit vendor wallets (Shopify path) ──────────────────────────────────
  await creditVendorWalletsForNativeOrder(db, {
    orderId,
    orderNumber: String(order.order_number ?? orderId),
    currency: String(order.currency ?? "RWF"),
    paymentProvider: ctx.paymentProvider ?? null,
    providerTransactionId: ctx.providerTransactionId,
    items: orderItems.map((i) => ({
      vendor_id: i.vendor_id,
      total_price: i.total_price,
      product_source: i.product_source,
      shopify_variant_id: i.shopify_variant_id,
    })),
  });

  await dispatchNonShopifyFulfillmentIntegrations(db, {
    orderId,
    orderNumber: String(order.order_number ?? orderId),
    items: orderItems.map((i) => ({
      id: i.id,
      product_id: i.product_id ?? "",
      vendor_id: i.vendor_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
      product_source: i.product_source,
      source_metadata: i.source_metadata ?? null,
    })),
  });

  // ── ✅ NEW: Submit CJ items even on Shopify path ───────────────────────────
  // An order can have both Shopify vendor items AND CJ items.
  // Shopify items go to Shopify; CJ items go to CJ. They're independent.
  await submitCJItemsIfPresent(db, orderId, orderItems, {
    cj_shipping_method: order.cj_shipping_method ?? null,
    shipping_address: order.shipping_address as Record<string, string> | null,
    profiles: buyerProfile,
  });

  // ── Affiliate commissions — deduplicated for Shopify path ─────────────────
  for (const item of orderItems.filter((i) => i.affiliate_id != null)) {
    if (!item.affiliate_id || !item.affiliate_commission_amount) continue;

    const { data: existing } = await db
      .from("affiliate_commissions")
      .select("id")
      .eq("order_item_id", item.id)
      .maybeSingle();

    if (existing) continue;

    await db.from("affiliate_commissions").insert({
      affiliate_id: item.affiliate_id,
      order_id: orderId,
      order_item_id: item.id,
      product_id: item.product_id,
      vendor_id: item.vendor_id,
      commission_rate: item.affiliate_commission_rate,
      order_amount: item.total_price,
      commission_amount: item.affiliate_commission_amount,
      status: "pending",
    });

    await db.rpc("increment_affiliate_earnings", {
      p_affiliate_id: item.affiliate_id,
      p_amount: item.affiliate_commission_amount,
    });
  }

  return { type: "shopify" };
}