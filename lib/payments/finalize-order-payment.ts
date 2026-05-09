import type { SupabaseClient } from "@supabase/supabase-js";
import { createShopifyOrder, attachShopifyOrdersToJimvioOrder } from "@/services/shopifyOrderCreation";
import { getShopifyPlatformCommissionFallback } from "@/lib/platform-settings";
import { creditVendorWalletsForNativeOrder } from "@/lib/payments/credit-vendors-for-native-order";
import { dispatchNonShopifyFulfillmentIntegrations, isShopifyFulfillmentLine } from "@/lib/order-fulfillment/after-payment";
import { grantDigitalAccess as executeDigitalAccessGrant } from "@/lib/actions/digital-access";

/**
 * Grants instant digital access after payment:
 * - Copies products.digital_file_url → order_items.digital_download_url
 * - Stamps order_items.access_granted_at
 * - Sets order_items.product_type = 'digital'
 * - Updates order status to 'delivered' if ALL items are digital
 * Safe: logs warnings on failure, never throws.
 */
async function grantDigitalAccess(
  db: SupabaseClient,
  orderId: string,
  buyerUserId: string | null | undefined,
  paymentProvider: string | null | undefined
): Promise<void> {
  try {
    // Fetch all order items with their product info
    const { data: items } = await db
      .from("order_items")
      .select("id, product_id, digital_download_url")
      .eq("order_id", orderId);

    if (!items || items.length === 0) return;

    // Fetch product details in one query for all products
    const productIds = items
      .map((i: { product_id: string | null }) => i.product_id)
      .filter((id): id is string => !!id);

    if (productIds.length === 0) return;

    const { data: products } = await db
      .from("products")
      .select("id, product_type, digital_file_url, pricing_type, billing_period")
      .in("id", productIds);

    const productMap = new Map(
      (products ?? []).map((p: any) =>
        [p.id, p] as const
      )
    );

    const now = new Date().toISOString();
    let digitalCount = 0;

    for (const item of items) {
      const product = productMap.get(item.product_id ?? "");
      if (!product || product.product_type !== "digital") continue;

      digitalCount++;
      const fileUrl = product.digital_file_url ?? null;

      // Skip if already granted
      if (item.digital_download_url) continue;

      if (buyerUserId) {
         try {
           await executeDigitalAccessGrant({
             userId: buyerUserId,
             productId: product.id,
             orderItemId: item.id,
             orderId: orderId,
             accessUrl: fileUrl,
             subtype: null,
             pricingType: product.pricing_type ?? 'one_time',
             billingPeriod: product.billing_period ?? null
           });
         } catch (e) {
           console.warn(`[DigitalAccess] Failed to grant via digital_access table for ${item.id}:`, e);
         }
      } else {
         // Legacy fallback if no buyer user ID
         const { error: grantErr } = await db
           .from("order_items")
           .update({
             product_type: "digital",
             digital_download_url: fileUrl,
             access_granted_at: now,
           })
           .eq("id", item.id);

         if (grantErr) {
           console.warn(`[DigitalAccess] Failed to grant for order_item ${item.id}:`, grantErr.message);
         }
      }
    }

    // If ALL items are digital → instantly mark order as delivered
    if (digitalCount > 0 && digitalCount === items.length) {
      await db
        .from("orders")
        .update({ status: "delivered", delivered_at: now })
        .eq("id", orderId);

      // Send library notification
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

      console.log(`[DigitalAccess] ✓ Instant delivery for order ${orderId}. ${digitalCount} digital items unlocked.`);
    } else if (digitalCount > 0) {
      // Mixed order: some digital, some physical — grant digital items only
      console.log(`[DigitalAccess] ✓ Partial digital grant for order ${orderId}. ${digitalCount}/${items.length} items unlocked.`);
    }
  } catch (err) {
    // Never break payment flow for digital access errors
    console.warn(`[DigitalAccess] Non-fatal error for order ${orderId}:`, err);
  }
}

export type FinalizePaymentContext = {
  providerTransactionId: string;
  providerReference: string;
  paidAtIso: string;
  notifyUserId?: string | null;
  amountForMessage?: number | null;
  webhookReference?: string;
  /** When checkout used NowPayments (crypto). */
  nowpaymentsPaymentId?: number | null;
  /** e.g. pawapay — stored on orders.payment_provider when finalizing */
  paymentProvider?: string | null;
};

/**
 * Idempotent per order: if already paid and Shopify side already linked (when applicable), skips work.
 */
export async function finalizeOrderPayment(
  db: SupabaseClient,
  orderId: string,
  ctx: FinalizePaymentContext
): Promise<{ type: "regular" | "shopify" | "skipped" }> {

  // 0. Atomic Lock: Prevent concurrent executions (webhook vs frontend polling)
  if (ctx.providerTransactionId) {
    const now = new Date();
    
    // Attempt to claim the transaction
    const { data: claimedTx, error: claimError } = await db
      .from("transactions")
      .update({ status: "successful", updated_at: now.toISOString() })
      .eq("provider_transaction_id", ctx.providerTransactionId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
      
    if (claimError) {
      console.error(`[finalizeOrderPayment] Error locking tx ${ctx.providerTransactionId}:`, claimError);
    }
    
    if (!claimedTx && !claimError) {
      // Transaction is already 'successful' or 'failed'.
      // This means another thread processed it, OR a previous run crashed.
      // Let's check when it was last updated to allow crash recovery.
      const { data: existingTx } = await db
        .from("transactions")
        .select("updated_at, status")
        .eq("provider_transaction_id", ctx.providerTransactionId)
        .maybeSingle();
        
      if (existingTx && existingTx.status === "successful") {
        const updatedAt = new Date(existingTx.updated_at).getTime();
        const ageMs = now.getTime() - updatedAt;
        
        // If it was updated less than 3 minutes ago, assume the other thread is still running.
        if (ageMs < 3 * 60 * 1000) {
          console.log(`[finalizeOrderPayment] Tx ${ctx.providerTransactionId} locked by another thread ${Math.round(ageMs/1000)}s ago. Skipping.`);
          return { type: "skipped" };
        } else {
          console.log(`[finalizeOrderPayment] Tx ${ctx.providerTransactionId} lock is stale (${Math.round(ageMs/1000)}s old). Allowing retry to recover from potential crash.`);
          // We update the timestamp to re-acquire the lock
          await db
            .from("transactions")
            .update({ updated_at: now.toISOString() })
            .eq("provider_transaction_id", ctx.providerTransactionId);
        }
      }
    }
  }

  const { data: order, error: orderError } = await db
    .from("orders")
    .select(
      `
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
        full_name,
        email,
        phone
      )
    `
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const isPaid = order.payment_status === "completed";
  const rawOrderItems = order.order_items ?? [];
  const orderItems = rawOrderItems.map((item: any) => ({
    ...item,
    shopify_variant_id: item.source_metadata?.shopify_variant_id ?? null,
    shopify_product_id: item.source_metadata?.shopify_product_id ?? null,
  })) as Array<{
    id: string;
    vendor_id: string;
    shopify_variant_id: number | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_source?: string | null;
    source_metadata?: Record<string, unknown> | null;
    affiliate_id: string | null;
    affiliate_commission_rate: number | null;
    affiliate_commission_amount: number | null;
    product_id: string | null;
  }>;

  const shopifyItems = orderItems.filter((item) => isShopifyFulfillmentLine(item));
  const hasShopifyBridge =
    order.shopify_order_id != null || (Array.isArray(order.shopify_order_ids) && order.shopify_order_ids.length > 0);

  if (isPaid && (shopifyItems.length === 0 || hasShopifyBridge)) {
    return { type: "skipped" };
  }

  /** Paid via provider but Shopify push failed earlier — finish Shopify only. */
  const recoveryShopifyOnly = isPaid && shopifyItems.length > 0 && !hasShopifyBridge;

  const buyerProfile = order.profiles as { full_name?: string | null; email?: string | null; phone?: string | null } | null;
  const buyerName = (buyerProfile?.full_name || "Unknown User").split(" ");
  const shipping = order.shipping_address as
    | {
        address1?: string;
        address2?: string;
        city?: string;
        country?: string;
        country_code?: string;
        zip?: string;
        phone?: string;
      }
    | null;

  const providerTxId = ctx.providerTransactionId;

  if (shopifyItems.length === 0) {
    if (isPaid) {
      return { type: "skipped" };
    }
    const regularPatch: Record<string, unknown> = {
      payment_status: "completed",
      status: "confirmed",
      paid_at: ctx.paidAtIso,
      updated_at: new Date().toISOString(),
    };
    if (ctx.nowpaymentsPaymentId != null) {
      regularPatch.nowpayments_payment_id = ctx.nowpaymentsPaymentId;
    }
    if (ctx.paymentProvider) {
      regularPatch.payment_provider = ctx.paymentProvider;
    }
    await db.from("orders").update(regularPatch).eq("id", orderId);

    // Track History
    try {
      await db.from("order_status_history").insert({
        order_id: orderId,
        previous_status: order.status,
        new_status: "confirmed",
        notes: `Payment confirmed via ${ctx.paymentProvider || 'gateway'}. Order moved to confirmed.`
      });
    } catch (e) {
      console.warn("Could not log status history for confirmed order:", e);
    }

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

    // ── DIGITAL ACCESS: Grant instant download access for digital products
    await grantDigitalAccess(db, orderId, ctx.notifyUserId, ctx.paymentProvider);

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

    const affItems = orderItems.filter((i) => i.affiliate_id != null);
    for (const item of affItems) {
      if (item.affiliate_id && item.affiliate_commission_amount) {
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
    }

    if (ctx.notifyUserId) {
      await db.from("notifications").insert({
        user_id: ctx.notifyUserId,
        type: "order",
        title: "Payment Confirmed!",
        message: `Your payment${ctx.amountForMessage != null ? ` of RWF ${Number(ctx.amountForMessage).toLocaleString()}` : ""} has been confirmed. Order is being processed.`,
        data: { order_id: orderId, reference: ctx.webhookReference },
        action_url: `/dashboard/orders/${orderId}`,
      });
    }

    return { type: "regular" };
  }

  const itemsByVendor = shopifyItems.reduce<Record<string, typeof shopifyItems>>((acc, item) => {
    if (!acc[item.vendor_id]) acc[item.vendor_id] = [];
    acc[item.vendor_id].push(item);
    return acc;
  }, {});

  const results = await Promise.allSettled(
    Object.entries(itemsByVendor).map(async ([vendorId, items]) => {
      const { data: creds } = await db.from("shopify_credentials").select("platform_commission_rate").eq("vendor_id", vendorId).single();

      const fallbackRate = await getShopifyPlatformCommissionFallback(db);
      const platformCommissionRate =
        creds?.platform_commission_rate != null ? Number(creds.platform_commission_rate) : fallbackRate;
      const vendorTotal = items.reduce((sum, i) => sum + Number(i.total_price), 0);

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
        paymentReference: providerTxId,
        platformCommissionRate,
      });
    })
  );

  const created = results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof createShopifyOrder>>> => r.status === "fulfilled")
    .map((r) => r.value);

  if (created.length) {
    await attachShopifyOrdersToJimvioOrder(orderId, created);
  }

  if (!recoveryShopifyOnly) {
    const shopifyPatch: Record<string, unknown> = {
      payment_status: "completed",
      status: "processing",
      paid_at: ctx.paidAtIso,
      updated_at: new Date().toISOString(),
    };
    if (ctx.nowpaymentsPaymentId != null) {
      shopifyPatch.nowpayments_payment_id = ctx.nowpaymentsPaymentId;
    }
    if (ctx.paymentProvider) {
      shopifyPatch.payment_provider = ctx.paymentProvider;
    }
    await db.from("orders").update(shopifyPatch).eq("id", orderId);

    // Track History
    try {
      await db.from("order_status_history").insert({
        order_id: orderId,
        previous_status: order.status,
        new_status: "processing",
        notes: `Payment confirmed via ${ctx.paymentProvider || 'gateway'}. Forwarding to Shopify for fulfillment.`
      });
    } catch (e) {
      console.warn("Could not log status history for shopify order:", e);
    }

    if (ctx.notifyUserId) {
      await db.from("notifications").insert({
        user_id: ctx.notifyUserId,
        type: "order",
        title: "Payment Confirmed!",
        message: `Your Shopify order${ctx.amountForMessage != null ? ` (RWF ${Number(ctx.amountForMessage).toLocaleString()})` : ""} is being fulfilled by the merchant.`,
        data: { order_id: orderId, reference: ctx.webhookReference },
        action_url: `/dashboard/orders/${orderId}`,
      });
    }
  }

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

  const affShopify = orderItems.filter((i) => i.affiliate_id != null);
  for (const item of affShopify) {
    if (item.affiliate_id && item.affiliate_commission_amount) {
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
  }

  return { type: "shopify" };
}
